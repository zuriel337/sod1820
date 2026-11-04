// Existing video identity, re-admitted through its current public source. No
// placements/topics from other occurrences are downloaded or treated as public.
import { stripHtml } from "../format.js";
import { publicPostHref } from "../publicPostUrls.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";
import { publicNowMediaHref } from "./systemFeedPublicSources2029.js";

const clean = value => stripHtml(String(value || "")).trim();
const validTime = value => Number.isFinite(Date.parse(value || ""));
const canceled = signal => { if (signal?.aborted) throw new DOMException("Video reading canceled", "AbortError"); };

export async function readPublicVideoRows2029(table, params, { signal } = {}) {
  const { getPublicResearchClient } = await import("./researchViewMode.js");
  let query = getPublicResearchClient().from(table).select(params.select);
  for (const [key, value] of Object.entries(params)) {
    if (key === "select" || key === "limit") continue;
    if (key === "or") query = query.or(value.slice(1, -1));
    else if (String(value).startsWith("eq.")) query = query.eq(key, String(value).slice(3));
    else throw new Error("unsupported_video_read_filter");
  }
  query = query.limit(1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  canceled(signal);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("invalid_video_source_response");
  return data;
}

function mediaAddress(value) {
  const local = publicNowMediaHref(value);
  if (local) return local;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    if (url.hostname === "www.youtube.com" && url.pathname === "/watch"
      && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get("v") || "")
      && [...url.searchParams.keys()].every(key => key === "v")) return url.href;
    if (url.hostname === "vimeo.com" && /^\/\d+$/.test(url.pathname) && !url.search) return url.href;
  } catch { /* an unverified destination is not playable */ }
  return null;
}

// One query specification reused by the single-page reader and the existing
// server sitemap's bounded batches. This is not a second publication policy.
export function publicVideoSourceQuery2029(kind, id, now = Date.now()) {
  if (kind === "post") return { table: "posts", params: {
    select: "id,slug,title,tags,source,link,wp_id,date", id: `eq.${id}`, or: `(${publicPostOnlyFilter()})`,
  } };
  if (kind === "channel_update") return { table: "channel_updates", params: {
    select: "id,channel,status,page_only,expires_at,created_at,text,seo_title,speaker,credit,image_url,thumb_url",
    id: `eq.${id}`, status: "eq.live", page_only: "eq.false", or: `(expires_at.is.null,expires_at.gt.${new Date(now).toISOString()})`,
  } };
  if (kind === "home_video") return { table: "home_videos", params: {
    select: "id,is_active,title,video_url,yt,poster_url,created_at", id: `eq.${id}`, is_active: "eq.true",
  } };
  if (kind === "story") return { table: "stories", params: {
    select: "id,active,title,video_url,image_url,created_at", id: `eq.${id}`, active: "eq.true",
  } };
  return null;
}

export async function fetchPublicVideo2029(assetId, { readRows = readPublicVideoRows2029, signal, now = Date.now() } = {}) {
  canceled(signal);
  if (!/^[0-9a-f]{32}$/i.test(assetId || "")) return null;
  const one = async (table, params) => {
    canceled(signal);
    const rows = await readRows(table, { ...params, limit: "1" }, { signal });
    canceled(signal);
    if (!Array.isArray(rows)) throw new Error("invalid_video_source_response");
    return rows[0] || null;
  };
  const identity = await one("video_media_assets_v1", {
    select: "public_id,primary_source_type,primary_source_id", public_id: `eq.${assetId}`,
  });
  if (!identity || identity.public_id !== assetId) return null;
  const id = String(identity.primary_source_id || ""), kind = identity.primary_source_type;
  if (!id || id.length > 64) return null;
  const query = publicVideoSourceQuery2029(kind, id, now);
  const readSource = () => one(query.table, query.params);
  let source, sourceTitle, sourceMedia, sourceTime, credit, author;
  if (kind === "post") {
    if (!/^\d+$/.test(id)) return null;
    source = await readSource();
    if (!source || String(source.id) !== id || hasSuppressedPublicPostTag(source) || !source.slug) return null;
    return { public_id: assetId, title: clean(source.title), first_seen_at: source.date, redirectHref: publicPostHref(source) };
  }
  if (kind === "channel_update") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    source = await readSource();
    if (!source || String(source.id) !== id || source.status !== "live" || source.page_only !== false
      || source.expires_at && (!validTime(source.expires_at) || Date.parse(source.expires_at) <= now)) return null;
    sourceTitle = source.seo_title || source.text; sourceMedia = source.image_url; sourceTime = source.created_at;
    credit = clean(source.credit); author = clean(source.speaker);
  } else if (kind === "home_video") {
    source = await readSource();
    if (!source || String(source.id) !== id || source.is_active !== true) return null;
    sourceTitle = source.title; sourceTime = source.created_at;
    sourceMedia = source.video_url || (source.yt ? `https://www.youtube.com/watch?v=${source.yt}` : null);
  } else if (kind === "story") {
    source = await readSource();
    if (!source || String(source.id) !== id || source.active !== true) return null;
    sourceTitle = source.title; sourceTime = source.created_at; sourceMedia = source.video_url;
  } else return null;
  const media = mediaAddress(sourceMedia), title = clean(sourceTitle);
  if (!media || !title || !validTime(sourceTime)) return null;
  // Fetch playable metadata only after the source has passed its own gates.
  const asset = await one("video_media_assets_v1", {
    select: "public_id,primary_source_type,primary_source_id,video_kind,media_url,youtube_id,poster_url,thumb_url,google_indexable",
    public_id: `eq.${assetId}`, primary_source_type: `eq.${kind}`, primary_source_id: `eq.${id}`,
  });
  if (!asset || asset.public_id !== assetId || asset.primary_source_type !== kind || String(asset.primary_source_id) !== id
    || mediaAddress(asset.media_url) !== media) return null;
  return { public_id: assetId, title, media_url: media, video_kind: asset.video_kind,
    youtube_id: asset.youtube_id, thumb_url: publicNowMediaHref(source.thumb_url || source.poster_url || (kind === "story" ? source.image_url : null)) || publicNowMediaHref(asset.thumb_url || asset.poster_url),
    first_seen_at: sourceTime, google_indexable: asset.google_indexable === true, credit, author,
    sourceRef: `${kind}:${id}`, uses_generic_page: true };
}

// Server-only use by the existing XML owner. Per-request maps are discarded;
// at most 40 distinct source IDs per GET, never one HTTP request per asset.
export async function publicVideoSitemapAssets2029(assets, { readRows, now = Date.now() }) {
  const eligible = assets.filter(v => /^[0-9a-f]{32}$/i.test(v.public_id || "") && v.google_indexable === true
    && /^[0-9a-f-]{1,64}$/i.test(String(v.primary_source_id || "")) && publicVideoSourceQuery2029(v.primary_source_type, v.primary_source_id, now));
  const sources = new Map();
  for (const kind of new Set(eligible.map(v => v.primary_source_type))) {
    const ids = [...new Set(eligible.filter(v => v.primary_source_type === kind).map(v => String(v.primary_source_id)))];
    const spec = publicVideoSourceQuery2029(kind, ids[0], now), tableRows = new Map();
    for (let offset = 0; offset < ids.length; offset += 40) {
      const batch = ids.slice(offset, offset + 40);
      const rows = await readRows(spec.table, { ...spec.params, id: `in.(${batch.join(",")})`, limit: String(batch.length) });
      if (!Array.isArray(rows)) throw new Error("invalid_video_source_response");
      for (const row of rows) if (batch.includes(String(row.id))) tableRows.set(String(row.id), row);
    }
    sources.set(spec.table, tableRows);
  }
  const result = [];
  for (const original of eligible) {
    const item = await fetchPublicVideo2029(original.public_id, { now, readRows: async (table, params) => {
      if (table === "video_media_assets_v1") return [original];
      const row = sources.get(table)?.get(params.id.slice(3));
      return row ? [row] : [];
    } });
    if (!item) continue;
    const media = item.redirectHref ? mediaAddress(original.media_url) : item.media_url;
    if (!media) continue;
    result.push({ public_id: item.public_id, title: item.title, media_url: media,
      video_kind: original.video_kind, youtube_id: original.youtube_id,
      thumb_url: item.thumb_url || publicNowMediaHref(original.thumb_url || original.poster_url),
      first_seen_at: item.first_seen_at,
      primary_page_url: `https://sod1820.co.il${item.redirectHref || `/video/${item.public_id}`}` });
  }
  return result;
}

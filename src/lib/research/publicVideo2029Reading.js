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
  let source, sourceTitle, sourceMedia, sourceTime, credit, author;
  if (kind === "post") {
    if (!/^\d+$/.test(id)) return null;
    source = await one("posts", { select: "id,slug,title,tags,source,link,wp_id,date", id: `eq.${id}`, or: `(${publicPostOnlyFilter()})` });
    if (!source || String(source.id) !== id || hasSuppressedPublicPostTag(source) || !source.slug) return null;
    return { public_id: assetId, title: clean(source.title), redirectHref: publicPostHref(source) };
  }
  if (kind === "channel_update") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    source = await one("channel_updates", {
      select: "id,channel,status,page_only,expires_at,created_at,text,seo_title,speaker,credit,image_url,thumb_url",
      id: `eq.${id}`, status: "eq.live", page_only: "eq.false", or: `(expires_at.is.null,expires_at.gt.${new Date(now).toISOString()})`,
    });
    if (!source || String(source.id) !== id || source.status !== "live" || source.page_only !== false
      || source.expires_at && (!validTime(source.expires_at) || Date.parse(source.expires_at) <= now)) return null;
    sourceTitle = source.seo_title || source.text; sourceMedia = source.image_url; sourceTime = source.created_at;
    credit = clean(source.credit); author = clean(source.speaker);
  } else if (kind === "home_video") {
    source = await one("home_videos", { select: "id,is_active,title,video_url,yt,poster_url,created_at", id: `eq.${id}`, is_active: "eq.true" });
    if (!source || String(source.id) !== id || source.is_active !== true) return null;
    sourceTitle = source.title; sourceTime = source.created_at;
    sourceMedia = source.video_url || (source.yt ? `https://www.youtube.com/watch?v=${source.yt}` : null);
  } else if (kind === "story") {
    source = await one("stories", { select: "id,active,title,video_url,image_url,created_at", id: `eq.${id}`, active: "eq.true" });
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

import { stripHtml } from "../format.js";
import { getPublicResearchClient } from "./researchViewMode.js";
import { hasSuppressedPublicPostTag, publicPostOnlyFilter } from "./publicPostBoundary.js";
import { publicPostHref } from "../publicPostUrls.js";

const clean = (value) => value == null ? "" : String(value).trim();

// Adopted from 780db978a9dce428aef31d9b68cf5437170b1677; shared exact compatibility descriptors keep Home/World and Follow in step.
import { CONTENT_SERIES_2029, contentSeriesByKey, contentSeriesMembershipFilter, hasExactMembership } from "./contentSeries2029Identity.js";
export { CONTENT_SERIES_2029, contentSeriesMembershipFilter } from "./contentSeries2029Identity.js";

function isSuppressedPost(row) {
  return hasSuppressedPublicPostTag(row);
}

const publishedFirst = (a, b) => {
  const dateOrder = (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
  if (dateOrder) return dateOrder;
  if (a.kind === "post" && b.kind === "post") {
    const numericOrder = Number(a.id) - Number(b.id);
    if (Number.isFinite(numericOrder) && numericOrder) return numericOrder;
  } else if (a.kind === "post" || b.kind === "post") return a.kind === "post" ? -1 : 1;
  return clean(a.sourceRef).localeCompare(clean(b.sourceRef));
};
const occurrence = item => ({ sourceRef: item.sourceRef, kind: item.kind, href: item.href,
  title: item.title, credit: item.credit || item.author || null, publishedAt: item.publishedAt });

// Exact source identity deduplicates. Media source occurrences can group by
// asset; two authored Posts remain separate even when they share a video.
export function mergeContentSeriesItems(postItems = [], sourceItems = []) {
  const items = [], byRef = new Map(), byAsset = new Map();
  for (const item of [...postItems, ...sourceItems]) {
    if (!item?.sourceRef) continue;
    const matches = [...new Set([byRef.get(item.sourceRef),
      item.kind !== "post" && item.assetKey && byAsset.get(item.assetKey)].filter(Boolean))];
    let target = matches[0];
    if (!target) {
      target = { ...item, sourceOccurrences: [] };
      items.push(target);
    }
    for (const duplicate of matches.slice(1)) {
      for (const source of duplicate.sourceOccurrences) {
        if (!target.sourceOccurrences.some(existing => existing.sourceRef === source.sourceRef)) target.sourceOccurrences.push(source);
      }
      items.splice(items.indexOf(duplicate), 1);
      for (const [ref, value] of byRef) if (value === duplicate) byRef.set(ref, target);
      for (const [key, value] of byAsset) if (value === duplicate) byAsset.set(key, target);
    }
    for (const source of item.sourceOccurrences || [occurrence(item)]) {
      if (!target.sourceOccurrences.some(existing => existing.sourceRef === source.sourceRef)) target.sourceOccurrences.push(source);
    }
    byRef.set(item.sourceRef, target);
    if (item.kind !== "post" && item.assetKey) { target.assetKey = item.assetKey; byAsset.set(item.assetKey, target); }
  }
  return items.sort(publishedFirst);
}

// Project only a Human-Gated occurrence declared by the existing series owner.
// This does not use topics, the channel name or video series_keys as admission.
export async function projectApprovedContentSeriesSource(row, asset, seriesKey, { now = Date.now() } = {}) {
  const spec = contentSeriesByKey(seriesKey);
  const approval = spec?.approvedSources?.find(item => item.sourceRef === `channel_updates:${row?.id}`);
  if (!approval || row.channel !== approval.channel || row.status !== "live" || row.page_only !== false
    || row.expires_at && (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= now)
    || !Number.isFinite(Date.parse(row.created_at || ""))) return null;
  // Reuse the public media policy only after exact series/source admission.
  // A static import here would make Home eagerly import the deferred Now reader.
  const { publicNowMediaHref } = await import("./systemFeedPublicSources2029.js");
  const media = publicNowMediaHref(row.image_url);
  if (!media || asset?.public_id !== approval.publicAssetId || publicNowMediaHref(asset.media_url) !== media
    || !clean(asset.asset_key)) return null;
  const exactPlacement = asset.primary_source_type === "channel_update" && asset.primary_source_id === row.id;
  if (!exactPlacement) return null;
  const title = stripHtml(clean(row.seo_title || row.text));
  if (!title) return null;
  return {
    id: approval.sourceRef, sourceRef: approval.sourceRef, kind: "channel_update", title,
    excerpt: stripHtml(clean(row.text)) || null, author: stripHtml(clean(row.speaker)) || null,
    credit: stripHtml(clean(row.credit)) || null, channel: row.channel,
    publishedAt: row.created_at, updatedAt: row.created_at,
    imageUrl: publicNowMediaHref(row.thumb_url) || publicNowMediaHref(asset.thumb_url || asset.poster_url),
    href: `/video/${asset.public_id}`, assetKey: asset.asset_key,
    // Exact public media object (same policy as imageUrl) so a reader can play it on selection.
    mediaUrl: media,
    decisionRef: approval.decisionRef,
  };
}

function canceled(signal) {
  if (signal?.aborted) throw new DOMException("Series reading canceled", "AbortError");
}

export async function fetchApprovedContentSeriesSources2029(seriesKey, {
  client = getPublicResearchClient(), signal, now = Date.now(),
} = {}) {
  const spec = contentSeriesByKey(seriesKey);
  canceled(signal);
  const results = await Promise.all((spec?.approvedSources || []).map(async approval => {
    try {
      canceled(signal);
      const id = approval.sourceRef.slice("channel_updates:".length);
      let sourceQuery = client.from("channel_updates")
        .select("id,channel,status,page_only,expires_at,created_at,text,seo_title,speaker,credit,image_url,thumb_url")
        .eq("id", id).eq("channel", approval.channel).eq("status", "live").eq("page_only", false)
        .or(`expires_at.is.null,expires_at.gt.${new Date(now).toISOString()}`).limit(1);
      if (signal) sourceQuery = sourceQuery.abortSignal(signal);
      const source = await sourceQuery;
      canceled(signal);
      if (source.error) throw source.error;
      const row = source.data?.[0];
      if (!row || row.id !== id || row.channel !== approval.channel || row.status !== "live" || row.page_only !== false
        || row.expires_at && (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= now)) {
        return { sourceRef: approval.sourceRef, state: "access_filtered", item: null };
      }
      let assetQuery = client.from("video_media_assets_v1")
        .select("public_id,asset_key,media_url,thumb_url,poster_url,primary_source_type,primary_source_id")
        .eq("public_id", approval.publicAssetId).limit(1);
      if (signal) assetQuery = assetQuery.abortSignal(signal);
      const asset = await assetQuery;
      canceled(signal);
      if (asset.error) throw asset.error;
      const item = await projectApprovedContentSeriesSource(row, asset.data?.[0], spec.key, { now });
      canceled(signal);
      return { sourceRef: approval.sourceRef, state: item ? "measured" : "failed", item };
    } catch (error) {
      canceled(signal);
      return { sourceRef: approval.sourceRef, state: error?.code === "42501" ? "access_filtered" : "failed", item: null };
    }
  }));
  canceled(signal);
  return { items: mergeContentSeriesItems([], results.map(result => result.item).filter(Boolean)),
    sourceStates: results.map(({ sourceRef, state }) => ({ sourceRef, state })) };
}

export function projectContentSeriesItems(rows = [], spec = {}) {
  const items = [];
  const excluded = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!hasExactMembership(row, spec)) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: "membership_not_exact" });
      continue;
    }
    if (spec.exactAuthor && row?.author !== spec.exactAuthor) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: "author_not_mapped" });
      continue;
    }
    if (isSuppressedPost(row)) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: "draft_or_forum" });
      continue;
    }
    const slug = clean(row?.slug);
    const title = stripHtml(clean(row?.title));
    if (!slug || !title) {
      excluded.push({ id: row?.id == null ? null : String(row.id), reason: !slug ? "no_slug" : "no_title" });
      continue;
    }
    if (seen.has(String(row.id))) continue;
    seen.add(String(row.id));
    items.push({
      id: String(row.id),
      slug,
      title,
      excerpt: stripHtml(clean(row?.excerpt)) || null,
      author: clean(row?.author) || null,
      imageUrl: clean(row?.thumb_url || row?.image_url) || null,
      publishedAt: row?.date || null,
      updatedAt: row?.modified || row?.date || null,
      href: publicPostHref(row),
      sourceRef: `posts:${row.id}`,
      kind: "post",
    });
  }
  return { items: items.sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0)), excluded };
}

export function buildContentSeriesCatalog2029(results = [], { homeOnly = false } = {}) {
  const byKey = new Map((Array.isArray(results) ? results : []).map((result) => [result?.key, result]));
  const series = CONTENT_SERIES_2029.map((spec) => {
    const result = byKey.get(spec.key) || {};
    const projected = projectContentSeriesItems(result.rows, spec);
    const sourceItems = result.sourceItems || [];
    const sourceStates = result.sourceStates || [];
    const items = mergeContentSeriesItems(projected.items, sourceItems);
    const failed = result.failed || sourceStates.some(source => source.state !== "measured");
    const total = result.total != null && Number.isFinite(Number(result.total)) ? Number(result.total) : null;
    return {
      key: spec.key,
      label: spec.label,
      entityKind: "series",
      decisionId: spec.decisionId,
      writerLabel: spec.writerLabel,
      publisherLabel: spec.publisherLabel,
      priorityLane: spec.priorityLane,
      relationNote: spec.relationNote,
      mappingState: "approved_identity_partial_membership",
      homeOnly,
      total,
      items,
      sourceItems,
      sourceStates,
      sourceTotal: result.sourcesRequested && sourceStates.length && sourceStates.every(source => source.state === "measured") ? sourceItems.length : null,
      sourcesRequested: result.sourcesRequested === true,
      hasApprovedSources: Boolean(spec.approvedSources?.length),
      excluded: projected.excluded,
      readState: !byKey.has(spec.key) ? "not_loaded" : failed ? items.length ? "partial" : "failed"
        : items.length ? "measured" : spec.approvedSources?.length && !result.sourcesRequested ? "not_loaded" : "measured_empty",
    };
  });
  return {
    series,
    byKey: Object.fromEntries(series.map((item) => [item.key, item])),
    note: "One shared Home/World series projection. Series, topic, writer, publisher, post and media remain distinct identities; exact tags/categories are compatibility evidence, not truth authority.",
  };
}

async function fetchSeriesPreview(spec, { client, limit, homeOnly, signal }) {
  const filter = contentSeriesMembershipFilter(spec);
  if (!client || !filter) return { key: spec.key, rows: [], total: null, failed: true };
  let query = client
    .from("posts")
    .select("id,slug,title,excerpt,author,categories,tags,image_url,thumb_url,date,modified,home_hidden,source,link,wp_id", { count: "exact" })
    .or(filter)
    .or(publicPostOnlyFilter());
  if (spec.exactAuthor) query = query.eq("author", spec.exactAuthor);
  if (homeOnly) query = query.eq("home_hidden", false);
  if (signal) query = query.abortSignal(signal);
  const { data, error, count } = await query
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return {
    key: spec.key,
    rows: Array.isArray(data) ? data : [],
    total: count != null && Number.isFinite(Number(count)) ? Number(count) : null,
  };
}

export async function fetchContentSeriesCatalog2029({
  client = getPublicResearchClient(),
  limitPerSeries = 4,
  homeOnly = false,
  signal,
  sourceSeriesKey = null,
} = {}) {
  const limit = Math.max(1, Math.min(Number(limitPerSeries) || 4, 12));
  canceled(signal);
  const results = await Promise.all(CONTENT_SERIES_2029.map(async spec => {
    const sourcesRequested = sourceSeriesKey === spec.key && Boolean(spec.approvedSources?.length);
    const [posts, sources] = await Promise.all([
      fetchSeriesPreview(spec, { client, limit, homeOnly, signal }).catch(error => {
        if (signal?.aborted) throw error;
        return { key: spec.key, rows: [], total: null, failed: true };
      }),
      sourcesRequested ? fetchApprovedContentSeriesSources2029(spec.key, { client, signal })
        : Promise.resolve({ items: [], sourceStates: [] }),
    ]);
    return { ...posts, sourceItems: sources.items, sourceStates: sources.sourceStates, sourcesRequested };
  }));
  canceled(signal);
  return buildContentSeriesCatalog2029(results, { homeOnly });
}

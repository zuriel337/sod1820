// Extra public Now lenses over EXISTING sources, admitted only on opening Now.
// No Legacy WhatsApp endpoint, private intake, model, RPC, writer or new store.
import { stripHtml } from "../format.js";
import { publicStorageMedia } from "../mediaEgressGuard.js";
import { redactGroupText } from "./worldGroupSource.js";
import { gallerySourceHref2029 } from "./topicSourceContext.js";
import { CONTENT_SERIES_2029 } from "./contentSeries2029Identity.js";
import { fetchApprovedContentSeriesSources2029, fetchContentSeriesCatalog2029 } from "./contentSeries2029Projection.js";

const GILUI_YOMI_CARD_ID = "ad270354-41ab-4d4d-8bf5-030e0452406d";
const GILUI_YOMI_ROOT_ID = "2c22eafe-5847-4c31-a510-2abfd1fa3291";
const GILUI_YOMI_SOURCE_REFS = Object.freeze([
  "60ee7dd1-f2c2-42b0-8a36-89a4fa9190e4", "8c30a12a-57da-49a8-a454-748c674fc6b0",
  "8594a16e-b68d-4d5c-a7ed-491a76097eb7", "9ae687a5-69f6-4196-8884-35395c0b1b1a",
  "82ff208e-20b5-47b4-a572-d62db931b234", "ac57bf9c-d19e-421d-83f8-15351664189c",
].map(id => `channel_updates:${id}`));

export const NOW_PUBLIC_CHANNELS_2029 = Object.freeze({
  "gilui-yomi": "הגילוי היומי", "site-news": "עדכוני האתר", "reality-code": "קוד המציאות",
  "sod-hachashmal": "סוד החשמל", "or-geula": "אור הגאולה",
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = value => Number.isFinite(Date.parse(value || "")) ? new Date(value).toISOString() : null;
const text = value => redactGroupText(stripHtml(String(value || "")));

// URL syntax is not publication proof: destinations re-enter their existing
// public readers. Unmapped Legacy landings stay readable as text, not fake links.
export function publicNowSourceHref(value) {
  if (!value || /[\\]/.test(value)) return null;
  try {
    const u = new URL(value, "https://sod1820.co.il");
    if (u.origin !== "https://sod1820.co.il" || u.username || u.password
      || [...u.searchParams.keys()].some(k => /token|signed|signature|email|phone|birth|name|return|redirect|next/i.test(k))) return null;
    if (u.pathname === "/" && /^\d+$/.test(u.searchParams.get("p") || "")) return u.pathname + u.search + u.hash;
    if (/^\/(?:post|topic|number)\/[^/]+\/?$/.test(u.pathname) && !/%(?:2f|5c)/i.test(u.pathname)) return u.pathname + u.search + u.hash;
    // Or HaGeula video pages: the 2029 route /or-geula/video/:id exists and the release policy keeps it open. Exact UUID only.
    if (/^\/or-geula\/video\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(u.pathname)) return u.pathname + u.search + u.hash;
    return null;
  } catch { return null; }
}
// The shared public storage media rule (PUBLIC_STORAGE_MEDIA_V1), the same one the public-reading worker uses: an already-public
// object of this project's public buckets, with at most a version/cache key or a media start fragment. Signed, private-bucket,
// rendition and foreign addresses stay out.
export function publicNowMediaHref(value) {
  const media = publicStorageMedia(value);
  return media && !media.rendition ? media.href : null;
}
// The media kind of an admitted address comes from its canonical path, never from a version key (…/original.mp4?v=2 is a video).
export function publicNowMediaKind(value) {
  const media = publicStorageMedia(value);
  return media && !media.rendition ? media.kind : null;
}
export function publicChannelToSystemItem(row, { now = Date.now() } = {}) {
  if (!UUID.test(row?.id || "") || !NOW_PUBLIC_CHANNELS_2029[row.channel] || row.status !== "live" || row.page_only !== false
    || row.expires_at && (!date(row.expires_at) || Date.parse(row.expires_at) <= now)) return null;
  const body = text(row.text), at = date(row.created_at), mediaHref = publicNowMediaHref(row.image_url);
  if (!at || !body && !mediaHref) return null;
  const label = body || `${publicNowMediaKind(mediaHref) === "video" ? "סרטון" : publicNowMediaKind(mediaHref) === "audio" ? "הקלטה" : "תמונה"} · ${NOW_PUBLIC_CHANNELS_2029[row.channel]}`;
  return { id: `channel:${row.id}`, kind: "source", sourceKind: "channel_update", channel: row.channel,
    sourceLabel: NOW_PUBLIC_CHANNELS_2029[row.channel], label: label.slice(0, 160), fullText: body, mediaHref, thumbUrl: publicNowMediaHref(row.thumb_url),
    fullTextTruncated: body.length === 1200,
    creator: NOW_PUBLIC_CHANNELS_2029[row.channel], at, arrivalAt: at, recordedAt: at,
    sourceRef: `channel_updates:${row.id}`, publicState: "published_channel_update",
    href: publicNowSourceHref(row.link_url), researchCount: 0, numbers: [],
    // The owner's own mark (channel_updates.priority above the default 50): the one update of a second-tier channel that stands on its own.
    ownerFeatured: Number.isFinite(Number(row.priority)) && Number(row.priority) > 50 };
}
async function giluiYomiThreadItem(row, { api, now, signal }) {
  if (row.id !== GILUI_YOMI_CARD_ID) return publicChannelToSystemItem(row, { now });
  if (row.channel !== "gilui-yomi" || row.link_url !== `/community/chat?thread=${GILUI_YOMI_ROOT_ID}`) return null;
  const update = publicChannelToSystemItem(row, { now });
  if (!update) return null;
  const { fetchCommunityThread } = await import("../community/communityArchive.js");
  const root = await fetchCommunityThread(GILUI_YOMI_ROOT_ID, { client: api, signal });
  if (!root || root.origin !== "community_2029" || root.isDeleted || !root.body?.trim()) return null;
  const title = text(root?.title);
  if (!title) return null;
  return {
    ...update, id: `community:${root.id}`, sourceKind: "community_thread",
    sourceGroupLabel: NOW_PUBLIC_CHANNELS_2029["gilui-yomi"],
    sourceGroup: { key: "gilui-yomi", label: NOW_PUBLIC_CHANNELS_2029["gilui-yomi"] },
    sourceRefs: [update.sourceRef, ...GILUI_YOMI_SOURCE_REFS],
    label: title, fullText: "", summary: update.fullText, href: row.link_url,
    publicState: "published_community_thread", ownerFeatured: false,
  };
}

export function publicGalleryToSystemItem(row) {
  if (!UUID.test(row?.id || "") || row.source !== "update" || row.min_tier == null || Number(row.min_tier) !== 0 || Number(row.published) !== 1 || row.curator_hidden === true) return null;
  const label = text(row.name || row.description), at = date(row.stream_at) || date(row.created_at);
  if (!label || !at) return null;
  return { id: `gallery:${row.id}`, kind: "source", sourceKind: "gallery_update", sourceLabel: "זרם המציאות",
    label: label.slice(0, 160), fullText: text(row.description || row.name), mediaHref: publicNowMediaHref(row.image_url), creator: "זרם המציאות", at,
    arrivalAt: at, recordedAt: date(row.created_at), occurredAt: date(row.occurred_at),
    sourceRef: `gallery_images:${row.id}`, publicState: "published_gallery_update",
    href: gallerySourceHref2029(Number(row.wp_gallery_id), row.id), researchCount: 0, numbers: [] };
}
// A Human-Gated series occurrence already declared by the series owner (contentSeries2029Identity.approvedSources).
// Same channel row id => same Now identity: the exact video/public representation enriches, never duplicates.
export function approvedSeriesToSystemItem(item, spec) {
  const id = String(item?.sourceRef || "").slice("channel_updates:".length);
  const at = date(item?.publishedAt);
  if (!UUID.test(id) || !at || !item.title || !NOW_PUBLIC_CHANNELS_2029[item.channel]) return null;
  const body = text(item.excerpt);
  return { id: `channel:${id}`, kind: "source", sourceKind: "channel_update", channel: item.channel,
    sourceLabel: NOW_PUBLIC_CHANNELS_2029[item.channel], label: text(item.title).slice(0, 160), fullText: body,
    fullTextTruncated: body.length === 1200, mediaHref: publicNowMediaHref(item.mediaUrl), thumbUrl: publicNowMediaHref(item.imageUrl),
    creator: NOW_PUBLIC_CHANNELS_2029[item.channel], at, arrivalAt: at, recordedAt: at, sourceRef: item.sourceRef,
    publicState: "published_channel_update", href: typeof item.href === "string" && /^\/video\/[0-9a-f]{32}$/i.test(item.href) ? item.href : null,
    seriesKey: spec.key, seriesLabel: spec.label, researchCount: 0, numbers: [] };
}
// Latest public Posts of each approved series, read through the SAME series reader as Home/World, so a series
// is represented in Now even when its newest Post is older than the shared stream's recent window.
// Membership is the series owner's exact projection (never author/channel inference); posts only.
export function seriesCatalogToSystemItems(catalog) {
  return (Array.isArray(catalog?.series) ? catalog.series : []).flatMap(series => (Array.isArray(series.items) ? series.items : [])
    .filter(item => item?.kind === "post" && item.id != null && item.title && /^\/[^/]/.test(item.href || "") && date(item.publishedAt))
    .map(item => ({ id: `post:${item.id}`, kind: "source", sourceKind: "post", sourceLabel: "פוסט מקור באתר",
      label: text(item.title).slice(0, 160), summary: text(item.excerpt).slice(0, 240) || null,
      creator: item.author || series.writerLabel || series.publisherLabel || "יצירה באתר", author: item.author || "",
      at: date(item.publishedAt), arrivalAt: date(item.publishedAt), sourceRef: item.sourceRef, href: item.href,
      thumbUrl: /^https:\/\//.test(item.imageUrl || "") ? item.imageUrl : null,
      seriesKey: series.key, seriesLabel: series.label, researchCount: 0, numbers: [], publicState: "published_source_representation" })));
}
export async function fetchSystemFeedPublicSources2029({ client = null, signal = null } = {}) {
  const api = client || (await import("./researchViewMode.js")).getPublicResearchClient();
  const read = async query => { if (signal) query = query.abortSignal(signal); const { data, error } = await query; if (error) throw error; return Array.isArray(data) ? data : []; };
  const now = Date.now(), keys = Object.keys(NOW_PUBLIC_CHANNELS_2029);
  const seriesSpecs = CONTENT_SERIES_2029.filter(spec => spec.approvedSources?.length);
  const seriesRead = Promise.allSettled(seriesSpecs.map(spec => fetchApprovedContentSeriesSources2029(spec.key, { client: api, signal, now })));
  const catalogRead = fetchContentSeriesCatalog2029({ client: api, limitPerSeries: 4, homeOnly: true, signal }).then(catalog => ({ catalog }), error => ({ error }));
  const results = await Promise.allSettled([
    ...keys.map(channel => read(api.from("channel_updates")
      .select("id,text,image_url,thumb_url,channel,status,page_only,expires_at,created_at,link_url,priority")
      .eq("status", "live").eq("page_only", false).eq("channel", channel)
      .or(`expires_at.is.null,expires_at.gt.${new Date(now).toISOString()}`)
      .order("created_at", { ascending: false }).limit(12))),
    read(api.from("gallery_images").select("id,image_url,name,description,source,published,min_tier,curator_hidden,stream_at,created_at,occurred_at,wp_gallery_id")
      .eq("source", "update").eq("published", 1).eq("min_tier", 0).not("curator_hidden", "is", true)
      .order("stream_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(10)),
  ]);
  const seriesResults = await seriesRead;
  const catalogResult = await catalogRead;
  if (signal?.aborted) throw new DOMException("Now source read canceled", "AbortError");
  const seriesItems = seriesResults.flatMap((r, i) => r.status === "fulfilled" ? r.value.items.map(item => approvedSeriesToSystemItem(item, seriesSpecs[i])).filter(Boolean) : []);
  const sourceStates = results.map((r, i) => ({ source: i < keys.length ? keys[i] : "gallery",
    status: r.status === "rejected" ? String(r.reason?.code) === "42501" ? "access_filtered" : "failed"
      : r.value.length ? "read" : "measured_empty" }));
  const seriesStates = seriesResults.map((r, i) => ({ source: `series:${seriesSpecs[i].key}`,
    status: r.status === "rejected" ? "failed" : r.value.sourceStates.some(state => state.state === "access_filtered") ? "access_filtered"
      : r.value.sourceStates.some(state => state.state !== "measured") ? "failed" : r.value.items.length ? "read" : "measured_empty" }));
  const channelItems = (await Promise.all(results.map(async (result, i) => {
    if (result.status !== "fulfilled") return [];
    if (i >= keys.length) return result.value.map(publicGalleryToSystemItem);
    return Promise.all(result.value.map(row => giluiYomiThreadItem(row, { api, now, signal }).catch(() => {
      if (!signal?.aborted) sourceStates[i] = { source: keys[i], status: "failed" };
      return null;
    })));
  }))).flat().filter(Boolean);
  if (signal?.aborted) throw new DOMException("Now source read canceled", "AbortError");
  // Series-approved occurrences go first: the same channel id keeps ONE row, enriched with its exact video/series.
  const ids = new Set(seriesItems.map(item => item.id));
  const catalogItems = catalogResult.catalog ? seriesCatalogToSystemItems(catalogResult.catalog) : [];
  const catalogState = { source: "series-posts", status: catalogResult.error ? "failed" : catalogResult.catalog.series.some(series => series.readState === "failed") ? "failed" : catalogItems.length ? "read" : "measured_empty" };
  return { items: [...seriesItems, ...channelItems.filter(item => !ids.has(item.id)), ...catalogItems], sourceStates: [...sourceStates, ...seriesStates, catalogState] };
}

// "Now" publications window: pure presentation projection over the EXISTING system feed rows
// (useSystemFeed2029 -> feedRows). No network, store, ranking or second reader.
// One publication is ONE row: identity comes from feed row ids / sourceRefs (see mergeSystemFeedItems);
// the same row model feeds the compact Now list, its filters and its detail. Similar wording never merges rows.
// Series, source/channel, content family and media type stay SEPARATE dimensions (CONTENT-AUDIENCES-HYBRID-NOW).
import { contentSeriesByKey, contentSeriesKeysForPost } from "./research/contentSeries2029Identity.js";

// Public name of the shared series is "מסרים"; the historical source titles and the series key stay untouched.
export const NOW_SERIES_PUBLIC_LABEL = Object.freeze({ "messages-from-righteous": "מסרים" });
export const nowSeriesLabel = (key, fallback = "") => NOW_SERIES_PUBLIC_LABEL[key] || fallback;

// Exact public category names (compatibility evidence, never inferred from wording).
const MESSAGE_CATEGORIES = Object.freeze(["מסרים", "רמזים מצדיקים"]);
const HINT_CATEGORIES = Object.freeze(["רמזי הגאולה", "רמזים חזקים"]);
const HINT_CHANNELS = Object.freeze(["reality-code"]);
const VIDEO_CATEGORY = "וידאו";

// Hierarchy (ZURIEL / GPT 5.11.2026): the public source path first, then messages (including Or HaGeula),
// then the reality stream; "all" and the remaining lenses follow. Lens = presentation only; rows are never re-ranked.
export const NOW_PRIMARY_LENSES = Object.freeze(["sources", "messages", "reality"]);
export const NOW_LENSES = Object.freeze([
  Object.freeze({ id: "sources", label: "מקורות ציבוריים" }),
  Object.freeze({ id: "messages", label: "מסרים ואור הגאולה" }),
  Object.freeze({ id: "reality", label: "זרם המציאות" }),
  Object.freeze({ id: "all", label: "הכול" }),
  Object.freeze({ id: "series", label: "סדרות" }),
  Object.freeze({ id: "hints", label: "רמזי גאולה וקוד המציאות" }),
]);
const MESSAGE_CHANNELS = Object.freeze(["or-geula"]);
export const NOW_MEDIA = Object.freeze([
  Object.freeze({ id: "video", label: "וידאו" }),
  Object.freeze({ id: "image", label: "תמונה" }),
  Object.freeze({ id: "text", label: "טקסט" }),
]);

const VIDEO_URL = /\.(?:mp4|webm|mov|m4v)(?:[?#].*)?$/i;
// Raw media addresses are storage plumbing, never reading text.
const RAW_MEDIA_URL = /(?:https?:)?\/\/[^\s<>"'\])]+\.(?:mp4|webm|mov|m4v)(?:\?[^\s<>"'\])]*)?/gi;

/** Reading text with raw video/storage addresses removed (the source row itself is never rewritten). */
export function cleanNowText(value) {
  return String(value == null ? "" : value)
    .replace(RAW_MEDIA_URL, " ")
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/^[\s\-–—·•:|]+|[\s\-–—·•:|]+$/g, "")
    .trim();
}

/** Short visual title: first words only, cut at a word boundary. Full text stays in the detail. */
export function shortNowTitle(value, max = 84) {
  // Addresses belong to the detail, not the one-line title.
  const text = cleanNowText(value).replace(/(?:https?:\/\/|www\.)\S+|\[(?:קישור|מספר|דוא״ל)\]/gi, " ").replace(/[ \t]+/g, " ").trim().split("\n").map(line => line.trim()).filter(Boolean)[0] || "";
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.55 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?\-–—]+$/g, "")}…`;
}

const list = value => Array.isArray(value) ? value : [];
const clean = value => value == null ? "" : String(value).trim();
const hasAny = (values, wanted) => list(values).some(value => wanted.includes(value));

/**
 * The words of the message itself (not only a headline). Unverified source rows (Zvi) stay two lines: no excerpt.
 * When the short title is just the beginning of the text, the text replaces it (`excerptIsLead`) instead of repeating it.
 */
export function nowExcerpt({ unverified, title, fullText, summary }) {
  if (unverified) return { excerpt: "", excerptIsLead: false };
  const body = (fullText || summary || "").replace(/\s+/g, " ").trim();
  if (!body || body === title) return { excerpt: "", excerptIsLead: false };
  const stem = title.replace(/[…\s]+$/g, "");
  const lead = body.startsWith(stem) && body.length > stem.length;
  return { excerpt: body.slice(0, 420), excerptIsLead: lead };
}

/** Compact, filterable model for one feed row (see feedRows). */
export function nowRowModel(row) {
  const item = row?.item || {};
  const categories = list(item.categories), tags = list(item.tags);
  const isGroup = item.sourceKind === "group_message", isPost = item.sourceKind === "post";
  const isGallery = item.sourceKind === "gallery_update", isChannel = item.sourceKind === "channel_update";
  const media = item.mediaHref || item.mediaUrl || item.media?.url || null;
  const href = row?.href || null;
  const groupMediaKind = isGroup ? item.media?.kind : null; // a group source declares its own media kind
  const video = groupMediaKind === "video" || (!groupMediaKind && Boolean(media && VIDEO_URL.test(media))) || /^\/video\/[^/]+\/?$/.test(href || "")
    || (isPost && categories.includes(VIDEO_CATEGORY));
  const image = !video && (groupMediaKind ? groupMediaKind === "image" : Boolean(media || isGallery));
  const seriesKey = item.seriesKey || (isPost ? contentSeriesKeysForPost({ categories, tags, author: item.author })[0] || null : null);
  const seriesLabel = seriesKey ? nowSeriesLabel(seriesKey, item.seriesLabel || contentSeriesByKey(seriesKey)?.label || "") : "";
  // A public group source is labelled by its GROUP (the source); the writer stays in the byline.
  const groupLabel = isGroup ? clean(item.sourceGroupLabel) : "";
  const sourceName = isGroup ? (groupLabel || item.creator || "מקור ציבורי")
    : isChannel ? (item.sourceLabel || item.creator || "")
    : isGallery ? (item.sourceLabel || "זרם המציאות")
    : isPost ? (item.sourceLabel === "פוסט מקור באתר" ? "" : item.sourceLabel || "") || item.creator || ""
    : (item.creator || "");
  const unverified = isGroup;
  const typeLabel = unverified ? "מקור · טרם נבדק"
    : row?.kind === "convergence" ? "התכנסות" : row?.kind === "finding" ? "ממצא"
    : item.sourceUpdate ? "עדכון מקור" : video ? "סרטון" : image ? "תמונה" : isPost ? "פוסט" : "עדכון";
  const lenses = new Set(["all"]);
  if (seriesKey) lenses.add("series");
  if (isGroup) lenses.add("sources");
  if (seriesKey === "messages-from-righteous" || hasAny(categories, MESSAGE_CATEGORIES) || (isChannel && MESSAGE_CHANNELS.includes(item.channel))) lenses.add("messages");
  if (isGallery || (isChannel && HINT_CHANNELS.includes(item.channel))) lenses.add("reality");
  if (hasAny(categories, HINT_CATEGORIES) || (isChannel && HINT_CHANNELS.includes(item.channel))) lenses.add("hints");
  const fullText = cleanNowText(item.fullText);
  const summary = cleanNowText(item.summary);
  const title = shortNowTitle(row?.title || item.label) || (video ? "סרטון" : image ? "תמונה" : "עדכון");
  const byline = [seriesLabel, sourceName, isGroup ? item.creator : ""].filter((part, index, all) => part && all.indexOf(part) === index);
  return {
    id: row?.id, row, item, title, byline, typeLabel, unverified,
    at: row?.at || null, href, seriesKey, seriesLabel, sourceName,
    media: video ? "video" : image ? "image" : "text", video, image,
    thumb: [!video && media, item.thumbUrl, item.imageUrl].find(url => /^https:\/\//.test(url || "")) || null,
    groupLabel, creatorHref: isGroup ? item.creatorHref || null : null,
    mediaHref: media, lenses,
    fullText, summary: summary && summary !== title ? summary : "",
    ...nowExcerpt({ unverified, title, fullText, summary }),
    // Unverified source rows stay two lines without a text excerpt; a group source WITH media still shows its preview.
    previewKind: (unverified && !(isGroup && (video || image))) ? null : video ? "video" : (image || media) ? "image" : null,
    canExpand: Boolean(fullText || media),
  };
}

export const nowModels = rows => list(rows).filter(row => row?.id && row.title)
  .map(nowRowModel)
  .sort((a, b) => (Date.parse(b.at || 0) - Date.parse(a.at || 0)) || String(a.id).localeCompare(String(b.id)));

/** Primary lenses with at least one row; "all" is always available. */
export function availableNowLenses(models) {
  const all = list(models);
  return NOW_LENSES.filter(lens => lens.id === "all" || all.some(model => model.lenses.has(lens.id)));
}

/** First primary lens that has rows (sources → messages → reality); "all" when none does. */
export function defaultNowLens(models) {
  const all = list(models);
  return NOW_PRIMARY_LENSES.find(id => all.some(model => model.lenses.has(id))) || "all";
}

/** Secondary choices (series / source / media) derived from the rows that exist, never fixed lists. */
export function nowSecondaryChoices(models) {
  const all = list(models), series = new Map(), sources = new Map(), media = new Set();
  for (const model of all) {
    if (model.seriesKey) series.set(model.seriesKey, model.seriesLabel);
    if (model.sourceName) sources.set(model.sourceName, model.sourceName);
    media.add(model.media);
  }
  return {
    series: [...series].map(([id, label]) => ({ id, label })),
    sources: [...sources].map(([id, label]) => ({ id, label })),
    media: NOW_MEDIA.filter(option => media.has(option.id)),
  };
}

export function filterNowModels(models, { lens = "all", series = "", source = "", media = "" } = {}) {
  return list(models).filter(model => (lens === "all" || model.lenses.has(lens))
    && (!series || model.seriesKey === series) && (!source || model.sourceName === source) && (!media || model.media === media));
}

/** The series page for a model (series key is the existing approved identity). */
export const nowSeriesHref = model => model?.seriesKey ? `/2029/posts?series=${encodeURIComponent(model.seriesKey)}` : null;

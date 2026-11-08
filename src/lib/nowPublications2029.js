// "Now" publications window: pure presentation projection over the EXISTING system feed rows
// (useSystemFeed2029 -> feedRows). No network, store, ranking or second reader.
// One publication is ONE row: identity comes from feed row ids / sourceRefs (see mergeSystemFeedItems);
// the same row model feeds the compact Now list, its filters and its detail. Similar wording never merges rows.
// Series, source/channel, content family and media type stay SEPARATE dimensions (CONTENT-AUDIENCES-HYBRID-NOW).
import { publicAuthorName, SYSTEM_BYLINE } from "./publicIdentity.js";
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
  // "all" is first: the window opens on it (ZURIEL 6.11.2026; NOW-CENTRAL-HANDOFF-20261103 lists הכול first), so the active chip is
  // always visible without scrolling the chip row on a phone. The primary lenses keep their relative order.
  Object.freeze({ id: "all", label: "הכול" }),
  Object.freeze({ id: "sources", label: "מקורות ציבוריים" }),
  Object.freeze({ id: "messages", label: "מסרים ואור הגאולה" }),
  Object.freeze({ id: "reality", label: "זרם המציאות" }),
  Object.freeze({ id: "series", label: "סדרות" }),
  Object.freeze({ id: "hints", label: "רמזי גאולה וקוד המציאות" }),
]);
const MESSAGE_CHANNELS = Object.freeze(["or-geula"]);
export const NOW_MEDIA = Object.freeze([
  Object.freeze({ id: "video", label: "וידאו" }),
  Object.freeze({ id: "image", label: "תמונה" }),
  Object.freeze({ id: "text", label: "טקסט" }),
]);

// Presentation-only colour family of a row / lens chip (never ranking, never a claim): drives CSS hue only.
export const NOW_LENS_TONE = Object.freeze({ all: "sky", sources: "ember", messages: "gold", reality: "teal", series: "violet", hints: "rose" });
const toneOf = (lenses, unverified) => unverified ? "ember" : lenses.has("messages") ? "gold" : lenses.has("reality") ? "teal"
  : lenses.has("hints") ? "rose" : lenses.has("series") ? "violet" : "sky";

// Source logos (small webp copies of the approved logos: Or HaGeula = the broadcast logo, ELS = Bible-cipher research, site = the crown).
// A logo only names WHERE a row comes from; it never claims verification. Unverified group sources get none. The series session adds
// per-series logos here only when the series is OURS and ZURIEL approved its logo; no logo is the default.
export const NOW_SOURCE_LOGOS = Object.freeze({
  "or-geula": Object.freeze({ src: "/brand/2029/source-logos/or-geula.webp", label: "אור הגאולה" }),
  els: Object.freeze({ src: "/brand/2029/source-logos/els.webp", label: "הצופן התנכי" }),
  site: Object.freeze({ src: "/brand/2029/source-logos/site.webp", label: "כי לה׳ המלוכה" }),
});
// OUR logos mark OUR material only (ZURIEL 6.11.2026): Or HaGeula channel, ELS findings, and posts whose public byline is the system
// identity. A named human writer or a third-party series (e.g. מה קורה הבורא, מימד חמש, סוד החשמל) never gets a site logo: default is none.
const logoKeyOf = ({ unverified, isChannel, channel, kind, isPost, author, seriesKey }) => {
  if (unverified) return null;
  if (isChannel && channel === "or-geula") return "or-geula";
  if (kind === "finding" || kind === "convergence") return "els";
  if (isPost && !seriesKey && publicAuthorName(author) === SYSTEM_BYLINE) return "site";
  return null;
};

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
    tone: toneOf(lenses, unverified),
    logo: NOW_SOURCE_LOGOS[logoKeyOf({ unverified, isChannel, channel: item.channel, kind: row?.kind, isPost, author: item.author, seriesKey })] || null,
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

/**
 * The window opens on "all" (ZURIEL 6.11.2026; NOW-CENTRAL-HANDOFF-20261103: time order in "הכול"). This replaces the 5.11 default
 * that opened on the first populated primary lens, which showed only the public group sources. NOW_PRIMARY_LENSES remains the
 * order of the primary chips; it no longer picks the opening lens.
 */
export function defaultNowLens(_models) {
  return "all";
}

/**
 * Entries per lens among the rows ALREADY LOADED in the window. This counts loaded entries only: it is not site activity, not a
 * site-wide total and not an audience size (traffic_intelligence_law: activity != audience; no multiplier, no floor).
 */
export function nowLensCounts(models) {
  const all = list(models), counts = Object.create(null);
  for (const lens of NOW_LENSES) counts[lens.id] = lens.id === "all" ? all.length : all.filter(model => model.lenses.has(lens.id)).length;
  return counts;
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

/**
 * Presentation only (ZURIEL 6.11.2026 "לכווץ"): a run of at least `min` CONSECUTIVE unverified group-source rows from the same source
 * becomes one collapsible entry, so a busy source does not bury the rest of the window. Every row stays its own publication inside the
 * run (same ids, same order, nothing merged, nothing dropped); the input order is never changed.
 * Returns entries: { kind: "row", model } | { kind: "run", id, sourceName, models }.
 */
export function collapseSourceRuns(models, { min = 2 } = {}) {
  const entries = [], all = list(models);
  const flush = run => {
    if (run.length >= min) entries.push({ kind: "run", id: `run:${run[0].id}`, sourceName: run[0].sourceName, models: run });
    else for (const model of run) entries.push({ kind: "row", model });
  };
  let run = [];
  for (const model of all) {
    if (model.unverified && (!run.length || run[0].sourceName === model.sourceName)) { run.push(model); continue; }
    flush(run); run = [];
    if (model.unverified) run.push(model); else entries.push({ kind: "row", model });
  }
  flush(run);
  return entries;
}

/** The newest valid time among the rows of a collapsed run (ISO string), or null when none has a usable time. */
export function latestRunAt(models) {
  let best = null;
  for (const model of list(models)) {
    const time = Date.parse(model?.at || "");
    if (Number.isFinite(time) && (best == null || time > best)) best = time;
  }
  return best == null ? null : new Date(best).toISOString();
}

/** The series page for a model (series key is the existing approved identity). */
export const nowSeriesHref = model => model?.seriesKey ? `/2029/posts?series=${encodeURIComponent(model.seriesKey)}` : null;

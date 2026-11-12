// "Now" publications window: pure presentation projection over the EXISTING system feed rows
// (useSystemFeed2029 -> feedRows). No network, store, ranking or second reader.
// One publication is ONE row: identity comes from feed row ids / sourceRefs (see mergeSystemFeedItems);
// the same row model feeds the compact Now list, its filters and its detail. Similar wording never merges rows.
// Series, source/channel, content family and media type stay SEPARATE dimensions (CONTENT-AUDIENCES-HYBRID-NOW).
import { resolveUnitMessage } from "./research/postSemanticDesign2029.js";
import { realityMapPreviewEnabled } from "./research/realityMap2029.js";
import { publicAuthorName, SYSTEM_BYLINE } from "./publicIdentity.js";
import { contentSeriesByKey, contentSeriesKeysForPost } from "./research/contentSeries2029Identity.js";
import { publicStorageMedia } from "./mediaEgressGuard.js";
import { GROUP_SOURCE_CHANNELS, groupWriterPinListed } from "./research/worldGroupSource.js";

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
// ZURIEL 11.11.2026 (Royal, second pass): one clear hue per KIND of publication, from the same approved tone set — a public group source
// (unchecked) is turquoise, Or HaGeula / messages gold, a series violet, hints rose, the site's own Posts sky. Presentation only, never a claim.
const toneOf = (lenses, unverified) => unverified ? "teal" : lenses.has("messages") ? "gold" : lenses.has("hints") ? "rose"
  : lenses.has("series") ? "violet" : lenses.has("reality") ? "teal" : "sky";

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
// Audio is recognised by the shared public-media rule (kind from the canonical path), so only admitted public storage audio plays here.
const isPublicAudio = url => publicStorageMedia(url)?.kind === "audio";
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
  const audio = !video && (groupMediaKind ? groupMediaKind === "audio" : Boolean(media && isPublicAudio(media)));
  const image = !video && !audio && (groupMediaKind ? groupMediaKind === "image" : Boolean(media || isGallery));
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
  // The SOURCE of the row by a stable key (ZURIEL 11.11.2026: one source picker is the primary control). A group is its group (Zvi stays the
  // writer, never the source); a channel is its channel; a series Post is its series; any other Post is "פרסומי האתר". Series, category,
  // source and Post identity stay separate: this key never reads a category.
  const groupKey = isGroup ? clean(item.sourceGroup?.key) || "" : "";
  const sourceKey = isGroup ? `group:${groupKey || "neutral"}` : isChannel && item.channel ? `channel:${item.channel}`
    : isPost && seriesKey ? `series:${seriesKey}` : isPost ? "site:posts" : isGallery ? "site:reality" : row?.kind === "finding" || row?.kind === "convergence" ? "site:els" : "site:other";
  const typeLabel = unverified ? "מקור · טרם נבדק"
    : row?.kind === "convergence" ? "התכנסות" : row?.kind === "finding" ? "ממצא"
    : item.sourceUpdate ? "עדכון מקור" : video ? "סרטון" : audio ? "הקלטה" : image ? "תמונה" : isPost ? "פוסט" : "עדכון";
  const lenses = new Set(["all"]);
  if (seriesKey) lenses.add("series");
  if (isGroup) lenses.add("sources");
  if (seriesKey === "messages-from-righteous" || hasAny(categories, MESSAGE_CATEGORIES) || (isChannel && MESSAGE_CHANNELS.includes(item.channel))) lenses.add("messages");
  if (isGallery || (isChannel && HINT_CHANNELS.includes(item.channel))) lenses.add("reality");
  if (hasAny(categories, HINT_CATEGORIES) || (isChannel && HINT_CHANNELS.includes(item.channel))) lenses.add("hints");
  // The unit's MAIN MESSAGE (ZURIEL 12.11.2026, section 4) is the central caption of its update here: the same canonical unit record the
  // Post reads, never a copy. Preview-only today (the choice is browser-local and there is no canonical store yet).
  const mainMessage = realityMapPreviewEnabled() && item.sourceUpdate ? resolveUnitMessage(String(item.sourceUpdate.sourceRef || "").replace(/^posts:/, ""), item.sourceUpdate.targetId) : null;
  const fullText = cleanNowText(mainMessage || item.fullText);
  const summary = cleanNowText(mainMessage || item.summary);
  const title = shortNowTitle(row?.title || item.label) || (video ? "סרטון" : image ? "תמונה" : "עדכון");
  const byline = [seriesLabel, sourceName, isGroup ? item.creator : ""].filter((part, index, all) => part && all.indexOf(part) === index);
  // Two pin kinds, one order (ZURIEL 11.11.2026): the owner's own pin (the Home featured item) leads; a writer pin follows it; then everything
  // else by time. A writer pin exists ONLY on a public group arrival (already proved by the server: group proof, verified number, approved
  // writer) whose writer is listed for its group (GROUP_WRITER_PINS_2029 — שחר יצחק קנדרו and יניב לוי in «הגילוי היומי») and that has a
  // real end time. A group arrival is never an owner pin; a writer pin on anything else is ignored.
  const writerPin = isGroup && item.pinned === true && item.pinKind === "writer" && typeof item.pinUntil === "string"
    && Number.isFinite(Date.parse(item.pinUntil)) && groupWriterPinListed(item.sourceGroup?.key, item.creatorSlug);
  const pinKind = writerPin ? "writer" : item.pinned === true && !isGroup && item.pinKind !== "writer" ? "owner" : null;
  return {
    id: row?.id, row, item, title, byline, typeLabel, unverified, mainMessage,
    tone: toneOf(lenses, unverified),
    // Pinned by the owner (the Home featured item): stays first in "עכשיו" whatever its time; how pinning is governed is to be set in the contracts.
    // A writer pin (pinKind "writer") stays at the top too, under the owner's pin, until its pinUntil. It keeps the row's source status
    // ("מקור · טרם נבדק"): a pin changes the order only, never what the row is.
    pinned: Boolean(pinKind), pinKind,
    // A blinking dot attached to the title marks an update the owner flagged (the Home featured Post update). Its label is the accessible name.
    dot: typeof item.liveDot === "string" && item.liveDot ? item.liveDot : null,
    logo: NOW_SOURCE_LOGOS[logoKeyOf({ unverified, isChannel, channel: item.channel, kind: row?.kind, isPost, author: item.author, seriesKey })] || null,
    at: row?.at || null, href, seriesKey, seriesLabel, sourceName, sourceKey,
    pinUntil: pinKind && typeof item.pinUntil === "string" ? item.pinUntil : null,
    central: pinKind === "owner" && item.central && Array.isArray(item.central.groups)
      // Re-read at model time: a main message saved after the feed was built still reaches the pinned card (same canonical unit record).
      ? (() => { const text = realityMapPreviewEnabled() && item.central.anchor ? resolveUnitMessage(item.central.postId, item.central.anchor) : null; return text ? { ...item.central, lead: text, leadSub: "" } : item.central; })()
      : null,
    media: video ? "video" : audio ? "audio" : image ? "image" : "text", video, audio, image,
    thumb: [!video && !audio && media, item.thumbUrl, item.imageUrl].find(url => /^https:\/\//.test(url || "")) || null,
    groupLabel, creatorHref: isGroup ? item.creatorHref || null : null,
    mediaHref: media, lenses,
    fullText, summary: summary && summary !== title ? summary : "",
    ...nowExcerpt({ unverified, title, fullText, summary }),
    // Unverified source rows stay two lines without a text excerpt; a group source WITH media still shows its preview.
    previewKind: (unverified && !(isGroup && (video || image))) ? null : video ? "video" : audio ? null : (image || media) ? "image" : null,
    // Almost every row opens in place (ZURIEL 11.11.2026): its full text when the item carries it, otherwise the approved summary (a Post's excerpt),
    // otherwise its media. A row with nothing to show stays a plain link — never an empty panel, never an invented continuation.
    canExpand: Boolean(fullText || summary || media),
    // "עודכן": the publication itself received an update (a proven Post source update, or the owner's pinned update). "חדש" stays row.isNew.
    // A writer pin is not an update of the publication, so it never says "עודכן".
    updated: Boolean(item.sourceUpdate || pinKind === "owner"),
  };
}

const PIN_RANK = Object.freeze({ owner: 2, writer: 1 });
const pinRank = model => model.pinned ? PIN_RANK[model.pinKind] || PIN_RANK.owner : 0;
export const nowModels = (rows, now = Date.now()) => list(rows).filter(row => row?.id && row.title)
  .map(nowRowModel).map(model => model.pinned && model.pinUntil && !(now < Date.parse(model.pinUntil)) ? { ...model, pinned: false, pinKind: null, pinUntil: null, central: null, dot: null } : model)
  .sort((a, b) => (pinRank(b) - pinRank(a)) || (Date.parse(b.at || 0) - Date.parse(a.at || 0)) || String(a.id).localeCompare(String(b.id)));

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
    // A pinned row (a writer pin on a group arrival) is always its own row: folding it into a run would hide the pin.
    const runnable = model.unverified && !model.pinned;
    if (runnable && (!run.length || run[0].sourceName === model.sourceName)) { run.push(model); continue; }
    flush(run); run = [];
    if (runnable) run.push(model); else entries.push({ kind: "row", model });
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

// ── Or HaGeula box (ZURIEL 10.11.2026; widened 11.11.2026) ───────────────────────────────────────────────────────────────────
// Or HaGeula is a SECOND tier: every one of its updates lives in ONE box, so however many arrive they take a single entry and never push a
// first-tier publication (a reality-stream image, a Post, a series, the site's news) out of the window. The only update that stands outside is
// one the owner marked himself (channel_updates.priority above the default → item.ownerFeatured), e.g. a popular video; and a series-approved
// occurrence (item.seriesKey) keeps its series row. Popularity is NEVER inferred from views or shares. The box sits where its newest member sits;
// every member stays its own publication (same id, same order inside). Pure presentation over the loaded rows: one function for Now and Home.
export const RABBI_BOX_LABEL = "אור הגאולה";
export function isOrGeulaBoxModel(model) {
  const item = model?.item;
  return Boolean(model && item?.sourceKind === "channel_update" && item.channel === "or-geula" && !model.unverified && item.ownerFeatured !== true && !item.seriesKey);
}
/** @deprecated name kept for existing callers: the box now holds every Or HaGeula update except the owner's featured one. */
export const isRabbiBoxModel = isOrGeulaBoxModel;

/**
 * Entries of the window: { kind: "row", model } | { kind: "run", ... } (consecutive source rows) | { kind: "box", id, label, models, latest }.
 * Order = the order of `models` (newest first); a box sits where its newest member sits.
 */
export function buildNowEntries(models, { rabbiBox = true, sourceRuns = true } = {}) {
  const all = list(models), entries = [];
  const members = rabbiBox ? all.filter(isRabbiBoxModel) : [];
  let segment = [], boxPlaced = false;
  const flush = () => {
    if (sourceRuns) entries.push(...collapseSourceRuns(segment));
    else for (const model of segment) entries.push({ kind: "row", model });
    segment = [];
  };
  for (const model of all) {
    if (members.length && isRabbiBoxModel(model)) {
      if (boxPlaced) continue;
      flush(); boxPlaced = true;
      entries.push({ kind: "box", id: "box:or-geula-rabbi", label: RABBI_BOX_LABEL, models: members, latest: latestRunAt(members) });
    } else segment.push(model);
  }
  flush();
  return entries;
}

/**
 * The update-of-the-day band: carried by an owner-flagged feed item (`item.band` = { from, days, title, groups: [{ value, phrases, numberOnly }], statement }),
 * shown only while today's date (Asia/Jerusalem) is inside [from, from + days). Pure presentation: no reader, no calculation; outside the window
 * (or without a band, or without a valid group) it is null.
 */
export function nowTodayBand(models, now = Date.now(), timeZone = "Asia/Jerusalem") {
  const band = list(models).map(model => model?.item?.band).find(Boolean);
  if (!band || !Number.isInteger(band.days) || band.days < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(band.from || "")) return null;
  const groups = list(band.groups).filter(group => group && Number.isInteger(group.value) && list(group.phrases).length)
    .map(group => ({ value: group.value, phrases: list(group.phrases).map(String), numberOnly: list(group.numberOnly).map(String) }));
  if (!groups.length) return null;
  const dayIndex = key => { const [y, m, d] = key.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
  let today;
  try { today = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now); } catch { return null; }
  const offset = dayIndex(today) - dayIndex(band.from);
  return offset >= 0 && offset < band.days ? { title: String(band.title || ""), groups, statement: band.statement ? String(band.statement) : null } : null;
}

// ── Source picker (ZURIEL 11.11.2026; PLAN37 NOW decision) ────────────────────────────────────────────────────────────────────
// "הכול" first, then the known public groups (also when nothing of theirs is in the window: an honest empty state, never hidden), then
// channels, series and the site's own publications. Every choice says what KIND of source it is. Built from the loaded rows only.
export const NOW_SOURCE_KIND_LABEL = Object.freeze({ group: "קבוצה", channel: "ערוץ", series: "סדרה", site: "פרסומי האתר" });
const SITE_SOURCE_LABEL = Object.freeze({ "site:posts": "פרסומי האתר", "site:reality": "זרם המציאות", "site:els": "הצופן התנ״כי", "site:other": "עוד מהאתר" });
const KNOWN_GROUPS = Object.freeze(["torat-haremez", "ki-la-hamelucha-gematria"]);
const KIND_ORDER = Object.freeze(["group", "channel", "series", "site"]);

export function nowSourceChoices(models) {
  const found = new Map();
  for (const model of list(models)) {
    const key = model?.sourceKey;
    if (!key) continue;
    const kind = key.split(":")[0];
    const label = kind === "group" ? (model.groupLabel || GROUP_SOURCE_CHANNELS[key.slice(6)] || "קבוצת מקור")
      : kind === "series" ? (model.seriesLabel || key.slice(7)) : kind === "site" ? SITE_SOURCE_LABEL[key] : (model.sourceName || key.slice(8));
    const entry = found.get(key) || { id: key, kind, kindLabel: NOW_SOURCE_KIND_LABEL[kind], label, count: 0, logo: null };
    entry.count += 1; if (!entry.logo && model.logo) entry.logo = model.logo;
    found.set(key, entry);
  }
  for (const group of KNOWN_GROUPS) {
    const key = `group:${group}`;
    if (!found.has(key)) found.set(key, { id: key, kind: "group", kindLabel: NOW_SOURCE_KIND_LABEL.group, label: GROUP_SOURCE_CHANNELS[group], count: 0, logo: null });
  }
  const rank = entry => KIND_ORDER.indexOf(entry.kind) * 1000 + (entry.kind === "group" && KNOWN_GROUPS.includes(entry.id.slice(6)) ? KNOWN_GROUPS.indexOf(entry.id.slice(6)) : 100);
  return [...found.values()].sort((a, b) => rank(a) - rank(b) || b.count - a.count || a.label.localeCompare(b.label, "he"));
}

export const filterNowBySource = (models, sourceKey = "") => list(models).filter(model => !sourceKey || model.sourceKey === sourceKey);

/**
 * The pinned central message (System Frame v2 §10.8 addendum, 11.11.2026): the ONE pinned row that carries an owner message, while its pin
 * window is open (checked again here at render time, so an expired pin never stays on top). Null otherwise.
 */
export function nowPinnedMessage(models, now = Date.now()) {
  const model = list(models).find(item => item?.pinned && item.central);
  if (!model) return null;
  const until = Date.parse(model.pinUntil || "");
  if (!Number.isFinite(until) || now >= until) return null;
  return { model, central: model.central, until: model.pinUntil, href: model.href };
}

/** "עד 14.11 · 10:00" in Israel time: the visible expiry of a pin. */
export function nowPinUntilLabel(until, timeZone = "Asia/Jerusalem") {
  const time = Date.parse(until || "");
  if (!Number.isFinite(time)) return "";
  try {
    const parts = new Intl.DateTimeFormat("he-IL", { timeZone, day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(time);
    const part = type => parts.find(item => item.type === type)?.value || "";
    return `עד ${part("day")}.${part("month")} · ${part("hour")}:${part("minute")}`;
  } catch { return ""; }
}

/** The series page for a model (series key is the existing approved identity). */
export const nowSeriesHref = model => model?.seriesKey ? `/2029/posts?series=${encodeURIComponent(model.seriesKey)}` : null;

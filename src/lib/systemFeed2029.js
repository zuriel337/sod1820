// "What entered the system" rows, built from the EXISTING world discovery stream (worldDiscoveryStream.js):
// public source posts, source-group arrivals, approved convergences. Pure helpers, no network.
// Updates are chronological. Gold/Diamond is a distinct curated signal shown
// on a row; it must not conceal a newer, directly relevant source update.
// Time is shown as relative time (relative_time_display_law); "new" = recent and not yet seen on this browser.
import { isRecent, recentSource, recentConvergence } from "./homeMotion2029.js";
import { NUMBER_PAGE_BASE } from "./research/numberPageAddress.js";

const DAY = 86400000;

export function feedKindLabel(item) {
  if (item?.kind === "convergence") return "התכנסות";
  if (item?.kind === "finding") return "ממצא";
  if (item?.kind === "source") return item.sourceKind === "group_message" ? "מקור · טרם נבדק"
    : item.sourceKind === "channel_update" ? "עדכון ערוץ" : item.sourceKind === "gallery_update" ? "תמונה בזרם המציאות" : "פוסט";
  return "עדכון";
}

export function feedHref(item) {
  if (item?.kind === "source") return item.href || (item.sourceKind === "group_message" ? "/world#world-sources" : null);
  if (item?.kind === "convergence" && item.slug) return `/topic/${encodeURIComponent(item.slug)}`;
  if (item?.kind === "finding") return item.value != null ? `${NUMBER_PAGE_BASE}/${item.value}` : "/world";
  return null;
}

export function isNewItem(item, now = Date.now()) {
  if (item?.kind === "convergence") return recentConvergence(item.approvedAt || item.at, now);
  if (item?.kind === "source" && item.sourceKind !== "group_message") return isRecent(item.at, 2 * DAY, now);
  return recentSource(item?.arrivalAt || item?.at, now);
}

// A second meaningful revision of the same source fragment is NEW again.
export const feedSeenKey = (item) => `feed:${item?.sourceUpdate?.eventKey || item?.id}`;

/** Rows for the panel: newest authorized activity first, across fair source-type caps. */
export const FEED_CAPS = Object.freeze({ group: 4, post: 4, convergence: 3, finding: 1 });
export function feedRows(items = [], { now = Date.now(), seen = {}, strongIds = {}, limit = 8, caps = FEED_CAPS } = {}) {
  const rows = (Array.isArray(items) ? items : []).filter((item) => item && item.id && item.label).map((item, index) => ({
    id: item.id, item, index, kind: item.kind,
    typeLabel: item.sourceUpdate ? "פוסט · עדכון מקור" : feedKindLabel(item),
    title: item.sourceUpdate?.label || item.label,
    sourceTitle: item.sourceUpdate ? item.label : null,
    at: item.at || null,
    href: feedHref(item),
    sourceUpdate: item.sourceUpdate || null,
    strong: Boolean(strongIds[item.id]),
    isNew: isNewItem(item, now) && !seen[feedSeenKey(item)],
  }));
  // One kind must not drown the others (source-group messages arrive in bursts): cap each bucket by newest first.
  // An item with an approved series identity is bucketed by series, so a series is represented even when the shared recent window is full.
  const bucket = (row) => row.item?.seriesKey ? `series:${row.item.seriesKey}` : (row.kind === "source" ? (row.item.sourceKind === "group_message" ? "group" : row.item.sourceKind === "channel_update" ? `channel:${row.item.channel}` : row.item.sourceKind === "gallery_update" ? "gallery" : "post") : row.kind);
  // A pinned item (the owner's pin, or a writer pin while its pinUntil is ahead) is never dropped by a bucket cap or the limit:
  // it takes its place first and the other rows fill what is left. The output order stays chronological.
  // A writer holds ONE pin at a time — his newest arrival in the pin window. His older arrivals stay regular rows (under the same caps)
  // and are shown without a pin, so a burst of messages never fills "עכשיו" with pins.
  const taken = {};
  const newestFirst = [...rows].sort((a, b) => (Date.parse(b.at || 0) - Date.parse(a.at || 0)) || a.index - b.index);
  const writers = new Set();
  const held = new Set(newestFirst.filter((row) => {
    if (row.item?.pinned !== true || (row.item.pinUntil && !(now < Date.parse(row.item.pinUntil)))) return false;
    if (row.item.pinKind !== "writer") return true;
    const writer = String(row.item.creatorSlug || "");
    if (!writer || writers.has(writer)) return false;
    writers.add(writer);
    return true;
  }));
  const pinned = (row) => held.has(row);
  const kept = newestFirst.filter((row) => {
    if (pinned(row)) return true;
    const key = bucket(row); taken[key] = (taken[key] || 0) + 1;
    return taken[key] <= (caps[key] ?? (key.startsWith("series:") ? 12 : 2));
  });
  kept.sort((a, b) => (Date.parse(b.at || 0) - Date.parse(a.at || 0)) || a.index - b.index);
  const pins = kept.filter(pinned);
  const chosen = pins.length ? new Set([...pins.slice(0, limit), ...kept.filter((row) => !pinned(row)).slice(0, Math.max(0, limit - pins.length))]) : null;
  const out = chosen ? kept.filter((row) => chosen.has(row)) : kept.slice(0, limit);
  // A writer pin that is not held (an older arrival of the same writer, or a window that ended) leaves the row as a regular one.
  return out.map((row) => row.item?.pinKind === "writer" && row.item.pinned === true && !pinned(row)
    ? { ...row, item: { ...row.item, pinned: false, pinKind: null, pinUntil: null } } : row);
}

// Dedupe actual source occurrences, never a number, wording or inferred topic.
// A grouped source retains all its occurrences when its raw channel row also arrives.
export function mergeSystemFeedItems(items = [], additional = []) {
  const seen = new Set(), ids = new Set(), out = [];
  for (const item of [...items, ...additional]) {
    if (!item?.id || ids.has(item.id)) continue;
    const refs = item.sourceRefs?.length ? item.sourceRefs : item.sourceRef ? [item.sourceRef] : [item.id];
    if (refs.every(ref => seen.has(ref))) continue;
    out.push(item);ids.add(item.id);refs.forEach(ref => seen.add(ref));
  }
  return out;
}

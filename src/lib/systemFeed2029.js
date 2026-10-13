// "What entered the system" rows, built from the EXISTING world discovery stream (worldDiscoveryStream.js):
// public source posts, source-group arrivals, approved convergences. Pure helpers, no network.
// Updates are chronological. Gold/Diamond is a distinct curated signal shown
// on a row; it must not conceal a newer, directly relevant source update.
// Time is shown as relative time (relative_time_display_law); "new" = recent and not yet seen on this browser.
import { isRecent, recentSource, recentConvergence } from "./homeMotion2029.js";

const DAY = 86400000;

export function feedKindLabel(item) {
  if (item?.kind === "convergence") return "התכנסות";
  if (item?.kind === "finding") return "ממצא";
  if (item?.kind === "source") return item.sourceKind === "group_message" ? "מקור · טרם נבדק" : "פוסט";
  return "עדכון";
}

export function feedHref(item) {
  if (item?.kind === "source") return item.href || (item.sourceKind === "group_message" ? "/world#world-sources" : null);
  if (item?.kind === "convergence" && item.slug) return `/topic/${encodeURIComponent(item.slug)}`;
  if (item?.kind === "finding") return item.value != null ? `/2029/number/${item.value}` : "/world";
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
  const bucket = (row) => (row.kind === "source" ? (row.item.sourceKind === "group_message" ? "group" : "post") : row.kind);
  const taken = {};
  const newestFirst = [...rows].sort((a, b) => (Date.parse(b.at || 0) - Date.parse(a.at || 0)) || a.index - b.index);
  const kept = newestFirst.filter((row) => {
    const key = bucket(row); taken[key] = (taken[key] || 0) + 1;
    return taken[key] <= (caps[key] ?? 2);
  });
  kept.sort((a, b) => (Date.parse(b.at || 0) - Date.parse(a.at || 0)) || a.index - b.index);
  return kept.slice(0, limit);
}

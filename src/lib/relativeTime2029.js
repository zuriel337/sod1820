// Record-time display rule (ZURIEL, 15.8.2026, narrowed 11.10.2026): relative time ("לפני X") is used only on the
// Home and the World surfaces. Everywhere else (archive, posts, researcher and the other surfaces) a time of record is
// shown as the Hebrew and the Gregorian date together, like the timeline ("כ״ו בסיוון · 22.06.2026").
// Event/content dates (when something happened in the world) are data and keep the bilingual date everywhere.
import { timeAgoHe } from "./format.js";
import { formatBilingualDate } from "./research/timeline2029.js";

/** Home and World only. "לפני 3 ימים" / "אתמול" / "לפני שעה". Missing or invalid input returns `missing` (never a date). */
export function relativeTimeLabel(value, missing = "") {
  if (!value) return missing;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return missing;
  return timeAgoHe(value);
}

/** Everywhere outside Home and World: Hebrew and Gregorian date together. Missing or invalid input returns `missing`. */
export function bilingualDateLabel(value, missing = "") {
  const date = formatBilingualDate(value);
  return date ? `${date.hebrew} · ${date.gregorian}` : missing;
}

/** One entry point for shared components: mode "relative" (Home/World) or "bilingual" (all other surfaces). */
export function recordTimeLabel(value, mode = "relative", missing = "") {
  return mode === "bilingual" ? bilingualDateLabel(value, missing) : relativeTimeLabel(value, missing);
}

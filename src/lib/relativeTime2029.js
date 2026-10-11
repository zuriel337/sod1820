// Standing site rule (ZURIEL, 15.8.2026): everywhere a time of record is shown (published, updated, arrived,
// approved, added), show how long ago ("לפני X") instead of a calendar date, with no fall-back to a date.
// Event/content dates (when something happened in the world) are data, not record times, and stay as dates.
// Exact dates may still be used for SEO/schema/archive via formatDateHe in src/lib/format.js.
import { timeAgoHe } from "./format.js";

/** "לפני 3 ימים" / "אתמול" / "לפני שעה". Missing or invalid input returns `missing` (never a date). */
export function relativeTimeLabel(value, missing = "") {
  if (!value) return missing;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return missing;
  return timeAgoHe(value);
}

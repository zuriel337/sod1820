import { timeAgoHe } from "../format.js";

const fullDate = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const DAY = 24 * 60 * 60 * 1000;

// ZURIEL 4.11.2026: Community messages may show relative time for their first
// 24 hours. Use the original creation time, never import/update/edited time.
// The shared Home/World date policy and activity-date override stay unchanged.
export function communityMessageTime(value, formatDate) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return null;
  const full = fullDate.format(new Date(timestamp));
  const age = Date.now() - timestamp;
  const relative = !formatDate && age >= 0 && age < DAY;
  const label = formatDate ? formatDate(value) : relative ? timeAgoHe(value) : full;
  return { label, full, accessible: relative ? `${label} · ${full}` : label };
}

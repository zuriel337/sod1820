import { timeAgoHe } from "../format.js";

const fullDate = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });
const localDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jerusalem" });
const DAY = 24 * 60 * 60 * 1000;

function dateBucket(value) {
  const fields = Object.fromEntries(localDay.formatToParts(value)
    .filter(part => ["year", "month", "day"].includes(part.type)).map(part => [part.type, Number(part.value)]));
  return Date.UTC(fields.year, fields.month - 1, fields.day) / DAY;
}

// Community chat: make recent chronology human-readable by Israel calendar
// dates, not by rounding elapsed 24-hour periods across midnight or DST.
// Preserve the exact original created_at as the accessible/title timestamp.
export function communityMessageTime(value, formatDate) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return null;
  const full = fullDate.format(new Date(timestamp));
  if (formatDate) {
    const label = formatDate(value);
    return { label, full, accessible: label };
  }
  const now = Date.now();
  if (timestamp > now) return { label: full, full, accessible: full };
  const days = dateBucket(new Date(now)) - dateBucket(new Date(timestamp));
  let label;
  if (days === 0) label = timeAgoHe(value);
  else if (days === 1) label = "אתמול";
  else if (days === 2) label = "שלשום";
  else if (days >= 3 && days <= 6) label = `לפני ${days} ימים`;
  else if (days >= 7 && days <= 13) label = "לפני שבוע";
  else label = full;
  return { label, full, accessible: label === full ? full : `${label} · ${full}` };
}

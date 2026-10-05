// Shared public Timeline (ציר הזמן) model for Post and Number surfaces.
// Pure helpers only: ordering, bilingual dates, current-position, public source labels.
// Reality time (occurred) and knowledge time (published/discovered/admitted) stay distinct roles.

import { decodePublicEntities } from "../presentation/contentTitle.js";

export const TIMELINE_PUBLIC_LABEL = "ציר הזמן";
export const TIMELINE_CURRENT_LABEL = "אתה נמצא כאן";

export const TIMELINE_ROLE_LABEL = Object.freeze({
  occurred: "קרה",
  published: "פורסם",
  discovered: "נמצא",
  admitted: "נוסף למחקר",
});

// Internal/system labels that must never reach a public reader.
const INTERNAL_SOURCE_LABELS = new Set(["POST", "SOD1820", "SYSTEM", "DB", "SUPABASE"]);

const hebrewFormatter = new Intl.DateTimeFormat("he-u-ca-hebrew", {
  day: "numeric", month: "long", timeZone: "UTC",
});

const HEBREW_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const HEBREW_TENS = ["", "י", "כ", "ל"];

/** Hebrew day-of-month numeral (1-30): 26 -> כ״ו, 15 -> ט״ו, 30 -> ל׳. */
export function hebrewDayNumeral(day) {
  const n = Number(day);
  if (!Number.isInteger(n) || n < 1 || n > 30) return String(day);
  const letters = n === 15 ? "טו" : n === 16 ? "טז" : `${HEBREW_TENS[Math.floor(n / 10)]}${HEBREW_ONES[n % 10]}`;
  return letters.length === 1 ? `${letters}׳` : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const date = m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** DD.MM.YYYY (Gregorian, UTC calendar day). */
export function formatGregorianDate(value) {
  const d = parseDate(value);
  if (!d) return null;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

export function formatHebrewDate(value) {
  const d = parseDate(value);
  if (!d) return null;
  const date = d.getUTCHours() === 12 && /^\d{4}-\d{2}-\d{2}/.test(String(value))
    ? d
    : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
  return hebrewFormatter.format(date).replace(/^\d+/, (day) => hebrewDayNumeral(day));
}

/** Hebrew + Gregorian together. Missing/invalid dates return null (never a half-date). */
export function formatBilingualDate(value) {
  const hebrew = formatHebrewDate(value);
  const gregorian = formatGregorianDate(value);
  return hebrew && gregorian ? { hebrew, gregorian, iso: String(value) } : null;
}

export function publicSourceLabel(label) {
  const text = String(label ?? "").trim();
  if (!text || INTERNAL_SOURCE_LABELS.has(text.toUpperCase())) return null;
  return decodePublicEntities(text).replace(/\s*\/\s*/g, " · ");
}

/** Newest first; stable for equal dates. */
export function sortTimelineNewestFirst(items = []) {
  return items
    .map((item, index) => ({ item, index, time: parseDate(item?.date ?? item?.at)?.getTime() ?? -Infinity }))
    .sort((a, b) => (b.time - a.time) || (a.index - b.index))
    .map(({ item }) => item);
}

export function buildPublicTimeline(items = [], { currentId = null, currentHref = null } = {}) {
  return sortTimelineNewestFirst(items).map((item) => {
    const date = item.date ?? item.at;
    const isCurrent = item.current === true
      || (currentId != null && item.id === currentId)
      || (currentHref != null && item.href != null && item.href === currentHref);
    return {
      ...item,
      date,
      dates: formatBilingualDate(date),
      roleLabel: TIMELINE_ROLE_LABEL[item.temporalRole] || null,
      sourceLabel: publicSourceLabel(item.sourceLabel),
      isCurrent,
    };
  });
}

// Raw research plumbing that must not surface as a public Number-timeline title.
const TECHNICAL_TITLE_RE = /(?:research[-_ ]?object|candidate|FAMILY\s*\/\s*SYSTEM[-_ ]?METHOD|SYSTEM[-_ ]?METHOD|engine[-_ ]?facts?)/i;

/** Public title for a Number timeline row: drops technical tokens, never returns raw plumbing. */
export function normalizeNumberTimelineTitle(title, fallback = "פריט במחקר") {
  const text = decodePublicEntities(title).replace(/\s+/g, " ").trim();
  if (!text || TECHNICAL_TITLE_RE.test(text) || /^[a-z0-9_.:\-/]+$/i.test(text) && /[_:/]/.test(text)) return fallback;
  return text;
}

/** Number surface projection: discovery rows -> shared timeline rows (role: admitted). */
export function numberTimelineToRows(rows = [], resolveTitle = (row) => row?.label, { currentHref = null } = {}) {
  return buildPublicTimeline(
    rows
      .filter((row) => row && row.at)
      .map((row, index) => ({
        id: row.id || `timeline-${index}`,
        label: normalizeNumberTimelineTitle(resolveTitle(row)),
        date: row.at,
        temporalRole: "admitted",
        href: row.href || null,
        note: null,
        source: row,
      })),
    { currentHref },
  );
}

export const TIMELINE_PAGE_SIZE = 8;

/** Initial 8 rows, then +8 per step, bounded by the available rows. */
export function timelineVisibleCount(total, steps = 0, pageSize = TIMELINE_PAGE_SIZE) {
  const size = Math.max(1, Number(pageSize) || TIMELINE_PAGE_SIZE);
  return Math.min(Math.max(0, Number(total) || 0), size * (1 + Math.max(0, Number(steps) || 0)));
}

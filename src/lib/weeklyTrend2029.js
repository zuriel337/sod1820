// A week against the week before (ZURIEL 25.11.2026: "מגמה שבועית עם אחוזים"). Pure functions, no network, no new reader.
// - A percentage is drawn only when the earlier number is big enough to mean something (a jump from 1 to 2 is not "+100%"); otherwise the two numbers
//   are shown as they are.
// - Behaviour counts (computations, searches, saves) are EVENTS, never people, and are shown only when both weeks are at or above the privacy floor
//   the server already applies (10 events). Public content counts (posts, messages, codes, contributions) are not behaviour and have no floor.
// - The earlier weeks are never invented. The reader (research_pulse_2029) serves only 24h, 168h and 720h windows (any other value is clamped to 24h), so
//   the comparison basis is the AVERAGE WEEK of the time before this week: (the 720h value minus the 168h value) divided by the number of weeks that
//   span is. It is labelled as such. The Home line compares with the exact week before through two head counts of the same public tables.
export const TREND_MIN_EARLIER = 5;
export const BEHAVIOUR_FLOOR = 10;

const whole = n => Number.isSafeInteger(n) && n >= 0;

export function weeklyTrend(recent, earlier, { minEarlier = TREND_MIN_EARLIER } = {}) {
  if (!whole(recent) || !whole(earlier) || (recent === 0 && earlier === 0)) return null;
  const diff = recent - earlier;
  return { recent, earlier, dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat", pct: earlier >= minEarlier ? Math.round(diff / earlier * 100) : null };
}

export const trendArrow = dir => dir === "up" ? "↑" : dir === "down" ? "↓" : "→";

/** "↑ 25%", "↓ 10%", "ללא שינוי", or, when the earlier week is too small for a percentage, "↑ 3 מול 1". */
export function trendText(t, format = n => n.toLocaleString("he-IL")) {
  if (!t) return "";
  if (t.dir === "flat") return "ללא שינוי";
  return t.pct != null ? `${trendArrow(t.dir)} ${format(Math.abs(t.pct))}%` : `${trendArrow(t.dir)} ${format(t.recent)} מול ${format(t.earlier)}`;
}

const activityValue = (d, matches) => (Array.isArray(d?.activity) ? d.activity : []).filter(matches).reduce((sum, item) => whole(item?.events) ? sum + item.events : sum, 0);

/** Behaviour trends: this week (168h payload) against the average week before it (720h minus 168h). Null parts are left out, never drawn as zero. */
export const BEHAVIOUR_TRENDS = Object.freeze([
  { key: "compute", label: "חישובי גימטריה", matches: item => item?.surface === "activity_2029" && item.event_type === "compute", href: "/gematria" },
  { key: "els", label: "חיפושי צופן", matches: item => item?.surface === "els" && (item.event_type === "search" || item.event_type === "cross_search"), href: "/code" },
  { key: "search", label: "חיפושים באתר", matches: item => item?.surface === "activity_2029" && item.event_type === "search" },
  { key: "save", label: "שמירות למחקר האישי", matches: item => item?.surface === "activity_2029" && item.event_type === "save" },
]);

// The number of weeks in the span between the end of the shorter window's start and the longer window's start: (720 - 168) / 168 = 3.29.
export const priorWeeks = (dShort, dLong) => {
  const span = Number(dLong?.hours) - Number(dShort?.hours);
  return span > 0 && Number(dShort?.hours) > 0 ? span / Number(dShort.hours) : null;
};

export function behaviourTrends(d168, d336) {
  if (!d168 || !d336 || d168.version !== 1 || d336.version !== 1) return [];
  const weeks = priorWeeks(d168, d336);
  if (!weeks) return [];
  const floor = whole(d168.threshold?.events) && d168.threshold.events > 0 ? d168.threshold.events : BEHAVIOUR_FLOOR;
  const out = [];
  for (const spec of BEHAVIOUR_TRENDS) {
    const recent = activityValue(d168, spec.matches), total = activityValue(d336, spec.matches), prior = total - recent;
    const earlier = Math.round(prior / weeks);
    if (recent < floor || prior < floor || !(earlier >= floor)) continue;
    out.push({ key: spec.key, label: spec.label, href: spec.href || null, basis: "average", ...weeklyTrend(recent, earlier, { minEarlier: floor }) });
  }
  return out;
}

const HALF_LABEL = Object.freeze({ compute: "חישובי גימטריה", search: "חיפושים באתר", save: "שמירות למחקר האישי" });

/** The server's own halves of the 168h window (the later half against the earlier half, event types of the 2029 activity surface): the comparison the
 *  site can make today, while the measurement is younger than two weeks. Same floor; labelled as halves of the week. */
export function halfWeekTrends(d168) {
  if (!d168 || d168.version !== 1) return [];
  const floor = whole(d168.threshold?.events) && d168.threshold.events > 0 ? d168.threshold.events : BEHAVIOUR_FLOOR;
  const out = [];
  for (const item of Array.isArray(d168.trend) ? d168.trend : []) {
    if (item?.surface !== "activity_2029" || !HALF_LABEL[item.event_type] || !whole(item.recent) || !whole(item.earlier)) continue;
    if (item.recent < floor || item.earlier < floor) continue;
    out.push({ key: item.event_type, label: HALF_LABEL[item.event_type], href: item.event_type === "compute" ? "/gematria" : null, basis: "halves", ...weeklyTrend(item.recent, item.earlier, { minEarlier: floor }) });
  }
  return out;
}

export const ADDED_FIELDS = Object.freeze([
  { key: "posts", label: "פוסטים חדשים", href: "/post" },
  { key: "community_messages", label: "הודעות בקהילה", href: "/community/chat" },
  { key: "contributions", label: "תרומות מחקר שאושרו" },
  { key: "codes", label: "צפנים חדשים", href: "/codes" },
]);

/** Content added this week against the week before (the same 168h/336h difference). Only fields that exist in both payloads. */
export function addedTrends(d168, d336) {
  const weeks = priorWeeks(d168, d336);
  if (!d168?.added || !d336?.added || !weeks) return {};
  const out = {};
  for (const { key } of ADDED_FIELDS) {
    const recent = d168.added[key], total = d336.added[key];
    if (!whole(recent) || !whole(total) || total < recent) continue;
    const t = weeklyTrend(recent, Math.round((total - recent) / weeks));
    if (t) out[key] = { basis: "average", ...t };
  }
  return out;
}

// Command intent resolver · DATE intent resolves BEFORE number/phrase fallback.
// Pure helpers only: no Date Engine, no store, no graph, no identity creation.
// Type distinctions are explicit: Date != Event != Expression != Number.

export const COMMAND_INTENT = Object.freeze({ DATE: "date", NUMBER: "number", PHRASE: "phrase" });
export const DATE_SOURCE_CAP = 7; // bounded outward connections

const MONTHS_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const DAY_WORDS_HE = [
  "", "ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שביעי", "שמיני", "תשיעי", "עשירי",
  "אחד עשר", "שנים עשר", "שלושה עשר", "ארבעה עשר", "חמישה עשר", "שישה עשר", "שבעה עשר", "שמונה עשר", "תשעה עשר",
  "עשרים", "עשרים ואחד", "עשרים ושניים", "עשרים ושלושה", "עשרים וארבעה", "עשרים וחמישה", "עשרים ושישה",
  "עשרים ושבעה", "עשרים ושמונה", "עשרים ותשעה", "שלושים", "שלושים ואחד",
];

// Curated hub POINTERS (routing hints only, never identity/truth). Applied only when the post is found.
export const DATE_HUB_POINTERS = Object.freeze({ "7.10": Object.freeze({ postId: 233, label: "מרכז נבחר" }) });

function daysIn(month, year) {
  if (month === 2) return year == null ? 29 : (new Date(Date.UTC(year, 2, 0)).getUTCDate());
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
const pad = (n) => String(n).padStart(2, "0");

/** Classify a command string. Returns { intent, ... }; date forms are D.M, D/M, D.M.YYYY, D/M/YYYY, YYYY-MM-DD. */
export function classifyCommandQuery(raw) {
  const text = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) return { intent: null, text };
  let m;
  let day = null, month = null, year = null;
  if ((m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { year = +m[1]; month = +m[2]; day = +m[3]; }
  else if ((m = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) { day = +m[1]; month = +m[2]; year = +m[3]; }
  else if ((m = text.match(/^(\d{1,2})[./](\d{1,2})$/))) { day = +m[1]; month = +m[2]; }
  if (day != null && month >= 1 && month <= 12 && day >= 1 && day <= daysIn(month, year)) {
    const key = `${day}.${month}`;
    return {
      intent: COMMAND_INTENT.DATE,
      kind: year == null ? "day_month" : "full_date",
      text, day, month, year, key,
      iso: year == null ? null : `${year}-${pad(month)}-${pad(day)}`,
    };
  }
  if (/^\d+$/.test(text)) return { intent: COMMAND_INTENT.NUMBER, text };
  return { intent: COMMAND_INTENT.PHRASE, text };
}

/** Human date phrase as an Expression CANDIDATE (not a Number, not an Event). */
export function humanDatePhrase(day, month) {
  if (!DAY_WORDS_HE[day] || !MONTHS_HE[month - 1]) return null;
  return `${DAY_WORDS_HE[day]} ב${MONTHS_HE[month - 1]}`;
}

/**
 * Expression candidates for a date. The phrase carries NO method/result: the canonical
 * engine (NumberDrawer) must compute it. Hebrew calendar date only when a source supplies it.
 */
export function buildDateRepresentations(date, { locale = "he", sourcedHebrewDates = [] } = {}) {
  const out = [];
  if (!date) return out;
  if (/^he/i.test(locale || "he")) {
    const phrase = humanDatePhrase(date.day, date.month);
    if (phrase) out.push({ id: `date-phrase:${date.key}`, kind: "human_date_phrase", type: "expression", expression: phrase, label: phrase, actionLabel: "חשב את התאריך כמילים", source: "date-representation" });
  }
  for (const h of [...new Set(sourcedHebrewDates.filter(Boolean))].slice(0, 2)) {
    out.push({ id: `hebrew-date:${h}`, kind: "hebrew_date", type: "expression", expression: h, label: h, actionLabel: "חשב את התאריך העברי", source: "sourced-hebrew-date" });
  }
  return out;
}

/** Expression candidate -> target object for the existing NumberDrawer flow (no method/result fields). */
export function expressionToNumberTarget(rep) {
  if (!rep?.expression) return null;
  return { id: rep.expression, type: "phrase", label: rep.expression, locator: null, href: null, source: rep.source || "date-representation" };
}

/** Published At != Occurred At. Never trusts an auto-derived occurred_at. */
export function assessTemporal({ publishedAt = null, occurredAt = null, occurredSource = null } = {}) {
  const day = (v) => (v ? String(v).slice(0, 10) : null);
  const pub = day(publishedAt), occ = day(occurredAt);
  let uncertain = false, reason = null;
  if (!occ) { uncertain = true; reason = "אין תאריך התרחשות מתועד"; }
  else if (/auto/i.test(String(occurredSource || ""))) { uncertain = true; reason = "תאריך ההתרחשות נגזר אוטומטית מהפוסט ולא אומת"; }
  else if (pub && pub === occ && !occurredSource) { uncertain = true; reason = "תאריך ההתרחשות זהה לתאריך הפרסום ללא מקור"; }
  return { publishedAt: pub, occurredAt: occ, differ: Boolean(pub && occ && pub !== occ), uncertain, reason };
}

/** Build the bounded DateContext projection from existing-source rows. Read-only; mints nothing. */
export function buildDateContextProjection(date, { axisHits = [], posts = [], locale = "he" } = {}) {
  if (!date || date.intent !== COMMAND_INTENT.DATE) return null;
  const matchesDate = (iso) => Boolean(iso) && (date.iso ? iso === date.iso : (+iso.slice(5, 7) === date.month && +iso.slice(8, 10) === date.day));
  const events = axisHits.filter((h) => matchesDate(h.occurred_at)).map((h) => ({
    type: "event_candidate", source: h.source, id: h.id, label: h.label, hebrewDate: h.hebrew_date || null,
    temporal: assessTemporal({ occurredAt: h.occurred_at, occurredSource: h.occurred_at_source }),
    identity: "candidate_only",
  }));
  const hub = DATE_HUB_POINTERS[date.key];
  const postRows = posts.map((p) => ({
    type: "post", id: p.id, slug: p.slug || null, title: p.title,
    curatedHub: Boolean(hub && Number(p.id) === hub.postId), hubLabel: hub && Number(p.id) === hub.postId ? hub.label : null,
    temporal: assessTemporal({ publishedAt: p.date, occurredAt: null }),
  })).sort((a, b) => Number(b.curatedHub) - Number(a.curatedHub));
  const hebrewDates = [...new Set(events.map((e) => e.hebrewDate).filter(Boolean))];
  const representations = buildDateRepresentations(date, { locale, sourcedHebrewDates: hebrewDates });
  const connections = [...events.map((e) => ({ type: "event_candidate", id: e.id, label: e.label })), ...postRows.map((p) => ({ type: "post", id: p.id, label: p.title }))].slice(0, DATE_SOURCE_CAP);
  return {
    type: "date_context",
    header: { key: date.key, kind: date.kind, label: date.kind === "full_date" ? date.iso : `${date.day}.${date.month}`, note: date.kind === "day_month" ? "עדשת תאריך על פני שנים — לא מספר ולא אירוע" : "תאריך מלא — לא מספר ולא אירוע" },
    events, hebrewDates, representations, posts: postRows.slice(0, DATE_SOURCE_CAP), connections,
    dimensions: [
      { id: "events", label: "אירועים מועמדים", value: events.length },
      { id: "posts", label: "פוסטים קשורים", value: postRows.length },
      { id: "hebrew", label: "ייצוגי תאריך עברי מקוריים", value: hebrewDates.length },
    ],
    mintsIdentity: false,
  };
}

/** Existing sources only (injected for tests): checkAxisData + searchPosts. */
export async function fetchDateContext(date, { checkAxisData, searchPosts, locale = "he", nowYear = new Date().getUTCFullYear() } = {}) {
  if (!date || date.intent !== COMMAND_INTENT.DATE) return null;
  const years = date.year != null ? [date.year] : Array.from({ length: nowYear - 1999 }, (_, i) => 2000 + i);
  const isoDates = years.map((y) => `${y}-${pad(date.month)}-${pad(date.day)}`);
  const queries = [`${date.day}.${date.month}`, `${date.day}/${date.month}`, humanDatePhrase(date.day, date.month), `${date.day} ב${MONTHS_HE[date.month - 1]}`].filter(Boolean);
  const [axis, ...lists] = await Promise.all([
    Promise.resolve(checkAxisData?.({ years, isoDates })).catch(() => null),
    ...queries.map((q) => Promise.resolve(searchPosts?.(q, { limit: 12 })).catch(() => [])),
  ]);
  const seen = new Set();
  const posts = lists.flat().filter((p) => p && !seen.has(p.id) && seen.add(p.id));
  return buildDateContextProjection(date, { axisHits: axis?.all || [], posts, locale });
}

/** Route a command: DATE first, otherwise the unchanged number/phrase flow. */
export function resolveCommandRoute(raw) {
  const c = classifyCommandQuery(raw);
  if (!c.intent || c.text.length > 120) return null;
  if (c.intent === COMMAND_INTENT.DATE) {
    return { capability: "date", target: { id: c.key + (c.year ? `.${c.year}` : ""), type: "date", label: c.text, locator: null, href: null, source: "selection", dateQuery: c }, classification: c };
  }
  const numeric = c.intent === COMMAND_INTENT.NUMBER;
  return { capability: "number", target: { id: numeric ? String(Number(c.text)) : c.text, type: numeric ? "number" : "phrase", label: c.text, locator: null, href: null, source: "selection" }, classification: c };
}

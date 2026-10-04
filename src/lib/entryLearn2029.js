import { emit } from "./events.js";

// SOD1820 2029 — Entry Orientation + Contextual Learn projection.
// Presentation/learning state only. No truth, research state, graph state, router or course store.

export const ENTRY_LEARN_SURFACE = "entry_2029";

export const ENTRY_ARRIVAL = Object.freeze({
  DIRECT: "direct",
  INTERNAL: "internal",
  EXACT_RETURN: "exact_return",
  UNKNOWN: "unknown",
});

export const LEARN_SCOPE = Object.freeze({
  SURFACE: "surface",
  CONCEPT: "concept",
  GUIDED: "guided",
  COURSE: "course",
});

export const LEARN_LAYER = Object.freeze({
  SEE: "see",
  TRY: "try",
  EXPLAIN: "explain",
  VERIFY_CONNECT: "verify_connect",
  EXPLORE: "explore",
});

export const ENTRY_LEARN_EVENTS = Object.freeze([
  "orientation_shown",
  "orientation_expanded",
  "orientation_dismissed",
  "learn_opened",
  "learn_layer",
  "example_tried",
  "method_tried",
  "first_action",
  "next_step",
  "exact_return",
  "continued_to_research",
  "learn_step_completed",
]);

const EVENT_SET = new Set(ENTRY_LEARN_EVENTS);
const SURFACE_SET = new Set([
  "home", "post", "number", "topic", "world", "books", "journey", "els", "heichal",
]);
const CONCEPT_SET = new Set([
  "anchor", "method", "finding", "relation", "verification", "evidence",
  "convergence", "interpretation", "milui", "mistater", "kadmi", "els", "journey",
]);
const CONCEPT_STAGE_SET = new Set(["seen", "tried", "complete"]);
const SURFACE_STATE_SET = new Set(["dismissed", "complete"]);
const AVAILABILITY_SET = new Set(["OPEN", "BUILDING", "LATER", "GATED"]);
const STORAGE_KEY = "sod_entry_learn_2029_v1";
const SESSION_KEY = "sod_entry_learn_2029_session_v1";
const MAX_SURFACES = 16;
const MAX_CONCEPTS = 32;

function cleanToken(value, max = 80) {
  if (value == null) return null;
  const text = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return text ? text.slice(0, max) : null;
}

function cleanSurface(value) {
  const key = cleanToken(value);
  return SURFACE_SET.has(key) ? key : null;
}

function cleanConcept(value) {
  const key = cleanToken(value);
  return CONCEPT_SET.has(key) ? key : null;
}

function defaultState() {
  return { version: 1, surfaces: {}, concepts: {} };
}

function sanitizeState(raw) {
  const next = defaultState();
  if (!raw || typeof raw !== "object") return next;

  const surfaces = Object.entries(raw.surfaces || {})
    .filter(([key, value]) => SURFACE_SET.has(key) && SURFACE_STATE_SET.has(value?.state))
    .sort((a, b) => Number(b[1]?.at || 0) - Number(a[1]?.at || 0))
    .slice(0, MAX_SURFACES);
  for (const [key, value] of surfaces) {
    next.surfaces[key] = {
      v: Number.isSafeInteger(Number(value?.v)) ? Number(value.v) : 1,
      state: value.state,
      at: Number(value?.at || 0) || 0,
    };
  }

  const concepts = Object.entries(raw.concepts || {})
    .filter(([key, value]) => CONCEPT_SET.has(key) && CONCEPT_STAGE_SET.has(value?.stage))
    .sort((a, b) => Number(b[1]?.at || 0) - Number(a[1]?.at || 0))
    .slice(0, MAX_CONCEPTS);
  for (const [key, value] of concepts) {
    next.concepts[key] = {
      v: Number.isSafeInteger(Number(value?.v)) ? Number(value.v) : 1,
      stage: value.stage,
      at: Number(value?.at || 0) || 0,
    };
  }
  return next;
}

export function readEntryLearnState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultState();
  }
}

function writeEntryLearnState(state) {
  const safe = sanitizeState(state);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); } catch { /* presentation state only */ }
  return safe;
}

export function getSurfaceFamiliarity(surface) {
  const key = cleanSurface(surface);
  if (!key) return null;
  return readEntryLearnState().surfaces[key] || null;
}

export function markSurfaceFamiliarity(surface, state = "complete", version = 1) {
  const key = cleanSurface(surface);
  if (!key || !SURFACE_STATE_SET.has(state)) return null;
  const current = readEntryLearnState();
  current.surfaces[key] = { v: Number(version) || 1, state, at: Date.now() };
  return writeEntryLearnState(current).surfaces[key] || null;
}

export function getConceptFamiliarity(conceptKey) {
  const key = cleanConcept(conceptKey);
  if (!key) return null;
  return readEntryLearnState().concepts[key] || null;
}

export function markConceptFamiliarity(conceptKey, stage = "seen", version = 1) {
  const key = cleanConcept(conceptKey);
  if (!key || !CONCEPT_STAGE_SET.has(stage)) return null;
  const current = readEntryLearnState();
  current.concepts[key] = { v: Number(version) || 1, stage, at: Date.now() };
  return writeEntryLearnState(current).concepts[key] || null;
}

export const ENTRY_ORIENTATION_MANIFESTS = Object.freeze({
  home: Object.freeze({
    version: 1,
    label: "חדש כאן? בוא נראה חיבור אחד",
    body: "אפשר להתחיל מחיבור אמיתי, לנסות פעולה אחת, ואז להמשיך לחקור. לא צריך ללמוד קודם את כל SOD1820.",
    firstAction: "command",
  }),
  post: Object.freeze({
    version: 1,
    label: "חדש כאן? מה עושים בפוסט הזה?",
    body: "זהו פוסט שמציג חיבורים וממצאים. מספרים וביטויים הם נקודות כניסה לבדיקה, בלי לאבד את הסיפור או את הדרך חזרה.",
    firstAction: "inspect",
  }),
  number: Object.freeze({
    version: 1,
    label: "מה אני רואה בדף המספר?",
    body: "דף המספר מרכז ביטויים, שיטות, מקורות וחיבורים סביב עוגן מספרי. עצם ההופעה כאן אינה אומרת שכל החיבורים שווים במשמעות.",
    firstAction: "inspect",
  }),
  topic: Object.freeze({
    version: 1,
    label: "מה מחבר את הציר הזה?",
    body: "טופיק מרכז חומר סביב ציר משותף. אפשר לפתוח כל ביטוי, מקור או מספר ולבדוק אותו דרך הכלים הקנוניים.",
    firstAction: "inspect",
  }),
  world: Object.freeze({
    version: 1,
    label: "מה מתחבר כאן?",
    body: "העולם מציג הקשרים סביב העוגן הפעיל. בוחרים פריט כדי להבין למה הוא כאן ולהעמיק במקום המתאים.",
    firstAction: "inspect",
  }),
  books: Object.freeze({
    version: 1,
    label: "איך קוראים מקור כאן?",
    body: "המקור והלוקוס נשארים מדויקים; חישוב, קשר ופרשנות נשארים שכבות נפרדות.",
    firstAction: "inspect",
  }),
  journey: Object.freeze({
    version: 1,
    label: "איך ממשיכים את המסלול?",
    body: "מסע שומר את הרצף בין גילויים ואת הסיבה למעבר. Guided הוא מצב של אותו Journey, לא מערכת נפרדת.",
    firstAction: "journey",
  }),
  els: Object.freeze({
    version: 1,
    label: "מה המבנה מראה?",
    body: "ב-ELS המיקום והגיאומטריה הם חלק מהבדיקה. פותחים מופע כדי לראות את הלוקוס וה-replay המדויקים.",
    firstAction: "inspect",
  }),
  heichal: Object.freeze({
    version: 1,
    label: "איך בודקים כאן?",
    body: "היכל הוא עומק מחקרי: מחשבים, משווים ובודקים מקור דרך היכולות הקנוניות, בלי ליצור אמת מקומית.",
    firstAction: "inspect",
  }),
});

export const LEARN_FRAGMENTS = Object.freeze({
  anchor: Object.freeze({
    version: 1,
    label: "מה אנחנו חוקרים עכשיו?",
    explain: "עוגן הוא הדבר שסביבו מתמקדת הבדיקה כרגע — למשל מספר, ביטוי, פסוק, אדם, אירוע או מקור.",
  }),
  method: Object.freeze({
    version: 1,
    label: "איך זה עובד?",
    explain: "השיטה היא חלק מהטענה המספרית. אותו ביטוי יכול לקבל תוצאות שונות בשיטות שונות, ולכן תמיד בודקים ביטוי + שיטה + תוצאה יחד.",
  }),
  finding: Object.freeze({
    version: 1,
    label: "מה מצאנו?",
    explain: "ממצא הוא תוצאה או תצפית ששווה לבדוק. עצם היותו ממצא אינו הופך אותו לעובדה, ראיה עצמאית או פרשנות נכונה.",
  }),
  relation: Object.freeze({
    version: 1,
    label: "מה מתחבר למה?",
    explain: "קשר מתאר יחס מוגדר בין דברים. שוויון מספרי הוא קשר חישובי; הוא אינו אומר ששני הביטויים הם אותה משמעות.",
  }),
  verification: Object.freeze({
    version: 1,
    label: "מה באמת נבדק?",
    explain: "אימות מתאר מה המנוע בדק ומה הוא החזיר. אימות חישובי אינו אישור אנושי ואינו הוכחת משמעות.",
  }),
  evidence: Object.freeze({
    version: 1,
    label: "מה תומך בחיבור?",
    explain: "ראיה תומכת בקריאה או בטענה. חזרות של אותו מקור או אותו חישוב אינן הופכות אוטומטית לראיות עצמאיות.",
  }),
  convergence: Object.freeze({
    version: 1,
    label: "מתי זו התכנסות?",
    explain: "התכנסות דורשת כמה קווי תמיכה אחרי בדיקת תלות וכפילויות. התאמה אחת או ספירת התאמות לבדה אינן מספיקות.",
  }),
  interpretation: Object.freeze({
    version: 1,
    label: "מה מזה כבר פרשנות?",
    explain: "פרשנות מציעה משמעות לממצאים ולקשרים. היא נשארת מובחנת מהחישוב, מהמקור ומהאימות.",
  }),
});

export function getEntryOrientationManifest(surface) {
  const key = cleanSurface(surface);
  return key ? ENTRY_ORIENTATION_MANIFESTS[key] || null : null;
}

export function getLearnFragment(conceptKey) {
  const key = cleanConcept(conceptKey);
  return key ? LEARN_FRAGMENTS[key] || null : null;
}

export function classifyEntryArrival({ locationState = null, historyIndex = null } = {}) {
  const explicit = cleanToken(locationState?.sodEntryArrival);
  if (explicit === ENTRY_ARRIVAL.EXACT_RETURN) return ENTRY_ARRIVAL.EXACT_RETURN;
  if (explicit === ENTRY_ARRIVAL.INTERNAL) return ENTRY_ARRIVAL.INTERNAL;
  if (Number.isInteger(historyIndex)) return historyIndex > 0 ? ENTRY_ARRIVAL.INTERNAL : ENTRY_ARRIVAL.DIRECT;
  return ENTRY_ARRIVAL.UNKNOWN;
}

export function resolveEntryOrientation({ surface, arrival, familiarity = null } = {}) {
  const manifest = getEntryOrientationManifest(surface);
  if (!manifest) return { mode: "hidden", manifest: null };
  if (arrival === ENTRY_ARRIVAL.EXACT_RETURN) return { mode: "hidden", manifest };
  if (familiarity?.state === "complete" || familiarity?.state === "dismissed") {
    return { mode: "compact", manifest };
  }
  if (arrival === ENTRY_ARRIVAL.DIRECT) return { mode: "prominent", manifest };
  return { mode: "compact", manifest };
}

// Consumes canonical feature-state output; it does not read site_flags or invent access truth.
export function projectAvailability(featureState) {
  const status = cleanToken(featureState?.status);
  if (status === "active") return "OPEN";
  if (status === "registered_only") return "GATED";
  if (status === "building") return "BUILDING";
  return "LATER";
}

function msBucket(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value < 0) return null;
  if (value < 10_000) return "lt_10s";
  if (value < 30_000) return "10_30s";
  if (value < 60_000) return "30_60s";
  if (value < 180_000) return "1_3m";
  return "gte_3m";
}

function oncePerSession(key) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const state = raw ? JSON.parse(raw) : {};
    if (state[key]) return false;
    state[key] = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    return true;
  } catch {
    return true;
  }
}

export function buildEntryLearnTelemetry(eventType, {
  entrySurface = null,
  arrival = null,
  conceptKey = null,
  layer = null,
  actionId = null,
  targetSurface = null,
  availability = null,
  mode = null,
  manifestVersion = null,
  guidedId = null,
  stepIndex = null,
  elapsedMs = null,
} = {}) {
  const event = cleanToken(eventType);
  if (!EVENT_SET.has(event)) return null;
  const surface = cleanSurface(entrySurface);
  const concept = cleanConcept(conceptKey);
  const safeAvailability = AVAILABILITY_SET.has(availability) ? availability : null;
  const safeStep = Number.isInteger(Number(stepIndex)) ? Number(stepIndex) : null;
  return {
    surface: ENTRY_LEARN_SURFACE,
    eventType: event,
    options: {
      props: {
        entry_surface: surface,
        arrival: Object.values(ENTRY_ARRIVAL).includes(arrival) ? arrival : null,
        concept_key: concept,
        layer: cleanToken(layer),
        action_id: cleanToken(actionId),
        target_surface: cleanSurface(targetSurface),
        availability: safeAvailability,
        mode: cleanToken(mode),
        manifest_version: Number.isFinite(Number(manifestVersion)) ? Number(manifestVersion) : null,
        guided_id: cleanToken(guidedId),
        step_index: safeStep,
        ms_bucket: msBucket(elapsedMs),
      },
    },
  };
}

export function emitEntryLearn(eventType, args = {}, { dedupe = false } = {}) {
  const payload = buildEntryLearnTelemetry(eventType, args);
  if (!payload) return false;
  if (dedupe) {
    const props = payload.options.props || {};
    const key = [
      payload.eventType,
      props.entry_surface || "",
      props.concept_key || "",
      props.action_id || "",
      props.manifest_version || "",
    ].join(":");
    if (!oncePerSession(key)) return false;
  }
  emit(payload.surface, payload.eventType, payload.options);
  return true;
}

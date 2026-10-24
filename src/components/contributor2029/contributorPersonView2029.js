import { publicContributorOverview } from "./contributorOverview2029Model.js";

// Presentation model over the existing public writer `personProjection`.
// It reads measurements; it never computes a rank, score, percentage or threshold, and it never turns
// an unmeasured value into zero. Capability comes only from the projection (canonical contributor kind).
const text = (value) => typeof value === "string" ? value.trim() : "";
const number = new Intl.NumberFormat("he-IL");

// Hebrew explanation of what each measurement counts. The adapter's scope strings are English provenance.
const MEASURES = Object.freeze({
  sourcePublications: ["פרסומי מקור", "פרסומים ציבוריים בקטלוג המקורות. תמונה וטקסט באותו פרסום נספרים פעם אחת. אין זו ספירת ממצאים."],
  mediaPublications: ["מהם עם תמונה או וידאו", "פרסומי קטלוג שמכילים מדיה. אין זה מספר הקבצים."],
  publications: ["פוסטים", "פוסטים ציבוריים של הכותב, כולל פוסטים משותפים."],
  cipherRecords: ["רשומות צופן", "רשומות צופן ציבוריות לפי קרדיט או העלאה. אינן ממצאים מאומתים."],
  contributionRows: ["שורות תרומה", "שורות תרומה ציבוריות. אינן ספירת הודעות ואינן ממצאים עצמאיים."],
  activeDays: ["ימי פעילות", "ימים עם פעילות ציבורית משמעותית."],
  tenureDays: ["ותק בקהילה", "ותק מוכח מההיסטוריה הציבורית."],
  likesReceived: ["לייקים שהתקבלו", "כל הלייקים הציבוריים של הכותב, לא סכום הדף שנטען."],
  reactionsReceived: ["ריאקציות שהתקבלו", "כל הריאקציות הציבוריות של הכותב."],
  uniqueResponders: ["מגיבים שונים", "מגיבים ציבוריים מזוהים ושונים זה מזה."],
  repliesReceived: ["תגובות שהתקבלו", "תגובות ציבוריות להודעות הכותב."],
});
const SOURCES = Object.freeze({
  "contributorSourceCatalogProjection+posts": "קטלוג המקורות והפוסטים הציבורי",
  contributorPublicationCatalog: "קטלוג הפרסומים הציבורי",
});
const REASONS = Object.freeze({
  public_activity_reader_not_connected: "קורא הפעילות הציבורית עדיין לא מחובר.",
  account_age_is_not_community_tenure: "הרשמת חשבון אינה ותק בקהילה, וההיסטוריה הציבורית עדיין לא נמדדה.",
  native_community_activity_remains_lazy_and_separate: "ההודעות והריאקציות מוצגות בלשונית כתיבה בקהילה ואינן מסוכמות כאן.",
  approved_public_dossier_and_progression_gates_not_connected: "אין דרגה ואין מעמד מחקרי עד שיחובר דוסייה ציבורי מאושר ושערי ההתקדמות.",
  governed_person_recognition_not_connected: "הכרה אנושית נקבעת בשער אנושי נפרד, ואינה נגזרת ממדידה אוטומטית.",
});
// One or two letters: the first letters of the first and last words, ignoring parenthetical text.
export function initialsOf(name) {
  const words = text(name).replace(/\([^)]*\)/g, " ").split(/\s+/).filter(Boolean);
  const letter = (word) => Array.from(word).find((char) => /\p{L}/u.test(char)) || "";
  const picked = (words.length > 1 ? [words[0], words[words.length - 1]] : words).map(letter).filter(Boolean);
  return picked.join("") || "✦";
}

const DEFAULT_REASON = "הקורא הציבורי עדיין לא מספק ספירה שלמה לנתון הזה.";
const AXIS_ORDER = ["activity", "tenure", "communityImpact", "contribution", "researchStanding", "publication", "humanCuration"];

function labels(capabilities = {}) {
  const held = [];
  if (capabilities.writer || capabilities.author) held.push("כותב");
  if (capabilities.researcher) held.push("חוקר");
  return held.length ? held : ["חבר קהילה"];
}

function language(capabilities = {}) {
  if (capabilities.researcher) return { mode: "researcher", aboutLabel: "על החוקר", boundary: "החומרים, המקורות והממצאים של החוקר. שיוך לחוקר אינו אימות של תוכן." };
  if (capabilities.writer || capabilities.author) return { mode: "writer", aboutLabel: "על הכותב", boundary: "החומרים של הכותב וההקשרים שנפתחו מהם. שיוך לכותב אינו אימות של תוכן." };
  return { mode: "community", aboutLabel: "על האדם", boundary: "מה שהאדם כתב והעלה בקהילה ובמקורות. שיוך לאדם אינו אימות של תוכן." };
}

export function contributorPersonView2029(projection, { overview = null, name = "" } = {}) {
  if (!projection || !Array.isArray(projection.axes)) return null;
  const capabilities = projection.profile?.capabilities || {};
  const held = labels(capabilities);
  const lang = language(capabilities);
  const registered = publicContributorOverview(overview);
  const registeredAt = registered.state === "ready" ? registered.joinedAt : null;
  const measured = [], unmeasured = [];
  const axes = [...projection.axes].sort((a, b) => AXIS_ORDER.indexOf(a.key) - AXIS_ORDER.indexOf(b.key));
  for (const axis of axes) {
    // An ordinary community member is not a researcher: the standing axis is simply not applicable.
    if (axis.key === "researchStanding" && axis.applicable !== true) continue;
    const items = [];
    for (const [key, measure] of Object.entries(axis.measures || {})) {
      const [label, explain] = MEASURES[key] || [axis.label, ""];
      if (measure?.state === "measured" && Number.isSafeInteger(measure.value) && measure.value >= 0) {
        items.push({ key, label, value: measure.value, valueText: number.format(measure.value), explain,
          source: SOURCES[measure.source] || "קורא ציבורי קיים" });
      } else unmeasured.push({ key: `${axis.key}.${key}`, axis: axis.label, label, reason: REASONS[axis.reason] || DEFAULT_REASON });
    }
    if (items.length) measured.push({ key: axis.key, label: axis.label, items });
    if (!Object.keys(axis.measures || {}).length) unmeasured.push({ key: axis.key, axis: axis.label, label: axis.label, reason: REASONS[axis.reason] || DEFAULT_REASON });
  }
  const standing = projection.axes.find((axis) => axis.key === "researchStanding");
  // A level is shown only when the authorized evidence adapter supplied one for a researcher.
  const level = capabilities.researcher && typeof standing?.level === "string" && standing.level.trim() ? standing.level.trim() : null;
  const registrationNote = registeredAt ? "הרשמת חשבון לאתר. אינה ותק בקהילה." : "";
  return {
    mode: lang.mode, aboutLabel: lang.aboutLabel, labels: held, eyebrow: held.join(" · "), boundary: lang.boundary,
    initial: initialsOf(name),
    registeredAt, registrationNote,
    standing: level ? { level } : null,
    measured, unmeasured,
    // The compact strip lists only measured values above zero; every measurement, including a known zero, is in the path panel.
    summary: measured.flatMap((group) => group.items).filter((item) => item.value > 0).slice(0, 3),
    binding: projection.personBinding === "unresolved"
      ? "הדף מציג את זהות הכותב. החיבור המלא לחשבון הקהילה ולאזור האישי עדיין לא הושלם." : "",
  };
}

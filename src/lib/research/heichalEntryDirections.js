// Heichal entry, stage 1: PRESENTATION helper for a free question typed at the Heichal entry.
//
// It never runs an engine, never dispatches a tool, never calls a model/DB/network and is not a planner:
//  - the canonical Research Plan (research_strategy_layer_law v17) stays the only planner;
//  - projectHeichalEntryInput (heichalFirstDecodingPlan.js) stays the only entry-intent gate;
//  - the wording cues below only ORDER and EXPLAIN suggested directions so the screen follows the person's question.
// A free question is a temporary Research Context representation (subject.type "phrase" + dimensions.entryIntent
// "free_question"): it is NOT a canonical phrase identity, is never calculated as a whole, never becomes a graph edge,
// and is never written to a URL, telemetry or a share payload.
import { buildResearchPlanV2 } from "./researchPlanV2.js";
import { resolveResearchIdentities } from "./researchIdentityResolver.js";

export const FREE_QUESTION_MAX = 200;
export const ENTRY_INTENT_FREE_QUESTION = "free_question";

// Bounded, single-line copy of what the person typed (meaning preserved; no rewriting).
export function boundFreeQuestion(raw) {
  const text = typeof raw === "string" ? raw : "";
  return text.replace(/\s+/g, " ").trim().slice(0, FREE_QUESTION_MAX);
}

const strip = (text) => String(text || "")
  .replace(/[֑-ׇ]/g, "")
  .replace(/[״׳"'`´]/g, "")
  .replace(/[?!.,;:()\[\]{}־–—-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Transparent wording cues. First match wins; none of them selects an engine.
const CUES = Object.freeze([
  { key: "image_source", test: (t) => /(צילום|תמונה|צילמתי|מצאתי|ראיתי|סרטון|וידאו)/.test(t) },
  { key: "els", test: (t) => /(דילוג|דילוגים|צופן|ELS)/i.test(t) },
  { key: "where_appears", test: (t) => /(איפה|היכן|באיזה|באילו|באיזו|מהו הפסוק|מה הפסוק)/.test(t) && /(מופיע|מופיעה|נמצא|נמצאת|כתוב|מוזכר|מופיעים|נמצאים|במקרא|בתנך|בתורה|בנביאים|בכתובים|בפסוק)/.test(t) },
  { key: "relation", test: (t) => /(קשר|קשורים|מתחבר|מתקשר|מה בין|בין)/.test(t) },
  { key: "compute", test: (t) => /(גימטריה|שווה|שוות|ערך של|כמה זה)/.test(t) },
]);

export function detectEntryCue(raw) {
  const text = strip(raw);
  if (!text) return "neutral";
  return CUES.find((cue) => cue.test(text))?.key || "neutral";
}

const SOURCES_STATUS = "מוצע · לא הופעל. חיפוש ביטוי רב־מילים במקרא מחייב מתאם קורפוס מאומת שטרם חובר. אין כאן ריצה, ואין תוצאה שלילית.";
const EXACT_STATUS = "דורש בחירה מפורשת של ביטוי מדויק. השאלה כולה אינה מחושבת ואינה נחשבת ביטוי.";

const DIRECTIONS = Object.freeze({
  sources: { key: "sources", label: "חפש במקורות", action: "plan", status: SOURCES_STATUS },
  books: { key: "books", label: "עיין בספרים", action: "route", href: "/books", status: "פותח את מסך הספרים הקיים; השאלה לא עוברת אליו אוטומטית." },
  relations: { key: "relations", label: "בדוק קשרים לביטוי מדויק", action: "exact", status: "לשאלה חופשית אין עוגן מזוהה בגרף. בחר ביטוי מדויק לבדיקת קשרים; אין ריצת קשרים כאן." },
  gematria: { key: "gematria", label: "בדוק גימטריה (בחר ביטוי מדויק)", action: "exact", status: EXACT_STATUS },
  els: { key: "els", label: "בדוק צופן (בחר ביטוי מדויק)", action: "exact", status: "דורש ביטוי מדויק; הכלי הקיים נפתח רק אחרי בחירה." },
  raziel: { key: "raziel", label: "✦ שאל את רזיאל", action: "raziel", status: "אותו רזיאל ואותו הקשר. השאלה נשמרת מוגבלת בהקשר המחקר ואינה נשלחת בכתובת, בשיתוף או במדידה." },
  clarify: { key: "clarify", label: "ספר לי על המקור", action: "raziel", status: "מקור חזותי נבדק לפי מקום ותאריך לפני כל מספר. קליטת תמונה בהיכל טרם חוברה; רזיאל יברר איתך." },
});

// Which directions suit THIS question, in order. Never a fixed checklist, never more than four.
const ORDER_BY_CUE = Object.freeze({
  where_appears: ["sources", "books", "raziel"],
  relation: ["relations", "sources", "raziel"],
  compute: ["gematria", "sources", "raziel"],
  els: ["els", "sources", "raziel"],
  image_source: ["clarify", "sources", "raziel"],
  neutral: ["sources", "relations", "raziel"],
});

const CUE_REASON = Object.freeze({
  where_appears: "זיהיתי שאלה על מקום הופעה, ולכן מקורות ראשונים. גימטריה זמינה רק אם תבקש ותבחר ביטוי מדויק.",
  relation: "זיהיתי שאלת קשר. קשר נבדק לביטוי מדויק, ולכן מבקשים ממך לבחור אותו.",
  compute: "ביקשת ערך. הגימטריה תחושב רק אחרי שתבחר ביטוי מדויק, לא על כל המשפט.",
  els: "הזכרת צופן או דילוגים. הכלי הקיים נפתח רק עם ביטוי מדויק.",
  image_source: "נראה שיש כאן מקור שמצאת. קודם מקור, מקום ותאריך, ורק אחר כך מספרים.",
  neutral: "לא זיהיתי כוונה חד־משמעית, ולכן לא נבחר כלי. בחר כיוון או שאל את רזיאל.",
});

export function projectHeichalEntryDirections(raw) {
  const question = boundFreeQuestion(raw);
  const cue = detectEntryCue(question);
  // Gematria stays reachable on request (never the default, never on the whole question): appended last when the cue did not lead with it.
  const keys = ORDER_BY_CUE[cue].includes("gematria") ? ORDER_BY_CUE[cue] : [...ORDER_BY_CUE[cue], "gematria"];
  const directions = keys.slice(0, 4).map((key, index) => ({ ...DIRECTIONS[key], recommended: index === 0 && cue !== "neutral" }));
  return {
    ready: Boolean(question),
    question,
    cue,
    reason: CUE_REASON[cue],
    directions,
    executed: false, // nothing is run by showing these directions
  };
}

// Words of the question offered as selectable pieces for the exact-expression choice (nothing is chosen for the user).
export function questionWordChoices(raw) {
  const words = strip(boundFreeQuestion(raw)).split(" ").filter((w) => w.length > 1);
  return [...new Set(words)].slice(0, 12);
}

// Temporary Research Context payload for a free question. Not a canonical phrase identity; no calculation fields;
// no query in the URL; direction is a navigation hint only.
export function buildFreeQuestionContext(raw, directionKey = null) {
  const question = boundFreeQuestion(raw);
  if (!question) return null;
  return {
    subject: { id: question, type: "phrase", label: question, href: "/heichal" },
    selection: { entityId: question, entityType: "phrase" },
    lens: "heichal",
    locale: "he",
    dimensions: {
      entryIntent: ENTRY_INTENT_FREE_QUESTION,
      entryDirection: DIRECTIONS[directionKey] ? directionKey : null,
      entryQuestion: question,
      // The shared context rail reads surfaceFocus: label the question as a question (never as an expression or a number).
      surfaceFocus: { id: "free-question", type: "question", label: question, primary: question, sectionLabel: "שאלה חופשית" },
    },
  };
}

// True only while the Research Context subject IS the free question (not after an exact expression was explicitly chosen).
export function isFreeQuestionContext(context) {
  return context?.dimensions?.entryIntent === ENTRY_INTENT_FREE_QUESTION
    && context?.subject?.type === "phrase"
    && Boolean(context?.dimensions?.entryQuestion)
    && context.dimensions.entryExactExpression !== true
    && context.subject.id === context.dimensions.entryQuestion;
}

// Plan steps for the chosen direction. Everything is "proposed": showing a plan is not running it.
export function projectFreeQuestionPlan(raw, directionKey = "sources") {
  const question = boundFreeQuestion(raw);
  if (!question) return { ready: false, steps: [], strategy: null, message: "אין שאלה לתכנן." };
  // The canonical planner is consulted only to report honestly what it chose; a free question yields no automatic tools.
  const identityResolution = resolveResearchIdentities({ candidates: [], rawInput: question, explicitTextComputation: false });
  const plan = buildResearchPlanV2({ question, intent: "research", identityResolution, contextType: "public_user", authorizationContext: null, surfaceContext: { surface: "heichal", subject: null } });
  const direction = DIRECTIONS[directionKey] || DIRECTIONS.sources;
  const stepsByDirection = {
    sources: [
      { key: "locate", label: "איתור במקורות", explanation: SOURCES_STATUS },
      { key: "locator", label: "מקור, מיקום ונוסח", explanation: "אם יימצא מופע יוצגו ספר, פרק, פסוק, נוסח וסוג ההתאמה. אין קביעה מראש שקיים מופע." },
    ],
    books: [{ key: "books", label: "עיון בספרים", explanation: DIRECTIONS.books.status }],
    clarify: [{ key: "origin", label: "בירור המקור", explanation: DIRECTIONS.clarify.status }],
    raziel: [{ key: "ask", label: "שיחה עם רזיאל", explanation: DIRECTIONS.raziel.status }],
    relations: [{ key: "exact", label: "בחירת ביטוי מדויק", explanation: DIRECTIONS.relations.status }],
    gematria: [{ key: "exact", label: "בחירת ביטוי מדויק", explanation: EXACT_STATUS }],
    els: [{ key: "exact", label: "בחירת ביטוי מדויק", explanation: DIRECTIONS.els.status }],
  };
  const steps = (stepsByDirection[direction.key] || stepsByDirection.sources).map((step) => ({ ...step, status: "proposed" }));
  return {
    ready: true,
    question,
    direction: direction.key,
    strategy: plan.strategy,
    autoSelectedTools: Array.isArray(plan.check_order) ? plan.check_order : [],
    steps,
    executed: false,
    message: "זו תוכנית מוצעת בלבד. " + (plan.strategy === "discovery" && !(plan.check_order || []).length
      ? "המתכנן הקנוני לא בחר כלים אוטומטית לשאלה חופשית, ולכן הכיוון הוא בחירה שלך."
      : "המתכנן הקנוני הציע כלים, אך שום דבר לא הופעל."),
  };
}

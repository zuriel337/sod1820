import { resolveResearchIdentities } from "./researchIdentityResolver.js";
import { buildResearchPlanV2 } from "./researchPlanV2.js";

// Heichal Stage 1: projection of the existing canonical Research Plan only.
// No engine execution, upload, persistence, access elevation, graph mutation or new planner.
const CAPABILITY_LABELS = Object.freeze({
  numeric: "בדיקת מספר",
  numeric_operators: "פעולות מספריות",
  graph: "בדיקת קשרים קיימים",
  numeric_relations: "יחסים בין מספרים",
  sources: "חיפוש במקורות",
  gematria: "בדיקת גימטריה",
  els: "דילוגי אותיות",
  books: "עיון בספרים",
  time: "ציר זמן",
  name: "מחקר שם",
  research_objects: "ממצאי מחקר קיימים",
});

export const HEICHAL_DECODING_DIRECTIONS = Object.freeze({
  number: Object.freeze([
    { key: "overview", label: "מה אפשר לגלות?" },
    { key: "sources", label: "חפש מקורות" },
    { key: "relations", label: "בדוק קשרים" },
  ]),
  phrase: Object.freeze([
    { key: "overview", label: "ממה להתחיל?" },
    { key: "sources", label: "חפש במקורות" },
    { key: "gematria", label: "בדוק גימטריה" },
    { key: "els", label: "בדוק צופן" },
  ]),
});

function sourceQuestion(type, label, direction) {
  if (direction === "sources") return "מצא מקורות לביטוי או למספר " + label;
  if (direction === "gematria") return "חשב את הגימטריה של " + label;
  if (direction === "els") return "חפש דילוגים בתורה עבור " + label;
  if (direction === "relations") return "בדוק קשרים ויחסים של המספר " + label;
  return type === "number" ? "חקור את המספר " + label : "חקור את הביטוי " + label;
}

function capabilityStatus(key, type, sourceCounts, loading) {
  if (key === "numeric" || key === "numeric_operators") {
    return type === "number"
      ? "אפשר לבקש בדיקה מפורשת דרך research-run הקיים; עדיין לא הופעלה כאן ריצה."
      : "המתכנן הציע יכולת; אין חיבור ביצוע מאומת למקור זה.";
  }
  if (key === "graph" || key === "research_objects") {
    return loading ? "הקרנת המחקר עדיין נטענת."
      : sourceCounts.findings == null || sourceCounts.relations == null
        ? "נתוני הממצאים או הקשרים אינם זמינים; אי אפשר להסיק שהתקבלו אפס תוצאות."
        : "בהקרנה הנוכחית: " + sourceCounts.findings + " ממצאים ו-" + sourceCounts.relations + " קשרים. נוכחות אינה אימות.";
  }
  if (key === "sources") {
    return loading ? "מקורות ההקרנה עדיין נטענים."
      : sourceCounts.sources == null
        ? "נתוני המקורות אינם זמינים; אין כאן תוצאת חיפוש שלילית."
        : "הקרנת המקור מכילה " + sourceCounts.sources + " הפניות. חיפוש ביטוי רב־מילים דורש חיבור מאומת.";
  }
  return "תוכנית בלבד; ביצוע ישיר מתוך ההיכל עדיין לא אומת ליכולת הזו.";
}

export function projectHeichalFirstDecoding({
  subject = null,
  direction = "overview",
  projection = null,
  loading = false,
} = {}) {
  const type = String(subject?.type || "").trim();
  const id = String(subject?.id || "").trim();
  const label = String(subject?.label || id).trim().slice(0, 160);
  const invalidNumber = type === "number" && (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)));
  if (!id || !["number", "phrase"].includes(type) || invalidNumber) {
    return {
      ready: false, direction, strategy: null, steps: [],
      message: "עדיין אין עוגן מסוג מספר או ביטוי. יש לבחור מקור לפני הצעת תוכנית.",
    };
  }

  // Recognized surface focus is not the same as a verified graph identity.
  const identityResolution = resolveResearchIdentities({
    candidates: [{ type, id, label, source: "surface_context", confidence: "candidate" }],
    rawInput: label,
    explicitTextComputation: direction === "gematria",
  });
  const question = sourceQuestion(type, label, direction);
  const plan = buildResearchPlanV2({
    question,
    intent: direction === "gematria" ? "gematria" : direction === "els" ? "els" : "research",
    identityResolution,
    contextType: "public_user",
    authorizationContext: null,
    surfaceContext: { surface: "heichal", subject: { type, id } },
  });
  const counts = {
    findings: Array.isArray(projection?.research?.findings) ? projection.research.findings.length : null,
    relations: Array.isArray(projection?.graph?.relations) ? projection.graph.relations.length : null,
    sources: Array.isArray(projection?.sources) ? projection.sources.length : null,
  };

  const steps = (plan.check_order || []).slice(0, 5).map((key) => ({
    key,
    label: CAPABILITY_LABELS[key] || "יכולת מחקר",
    explanation: capabilityStatus(key, type, counts, loading),
    status: "proposed",
  }));

  return {
    ready: true, direction, type, label, question,
    strategy: plan.strategy,
    steps,
    counts,
    hasProjection: Boolean(projection),
    canRunBoundedNumber: type === "number" && ["overview", "relations"].includes(direction),
    message: steps.length
      ? "זוהי תוכנית מוצעת מן המתכנן הקנוני. ההקרנה הקיימת אינה הוכחת ביצוע השלבים."
      : "עדיין אין למתכנן יכולת מתאימה להפעלה בלי בחירת כיוון. בחר מקורות, גימטריה או צופן.",
  };
}

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

function capabilityStatus(key, type, sourceCounts, loading, direction) {
  if (key === "numeric" || key === "numeric_operators") {
    if (type === "number" && direction === "relations") {
      return "בדיקת קשרים הוצעה, אך research-run הנוכחי מבצע numeric/numeric_operators בלבד; אין כאן ריצת קשרים.";
    }
    return type === "number"
      ? "אפשר לבקש בדיקה מספרית מפורשת דרך research-run הקיים; עדיין לא הופעלה כאן ריצה."
      : "המתכנן הציע יכולת; אין חיבור ביצוע מאומת למקור זה.";
  }
  if (key === "graph" || key === "research_objects") {
    return loading ? "הקרנת המחקר עדיין נטענת."
      : sourceCounts.findings == null || sourceCounts.relations == null
        ? "נתוני הממצאים או הקשרים אינם זמינים; אי אפשר להסיק שהתקבלו אפס תוצאות."
        : "בהקרנה הנוכחית: " + sourceCounts.findings + " ממצאים ו-" + sourceCounts.relations + " קשרים. נוכחות אינה אימות.";
  }
  if (key === "sources") {
    const phraseCoverage = type === "phrase"
      ? " חיפוש ביטוי רב־מילים מחייב מתאם קורפוס מאומת; נוכחות מקורות אינה הוכחת הופעתו."
      : "";
    return loading ? "מקורות ההקרנה עדיין נטענים." + phraseCoverage
      : sourceCounts.sources == null
        ? "נתוני המקורות אינם זמינים; אין כאן תוצאת חיפוש שלילית." + phraseCoverage
        : "הקרנת המקור מכילה " + sourceCounts.sources + " הפניות, לא תוצאות חיפוש." + phraseCoverage;
  }
  return "תוכנית בלבד; ביצוע ישיר מתוך ההיכל עדיין לא אומת ליכולת הזו.";
}

// First-entry preservation gate for the EXISTING Research Strategy owner.
 // It does not parse an arbitrary question as an exact expression, nor dispatch a tool.
 // The Heichal visual owner should consume this *before* calling resolveExpressionFocus.
export function projectHeichalEntryInput(raw, { explicitlyChoseGematria = false, exactExpressionSelected = false } = {}) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return {
    ready: false, reason: "empty_input",
    candidateSubject: null, autoCalculate: false, canResolveExpression: false,
  };
  const isDigits = /^\d+$/.test(text);
  const number = isDigits ? Number(text) : null;
  if (isDigits && (!Number.isSafeInteger(number) || number < 0)) return {
    ready: false, reason: "invalid_number",
    candidateSubject: null, autoCalculate: false, canResolveExpression: false,
  };
  if (isDigits) return {
    ready: true, inputKind: "number_literal", input: text,
    candidateSubject: { type: "number", id: String(number), label: String(number) },
    autoCalculate: false, canResolveExpression: false,
    // A Number subject alone is not a server execution instruction.
    reason: "known_number_literal",
  };
  return {
    ready: true, inputKind: "unresolved_text", input: text,
    candidateSubject: { type: "phrase", id: text, label: text },
    autoCalculate: false,
    // An explicit Gematria choice is necessary but not sufficient: the source owner/user
    // must also select the EXACT expression, not an entire conversational question.
    canResolveExpression: explicitlyChoseGematria === true && exactExpressionSelected === true,
    reason: explicitlyChoseGematria !== true ? "intent_first"
      : exactExpressionSelected === true ? "exact_expression_selected"
      : "exact_expression_required",
    // This is a source/intake guard, not engine verification or semantic identity admission.
    sourceTextIsExactExpression: exactExpressionSelected === true,
  };
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
    explanation: capabilityStatus(key, type, counts, loading, direction),
    status: "proposed",
  }));

  return {
    ready: true, direction, type, label, question,
    strategy: plan.strategy,
    steps,
    counts,
    hasProjection: Boolean(projection),
    // The public server transport is numeric + numeric_operators only, not a relations executor.
    canRunBoundedNumber: type === "number" && direction === "overview",
    message: steps.length
      ? "זוהי תוכנית מוצעת מן המתכנן הקנוני. ההקרנה הקיימת אינה הוכחת ביצוע השלבים."
      : "עדיין אין למתכנן יכולת מתאימה להפעלה בלי בחירת כיוון. בחר מקורות, גימטריה או צופן.",
  };
}

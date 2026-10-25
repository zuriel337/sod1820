// Raziel semantic intent gate v1.
//
// A future bounded classifier may help interpret natural language that deterministic parsing did
// not resolve. Its output is never authority and never selects a provider, RPC or capability. This
// pure gate admits only a stable conversational action plus at most two subject candidates whose
// evidence is present verbatim in the current question. The existing Identity Resolver and
// Research Plan remain the only owners downstream.

import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
} from "./researchIdentityResolver.js";

export const RAZIEL_SEMANTIC_INTENT_VERSION = "raziel-semantic-intent-v1";
export const RAZIEL_CONVERSATIONAL_ACT_VERSION = "raziel-conversational-act-v1";
export const RAZIEL_DETERMINISTIC_GUIDANCE_VERSION = "raziel-deterministic-guidance-v1";
export const RAZIEL_CANONICAL_REQUEST_VERSION = "raziel-canonical-request-v1";

const ACTIONS = new Set(["understand", "research", "connect", "continue"]);
const TYPES = new Set(["number", "phrase", "word", "name", "topic"]);
const TOP_LEVEL_KEYS = new Set(["version", "status", "action", "confidence", "ambiguous", "candidates", "reason", "text_computation_requested"]);
const CANDIDATE_KEYS = new Set(["type", "value", "label", "evidence_text", "role"]);
const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "access", "authorization", "capabilities", "capability", "provider", "rpc", "tool", "tools",
  "provenance", "metadata", "id", "ref", "identity_key", "source",
]);

const clean = (value, limit = 180) => value == null
  ? ""
  : String(value).normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

const grammarText = (value) => clean(value, 500)
  // A leading list ordinal is presentation, not a second research subject.
  .replace(/^\d{1,2}[.)]\s+/u, "")
  .replace(/[־–—-]/gu, " ")
  .replace(/[?؟!.]+$/gu, "")
  .replace(/\s+/gu, " ")
  .trim();

// Exact current-surface language shared by the browser resolver and the server admission gate.
// This is intentionally a whole-turn grammar, not a keyword scan: it may bind only an identity
// that is already present in the bounded surface descriptor and never invents a subject.
export function isRazielCurrentSurfaceQuestion(question) {
  const q = grammarText(question);
  return /^(?:מה\s+(?:אני\s+)?רואה\s+כאן|מה\s+רואים\s+כאן|מה\s+מוצג\s+כאן|(?:תסביר|הסבר|תסבירי|הסבירי)(?:\s+לי)?\s+מה\s+(?:אני\s+)?רואה\s+כאן)$/u.test(q);
}

const NUMERIC_CONTEXT_LABELS = [
  "שנת", "שנה", "עמוד", "דף", "פרק", "פסוק", "מקור", "מקורות",
  "שאלה", "שאלות", "תוצאה", "תוצאות", "קשר", "קשרים", "הצלבה", "הצלבות",
  "פעמים", "כמות",
];

function escapePattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The public product calls the locked internal method key "קדמי" by the display label
// "משולש". Natural combinations such as "הקדמי משולש" are therefore one method lens, not two
// methods and never the separate "משולש מילה" formula.
export function normalizeRazielRequestedMethod(value) {
  const method = clean(value, 60)
    .replace(/^שיטת\s+/u, "")
    .replace(/["'״׳`]/gu, "")
    .replace(/\s*\+\s*/gu, "+")
    .replace(/\s+/gu, " ")
    .trim();
  const comparable = method
    .replace(/^ה/u, "")
    .replace(/[·:]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (/^(?:קדמי\s+)?משולש(?:\s+קדמי)?$/u.test(comparable)) return "קדמי";
  // A definite article is presentation grammar, except in the canonical family "הכפלה" where
  // the initial ה is part of the method's actual name. "ההכפלה" still loses only its article.
  if (method.startsWith("ההכפלה")) return method.slice(1);
  return method.startsWith("הכפלה") ? method : method.replace(/^ה/u, "");
}

const canonicalRequestedMethod = normalizeRazielRequestedMethod;

// Deterministic conversation control for short, whole-turn acknowledgements. This is intentionally
// narrower than sentiment/small-talk classification: it never consumes a mixed request and never
// calls a model. The temporary conversation keeps its prior research identities, while ai-analyze
// can answer the social turn without inventing evidence or spending an AI call.
export function resolveRazielConversationalAct(message) {
  const q = grammarText(message)
    .replace(/[,،;:]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (!q || q.length > 40) return null;
  const acknowledgement = /^(?:תודה(?: רבה| לך| רזיאל)?|יפה(?: מאוד| מאד)?|יופי|מעולה|מצוין|מצויין|נהדר|נפלא|אחלה|סבבה|הבנתי)$/u.test(q);
  return acknowledgement
    ? Object.freeze({ version: RAZIEL_CONVERSATIONAL_ACT_VERSION, act: "acknowledgement" })
    : null;
}

// Whole-turn input assistance belongs before planning and model selection. It never resolves a
// missing subject from profile/history: a person who says "my name" is asked for the exact text,
// while an open capability question receives a stable research menu instead of invented findings.
export function resolveRazielDeterministicGuidance(message) {
  const q = grammarText(message)
    .replace(/[,،;:]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (!q || q.length > 100) return null;

  if (/^(?:(?:תחשב|חשב|חשבי|תחשבי)(?:\s+לי)?(?:\s+את)?\s+)(?:השם\s+שלי|שמי)$/u.test(q)) {
    return Object.freeze({
      version: RAZIEL_DETERMINISTIC_GUIDANCE_VERSION,
      kind: "missing_name_expression",
    });
  }

  if (/^(?:מה|איזה\s+דברים)\s+אתה\s+יכול\s+(?:ללמד\s+אותי|לעשות|לחקור)(?:\s+איתי)?$/u.test(q)) {
    return Object.freeze({
      version: RAZIEL_DETERMINISTIC_GUIDANCE_VERSION,
      kind: "research_menu",
    });
  }
  const canonicalRequest = resolveRazielCanonicalRequest(q);
  if (canonicalRequest.status === "clarify") {
    return Object.freeze({
      version: RAZIEL_DETERMINISTIC_GUIDANCE_VERSION,
      kind: "routing_clarification",
      reason: canonicalRequest.reason,
    });
  }
  return null;
}

// A complete calculation directive can modify the action/lens of the last explicit expression
// without naming that expression again. This is a grammar category, not a phrase dictionary:
// the carried subject still comes from the canonical temporary-session identity, and the server
// must re-authorize this same whole-turn shape before executing public expression research.
export function resolveRazielExpressionContinuationDirective(question) {
  const q = grammarText(question);
  if (!q || q.length > 140) return null;
  const correction = /^שיטת\s+(.{1,60}?)\s+(?:ביקשתי|התכוונתי)$/u.exec(q);
  if (correction) return Object.freeze({
    requested_action: "research",
    requested_method: canonicalRequestedMethod(correction[1]),
    all_methods: false,
    view_mode_only: false,
  });
  const command = /^(?:תחשב|חשב|חשבי|תחשבי)(?:\s+לי)?\s+(.+)$/u.exec(q);
  // A lens-only turn ("בכל השיטות", "בשיטת מסתתר") is already a complete
  // grammatical continuation. It carries the last explicit expression from the
  // temporary session; it must never be mistaken for a new expression itself.
  let remainder = clean(command ? command[1] : q, 120);
  const asksConnections = /(?:^|\s)(?:ומצא|מצא|וחפש|חפש|ובדוק|בדוק)(?:\s+לי)?\s+(?:הצלבות|קשרים)$/u.test(remainder);
  remainder = remainder
    .replace(/\s+(?:ומצא|מצא|וחפש|חפש|ובדוק|בדוק)(?:\s+לי)?\s+(?:הצלבות|קשרים)$/u, "")
    .trim();

  const anaphor = /^(?:את\s+)?(?:זה|זאת|אותו|אותה)(?:\s+(.*))?$/u.exec(remainder);
  const directive = clean(anaphor ? anaphor[1] : remainder, 80);
  if (!anaphor && !/^(?:בכל\s+השיטות|במצב\s+(?:רגיל|כללי)|בשיטת\s+.+)$/u.test(directive)) return null;
  if (directive && !/^(?:בכל\s+השיטות|במצב\s+(?:רגיל|כללי)|בשיטת\s+.{1,60})$/u.test(directive)) return null;

  const method = /^בשיטת\s+(.{1,60})$/u.exec(directive)?.[1] || null;
  return Object.freeze({
    requested_action: asksConnections ? "connect" : "research",
    requested_method: method ? canonicalRequestedMethod(method) : null,
    all_methods: directive === "בכל השיטות",
    view_mode_only: /^במצב\s+(?:רגיל|כללי)$/u.test(directive),
  });
}

// A whole-turn request for the calculation profile of one explicit expression. The grammar
// separates the computation noun ("הגימטריות", "הערכים הגימטריים") and the lexical role
// ("השם", "המילה", "הביטוי") from the bounded expression slot. This applies to every Hebrew
// expression and does not maintain a dictionary of known names.
function explicitExpressionProfileCommand(question) {
  const q = grammarText(question);
  const connectionSuffix = /(?:\s+ו(?:מה|אילו)\s+(?:ההצלבות|הקשרים)(?:\s+(?:שיש|שלו|שלה|קיימים|קיימות))?|\s+(?:ומצא|מצא|וחפש|חפש|ובדוק|בדוק)(?:\s+לי)?\s+(?:הצלבות|קשרים))$/u;
  const asksConnections = connectionSuffix.test(q);
  const profileQuestion = q.replace(connectionSuffix, "").trim();
  // Both the singular calculation noun ("הגימטריה של המילה X") and the plural
  // profile noun ("הגימטריות של X") own the same bounded expression slot. Keeping
  // this in the deterministic grammar prevents the semantic classifier from
  // treating the command scaffolding itself as the expression.
  const computation = "(?:ה?גימטרי(?:ה|א|ות)|חישובי\\s+ה?גימטרי[הא]|החישובים\\s+הגימטריים|הערכים\\s+הגימטריים)";
  const role = "(?:(?:השם|המילה|הביטוי)\\s+)?";
  const imperative = new RegExp(`^(?:תן|תני|הצג|הציגי|הראה|הראי|פרט|פרטי)(?:\\s+לי)?(?:\\s+את)?\\s+(?:כל\\s+)?${computation}\\s+(?:על|של|עבור)\\s+${role}(.+)$`, "u");
  const interrogative = new RegExp(`^(?:מה|אילו)(?:\\s+הן)?\\s+(?:כל\\s+)?${computation}\\s+(?:של|עבור)\\s+${role}(.+)$`, "u");
  const nominal = new RegExp(`^(?:כל\\s+)?${computation}\\s+(?:של|עבור)\\s+${role}(.+)$`, "u");
  // "הכל על הגימטריה של X" — a whole-profile request over one expression.
  const everything = new RegExp(`^(?:הכל|כל\\s+מה\\s+שיש)\\s+על\\s+(?:ה?גימטרי[הא]|ה?ערכים\\s+ה?גימטריים)\\s+(?:של|על)\\s+${role}(.+)$`, "u");
  const match = imperative.exec(profileQuestion) || interrogative.exec(profileQuestion) || nominal.exec(profileQuestion) || everything.exec(profileQuestion);
  const slot = match ? splitExpressionSlot(match[1]) : null;
  return slot ? expressionSubjectFromSlot(slot, { requested_action: asksConnections ? "connect" : "research" }) : null;
}

// "המילה שאול" / "הביטוי X" — a lexical-role noun followed by the bounded expression slot is an explicit research request.
function explicitRoleExpressionCommand(question) {
  const match = /^(?:המילה|הביטוי|השם)\s+(.+)$/u.exec(grammarText(question));
  const slot = match ? splitExpressionSlot(match[1]) : null;
  if (!slot || /^(?:הז[הא]ת?|ההי?א|הבא(?:ה)?|האחרונה?|שלפני|שלעיל)$/u.test(slot.expression)) return null;
  return expressionSubjectFromSlot(slot);
}

// "<expression> <value> בכל השיטות" — the all-methods lens over one explicit expression.
function explicitExpressionAllMethodsCommand(question) {
  const q = grammarText(question);
  const match = /^(.+?)\s+בכל\s+השיטות$/u.exec(q);
  const slot = match ? splitExpressionSlot(match[1]) : null;
  if (!slot || slot.observedValue == null) return null;
  return expressionSubjectFromSlot(slot, { all_methods: true });
}

function validExplicitHebrewExpression(value) {
  const expression = clean(value, 120)
    .replace(/^["'״׳]+|["'״׳]+$/gu, "")
    .replace(/[?؟!.]+$/gu, "")
    .trim();
  if (!expression || /^\d+$/u.test(expression) || !/[\u0590-\u05ff]/u.test(expression)) return null;
  if (/^(?:ה?שם(?:\s+שלי)?|שמי|שלי|ה?מילה|ה?ביטוי|זה|זאת|משהו)$/u.test(expression)) return null;
  if (/^(?:ה?גימטרי[הא]|ה?ערך\s+גימטרי)$/u.test(expression)) return null;
  if (/^(?:שנת|שנה|עמוד|דף|פרק|פסוק|מקור(?:ות)?)\s+\d+$/u.test(expression)) return null;
  return expression;
}

// An expression slot may carry ONE adjacent integer ("337 שאול", "שאול 337"). The integer is an
// observed value to be checked by the canonical engine, never the research subject: the Hebrew
// expression stays the focus. Structural for any expression; no vocabulary of names.
function splitExpressionSlot(text) {
  let body = clean(text, 120).replace(/\s+בכל\s+השיטות$/u, "").trim();
  let observedValue = null;
  const tokens = body.split(/\s+/u).filter(Boolean);
  if (tokens.filter((token) => /\d/u.test(token)).length > 1) return null;
  if (tokens.length >= 2) {
    const numericIndex = [0, tokens.length - 1].find((index) => /^\d{1,6}$/u.test(tokens[index]));
    if (numericIndex != null && tokens.filter((token) => /\d/u.test(token)).length === 1) {
      const numeric = Number(tokens[numericIndex]);
      if (Number.isSafeInteger(numeric) && numeric >= 1) {
        observedValue = numeric;
        body = tokens.filter((_, index) => index !== numericIndex).join(" ");
      }
    }
  }
  // A number glued to a context noun (year, page, chapter, count…) is never an observed value of an expression.
  if (observedValue != null && /^(?:שנת|שנה|עמוד|דף|פרק|פסוק|מקור(?:ות)?|כמות|מספר|ה?מספר)$/u.test(body)) return null;
  const expression = validExplicitHebrewExpression(body);
  return expression ? { expression, observedValue } : null;
}

function expressionSubjectFromSlot(slot, extra = {}) {
  return Object.freeze({
    type: "phrase",
    label: slot.expression,
    evidence_text: slot.expression,
    identity_key: `phrase:${slot.expression}`,
    source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    requested_action: "research",
    ...(slot.observedValue != null ? { observed_value: slot.observedValue } : {}),
    ...extra,
    explicit_text_computation: true,
  });
}

// Parse a complete expression-calculation command into independent semantic slots. The words that
// describe HOW to calculate ("בשיטת …") and WHAT to do afterwards ("ומצא הצלבות") are command
// scaffolding, never part of the expression sent to the canonical engine. Method identity remains
// Registry-owned downstream: this parser only preserves the bounded textual method slot, so future
// methods do not require another phrase-specific patch here.
function explicitExpressionCalculationCommand(question) {
  const q = grammarText(question);
  // The expression is the bounded slot between command scaffolding and a calculation lens.
  // Keep this structural: action words may appear before or after the slot, but are never sent
  // to the canonical engine. This covers natural variants such as "בדוק לי X בגימטריה" and
  // "כמה זה X בגימטריה תחשב" without maintaining a dictionary of known expressions.
  const connectionSuffix = /\s+(?:ומצא|מצא|וחפש|חפש|ובדוק|בדוק)(?:\s+לי)?\s+(?:הצלבות|קשרים)$/u;
  const asksConnections = connectionSuffix.test(q);
  const commandQuestion = q.replace(connectionSuffix, "").trim();
  const calculateVerb = "(?:תחשב|חשב|חשבי|תחשבי)";
  const inspectVerb = "(?:בדוק|בדקי|תבדוק|תבדקי)";
  const trailingCalculation = `(?:בבקשה\\s+)?${calculateVerb}(?:\\s+לי)?`;

  const prefixed = new RegExp(
    `^(?:בבקשה\\s+)?(${calculateVerb}|${inspectVerb})(?:\\s+בבקשה)?(?:\\s+לי)?(?:\\s+בבקשה)?(?:\\s+את)?(?:\\s+(המילה|הביטוי|השם))?\\s+(.+)$`,
    "u",
  ).exec(commandQuestion);
  const leadingQuestion = new RegExp(
    `^(?:כמה\\s+(?:זה|שווה)|מה\\s+שווה)\\s+(.+?)\\s+בגימטרי[הא](?:\\s+${trailingCalculation})?$`,
    "u",
  ).exec(commandQuestion);
  const trailingQuestion = new RegExp(
    `^(.+?)\\s+בגימטרי[הא]\\s+(?:כמה\\s+(?:זה|שווה)|מה\\s+שווה|${trailingCalculation})$`,
    "u",
  ).exec(commandQuestion);

  let body = "";
  if (prefixed) {
    const verb = prefixed[1];
    const explicitRole = Boolean(prefixed[2]);
    body = clean(prefixed[3], 240);
    const hasCalculationCue = /(?:^|\s)(?:(?:ב|ה)?גימטרי[הא]|בכל\s+השיטות|במצב\s+(?:רגיל|כללי)|בשיטת\s+.+)(?:\s|$)/u.test(body);
    // "בדוק X" alone is an open research request. Admit it here only when the user supplied
    // an explicit lexical role or calculation cue; otherwise the normal research resolver owns it.
    if (!/חשב/u.test(verb) && !explicitRole && !hasCalculationCue) return null;
  } else if (leadingQuestion || trailingQuestion) {
    body = clean((leadingQuestion || trailingQuestion)[1], 240);
  } else {
    return null;
  }

  // A computation noun before the slot is scaffolding too: "בדוק לי גימטריה של X".
  body = body
    .replace(/^(?:ה?גימטרי[הא]|הערך\s+הגימטרי)\s+(?:של\s+)?/u, "")
    .trim();

  const marker = body.lastIndexOf(" בשיטת ");
  const requestedMethod = marker > 0
    ? clean(body.slice(marker + " בשיטת ".length), 60)
    : "";
  const expressionCandidate = marker > 0
    ? body.slice(0, marker)
    : body;
  const expressionText = expressionCandidate
    .replace(new RegExp(`\\s+בגימטרי[הא](?:\\s+${trailingCalculation})?$`, "u"), "")
    .replace(/\s+(?:בכל\s+השיטות|במצב\s+(?:רגיל|כללי))$/u, "")
    .trim();
  // One adjacent integer is the expression's observed value, never part of the expression.
  const slot = splitExpressionSlot(expressionText);
  if (!slot || (marker > 0 && (!requestedMethod || !/[\u0590-\u05ff]/u.test(requestedMethod)))) return null;

  return expressionSubjectFromSlot(slot, {
    requested_action: asksConnections ? "connect" : "research",
    ...(requestedMethod ? { requested_method: canonicalRequestedMethod(requestedMethod) } : {}),
  });
}

// High-confidence, single-expression grammar shared by the browser resolver and the server
// re-authorization gate. This is structural, not a vocabulary list: any bounded Hebrew name,
// word or phrase can occupy the explicit expression slot. Incidental prose and personal pronouns
// are rejected, and this function never calculates or selects an executor.
export function resolveExplicitHebrewExpressionResearchSubject(question) {
  const q = grammarText(question);
  if (!q) return null;
  // A continuation directive has no new expression slot. In particular, never calculate the
  // literal scaffolding "במצב רגיל" or "זה בכל השיטות" as though it were the user's phrase.
  if (resolveRazielExpressionContinuationDirective(q)) return null;

  const expressionCalculationCommand = explicitExpressionCalculationCommand(q);
  if (expressionCalculationCommand) return expressionCalculationCommand;

  const expressionProfileCommand = explicitExpressionProfileCommand(q);
  if (expressionProfileCommand) return expressionProfileCommand;

  const expressionRoleCommand = explicitRoleExpressionCommand(q);
  if (expressionRoleCommand) return expressionRoleCommand;

  const expressionAllMethodsCommand = explicitExpressionAllMethodsCommand(q);
  if (expressionAllMethodsCommand) return expressionAllMethodsCommand;

  let match = /^(?:מצא|מצאי|חפש|חפשי|בדוק|בדקי|תבדוק|תבדקי)(?:\s+לי)?\s+(?:הצלבות|קשרים)\s+(?:(?:למילה|לביטוי|לשם|עבור)\s+)(.+)$/u.exec(q);
  let requestedAction = "connect";
  let requestedMethod = null;
  let observedValue = null;
  let identifyObservedMethod = false;

  if (!match) {
    const declaredFocus = /^נושא\s+המחקר\s+(?:(?:המילה|הביטוי|השם)\s+)?(.+?)\s+בשיטת\s+(.+)$/u.exec(q);
    if (declaredFocus) {
      match = [declaredFocus[0], declaredFocus[1]];
      requestedMethod = canonicalRequestedMethod(declaredFocus[2]);
      requestedAction = "research";
    }
  }

  if (!match) {
    const observedResult = /^(\d{1,6})\s+ב(?:(?:מילה|ביטוי|שם)\s+)?(.+?)\s+מה\s+(?:זה|זאת)\s+התוצאה$/u.exec(q);
    if (observedResult) {
      match = [observedResult[0], observedResult[2]];
      observedValue = Number(observedResult[1]);
      identifyObservedMethod = true;
      requestedAction = "research";
    }
  }

  if (!match) {
    const focusedValue = /^(?:מה\s+(?:אתה\s+אומר|את\s+אומרת|דעתך)\s+על|(?:תסביר|הסבר|תסבירי|הסבירי)(?:\s+לי)?(?:\s+את)?)\s+(\d{1,12})\s+ה?(.{2,60}?)\s+של\s+(?:(?:המילה|הביטוי|השם)\s+)?(.+)$/u.exec(q);
    if (focusedValue) {
      match = [focusedValue[0], focusedValue[3]];
      requestedMethod = clean(focusedValue[2], 60);
      const numeric = Number(focusedValue[1]);
      observedValue = Number.isSafeInteger(numeric) && numeric >= 1 ? numeric : null;
      requestedAction = "research";
    }
  }

  // A method-focused request still researches the expression, not the method word. The method
  // token is only a requested lens; the canonical calculation profile later validates whether it
  // is an actual active method. This keeps the grammar structural without maintaining a vocabulary
  // list of every present or future Gematria method.
  if (!match) {
    // Method-focused language is parsed by grammatical slots, never by a list of method names.
    // The first slot is an arbitrary bounded lens/method (present or future); the second is the
    // exact Hebrew expression to research. This admits natural variants such as "מה אומר...",
    // "מה משמעות..." and "איך מפרשים..." without letting a verb or a method label become the
    // research subject. The canonical method profile remains the authority that later decides
    // whether the requested lens actually exists.
    const focused = /^(?:(?:מה\s+(?:יש\s+לך|ידוע(?:\s+לך)?)\s+על)|(?:מה\s+(?:אומר(?:ת)?|מראה|מלמד(?:ת)?|מגלה))|(?:מה\s+(?:ה?משמעות|ה?פירוש)(?:\s+של)?)|(?:איך\s+(?:מפרשים|מפרשות|לפרש)(?:\s+את)?)|(?:ספר(?:י)?(?:\s+לי)?\s+על)|(?:(?:תמצא|תמצאי|מצא|מצאי)(?:\s+לי)?\s+מידע\s+על)|(?:(?:תסביר|הסבר|תסבירי|הסבירי)(?:\s+לי)?\s+את))\s+(.{2,60}?)\s+של\s+(?:(?:המילה|הביטוי|השם)\s+)?(.+)$/u.exec(q);
    if (focused) {
      match = [focused[0], focused[2]];
      requestedMethod = canonicalRequestedMethod(focused[1]);
      requestedAction = "research";
    }
  }

  if (!match) {
    match = /^מה\s+זה\s+(.+?)\s+בגימטרי[הא](?:\s+ו(?:מה|אילו)\s+(?:ההצלבות|הקשרים)(?:\s+(?:שיש|שלו|שלה|קיימים|קיימות))?)?$/u.exec(q);
    requestedAction = /(?:הצלבות|קשרים)/u.test(q) ? "connect" : "research";
  }
  if (!match) {
    match = /^מה\s+(?:הגימטרי[הא]|הערך)\s+של\s+(.+?)(?:\s+ו(?:מה|אילו)\s+(?:ההצלבות|הקשרים)(?:\s+(?:שיש|שלו|שלה|קיימים|קיימות))?)?$/u.exec(q);
    requestedAction = /(?:הצלבות|קשרים)/u.test(q) ? "connect" : "research";
  }
  if (!match) {
    match = /^(?:כמה\s+(?:זה|שווה)|מה\s+שווה)\s+(.+?)\s+בגימטרי[הא]$/u.exec(q);
    requestedAction = "research";
  }
  if (!match) {
    match = /^(?:בדוק|בדקי|תבדוק|תבדקי|תן|תני)(?:\s+לי)?(?:\s+את)?\s+(?:הגימטרי[הא]|הערך\s+הגימטרי)\s+(?:של\s+)?(.+?)(?:\s+(?:ומצא|וחפש|ובדוק)(?:\s+לי)?\s+(?:הצלבות|קשרים))?$/u.exec(q);
    requestedAction = /(?:הצלבות|קשרים)/u.test(q) ? "connect" : "research";
  }
  if (!match) {
    match = /^(?:תחשב|חשב|חשבי|תחשבי)(?:\s+לי)?(?:\s+את)?(?:\s+(?:המילה|הביטוי|השם))?\s+(.+?)(?:\s+(?:ומצא|וחפש|ובדוק)(?:\s+לי)?\s+(?:הצלבות|קשרים))?$/u.exec(q);
    requestedAction = /(?:הצלבות|קשרים)/u.test(q) ? "connect" : "research";
  }

  const label = match ? validExplicitHebrewExpression(match[1]) : null;
  if (!label) return null;
  return Object.freeze({
    type: "phrase",
    label,
    evidence_text: label,
    identity_key: `phrase:${label}`,
    source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    requested_action: requestedAction,
    ...(requestedMethod ? { requested_method: canonicalRequestedMethod(requestedMethod) } : {}),
    ...(observedValue != null ? { observed_value: observedValue } : {}),
    ...(identifyObservedMethod ? { identify_observed_method: true } : {}),
    explicit_text_computation: true,
  });
}

// Exact two-expression relation grammar. Both subjects must occupy the complete grammatical
// slots; this never scans arbitrary prose and never decides that a relationship exists. It only
// gives the existing canonical crossing path two bounded endpoints to verify.
export function resolveExplicitHebrewExpressionPairResearchSubject(question) {
  const q = grammarText(question);
  if (!q) return null;
  const match = /^(?:מה\s+(?:הקשר|היחס|ההבדל)\s+בין|(?:מצא|מצאי|בדוק|בדקי|תבדוק|תבדקי)(?:\s+לי)?\s+(?:את\s+)?(?:הקשר|היחס)\s+בין)\s+(.+?)\s+(?:לבין\s+|מול\s+|עם\s+|ל(?=[\u0590-\u05ff])|ו(?=[\u0590-\u05ff]))(.+)$/u.exec(q);
  if (!match) return null;
  const expressions = [validExplicitHebrewExpression(match[1]), validExplicitHebrewExpression(match[2])];
  if (!expressions.every(Boolean) || expressions[0] === expressions[1]) return null;
  return Object.freeze({ expressions: Object.freeze(expressions), requested_action: "connect" });
}

function resolveCandidateExpressionPair(question) {
  const q = grammarText(question);
  const match = /^(?:השווה|השווי|תשווה)(?:\s+לי)?(?:\s+בין)?\s+(.+?)\s+(?:לבין\s+|מול\s+|עם\s+|ו(?=[\u0590-\u05ff]))(.+?)(?:\s+בכל\s+השיטות)?$/u.exec(q);
  if (!match) return null;
  const expressions = [validExplicitHebrewExpression(match[1]), validExplicitHebrewExpression(match[2])];
  return expressions.every(Boolean) && expressions[0] !== expressions[1] ? expressions : null;
}

// High-confidence two-number subject grammar shared by the browser resolver and the server
// re-authorization gate. The numerals must occupy the two complete grammatical subject slots, so
// years, pages, quantities and incidental numbers in prose are never promoted into research roots.
export function resolveExplicitNumericPairResearchSubject(question) {
  const q = grammarText(question);
  if (!q) return null;

  const research = /^(?:חקור|חקרי|תחקור|תחקירי|בדוק|בדקי|תבדוק|תבדקי)(?:\s+לי)?(?:\s+את)?(?:\s+המספרים)?\s+(\d{1,6})\s*(?:מול|לבין|עם|ל)\s*(\d{1,6})$/u.exec(q);
  const connect = /^(?:(?:השווה|השווי|תשווה)(?:\s+לי)?(?:\s+בין)?(?:\s+המספרים)?|(?:תעשה|תעשי|עשה|עשי|בצע|בצעי)(?:\s+לי)?(?:\s+את)?\s+(?:הצלבה|השוואה)(?:\s+בין)?(?:\s+המספרים)?|(?:הצלב|הצליבי)(?:\s+לי)?(?:\s+בין)?(?:\s+המספרים)?|(?:השוואה|הצלבה)\s+בין(?:\s+המספרים)?|מה\s+(?:הקשר|ההבדל)\s+בין(?:\s+המספרים)?|(?:מצא|מצאי|תמצא|תמצאי)(?:\s+לי)?(?:\s+את)?\s+(?:הקשר|קשר|היחס|יחס)\s+בין(?:\s+המספרים)?)\s+(\d{1,6})\s*(?:ו|ל|לבין|מול|עם)\s*(\d{1,6})(?:\s+(?:מצא(?:י)?(?:\s+לי)?\s+(?:קשרים|הצלבות)|בכל\s+השיטות|לעומק))?$/u.exec(q);
  const match = research ?? connect;
  if (!match) return null;
  const numbers = [Number(match[1]), Number(match[2])];
  if (!numbers.every((value) => Number.isSafeInteger(value) && value >= 1 && value <= 999999)) return null;
  if (numbers[0] === numbers[1]) return null;
  return Object.freeze({
    type: "number_pair",
    numbers: Object.freeze(numbers),
    requested_action: research ? "research" : "connect",
  });
}

// High-confidence structural resolver used on both sides of the client/server boundary.
// It resolves only one explicit decimal subject and rejects contextual numerals such as years,
// pages, counts and source quantities. Unknown wording still belongs to the bounded semantic
// classifier; this function is not a second planner and never supplies research facts.
export function resolveExplicitNumericResearchSubject(question) {
  const q = grammarText(question);
  if (!q) return null;
  const numericTokens = [...q.matchAll(/(?<!\d)\d{1,6}(?!\d)/gu)].map((match) => match[0]);
  if (numericTokens.length !== 1) return null;
  // A value beside an explicit Hebrew expression is that expression's observed value, not a new subject.
  if (resolveExplicitHebrewExpressionResearchSubject(q)?.observed_value != null) return null;
  const literal = numericTokens[0];
  const value = Number(literal);
  if (!Number.isSafeInteger(value) || value < 1 || value > 999999) return null;

  const relationalTail = new RegExp(`^(?:ומה|מה)\\s+(?:הקשר|ההבדל)\\s+(?:ל|עם)\\s*${escapePattern(literal)}$`, "u");
  if (relationalTail.test(q)) return Object.freeze({
    type: "number",
    value,
    label: literal,
    evidence_text: literal,
    identity_key: `number:${value}`,
    source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    requested_action: "connect",
  });

  const escaped = escapePattern(literal);
  const contextLabels = NUMERIC_CONTEXT_LABELS.join("|");
  const contextualBefore = new RegExp(`(?:^|\\s)(?:${contextLabels})\\s+(?:מספר\\s+)?${escaped}(?:$|\\s)`, "u");
  const contextualAfter = new RegExp(`(?:^|\\s)${escaped}\\s+(?:${contextLabels})(?:$|\\s)`, "u");
  const explicitRoleQuestion = /(?:^|\s)(?:האם|אם)(?:\s|$)/u.test(q)
    && /(?:^|\s)(?:שנה|עמוד|דף|כמות|מספר)(?:\s|$)/u.test(q);
  if (contextualBefore.test(q) || contextualAfter.test(q) || explicitRoleQuestion) return null;

  const exactNumber = q === literal;
  const explicitNumberNoun = new RegExp(`(?:^|\\s)ה?מספר\\s+${escaped}(?:$|\\s)`, "u").test(q);
  const cuePrefix = q.slice(0, q.indexOf(literal));
  const researchCue = /(?:^|\s)(?:חקור|חקרי|תחקור|תחקירי|בדוק|בדקי|תבדוק|תבדקי|צלול|צללי|לצלול|העמק|העמיקי|תעמיק|תעמיקי|להעמיק)(?:\s|$)/u.test(cuePrefix);
  const connectionCue = /(?:^|\s)(?:קשר|קשרים|הצלבה|הצלבות|השווה|השווי|תשווה|לחבר)(?:\s|$)/u.test(cuePrefix);
  const explanationCue = /(?:^|\s)(?:מה|מהו|איזה|איזו|אילו|תן|תני|ספר|ספרי|הסבר|הסבירי|הראה|הראי|הצג|הציגי)(?:\s|$)/u.test(cuePrefix);
  if (!exactNumber && !explicitNumberNoun && !researchCue && !connectionCue && !explanationCue) return null;

  const requestedAction = connectionCue ? "connect" : researchCue ? "research" : "understand";
  return Object.freeze({
    type: "number",
    value,
    label: literal,
    evidence_text: literal,
    identity_key: `number:${value}`,
    source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    requested_action: requestedAction,
  });
}

function canonicalRequestResult(kind, action, subjects, extra = {}) {
  return Object.freeze({
    version: RAZIEL_CANONICAL_REQUEST_VERSION,
    status: "resolved",
    kind,
    action,
    subjects: Object.freeze(subjects.map((subject) => Object.freeze({ ...subject }))),
    requested_method: null,
    observed_value: null,
    identify_observed_method: false,
    all_methods: false,
    view_mode_only: false,
    ...extra,
  });
}

// One deterministic, whole-turn request shape shared by the temporary browser session and the
// server re-authorization boundary. It composes the existing canonical identity grammar; it does
// not calculate, choose a capability, authorize, execute or create another router. Keeping the
// semantic slots together prevents subject/method/value/action precedence from drifting between
// client and server as new Hebrew phrasings are added.
export function resolveRazielCanonicalRequest(question) {
  const q = grammarText(question);
  if (!q) return Object.freeze({
    version: RAZIEL_CANONICAL_REQUEST_VERSION,
    status: "unresolved",
    kind: null,
    action: null,
    subjects: Object.freeze([]),
    reason: "empty",
  });

  const continuation = resolveRazielExpressionContinuationDirective(q);
  if (continuation) return canonicalRequestResult(
    "expression_continuation",
    continuation.requested_action,
    [],
    {
      requested_method: continuation.requested_method,
      all_methods: continuation.all_methods === true,
      view_mode_only: continuation.view_mode_only === true,
    },
  );

  const numberPair = resolveExplicitNumericPairResearchSubject(q);
  if (numberPair) return canonicalRequestResult(
    "number_pair",
    numberPair.requested_action,
    numberPair.numbers.map((value) => ({
      type: "number",
      value,
      label: String(value),
      evidence_text: String(value),
      identity_key: `number:${value}`,
      source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    })),
  );

  const expressionPair = resolveExplicitHebrewExpressionPairResearchSubject(q);
  if (expressionPair) return canonicalRequestResult(
    "expression_pair",
    expressionPair.requested_action,
    expressionPair.expressions.map((expression) => expressionSubjectFromSlot({ expression, observedValue: null })),
  );

  const candidateExpressionPair = resolveCandidateExpressionPair(q);
  if (candidateExpressionPair) return canonicalRequestResult(
    "expression_pair_candidate",
    "connect",
    candidateExpressionPair.map((expression) => expressionSubjectFromSlot({ expression, observedValue: null })),
    { server_authorizable: false },
  );

  const expression = resolveExplicitHebrewExpressionResearchSubject(q);
  if (expression) return canonicalRequestResult("expression", expression.requested_action, [expression], {
    requested_method: expression.requested_method || null,
    observed_value: Number.isSafeInteger(expression.observed_value) ? expression.observed_value : null,
    identify_observed_method: expression.identify_observed_method === true,
    all_methods: expression.all_methods === true,
  });

  const number = resolveExplicitNumericResearchSubject(q);
  if (number) return canonicalRequestResult("number", number.requested_action, [number]);

  // Fail closed only when the user clearly invoked calculation/research grammar but omitted or
  // supplied conflicting subject slots. Ordinary conversation remains unresolved and may follow
  // the existing bounded semantic path. Context numerals (year/page/chapter/count) are excluded.
  const computationCue = /(?:^|\s)(?:גימטרי[הא]|גימטריות|חשב|חשבי|תחשב|תחשבי|חישוב|חישובי)(?:\s|$)/u.test(q);
  const contextualNumber = /(?:^|\s)(?:שנת|שנה|עמוד|דף|פרק|פסוק|כמות)\s+\d/u.test(q);
  if (computationCue && !contextualNumber) return Object.freeze({
    version: RAZIEL_CANONICAL_REQUEST_VERSION,
    status: "clarify",
    kind: "expression",
    action: "research",
    subjects: Object.freeze([]),
    reason: /(?:^|\s)\d{1,6}(?:\s|$)/u.test(q) ? "ambiguous_expression_value" : "missing_expression",
  });

  return Object.freeze({
    version: RAZIEL_CANONICAL_REQUEST_VERSION,
    status: "unresolved",
    kind: null,
    action: null,
    subjects: Object.freeze([]),
    reason: "no_deterministic_match",
  });
}

function hasOnlyKeys(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((key) => allowed.has(key) && !FORBIDDEN_AUTHORITY_KEYS.has(key));
}

function containsEvidence(question, evidence) {
  if (!question || !evidence) return false;
  const index = question.indexOf(evidence);
  if (index < 0) return false;
  if (!/^\d+$/u.test(evidence)) return true;
  const before = question[index - 1] || "";
  const after = question[index + evidence.length] || "";
  return !/\d/u.test(before) && !/\d/u.test(after);
}

function normalizeCandidate(raw, question) {
  if (!hasOnlyKeys(raw, CANDIDATE_KEYS)) return null;
  const type = clean(raw.type, 20).toLowerCase();
  const role = clean(raw.role, 20).toLowerCase();
  const evidence = clean(raw.evidence_text, 120);
  if (!TYPES.has(type) || role !== "subject" || !containsEvidence(question, evidence)) return null;

  if (type === "number") {
    if (!/^\d{1,6}$/u.test(evidence)) return null;
    const value = Number(raw.value);
    if (!Number.isSafeInteger(value) || value < 1 || value > 999999 || String(value) !== evidence) return null;
    return Object.freeze({
      type: "number",
      value,
      label: evidence,
      identity_key: `number:${value}`,
      source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.CANDIDATE,
    });
  }

  const label = clean(raw.label, 120);
  if (!label || label !== evidence || /^\d+$/u.test(label)) return null;
  return Object.freeze({
    type,
    label,
    identity_key: `${type}:${label}`,
    source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
    confidence: RESEARCH_IDENTITY_CONFIDENCE.CANDIDATE,
  });
}

export function validateRazielSemanticIntent(candidate, question) {
  if (!hasOnlyKeys(candidate, TOP_LEVEL_KEYS)) return null;
  if (candidate.version !== RAZIEL_SEMANTIC_INTENT_VERSION) return null;
  const currentQuestion = clean(question, 500);
  const status = clean(candidate.status, 20).toLowerCase();
  const action = clean(candidate.action, 20).toLowerCase();
  const confidence = clean(candidate.confidence, 20).toLowerCase();
  if (!currentQuestion || !["resolved", "clarify"].includes(status)) return null;

  if (status === "clarify" || candidate.ambiguous === true || confidence === "low") {
    return Object.freeze({
      version: RAZIEL_SEMANTIC_INTENT_VERSION,
      status: "clarify",
      action: null,
      candidates: Object.freeze([]),
      text_computation_requested: false,
      reason: clean(candidate.reason, 120) || "ambiguous",
    });
  }
  if (!ACTIONS.has(action) || !["high", "medium"].includes(confidence)) return null;
  if (candidate.text_computation_requested != null && typeof candidate.text_computation_requested !== "boolean") return null;
  const rawCandidates = Array.isArray(candidate.candidates) ? candidate.candidates : [];
  if (rawCandidates.length < 1 || rawCandidates.length > 2) return null;
  const candidates = rawCandidates.map((raw) => normalizeCandidate(raw, currentQuestion));
  if (candidates.some((item) => !item)) return null;
  const keys = candidates.map((item) => item.identity_key);
  if (new Set(keys).size !== keys.length) return null;

  return Object.freeze({
    version: RAZIEL_SEMANTIC_INTENT_VERSION,
    status: "resolved",
    action,
    confidence,
    candidates: Object.freeze(candidates),
    text_computation_requested: candidate.text_computation_requested === true,
    reason: clean(candidate.reason, 120) || null,
  });
}

export default validateRazielSemanticIntent;

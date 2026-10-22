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

const NUMERIC_CONTEXT_LABELS = [
  "שנת", "שנה", "עמוד", "דף", "פרק", "פסוק", "מקור", "מקורות",
  "שאלה", "שאלות", "תוצאה", "תוצאות", "קשר", "קשרים", "הצלבה", "הצלבות",
  "פעמים", "כמות",
];

function escapePattern(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const literal = numericTokens[0];
  const value = Number(literal);
  if (!Number.isSafeInteger(value) || value < 1 || value > 999999) return null;

  const escaped = escapePattern(literal);
  const contextLabels = NUMERIC_CONTEXT_LABELS.join("|");
  const contextualBefore = new RegExp(`(?:^|\\s)(?:${contextLabels})\\s+(?:מספר\\s+)?${escaped}(?:$|\\s)`, "u");
  const contextualAfter = new RegExp(`(?:^|\\s)${escaped}\\s+(?:${contextLabels})(?:$|\\s)`, "u");
  const explicitRoleQuestion = /(?:^|\s)(?:האם|אם)(?:\s|$)/u.test(q)
    && /(?:^|\s)(?:שנה|עמוד|דף|כמות|מספר)(?:\s|$)/u.test(q);
  if (contextualBefore.test(q) || contextualAfter.test(q) || explicitRoleQuestion) return null;

  const exactNumber = q === literal;
  const explicitNumberNoun = new RegExp(`(?:^|\\s)המספר\\s+${escaped}(?:$|\\s)`, "u").test(q);
  const cuePrefix = q.slice(0, q.indexOf(literal));
  const researchCue = /(?:^|\s)(?:חקור|חקרי|תחקור|תחקירי|בדוק|בדקי|תבדוק|תבדקי|צלול|צללי|לצלול|העמק|העמיקי|תעמיק|תעמיקי|להעמיק)(?:\s|$)/u.test(cuePrefix);
  const connectionCue = /(?:^|\s)(?:קשר|קשרים|הצלבה|הצלבות|השווה|השווי|תשווה|לחבר)(?:\s|$)/u.test(cuePrefix);
  const explanationCue = /(?:^|\s)(?:מה|מהו|תן|תני|ספר|ספרי|הסבר|הסבירי|הראה|הראי|הצג|הציגי)(?:\s|$)/u.test(cuePrefix);
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

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

// SOD1820 — bounded public Number Research Run request contract v1.
//
// This module is intentionally PURE and owns no execution, transport, DB or trace state. It only
// validates/normalizes an inbound request into the exact shape composeResearchW2() expects, per the
// "no identity inference" principle: an explicit canonical non-negative Number literal becomes the
// ONE candidate identity, never a text/label guess. Deterministic capabilities only are allowed —
// `numeric` and `numeric_operators` — because this is the bounded public Number Golden, not a general
// Research Run contract. Widening the allowed capability set is a decision for the canonical owner,
// never something this validator infers from a request.

import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
} from "./researchIdentityResolver.js";
import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";
import { buildResearchIntakeTransport } from "./researchIntakeTransport.js";
import { normalizeForCalc, onlyHeb } from "../gematria.js";

export const PUBLIC_NUMBER_RESEARCH_RUN_CONTRACT = "public-number-research-run-v1";
export const PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT = "public-expression-crossing-run-v1";
export const PUBLIC_EXPRESSION_CROSSING_CAPABILITY = RESEARCH_CAPABILITY.CROSSINGS;
export const PUBLIC_EXPRESSION_RESEARCH_CAPABILITIES = Object.freeze([
  RESEARCH_CAPABILITY.GEMATRIA,
  PUBLIC_EXPRESSION_CROSSING_CAPABILITY,
]);
export const PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT = "personal-gematria-pair-run-v1";
export const PERSONAL_GEMATRIA_PAIR_CAPABILITY = RESEARCH_CAPABILITY.GEMATRIA_RELATIONS;
export const PERSONAL_GEMATRIA_PAIR_MAX_CODEPOINTS = 160;
export const PERSONAL_GEMATRIA_PAIR_MAX_UTF8_BYTES = 640;

export const PUBLIC_NUMBER_RESEARCH_CAPABILITIES = Object.freeze([
  "numeric",
  "numeric_operators",
]);

const ALLOWED_CAPABILITIES = new Set(PUBLIC_NUMBER_RESEARCH_CAPABILITIES);
const ALLOWED_SURFACES = new Set(["number", "heichal", "world", "system"]);
const PAIR_ALLOWED_SURFACES = new Set([...ALLOWED_SURFACES, "raziel"]);
const EXPRESSION_ALLOWED_SURFACES = PAIR_ALLOWED_SURFACES;
const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f-\u009f]/u;

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

// Canonical non-negative integer literal only — never a parsed/derived/inferred value. Bounded to 12
// digits so it can never collide with an unrelated numeric-looking identifier from another owner.
function exactCanonicalNumber(value) {
  const text = clean(value);
  if (!/^\d{1,12}$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function exactPairExpression(value, index) {
  if (typeof value !== "string") {
    throw new TypeError(`research-run: expression ${index + 1} must be a string`);
  }
  const expression = value.trim();
  if (!expression) {
    throw new TypeError(`research-run: expression ${index + 1} must not be empty`);
  }
  if (CONTROL_CHARACTER_RE.test(expression)) {
    throw new TypeError(`research-run: expression ${index + 1} contains control characters`);
  }
  if (Array.from(expression).length > PERSONAL_GEMATRIA_PAIR_MAX_CODEPOINTS) {
    throw new TypeError(`research-run: expression ${index + 1} exceeds the character limit`);
  }
  if (new TextEncoder().encode(expression).byteLength > PERSONAL_GEMATRIA_PAIR_MAX_UTF8_BYTES) {
    throw new TypeError(`research-run: expression ${index + 1} exceeds the byte limit`);
  }
  const normalized = normalizeForCalc(expression);
  if (!normalized || onlyHeb(normalized).length === 0) {
    throw new TypeError(`research-run: expression ${index + 1} requires Hebrew text`);
  }
  return { expression, normalized };
}

function exactPublicCrossingExpression(value) {
  const parsed = exactPairExpression(value, 0);
  return parsed;
}

/**
 * Validate and normalize an inbound public Number Research Run request.
 *
 * Throws a TypeError (never returns a partial/best-effort object) when the request does not meet the
 * bounded contract — the caller (the research-run Edge transport) is expected to translate that into
 * a 400 response before any capability gate, trace or executor ever runs.
 */
export function normalizePublicNumberResearchRunRequest(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("research-run: object body required");
  }

  const number = exactCanonicalNumber(input.number);
  if (number == null) {
    throw new TypeError("research-run: canonical non-negative number required");
  }

  const requested = Array.isArray(input.requested_capabilities)
    ? [...new Set(input.requested_capabilities.map(clean).filter(Boolean))]
    : [...PUBLIC_NUMBER_RESEARCH_CAPABILITIES];
  if (requested.length === 0) {
    throw new TypeError("research-run: at least one requested capability is required");
  }

  const disallowed = requested.filter((key) => !ALLOWED_CAPABILITIES.has(key));
  if (disallowed.length) {
    throw new TypeError(`research-run: capability not allowed in ${PUBLIC_NUMBER_RESEARCH_RUN_CONTRACT}: ${disallowed.join(",")}`);
  }

  const surface = clean(input.surface) || "number";
  if (!ALLOWED_SURFACES.has(surface)) {
    throw new TypeError("research-run: unsupported surface");
  }

  const question = clean(input.question).slice(0, 500) || String(number);

  return Object.freeze({
    contract: PUBLIC_NUMBER_RESEARCH_RUN_CONTRACT,
    number,
    question,
    intent: "research",
    visitor_id: clean(input.visitor_id) || null,
    interaction_id: clean(input.interaction_id).slice(0, 180) || null,
    requested_capabilities: Object.freeze(requested),
    identity_candidates: Object.freeze([Object.freeze({
      type: "number",
      value: number,
      label: String(number),
      ref: `number:${number}`,
      source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
      access: Object.freeze({ tier: "public" }),
    })]),
    surface_context: Object.freeze({
      surface,
      subject: Object.freeze({
        type: "number",
        id: String(number),
        label: String(number),
      }),
    }),
  });
}

/**
 * Validate the authenticated, ephemeral two-expression Gematria relation contract.
 *
 * Personal text is deliberately carried only by the existing Research Intake transport. The
 * returned question/surface/plan inputs are generic, caller-declared authority/publication fields
 * are ignored, and no persistence intent is accepted. The Edge boundary still owns authentication.
 */
export function normalizePersonalGematriaPairResearchRunRequest(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("research-run: object body required");
  }
  if (!Array.isArray(input.expressions) || input.expressions.length !== 2) {
    throw new TypeError("research-run: exactly two expressions are required");
  }

  const endpoints = input.expressions.map(exactPairExpression);
  if (endpoints[0].normalized === endpoints[1].normalized) {
    throw new TypeError("research-run: expressions must be distinct after canonical normalization");
  }

  const surface = clean(input.surface) || "raziel";
  if (!PAIR_ALLOWED_SURFACES.has(surface)) {
    throw new TypeError("research-run: unsupported surface");
  }

  const intake = buildResearchIntakeTransport({
    rawInput: null,
    representations: endpoints.map(({ expression }, index) => ({
      kind: "expression",
      content: expression,
      role: index === 0 ? "pair_left" : "pair_right",
      language: "he",
      script: "Hebr",
      access: { tier: "personal" },
    })),
    identityCandidates: [],
    origin: { channel: "web", surface },
    persistence: { mode: "ephemeral", persisted_ref: null },
    accessTier: "personal",
  });

  return Object.freeze({
    contract: PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT,
    question: "השוואה קנונית בין שני ביטויים",
    intent: "gematria_relation",
    visitor_id: null,
    interaction_id: clean(input.interaction_id).slice(0, 180) || null,
    requested_capabilities: Object.freeze([PERSONAL_GEMATRIA_PAIR_CAPABILITY]),
    identity_candidates: Object.freeze([]),
    intake,
    surface_context: Object.freeze({
      surface,
      subject: Object.freeze({
        type: "expression_pair",
        id: "ephemeral-personal-pair",
        label: "שני ביטויים",
      }),
    }),
  });
}

/**
 * Validate the public, ephemeral single-expression corpus-crossing contract.
 *
 * This contract is deliberately narrower than general Gematria research: it admits one bounded
 * Hebrew expression and one fixed calculation+crossing plan. Caller-supplied capability,
 * authority, publication, persistence and ranking fields are ignored, so the request cannot widen
 * the execution plan.
 */
export function normalizePublicExpressionCrossingResearchRunRequest(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("research-run: object body required");
  }

  const { expression, normalized } = exactPublicCrossingExpression(input.expression);
  const surface = clean(input.surface) || "raziel";
  if (!EXPRESSION_ALLOWED_SURFACES.has(surface)) {
    throw new TypeError("research-run: unsupported surface");
  }

  return Object.freeze({
    contract: PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT,
    expression,
    normalized_expression: normalized,
    question: "חיפוש הצלבות קנוני במאגר הציבורי",
    intent: "gematria_crossing",
    visitor_id: clean(input.visitor_id) || null,
    interaction_id: clean(input.interaction_id).slice(0, 180) || null,
    requested_capabilities: PUBLIC_EXPRESSION_RESEARCH_CAPABILITIES,
    identity_candidates: Object.freeze([Object.freeze({
      type: "phrase",
      value: expression,
      label: expression,
      ref: `phrase:${normalized}`,
      source: RESEARCH_IDENTITY_SOURCE.TEXT_MATCH,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
      access: Object.freeze({ tier: "public" }),
    })]),
    surface_context: Object.freeze({
      surface,
      subject: Object.freeze({
        type: "phrase",
        id: `phrase:${normalized}`,
        label: expression,
      }),
    }),
  });
}

/**
 * Backward-compatible transport dispatcher. Requests without an explicit contract remain the
 * public Number v1 contract byte-for-byte; the personal pair path is opt-in only.
 */
export function normalizeResearchRunRequest(input = {}) {
  const contract = clean(input?.contract);
  if (!contract || contract === PUBLIC_NUMBER_RESEARCH_RUN_CONTRACT) {
    return normalizePublicNumberResearchRunRequest(input);
  }
  if (contract === PUBLIC_EXPRESSION_CROSSING_RESEARCH_RUN_CONTRACT) {
    return normalizePublicExpressionCrossingResearchRunRequest(input);
  }
  if (contract === PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT) {
    return normalizePersonalGematriaPairResearchRunRequest(input);
  }
  // Keep error text static: an untrusted contract field must not become a reflected/loggable input.
  throw new TypeError("research-run: unsupported contract");
}

export default normalizePublicNumberResearchRunRequest;

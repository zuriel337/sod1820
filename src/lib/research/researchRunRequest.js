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

export const PUBLIC_NUMBER_RESEARCH_RUN_CONTRACT = "public-number-research-run-v1";

export const PUBLIC_NUMBER_RESEARCH_CAPABILITIES = Object.freeze([
  "numeric",
  "numeric_operators",
]);

const ALLOWED_CAPABILITIES = new Set(PUBLIC_NUMBER_RESEARCH_CAPABILITIES);
const ALLOWED_SURFACES = new Set(["number", "heichal", "world", "system"]);

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

export default normalizePublicNumberResearchRunRequest;

import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
} from "./researchIdentityResolver.js";

export const PUBLIC_NUMBER_RESEARCH_CAPABILITIES = Object.freeze([
  "numeric",
  "numeric_operators",
]);

const ALLOWED = new Set(PUBLIC_NUMBER_RESEARCH_CAPABILITIES);

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function exactNumber(value) {
  const text = clean(value);
  if (!/^\d{1,12}$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function normalizePublicNumberResearchRunRequest(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("research-run: object body required");
  }

  const number = exactNumber(input.number);
  if (number == null) {
    throw new TypeError("research-run: canonical non-negative number required");
  }

  const requested = Array.isArray(input.requested_capabilities)
    ? [...new Set(input.requested_capabilities.map(clean).filter(Boolean))]
    : [...PUBLIC_NUMBER_RESEARCH_CAPABILITIES];

  const disallowed = requested.filter((key) => !ALLOWED.has(key));
  if (disallowed.length) {
    throw new TypeError("research-run: capability not allowed in public-number-v1: " + disallowed.join(","));
  }

  const surface = clean(input.surface) || "number";
  if (!["number", "heichal", "world", "system"].includes(surface)) {
    throw new TypeError("research-run: unsupported surface");
  }

  const question = clean(input.question).slice(0, 500) || String(number);

  return Object.freeze({
    contract: "public-number-research-run-v1",
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
      ref: "number:" + number,
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

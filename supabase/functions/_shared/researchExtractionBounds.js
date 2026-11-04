const POSTGRES_INTEGER_MIN = -2_147_483_648;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

export const DEFAULT_RESEARCH_OUTPUT_TOKENS = 4_096;
export const ENGINE_OUTPUT_REPAIR_TOKENS = 8_192;

function boundedIntegerOrNull(value, min, max) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  if (!Number.isSafeInteger(integer) || integer < min || integer > max) return null;
  return integer;
}

// research_objects.value is a PostgreSQL integer. A model-supplied value outside
// that range is not clamped because a clamp would manufacture a different claim.
export function postgresIntegerOrNull(value) {
  return boundedIntegerOrNull(value, POSTGRES_INTEGER_MIN, POSTGRES_INTEGER_MAX);
}

export function confidenceIntegerOrNull(value) {
  return boundedIntegerOrNull(value, 0, 100);
}

export function researchOutputTokenLimit(profile) {
  return profile === "engine_output_v2"
    ? ENGINE_OUTPUT_REPAIR_TOKENS
    : DEFAULT_RESEARCH_OUTPUT_TOKENS;
}

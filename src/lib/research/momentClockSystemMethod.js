import { makeUniversalFinding } from "./universalFinding.js";

// NASRALLAH_POST92_TEMPORAL_SOURCE_GOLDEN_V1 — TEMPORAL adapter of the existing Branch B System Method
// owner (numeric_rule_family_index) for moment_clock_law v2. It is NOT a Clock Engine, store or
// registry: it is a pure, deterministic Rule Application over a typed temporal observation.
//
//   Typed Temporal Observation (original display + local time + timezone + source_ref)
//     -> CLOCK_24H_CONCAT / CLOCK_12H_CONCAT   (the only two representations the law defines)
//
// Fail closed (CONTEXT_REQUIRED / reason codes) on malformed or ambiguous input. The rule_version is
// never defaulted: it must be attested by the caller from the live rule registry (nodes.rule_version).
// Seconds, dates, ordinals, digit joins and leading-zero scale logic are NOT implied by this law.
// Every representation of ONE occurrence is a DERIVATION of SAME_OCCURRENCE — never independent.

export const MOMENT_CLOCK_RULE_ID = "moment_clock_law";
export const MOMENT_CLOCK_ADAPTER = "numeric-rule-application-v1";
export const MOMENT_CLOCK_REPRESENTATION = Object.freeze({
  H24: "CLOCK_24H_CONCAT",
  H12: "CLOCK_12H_CONCAT",
});
export const MOMENT_CLOCK_REASON = Object.freeze({
  RULE_VERSION_UNATTESTED: "rule_version_not_attested",
  OBSERVATION_INVALID: "temporal_observation_invalid",
  DISPLAY_MISSING: "original_display_missing",
  DISPLAY_MISMATCH: "original_display_does_not_match_local_time",
  TIMEZONE_MISSING: "timezone_missing",
  SOURCE_REF_MISSING: "source_ref_missing",
  TIME_MALFORMED: "local_time_malformed",
  CONTEXT_REQUIRED: "CONTEXT_REQUIRED",
  MERIDIEM_INVALID: "meridiem_invalid",
});

const clean = (v) => (v == null ? null : String(v).trim() || null);
const TIME = /^(\d{1,2}):(\d{2})$/;

// Latin/Hebrew-agnostic: the original display must literally contain the HH:MM it claims.
function displayCarries(display, hh, mm) {
  const digits = display.replace(/[^\d:]/g, " ");
  return new RegExp(`(^|\\s)0?${Number(hh)}:${mm}(\\s|$)`).test(digits);
}

/**
 * Pure, deterministic Moment Clock transform.
 * @param {object} obs
 * @param {string} obs.original_display   exactly as the source shows it (e.g. "18:20")
 * @param {string} obs.local_time         "HH:MM" local to obs.timezone
 * @param {string} obs.timezone           IANA zone / explicit context of the source
 * @param {string} obs.source_ref
 * @param {"24h"|"12h"} [obs.clock_format] required when the hour is 1..12 (else CONTEXT_REQUIRED)
 * @param {"AM"|"PM"} [obs.meridiem]      required when clock_format is 12h
 * @returns {{ok:true, representations:Array, input:object}|{ok:false, reason:string}}
 */
export function applyMomentClockLaw(obs) {
  if (!obs || typeof obs !== "object") return { ok: false, reason: MOMENT_CLOCK_REASON.OBSERVATION_INVALID };
  const display = clean(obs.original_display);
  if (!display) return { ok: false, reason: MOMENT_CLOCK_REASON.DISPLAY_MISSING };
  if (!clean(obs.timezone)) return { ok: false, reason: MOMENT_CLOCK_REASON.TIMEZONE_MISSING };
  if (!clean(obs.source_ref)) return { ok: false, reason: MOMENT_CLOCK_REASON.SOURCE_REF_MISSING };
  const m = TIME.exec(clean(obs.local_time) || "");
  if (!m) return { ok: false, reason: MOMENT_CLOCK_REASON.TIME_MALFORMED };
  const hh = Number(m[1]);
  const mm = m[2];
  if (hh > 23 || Number(mm) > 59) return { ok: false, reason: MOMENT_CLOCK_REASON.TIME_MALFORMED };
  if (!displayCarries(display, hh, mm)) return { ok: false, reason: MOMENT_CLOCK_REASON.DISPLAY_MISMATCH };

  const format = clean(obs.clock_format);
  const meridiem = clean(obs.meridiem)?.toUpperCase() ?? null;
  if (meridiem && meridiem !== "AM" && meridiem !== "PM") return { ok: false, reason: MOMENT_CLOCK_REASON.MERIDIEM_INVALID };

  // Resolve the half-day. 12h -> 24h needs AM/PM; an hour 1..12 with neither format nor meridiem is
  // ambiguous and is never guessed (3:58 must not become 15:58).
  let hour24;
  if (format === "12h" || (!format && meridiem)) {
    if (!meridiem) return { ok: false, reason: MOMENT_CLOCK_REASON.CONTEXT_REQUIRED };
    if (hh < 1 || hh > 12) return { ok: false, reason: MOMENT_CLOCK_REASON.TIME_MALFORMED };
    hour24 = (hh % 12) + (meridiem === "PM" ? 12 : 0);
  } else if (format === "24h" || hh > 12 || hh === 0) {
    hour24 = hh;
  } else {
    return { ok: false, reason: MOMENT_CLOCK_REASON.CONTEXT_REQUIRED };
  }

  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const h24Digits = `${String(hour24).padStart(2, "0")}${mm}`;
  const h12Digits = `${hour12}${mm}`;
  return {
    ok: true,
    input: { original_display: display, local_time: `${String(hour24).padStart(2, "0")}:${mm}`, timezone: clean(obs.timezone), source_ref: clean(obs.source_ref), meridiem: hour24 >= 12 ? "PM" : "AM" },
    representations: [
      {
        representation: MOMENT_CLOCK_REPRESENTATION.H24,
        operation: "concat_24h_hhmm",
        shown: `${String(hour24).padStart(2, "0")}:${mm}`,
        // display digits are kept apart from the numeric value; a leading zero never triggers
        // Zero Scale / Zero Navigation (that needs its own explicit rule).
        display_digits: h24Digits,
        value: Number(h24Digits),
      },
      {
        representation: MOMENT_CLOCK_REPRESENTATION.H12,
        operation: "concat_12h_hmm_meridiem_as_context",
        shown: `${hour12}:${mm}`,
        display_digits: h12Digits,
        value: Number(h12Digits),
      },
    ],
  };
}

/**
 * Governed Rule Application Universal Finding (numeric-rule-application-v1 envelope) for ONE
 * representation of ONE clock occurrence. Same envelope family as every other System Method
 * application: rule_id/version/operation/input/output provenance in evidence.facts[0].
 */
export function momentClockRuleFinding({ occurrenceKey, input, representation, ruleVersion, eventRef = null, observationFindingId = null }) {
  const out = { value: representation.value, display_digits: representation.display_digits, representation: representation.representation };
  return makeUniversalFinding({
    kind: "numeric-operator",
    stage: null,
    subject: { type: "number", key: String(representation.value), label: String(representation.value), value: representation.value },
    source: {
      engine: null,
      adapter: MOMENT_CLOCK_ADAPTER,
      sourceRef: `${MOMENT_CLOCK_RULE_ID}:v${ruleVersion}`,
      method: MOMENT_CLOCK_RULE_ID,
      corpus: null,
      lang: null,
    },
    identity: {
      sourceIdentity: { ruleId: MOMENT_CLOCK_RULE_ID, ruleVersion, operation: representation.operation, occurrence: occurrenceKey, input: input.local_time, timezone: input.timezone },
      entityRef: `number:${representation.value}`,
      relationRef: null,
    },
    verification: { claimed_expression: null, claimed_method: null, claimed_value: null, engine_method_tested: null, engine_result: out, verification_state: "not_tested" },
    evidence: {
      refs: [`${MOMENT_CLOCK_RULE_ID}:v${ruleVersion}`, input.source_ref],
      facts: [{
        type: "rule-application",
        rule_id: MOMENT_CLOCK_RULE_ID,
        rule_version: ruleVersion,
        rule_version_source: "nodes.rule_version",
        operation: representation.operation,
        input: { ...input, occurrence_key: occurrenceKey },
        output: out,
        engine_ref: null,
        family: "zuriel_numeric_research_laws",
        public_family_name: "שיטות המערכת",
        dependency_class: "SAME_OCCURRENCE_DERIVATION",
        independent_evidence: false,
        boundary: "CLOCK_OCCURRENCE != CLOCK_REPRESENTATION != RULE_APPLICATION != GEMATRIA_CALCULATION != INDEPENDENT_EVIDENCE != INTERPRETATION != CANONICAL",
      }],
      score: null,
      confidence: null,
    },
    access: { tier: "public" },
    provenance: { createdBy: null, inputRef: input.source_ref, parentFindingIds: observationFindingId ? [observationFindingId] : [] },
    projection: {
      anchors: [{ space: "number", id: String(representation.value) }],
      relations: [],
      dimensions: { clockRepresentation: representation.representation, occurrence: occurrenceKey, eventCandidate: eventRef },
    },
  });
}

import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
  capabilityResult,
} from "./researchResultBundle.js";
import { resolveNumericRuleVersions } from "./researchW2ExecutorsBase.js";
import { EVENT_MEMBER_TYPE } from "./eventObservationCompiler.js";
import { ACCESS_TIER } from "./researchPlanV2.js";

// NASRALLAH_POST92_GOLDEN_V1 — typed temporal System Method adapter (moment_clock_law v2).
//
// EXTENDS the numeric_rule_family_index (Branch B / שיטות המערכת). It is NOT a new law, store,
// registry or engine, and it does not touch numeric_operators (which skips moment_clock_law on a
// bare number by design: a bare number carries no temporal input).
//
// Input is a strict, explicit Typed Temporal Observation — never a free-text parse:
//   { display:"18:20", hour:18, minute:20, timezone|context, source_ref, [date], [meridiem] }
//
//   CLOCK_OCCURRENCE != CLOCK_REPRESENTATION != RULE_APPLICATION != GEMATRIA_CALCULATION
//   != CONVERGENCE != INDEPENDENT_EVIDENCE != INTERPRETATION != CANONICAL != PUBLISHED
//
// Each representation is a deterministic DERIVATION of the SAME occurrence; none is independent
// evidence of another. The rule_version must be attested by the live nodes registry (injected
// reader/map, same seam as numeric_operators) and fail-closed otherwise. Dual-clock representation
// exists from v2, so an attestation below v2 is refused.

export const MOMENT_CLOCK_RULE_ID = "moment_clock_law";
export const MOMENT_CLOCK_MIN_VERSION = 2;
export const CLOCK_REPRESENTATION = Object.freeze({
  H24: "CLOCK_24H_CONCAT",
  H12: "CLOCK_12H_CONCAT",
});
export const CLOCK_OCCURRENCE_MEMBER_TYPE = EVENT_MEMBER_TYPE.CLOCK_TIME;
export const DAY_ORDINAL_MEMBER_TYPE = "day_ordinal_observation";

const RULE_ADAPTER = "numeric-rule-application-v1";
const clean = (v) => (v == null ? null : String(v).trim() || null);
const isInt = (v) => typeof v === "number" && Number.isSafeInteger(v);
const pad2 = (n) => String(n).padStart(2, "0");

// Temporal access inheritance. Reuses the existing ACCESS_TIER vocabulary; adds NO auth/access system.
// An explicit tier is mandatory on every temporal input: a missing or unknown tier fails closed and is
// never defaulted to public (otherwise a private/community/contributor input would be laundered public).
const TIER_RANK = Object.freeze({
  [ACCESS_TIER.PUBLIC]: 0,
  [ACCESS_TIER.PUBLIC_CANDIDATE]: 1,
  [ACCESS_TIER.PRIVATE]: 2,
  [ACCESS_TIER.PERSONAL]: 3,
});
export function normalizeAccessTier(v) {
  const t = clean(v);
  return t && Object.prototype.hasOwnProperty.call(TIER_RANK, t) ? t : null;
}
/** Most restrictive of the given tiers. Missing/unknown counts as private (fail closed), never public. */
export function mostRestrictiveTier(tiers = []) {
  let worst = ACCESS_TIER.PUBLIC;
  for (const raw of tiers) {
    const t = normalizeAccessTier(raw) ?? ACCESS_TIER.PRIVATE;
    if (TIER_RANK[t] > TIER_RANK[worst]) worst = t;
  }
  return worst;
}
/** Source refs that may ride on a capability record: only those of public-tier findings (the Bundle does not scrub them). */
export function publicSourceRefs(findings = []) {
  return [...new Set(findings.filter(f => f?.access?.tier === ACCESS_TIER.PUBLIC).map(f => f.source?.sourceRef).filter(Boolean))];
}

export function momentClockOccurrenceKey(obs) {
  return `clock:${obs.source_ref}:${obs.display}${obs.date ? `@${obs.date}` : ""}`;
}

/**
 * Strict normalizer for a Typed Temporal Observation. Fail closed (PR2): never coerces.
 * Returns { ok:true, observation } | { ok:false, reason }.
 */
export function normalizeClockObservation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "clock_observation_invalid" };
  const display = clean(input.display);
  const m = display && /^(\d{1,2}):(\d{2})$/.exec(display);
  if (!m) return { ok: false, reason: "clock_display_not_hh_mm" };
  if (!isInt(input.hour) || !isInt(input.minute)) return { ok: false, reason: "clock_hour_minute_must_be_explicit_integers" };
  if (input.hour < 0 || input.hour > 23 || input.minute < 0 || input.minute > 59) return { ok: false, reason: "clock_hour_minute_out_of_range" };
  if (Number(m[1]) !== input.hour || Number(m[2]) !== input.minute) return { ok: false, reason: "clock_display_disagrees_with_hour_minute" };
  const sourceRef = clean(input.source_ref);
  if (!sourceRef) return { ok: false, reason: "clock_source_ref_required" };
  const accessTier = normalizeAccessTier(input.accessTier);
  if (!accessTier) return { ok: false, reason: "clock_access_tier_required" };
  const timezone = clean(input.timezone);
  const context = clean(input.context);
  if (!timezone && !context) return { ok: false, reason: "clock_timezone_or_context_required" };
  // 12h->24h is never invented (ambiguity rule). Input here is 24h-local (hour is 0..23); a caller
  // that only knows a 12h display must resolve AM/PM itself, or the observation is CONTEXT_REQUIRED.
  const meridiem = clean(input.meridiem);
  if (meridiem && !["AM", "PM"].includes(meridiem)) return { ok: false, reason: "clock_meridiem_invalid" };
  if (meridiem && (meridiem === "PM") !== (input.hour >= 12)) return { ok: false, reason: "clock_meridiem_disagrees_with_hour" };
  const date = clean(input.date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: "clock_date_invalid" };
  return {
    ok: true,
    observation: {
      type: "clock_occurrence",
      display,
      hour: input.hour,
      minute: input.minute,
      timezone,
      context,
      source_ref: sourceRef,
      accessTier,
      date,
      meridiem: meridiem || (input.hour >= 12 ? "PM" : "AM"),
      label: clean(input.label),
    },
  };
}

/** Deterministic representations of ONE occurrence. Display digits stay separate from numeric output. */
export function clockRepresentations(obs) {
  const h12 = obs.hour % 12 === 0 ? 12 : obs.hour % 12;
  const digits24 = `${obs.hour}${pad2(obs.minute)}`;
  const digits12 = `${h12}${pad2(obs.minute)}`;
  return [
    { representation: CLOCK_REPRESENTATION.H24, display_digits: digits24, output: Number(digits24), display: `${obs.hour}:${pad2(obs.minute)}` },
    { representation: CLOCK_REPRESENTATION.H12, display_digits: digits12, output: Number(digits12), display: `${h12}:${pad2(obs.minute)}`, meridiem: obs.meridiem },
  ];
}

function anchorsFor(eventKey, postId, numbers = []) {
  const out = [{ space: "event_candidate", id: eventKey }];
  if (postId != null) out.push({ space: "post", id: String(postId) });
  for (const n of numbers) if (n != null) out.push({ space: "number", id: String(n) });
  return out;
}

export function clockOccurrenceFinding(obs, { eventKey, eventRef, postId = null, prominence = "default" }) {
  const key = momentClockOccurrenceKey(obs);
  return makeUniversalFinding({
    kind: "event-clock-time",
    stage: "candidate",
    subject: { type: "clock_time", key, label: obs.label || obs.display, value: null },
    source: { engine: null, adapter: "moment-clock-temporal-observation-v1", sourceRef: obs.source_ref, method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: eventKey, type: "clock_occurrence", key }, entityRef: null, relationRef: null },
    verification: {},
    evidence: {
      refs: [obs.source_ref],
      facts: [{
        type: "temporal-observation",
        temporal_kind: "CLOCK_OCCURRENCE",
        original_display: obs.display,
        local_hour: obs.hour,
        local_minute: obs.minute,
        meridiem: obs.meridiem,
        timezone: obs.timezone,
        context: obs.context,
        date: obs.date,
        source_ref: obs.source_ref,
        is_number: false,
        boundary: "a clock occurrence is a typed temporal observation, never Number 1820 and never a Gematria result",
      }],
    },
    access: { tier: obs.accessTier },
    provenance: { createdBy: null, inputRef: obs.source_ref, parentFindingIds: [] },
    projection: {
      // deliberately NO number anchor: occurrence != Number
      anchors: anchorsFor(eventKey, postId),
      relations: [],
      dimensions: { eventMemberType: CLOCK_OCCURRENCE_MEMBER_TYPE, eventCandidate: eventRef, prominence },
    },
  });
}

function representationFinding(obs, rep, version, occurrenceFinding, { eventKey, eventRef, postId, prominence }) {
  const sourceIdentity = { ruleId: MOMENT_CLOCK_RULE_ID, ruleVersion: version, operation: rep.representation, input: momentClockOccurrenceKey(obs) };
  return makeUniversalFinding({
    kind: "numeric-operator",
    stage: null,
    status: null,
    subject: { type: "number", key: String(rep.output), label: String(rep.output), value: rep.output },
    source: { engine: null, adapter: RULE_ADAPTER, sourceRef: `${MOMENT_CLOCK_RULE_ID}:v${version}`, method: MOMENT_CLOCK_RULE_ID, corpus: null, lang: null },
    identity: { sourceIdentity, occurrence: null, entityRef: `number:${rep.output}`, relationRef: null },
    verification: { claimed_expression: null, claimed_method: null, claimed_value: null, engine_method_tested: null, engine_result: { output: rep.output }, statement_lang: null, verification_state: "not_tested" },
    evidence: {
      refs: [`${MOMENT_CLOCK_RULE_ID}:v${version}`, obs.source_ref],
      facts: [{
        type: "rule-application",
        rule_id: MOMENT_CLOCK_RULE_ID,
        rule_version: version,
        rule_version_source: "nodes.rule_version",
        operation: rep.representation,
        input: momentClockOccurrenceKey(obs),
        output: {
          value: rep.output,
          display_digits: rep.display_digits,
          representation_display: rep.display,
          ...(rep.meridiem ? { meridiem_context: rep.meridiem } : {}),
        },
        original_temporal_input: { display: obs.display, hour: obs.hour, minute: obs.minute, timezone: obs.timezone, context: obs.context, source_ref: obs.source_ref, date: obs.date },
        occurrence_finding_id: occurrenceFinding.id,
        dependency_class: "SAME_OCCURRENCE_DERIVATION",
        independent_evidence: false,
        engine_ref: null,
        family: "zuriel_numeric_research_laws",
        public_family_name: "שיטות המערכת",
        boundary: "rule application never changes raw engine truth, canonical status or publication status; display digits are kept apart from the numeric output; no zero-scale is implied",
      }],
      score: null,
      confidence: null,
    },
    // The rule is public, but the application inherits the EXACT tier of the temporal occurrence it derives from.
    access: { tier: obs.accessTier, reason: "rule application inherits the access tier of its temporal occurrence" },
    provenance: { createdBy: `RULE:${MOMENT_CLOCK_RULE_ID}@v${version}`, inputRef: momentClockOccurrenceKey(obs), parentFindingIds: [occurrenceFinding.id] },
    projection: {
      anchors: anchorsFor(eventKey, postId, [rep.output]),
      relations: [],
      dimensions: {
        ruleApplication: { ruleId: MOMENT_CLOCK_RULE_ID, ruleVersion: version, operation: rep.representation },
        eventMemberType: "system_method_application",
        eventCandidate: eventRef,
        eventRole: "source",
        ruleTarget: rep.output,
        prominence: rep.representation === CLOCK_REPRESENTATION.H24 ? prominence : "depth",
      },
    },
    view: { rendererHints: { role: "rule-application" } },
  });
}

/**
 * Apply moment_clock_law to ONE typed clock occurrence.
 *
 * @param {object} p
 * @param {object} p.observation   strict Typed Temporal Observation (see normalizeClockObservation)
 * @param {object|Function} p.ruleVersions injected live nodes attestation ({moment_clock_law: 2} or reader)
 * @param {{key:string,ref:string,postId?:string|number}} p.event event-candidate anchor context
 * @returns {Promise<{ok:boolean, reason?:string, occurrence?:object, applications?:object[], capability:object}>}
 */
export async function applyMomentClockLaw({ observation, ruleVersions = null, event, prominence = "default" } = {}) {
  const fail = (reason) => ({
    ok: false,
    reason,
    occurrence: null,
    applications: [],
    capability: capabilityResult({
      key: "moment_clock_applications",
      owner: "numeric_rule_family_index",
      status: CAPABILITY_STATUS.UNVERIFIED,
      findings: [],
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      reason,
    }),
  });
  if (!event?.key || !event?.ref) return fail("event_context_required");
  const norm = normalizeClockObservation(observation);
  if (!norm.ok) return fail(norm.reason);
  const attested = await resolveNumericRuleVersions(ruleVersions);
  const version = attested.get(MOMENT_CLOCK_RULE_ID);
  if (version == null) return fail("rule_version_not_attested_by_live_registry");
  if (version < MOMENT_CLOCK_MIN_VERSION) return fail(`rule_version_below_v${MOMENT_CLOCK_MIN_VERSION}_dual_clock`);

  const obs = norm.observation;
  const ctx = { eventKey: event.key, eventRef: event.ref, postId: event.postId ?? null, prominence };
  const occurrence = clockOccurrenceFinding(obs, ctx);
  const reps = clockRepresentations(obs);
  const applications = reps.map(rep => representationFinding(obs, rep, version, occurrence, ctx));
  const outcomes = [
    { findingId: occurrence.id, evidenceRelation: EVIDENCE_RELATION.DERIVATION, dependsOn: [], reason: "typed temporal observation (source claim); not a Number and not a calculation" },
    ...applications.map(f => ({
      findingId: f.id,
      evidenceRelation: EVIDENCE_RELATION.DERIVATION,
      dependsOn: [occurrence.id],
      reason: `rule application of ${MOMENT_CLOCK_RULE_ID} v${version}; SAME_OCCURRENCE derivation, never independent corroboration`,
    })),
  ];
  return {
    ok: true,
    reason: null,
    occurrence,
    applications,
    representations: reps.map((r, i) => ({ finding_id: applications[i].id, representation: r.representation, output: r.output, display_digits: r.display_digits })),
    rule_version: version,
    capability: capabilityResult({
      key: "moment_clock_applications",
      owner: "numeric_rule_family_index",
      status: CAPABILITY_STATUS.EXECUTED,
      findings: [occurrence, ...applications],
      findingOutcomes: outcomes,
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      sourceRefs: publicSourceRefs([occurrence]),
      versionRefs: [`${MOMENT_CLOCK_RULE_ID}:v${version}`],
      trace: { applied: reps.map(r => ({ rule_id: MOMENT_CLOCK_RULE_ID, rule_version: version, operation: r.representation, version_source: "nodes.rule_version" })), skipped: [] },
    }),
  };
}

export default applyMomentClockLaw;

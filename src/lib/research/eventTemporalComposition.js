import { makeUniversalFinding } from "./universalFinding.js";
import { CAPABILITY_STATUS, ACCESS_CLASS, EVIDENCE_RELATION, SEMANTIC_CLASS, capabilityResult } from "./researchResultBundle.js";
import { normalizeAttribution, withAttribution } from "./eventSystemMethodRuntime.js";
import {
  DAY_ORDINAL_MEMBER_TYPE,
  applyMomentClockLaw,
  normalizeAccessTier,
  publicSourceRefs,
} from "./momentClockSystemMethod.js";

// EVENT_TEMPORAL_COMPOSITION — the ONE source-agnostic temporal composer for event consumers
// (Nasrallah Golden, Event Family members, future events). It only composes EXISTING owners:
// applyMomentClockLaw (moment_clock_law) for clock occurrences + representations, and the typed
// day-ordinal / alternate-source observation findings. It owns no store, registry, law or identity.
//   Repeated clock observations (different sources / displays) stay SEPARATE source observations;
//   differing displays are reported as an unresolved discrepancy, never reconciled or averaged.
//   Clock -> Number happens only inside moment_clock_law; this module never derives a Number itself.

export const ALTERNATE_OBSERVATION_MEMBER_TYPE = "alternate_temporal_observation";
export const PROMINENCE = Object.freeze({ DEFAULT: "default", DEPTH: "depth" });
export const UNRESOLVED_SOURCE_CONFLICT = "unresolved_source_conflict";

const clean = (v) => (v == null ? null : String(v).trim() || null);
const isInt = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

export function eventAnchors(eventKey, postId, numbers = []) {
  const out = [{ space: "event_candidate", id: eventKey }];
  if (postId != null) out.push({ space: "post", id: String(postId) });
  for (const n of numbers) if (n != null) out.push({ space: "number", id: String(n) });
  return out;
}

/** Strict typed DAY_ORDINAL observation. An ordinal is a position in a count, never a Gematria result. */
export function normalizeDayOrdinal(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "day_ordinal_invalid" };
  if (!isInt(input.ordinal) || input.ordinal < 1) return { ok: false, reason: "day_ordinal_must_be_explicit_positive_integer" };
  const sourceRef = clean(input.source_ref);
  if (!sourceRef) return { ok: false, reason: "day_ordinal_source_ref_required" };
  const counting = clean(input.counting_context);
  if (!counting) return { ok: false, reason: "day_ordinal_counting_context_required" };
  const accessTier = normalizeAccessTier(input.accessTier);
  if (!accessTier) return { ok: false, reason: "day_ordinal_access_tier_required" };
  return { ok: true, observation: { ordinal: input.ordinal, source_ref: sourceRef, counting_context: counting, accessTier, label: clean(input.label) } };
}

export function dayOrdinalFinding(obs, { eventKey, eventRef, postId }) {
  return makeUniversalFinding({
    kind: "event-day-ordinal",
    stage: "candidate",
    subject: { type: "day_ordinal", key: `${eventKey}:day_ordinal:${obs.ordinal}`, label: obs.label || `day ${obs.ordinal}`, value: null },
    source: { engine: null, adapter: "event-temporal-observation-v1", sourceRef: obs.source_ref, method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: eventKey, type: "day_ordinal", ordinal: obs.ordinal, countingContext: obs.counting_context }, entityRef: null, relationRef: null },
    verification: {},
    evidence: {
      refs: [obs.source_ref],
      facts: [{
        type: "temporal-observation",
        temporal_kind: "DAY_ORDINAL",
        ordinal: obs.ordinal,
        counting_context: obs.counting_context,
        source_ref: obs.source_ref,
        is_gematria_result: false,
        is_rule_application: false,
        number_representation: { number: obs.ordinal, relation: "source_representation_of_ordinal", engine_fact: false },
        boundary: "a day ordinal is a typed source observation; its Number representation is a research relation, not a calculation",
      }],
    },
    access: { tier: obs.accessTier },
    provenance: { createdBy: null, inputRef: obs.source_ref, parentFindingIds: [] },
    projection: {
      // anchoring to Number N lets Number context show it, WITHOUT claiming it is gematria.
      anchors: eventAnchors(eventKey, postId, [obs.ordinal]),
      relations: [{ type: "represented_as_number", target: { space: "number", id: String(obs.ordinal) }, kind: "research_relation", engine_fact: false }],
      dimensions: { eventMemberType: DAY_ORDINAL_MEMBER_TYPE, eventCandidate: eventRef, prominence: PROMINENCE.DEFAULT },
    },
  });
}

export function alternateObservationFinding(alt, { eventKey, eventRef, postId }) {
  const sourceRef = clean(alt?.source_ref);
  const attr = normalizeAttribution(alt?.attribution);
  if (!sourceRef || !attr.ok) return { ok: false, reason: !sourceRef ? "alternate_source_ref_required" : attr.reason };
  const accessTier = normalizeAccessTier(alt.accessTier);
  if (!accessTier) return { ok: false, reason: "alternate_access_tier_required" };
  const display = clean(alt.display);
  const dayOrdinal = isInt(alt.day_ordinal) ? alt.day_ordinal : null;
  if (!display && dayOrdinal == null) return { ok: false, reason: "alternate_observation_empty" };
  return {
    ok: true,
    finding: withAttribution(makeUniversalFinding({
      kind: "event-alternate-temporal-observation",
      stage: "candidate",
      subject: { type: "alternate_temporal_observation", key: `${eventKey}:alternate:${sourceRef}`, label: display || `day ${dayOrdinal}`, value: null },
      source: { engine: null, adapter: "event-temporal-observation-v1", sourceRef, method: null, corpus: null, lang: null },
      identity: { sourceIdentity: { eventCandidate: eventKey, type: "alternate_temporal_observation", sourceRef, display, dayOrdinal }, entityRef: null, relationRef: null },
      verification: { verification_state: clean(alt.verification_state) || "not_tested" },
      evidence: {
        refs: [sourceRef],
        facts: [{
          type: "temporal-observation",
          temporal_kind: "ALTERNATE_SOURCE_OBSERVATION",
          display,
          day_ordinal: dayOrdinal,
          timezone: clean(alt.timezone),
          source_ref: sourceRef,
          discrepancy: { against: "approved_site_reading", status: clean(alt.discrepancy_status) || "unreconciled", note: clean(alt.note), explain_why: "מקור נוסף מציג זמן אחר" },
          overrides_approved_reading: false,
        }],
      },
      access: { tier: accessTier },
      provenance: { createdBy: null, inputRef: sourceRef, parentFindingIds: [] },
      projection: {
        // No number anchor: a discrepancy source never competes on Number surfaces by default.
        anchors: eventAnchors(eventKey, postId),
        relations: [],
        dimensions: { eventMemberType: ALTERNATE_OBSERVATION_MEMBER_TYPE, eventCandidate: eventRef, prominence: PROMINENCE.DEPTH },
      },
    }), attr.attribution),
  };
}

/**
 * Read-only view of clock occurrence evidence over ALREADY-COMPOSED (and access-filtered) findings.
 * Shared by every consumer so no one re-implements conflict detection. Never derives a Number: it only
 * echoes rule applications produced by moment_clock_law (dimensions.ruleTarget).
 */
export function clockOccurrenceEvidence(findings = []) {
  const occ = findings.filter(f => f?.projection?.dimensions?.eventMemberType === "clock_time" && f.evidence?.facts?.[0]?.original_display);
  const ids = new Set(occ.map(f => f.id));
  const observations = occ.map(f => ({
    finding_id: f.id,
    display: f.evidence.facts[0].original_display,
    local_time: f.evidence.facts[0].original_display,
    source_ref: f.evidence.facts[0].source_ref ?? f.source?.sourceRef ?? null,
    timezone: f.evidence.facts[0].timezone ?? null,
  }));
  const representations = findings
    .filter(f => f?.projection?.dimensions?.ruleApplication?.ruleId === "moment_clock_law" && (f.provenance?.parentFindingIds ?? []).some(p => ids.has(p)))
    .map(f => ({ finding_id: f.id, representation: f.projection.dimensions.ruleApplication.operation, value: f.projection.dimensions.ruleTarget, parent_finding_ids: f.provenance.parentFindingIds }));
  const displays = new Set(observations.map(o => o.display));
  const conflict = observations.length > 1 && displays.size > 1
    ? { state: UNRESOLVED_SOURCE_CONFLICT, finding_ids: observations.map(o => o.finding_id), displays: [...displays].sort() }
    : null;
  return { observations, representations, conflict };
}

function mergeClockCapabilities(clocks) {
  const oks = clocks.filter(c => c.ok);
  if (oks.length === 0) return clocks[0]?.capability ?? null;
  if (oks.length === 1 && clocks.length === 1) return oks[0].capability;
  const caps = clocks.map(c => c.capability);
  return capabilityResult({
    key: "moment_clock_applications",
    owner: "numeric_rule_family_index",
    status: caps.some(c => c.status === CAPABILITY_STATUS.EXECUTED) ? CAPABILITY_STATUS.EXECUTED : caps[0].status,
    findings: caps.flatMap(c => c.findings),
    findingOutcomes: caps.flatMap(c => c.finding_outcomes),
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    semanticClass: SEMANTIC_CLASS.DERIVATION,
    sourceRefs: [...new Set(caps.flatMap(c => c.source_refs))],
    versionRefs: [...new Set(caps.flatMap(c => c.version_refs))],
    trace: { applied: caps.flatMap(c => c.trace?.applied ?? []), skipped: caps.flatMap(c => c.trace?.skipped ?? []) },
  });
}

/**
 * @param {object} p
 * @param {{key:string,ref:string,postId?:string|number|null}} p.event
 * @param {object|Array} [p.clockObservations] one or many strict typed clock observations
 * @param {object|null} [p.dayOrdinal]     undefined = not applicable; anything else is strictly validated
 * @param {object|null} [p.alternateObservation] optional caller-supplied discrepancy source
 * @param {object|Function|null} [p.ruleVersions] live nodes attestation for moment_clock_law
 * @returns clocks[], clock (first), dayFinding/day, altFinding, capabilities[], temporalFindings, conflict, refusals
 */
export async function composeEventTemporalObservations({
  event,
  clockObservations = undefined,
  dayOrdinal = undefined,
  alternateObservation = null,
  ruleVersions = null,
} = {}) {
  const eventKey = event?.key;
  const eventRef = event?.ref;
  const postId = event?.postId != null ? String(event.postId) : null;
  const ctx = { eventKey, eventRef, postId };
  const refusals = [];

  const list = clockObservations === undefined ? [] : Array.isArray(clockObservations) ? clockObservations : [clockObservations];
  const many = Array.isArray(clockObservations) && clockObservations.length > 1;
  const clocks = [];
  for (const obs of list) {
    const c = await applyMomentClockLaw({ observation: obs, ruleVersions, event: { key: eventKey, ref: eventRef, postId } });
    clocks.push(c);
    if (!c.ok) refusals.push({ part: "clock_occurrence", reason: c.reason, ...(many ? { source_ref: clean(obs?.source_ref) } : {}) });
  }

  let day = null;
  let dayFinding = null;
  if (dayOrdinal !== undefined) {
    day = normalizeDayOrdinal(dayOrdinal);
    if (day.ok) dayFinding = dayOrdinalFinding(day.observation, ctx);
    else refusals.push({ part: "day_ordinal", reason: day.reason });
  }

  let altFinding = null;
  if (alternateObservation != null) {
    const alt = alternateObservationFinding(alternateObservation, ctx);
    if (alt.ok) altFinding = alt.finding;
    else refusals.push({ part: "alternate_observation", reason: alt.reason });
  }

  const temporalFindings = [dayFinding, altFinding].filter(Boolean);
  const temporalCapability = temporalFindings.length ? capabilityResult({
    key: "event_temporal_observations",
    owner: "research_intake_foundation_contract_law",
    status: CAPABILITY_STATUS.EXECUTED,
    findings: temporalFindings,
    findingOutcomes: temporalFindings.map(f => ({
      findingId: f.id,
      evidenceRelation: EVIDENCE_RELATION.DERIVATION,
      dependsOn: [],
      reason: "typed source observation; not a calculation and not independent corroboration",
    })),
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    semanticClass: SEMANTIC_CLASS.CONTEXT,
    sourceRefs: publicSourceRefs(temporalFindings),
  }) : null;

  // Repeated clock observations: differing displays are an unresolved discrepancy (metadata over the
  // existing occurrence findings; no new finding, never reconciled).
  const conflict = clockOccurrenceEvidence(clocks.filter(c => c.ok).map(c => c.occurrence)).conflict;

  const capabilities = [clocks.length ? mergeClockCapabilities(clocks) : null, temporalCapability].filter(Boolean);
  return { clocks, clock: clocks[0] ?? null, day, dayFinding, altFinding, temporalCapability, capabilities, conflict, refusals };
}

export default composeEventTemporalObservations;

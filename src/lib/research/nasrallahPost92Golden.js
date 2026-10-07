import { makeUniversalFinding } from "./universalFinding.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { CAPABILITY_STATUS, ACCESS_CLASS, EVIDENCE_RELATION, SEMANTIC_CLASS, capabilityResult } from "./researchResultBundle.js";
import { EVENT_MEMBER_TYPE, eventCandidateRef } from "./eventObservationCompiler.js";
import {
  ATTRIBUTION_ROLE,
  SITE_INTERPRETATION_LABEL,
  compileEventObservationWithSystemMethods,
  normalizeAttribution,
  withAttribution,
} from "./eventSystemMethodRuntime.js";
import {
  DAY_ORDINAL_MEMBER_TYPE,
  applyMomentClockLaw,
  momentClockOccurrenceKey,
  mostRestrictiveTier,
  normalizeAccessTier,
  normalizeClockObservation,
  publicSourceRefs,
} from "./momentClockSystemMethod.js";

// NASRALLAH_POST92_GOLDEN_V1 — composition over the EXISTING event compiler / system-method runtime.
// No new owner, store, registry or law. Event stays a non-canonical candidate; nothing is minted.
//
//   CLOCK_OCCURRENCE != Number 1820      DAY_ORDINAL != Number 358
//   PublishedAt != OccurredAt            Post != Event
//   Rule Application != independent evidence
//   Gematria calculation != temporal observation
//   site interpretation != engine fact
//
// Human Gate default reading (work_log NASRALLAH_POST92_GOLDEN_HUMAN_GATE_TEMPORAL_READING_V1):
// 18:20 -> 1820 and day ordinal 358 -> Number 358. An alternate external observation is a separate
// source finding with discrepancy metadata and never mutates the approved reading or its ids.

export const NASRALLAH_POST92_CANDIDATE_KEY = "NASRALLAH_POST92";
export const ALTERNATE_OBSERVATION_MEMBER_TYPE = "alternate_temporal_observation";
export const INTERPRETATION_MEMBER_TYPE = "site_interpretation";
export const RESEARCH_CONTEXT_MEMBER_TYPE = "research_context";
export const PROMINENCE = Object.freeze({ DEFAULT: "default", DEPTH: "depth" });

const clean = (v) => (v == null ? null : String(v).trim() || null);
const isInt = (v) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

function anchors(eventKey, postId, numbers = []) {
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

function dayOrdinalFinding(obs, { eventKey, eventRef, postId }) {
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
      anchors: anchors(eventKey, postId, [obs.ordinal]),
      relations: [{ type: "represented_as_number", target: { space: "number", id: String(obs.ordinal) }, kind: "research_relation", engine_fact: false }],
      dimensions: { eventMemberType: DAY_ORDINAL_MEMBER_TYPE, eventCandidate: eventRef, prominence: PROMINENCE.DEFAULT },
    },
  });
}

function alternateObservationFinding(alt, { eventKey, eventRef, postId }) {
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
        anchors: anchors(eventKey, postId),
        relations: [],
        dimensions: { eventMemberType: ALTERNATE_OBSERVATION_MEMBER_TYPE, eventCandidate: eventRef, prominence: PROMINENCE.DEPTH },
      },
    }), attr.attribution),
  };
}

function interpretationFinding({ eventKey, eventRef, postId, numbers, parents, tier }) {
  const attribution = { role: ATTRIBUTION_ROLE.SITE_INTERPRETATION, display_name: SITE_INTERPRETATION_LABEL, source_id: null, work_title: null, contributor_id: null, channel: null };
  return withAttribution(makeUniversalFinding({
    kind: "event-site-interpretation",
    stage: "interpretation",
    subject: { type: "interpretation", key: `${eventKey}:site_interpretation:${numbers.join("+")}`, label: numbers.join(" · "), value: null },
    source: { engine: null, adapter: "event-golden-composition-v1", sourceRef: null, method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: eventKey, type: "site_interpretation", numbers, parents }, entityRef: null, relationRef: null },
    verification: { verification_state: "not_tested" },
    evidence: {
      refs: parents,
      facts: [{
        type: "site-interpretation",
        numbers,
        depends_on_finding_ids: parents,
        independent_evidence: false,
        is_engine_fact: false,
        boundary: "site interpretation over the temporal observation, day observation and engine finding; not an engine fact and not independent evidence",
      }],
    },
    // Derived tier: never less restrictive than any parent Finding.
    access: { tier, reason: "most restrictive tier of the parent findings" },
    provenance: { createdBy: null, inputRef: eventCandidateRef(eventKey), parentFindingIds: parents },
    projection: {
      anchors: anchors(eventKey, postId, numbers),
      relations: [],
      dimensions: { eventMemberType: INTERPRETATION_MEMBER_TYPE, eventCandidate: eventRef, prominence: PROMINENCE.DEFAULT },
    },
  }), attribution);
}

/**
 * Existing research_objects supplied as legacy/candidate CONTEXT (distinct from the compiler's
 * verified researchObjects evidence path). Reuses the canonical researchObjectToUniversalFinding
 * adapter; the overlay only appends event/post anchors and a member type, so finding.id,
 * identity.sourceIdentity, verification, access, source and status are preserved EXACTLY.
 * No Number anchor is derived from row.value. Row verification is never upgraded.
 */
function researchContextCapability(rows, { eventKey, eventRef, postId }) {
  const byId = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.id || byId.has(String(row.id))) continue;
    byId.set(String(row.id), row);
  }
  const findings = [];
  for (const row of byId.values()) {
    const base = researchObjectToUniversalFinding(row);
    if (!base) continue;
    findings.push({
      ...base,
      projection: {
        ...base.projection,
        anchors: [...base.projection.anchors, ...anchors(eventKey, postId)],
        dimensions: { ...base.projection.dimensions, eventMemberType: RESEARCH_CONTEXT_MEMBER_TYPE, eventCandidate: eventRef, prominence: PROMINENCE.DEPTH },
      },
    });
  }
  if (!findings.length) return null;
  return capabilityResult({
    key: "event_research_context",
    owner: "research_strategy_layer_law",
    status: CAPABILITY_STATUS.EXECUTED,
    findings,
    findingOutcomes: findings.map(f => ({
      findingId: f.id,
      evidenceRelation: EVIDENCE_RELATION.DERIVATION,
      dependsOn: [],
      reason: "legacy/candidate research context; verification preserved as-is, not independent evidence",
    })),
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    semanticClass: SEMANTIC_CLASS.CONTEXT,
  });
}

/**
 * Compose the NASRALLAH_POST92 Golden pack.
 *
 * @param {object} p
 * @param {object} p.post                  existing post row ({id, slug, date}) — source representation
 * @param {object} p.clockObservation      strict Typed Temporal Observation (display/hour/minute/timezone|context/source_ref)
 * @param {object} p.dayOrdinal            strict typed day ordinal ({ordinal, counting_context, source_ref})
 * @param {object|Function} p.ruleVersions live nodes attestation for moment_clock_law
 * @param {Function} p.receiptResolver     canonical Gematria Trace resolver (member) -> trace finding
 * @param {object} p.alternateObservation  optional caller-supplied discrepancy source ({display?, day_ordinal?, source_ref, attribution?, ...})
 * @param {string} p.legacyGraphOccurredAt optional auto_from_post graph value; recorded as drift, never consumed
 * @param {object} p.occurredAt            optional {at, source_ref}: an independently SOURCED event time
 * @param {Array}  p.supportingSources     generic seam, forwarded unchanged
 * @param {Array}  p.additionalExpressions further source-claimed expression members (same receipt gate; the primary `expression` still anchors the interpretation)
 * @param {Array}  p.contextResearchObjects existing research_objects rows as legacy/candidate CONTEXT (access-filtered by the Bundle)
 */
export async function compileNasrallahPost92Golden({
  post,
  clockObservation,
  dayOrdinal,
  ruleVersions = null,
  receiptResolver = null,
  alternateObservation = null,
  legacyGraphOccurredAt = null,
  occurredAt = null,
  supportingSources = [],
  expression = { expression: "משיח", method_key: "רגיל", claimed_value: 358 },
  additionalExpressions = [],
  humanGate = null,
  accessDescriptor = null,
  contextResearchObjects = [],
} = {}) {
  const key = NASRALLAH_POST92_CANDIDATE_KEY;
  const ref = eventCandidateRef(key);
  const postId = post?.id != null ? String(post.id) : null;
  const ctx = { eventKey: key, eventRef: ref, postId };
  const declaration = {
    key,
    label: key,
    ...(clean(occurredAt?.at) && clean(occurredAt?.source_ref) ? { occurred_at: occurredAt.at, occurred_at_source_ref: occurredAt.source_ref } : {}),
  };
  const refusals = [];

  const clock = await applyMomentClockLaw({ observation: clockObservation, ruleVersions, event: { key, ref, postId } });
  if (!clock.ok) refusals.push({ part: "clock_occurrence", reason: clock.reason });

  const day = normalizeDayOrdinal(dayOrdinal);
  let dayFinding = null;
  if (day.ok) dayFinding = dayOrdinalFinding(day.observation, ctx);
  else refusals.push({ part: "day_ordinal", reason: day.reason });

  let altFinding = null;
  if (alternateObservation != null) {
    const alt = alternateObservationFinding(alternateObservation, ctx);
    if (alt.ok) altFinding = alt.finding;
    else refusals.push({ part: "alternate_observation", reason: alt.reason });
  }

  const temporalFindings = [dayFinding, altFinding].filter(Boolean);
  const temporalOutcomes = temporalFindings.map(f => ({
    findingId: f.id,
    evidenceRelation: EVIDENCE_RELATION.DERIVATION,
    dependsOn: [],
    reason: "typed source observation; not a calculation and not independent corroboration",
  }));
  const temporalCapability = temporalFindings.length ? capabilityResult({
    key: "event_temporal_observations",
    owner: "research_intake_foundation_contract_law",
    status: CAPABILITY_STATUS.EXECUTED,
    findings: temporalFindings,
    findingOutcomes: temporalOutcomes,
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    semanticClass: SEMANTIC_CLASS.CONTEXT,
    sourceRefs: publicSourceRefs(temporalFindings),
  }) : null;

  const common = {
    candidate: declaration,
    post,
    members: [expression, ...(Array.isArray(additionalExpressions) ? additionalExpressions : [])]
      .map(e => ({ type: EVENT_MEMBER_TYPE.EXPRESSION_MATCH, ...e, source_ref: `post:${postId}` })),
    receiptResolver,
    accessDescriptor,
    supportingSources,
    humanGate,
  };
  const contextCapability = researchContextCapability(contextResearchObjects, ctx);
  const baseCaps = [clock.capability, temporalCapability, contextCapability].filter(Boolean);

  // Pass 1 (pure, deterministic) resolves the engine-finding id so the interpretation can declare its
  // dependency lineage; pass 2 adds the interpretation to the SAME bundle. Ids never change between passes.
  const first = await compileEventObservationWithSystemMethods({ ...common, extraCapabilities: baseCaps });
  const trace = first.bundle.findings.find(f => f.subject?.type === "expression" && f.source?.engine === "gematria"
    && Number(f.verification?.engine_result) === Number(expression.claimed_value));
  const k1820 = clock.ok ? clock.representations.find(r => r.representation === "CLOCK_24H_CONCAT") : null;

  let pack = first;
  let interpretation = null;
  if (clock.ok && dayFinding && trace && k1820) {
    const parents = [clock.applications[0].id, dayFinding.id, trace.id];
    // The engine Trace arrives through a public-source capability, where a tier-less Finding is public by
    // Result Bundle semantics; an explicit but unknown tier still fails closed inside mostRestrictiveTier.
    const tier = mostRestrictiveTier([clock.applications[0].access?.tier, dayFinding.access?.tier, trace.access?.tier ?? "public"]);
    interpretation = interpretationFinding({ ...ctx, numbers: [k1820.output, day.observation.ordinal], parents, tier });
    const interpCap = capabilityResult({
      key: "event_site_interpretation",
      owner: "research_strategy_layer_law",
      status: CAPABILITY_STATUS.EXECUTED,
      findings: [interpretation],
      findingOutcomes: [{
        findingId: interpretation.id,
        evidenceRelation: EVIDENCE_RELATION.DERIVATION,
        dependsOn: parents,
        reason: "interpretation depends on the temporal/day observations and the engine finding; not independent evidence",
      }],
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      semanticClass: SEMANTIC_CLASS.CONTEXT,
    });
    pack = await compileEventObservationWithSystemMethods({ ...common, extraCapabilities: [...baseCaps, interpCap] });
  } else {
    refusals.push({ part: "site_interpretation", reason: "missing_dependency_clock_day_or_engine_trace" });
  }

  const byId = new Map(pack.bundle.findings.map(f => [f.id, f]));
  // Golden convenience metadata is OUTPUT too: it may only name Findings that survived the Bundle's
  // access filter, and may only echo a clock/day value whose source Finding survived.
  const seen = (id) => (id != null && byId.has(id) ? id : null);
  const visibleReps = clock.ok ? clock.representations.filter(r => byId.has(r.finding_id)) : [];
  const clockSeen = seen(clock.occurrence?.id) != null;
  const daySeen = seen(dayFinding?.id) != null;
  const k1820Seen = k1820 && byId.has(k1820.finding_id) ? k1820 : null;
  const defaultReading = pack.bundle.findings
    .filter(f => f.projection?.dimensions?.prominence === PROMINENCE.DEFAULT || f.verification?.engine_result === expression.claimed_value && f.source?.engine === "gematria")
    .map(f => f.id);
  const depthReading = pack.bundle.findings.filter(f => f.projection?.dimensions?.prominence === PROMINENCE.DEPTH).map(f => f.id);

  return {
    ...pack,
    golden: {
      task_key: "NASRALLAH_POST92_GOLDEN_V1",
      approved_reading: {
        clock: clockSeen ? (clockObservation?.display ?? null) : null,
        clock_24h_concat: k1820Seen?.output ?? null,
        day_ordinal: daySeen ? day.observation.ordinal : null,
      },
      clock_occurrence_finding_id: seen(clock.occurrence?.id),
      representations: visibleReps,
      day_ordinal_finding_id: seen(dayFinding?.id),
      engine_trace_finding_id: seen(trace?.id),
      interpretation_finding_id: seen(interpretation?.id),
      alternate_observation_finding_id: seen(altFinding?.id),
      default_reading_ids: defaultReading.filter(id => byId.has(id)),
      depth_reading_ids: depthReading.filter(id => byId.has(id)),
      refusals,
      legacy_graph_occurred_at: clean(legacyGraphOccurredAt)
        ? { value: clean(legacyGraphOccurredAt), origin: "auto_from_post", consumed_as_event_time: false, reason: "post-publication-derived; PublishedAt != OccurredAt" }
        : null,
    },
    invariants: {
      ...pack.invariants,
      clock_occurrence_is_not_number: true,
      day_ordinal_is_not_number_result: true,
      rule_application_is_not_independent_evidence: true,
      gematria_calculation_is_not_temporal_observation: true,
      site_interpretation_is_not_engine_fact: true,
      alternate_observation_never_overrides_approved_reading: true,
      legacy_auto_from_post_never_event_time: true,
    },
  };
}

export { momentClockOccurrenceKey, normalizeClockObservation };
export default compileNasrallahPost92Golden;

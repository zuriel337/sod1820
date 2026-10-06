import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
  capabilityResult,
  findingAccessDecision,
} from "./researchResultBundle.js";
import { ACCESS_TIER } from "./researchPlanV2.js";
import { eventCandidateRef } from "./eventObservationCompiler.js";
import { compileEventObservationWithSystemMethods, normalizeAttribution } from "./eventSystemMethodRuntime.js";
import {
  MOMENT_CLOCK_RULE_ID,
  MOMENT_CLOCK_REASON,
  applyMomentClockLaw,
  momentClockRuleFinding,
} from "./momentClockSystemMethod.js";

// NASRALLAH_POST92_TEMPORAL_SOURCE_GOLDEN_V1 — generic event temporal composition over the existing
// Context Compiler (extraCapabilities seam). Owns NO store/engine/registry/Event identity and writes
// nothing. It carries, as typed observations on the ONE Result Bundle:
//
//   * Occurrence evidence set — several source observations of when the SAME event happened
//     (e.g. a post's own claim vs a later authoritative source) with an explicit conflict state.
//     Nothing is overwritten, ranked away or declared canonical; published_at is never an occurrence.
//   * Moment Clock rule applications (moment_clock_law v2) per clock observation: CLOCK_24H/12H are
//     DERIVATIONS of SAME_OCCURRENCE, never independent evidence.
//   * Reported ordinals ("day 358") — typed ordinal observations with a counting-convention state.
//     They may anchor to Number N only when the source wording itself carries N; the anchor is a
//     research relation, not a Gematria result and not corroboration of N.
//   * A convergence card connecting a reported ordinal with an engine-verified value at the same
//     Number, preserving the different origin roles.

export const TEMPORAL_OBSERVATION_ROLE = Object.freeze({
  SOURCE_CLAIM: "source_claim",
  LATER_AUTHORITATIVE: "later_authoritative_source",
});
export const OCCURRENCE_CONFLICT_STATE = "unresolved_source_conflict";
export const COUNTING_CONVENTION = Object.freeze({
  UNRESOLVED: "unresolved",
  ATTESTED: "attested",
});

const clean = (v) => (v == null ? null : String(v).trim() || null);

// Source access tier (existing ACCESS_TIER vocabulary; the Result Bundle composition boundary owns the
// filtering). Every temporal observation / reported ordinal must carry an explicit tier from its
// source adapter — there is NO implicit public. Derived Findings inherit the tier of what they derive
// from, never weaker. Restrictiveness order is local and conservative; anything unrecognised is
// treated as the restricted fallback (private), never public.
const TIER_RANK = Object.freeze({
  [ACCESS_TIER.PUBLIC]: 0,
  [ACCESS_TIER.PUBLIC_CANDIDATE]: 1,
  [ACCESS_TIER.PRIVATE]: 2,
  [ACCESS_TIER.PERSONAL]: 3,
});
export const TEMPORAL_ACCESS_REASON = Object.freeze({
  MISSING: "access_tier_missing",
  INVALID: "access_tier_invalid",
});
const knownTier = (t) => { const v = clean(t); return v != null && Object.hasOwn(TIER_RANK, v) ? v : null; };
export function mostRestrictiveTier(tiers) {
  let best = null;
  for (const t of tiers) {
    const v = knownTier(t);
    if (!v) return ACCESS_TIER.PRIVATE;
    if (best == null || TIER_RANK[v] > TIER_RANK[best]) best = v;
  }
  return best ?? ACCESS_TIER.PRIVATE;
}
function admitTier(raw) {
  const t = clean(raw?.accessTier);
  if (!t) return { ok: false, reason: TEMPORAL_ACCESS_REASON.MISSING };
  if (!knownTier(t)) return { ok: false, reason: TEMPORAL_ACCESS_REASON.INVALID };
  return { ok: true, tier: t };
}
const ROLES = new Set(Object.values(TEMPORAL_OBSERVATION_ROLE));

function anchorsFor(candidate, post, extra = []) {
  const out = [{ space: "event_candidate", id: candidate.key }];
  if (post) out.push({ space: "post", id: post.id });
  return [...out, ...extra];
}

function observationFinding(candidate, post, obs, clockInput) {
  const role = obs.role;
  const attribution = obs.attribution ? normalizeAttribution(obs.attribution).attribution : null;
  return makeUniversalFinding({
    kind: "event-source-occurrence-observation",
    stage: role === TEMPORAL_OBSERVATION_ROLE.SOURCE_CLAIM ? "claim" : "evidence",
    subject: { type: "occurrence_observation", key: `${candidate.key}:occurrence:${obs.key}`, label: clean(obs.original_display) || obs.key, value: null },
    source: { engine: null, adapter: "event-temporal-observations-v1", sourceRef: clean(obs.source_ref), method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: candidate.key, observation: obs.key, sourceRef: clean(obs.source_ref) }, entityRef: null, relationRef: null },
    verification: { verification_state: "not_tested" },
    evidence: {
      refs: [clean(obs.source_ref)].filter(Boolean),
      facts: [{
        type: "occurrence-observation",
        role,
        source_ref: clean(obs.source_ref),
        original_display: clean(obs.original_display),
        local_date: clean(obs.local_date),
        local_time: clockInput?.local_time ?? clean(obs.local_time),
        timezone: clean(obs.timezone),
        // Hebrew date is a separate typed representation: never compared to / derived from the clock.
        hebrew_date_display: clean(obs.hebrew_date_display),
        source_verification_state: clean(obs.verification_state) || "unreviewed",
        // Occurrence evidence axis — explicitly NOT the publication axis.
        axis: "occurrence",
        published_at_is_occurrence: false,
        attribution,
        canonical: false,
      }],
    },
    access: { tier: obs.accessTier },
    provenance: { createdBy: null, inputRef: clean(obs.source_ref), parentFindingIds: [] },
    projection: {
      anchors: anchorsFor(candidate, obs.source_ref?.startsWith?.("post:") ? post : null),
      relations: [],
      dimensions: { eventMemberType: "source_occurrence_observation", eventCandidate: candidate.ref, observationRole: role, presentation: obs.selected === true ? "primary" : "depth", attribution },
    },
  });
}

function conflictFinding(candidate, post, observations, accessTier) {
  const ids = observations.map(o => o.findingId);
  return makeUniversalFinding({
    kind: "event-occurrence-conflict",
    stage: "evidence",
    subject: { type: "occurrence_conflict", key: `${candidate.key}:occurrence-conflict`, label: "source conflict on occurrence time", value: null },
    source: { engine: null, adapter: "event-temporal-observations-v1", sourceRef: null, method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: candidate.key, observations: observations.map(o => o.key).sort() }, entityRef: null, relationRef: null },
    verification: { verification_state: "not_tested" },
    evidence: {
      refs: observations.map(o => o.source_ref).filter(Boolean),
      facts: [{
        type: "occurrence-conflict",
        state: OCCURRENCE_CONFLICT_STATE,
        resolution: null,
        observations: observations.map(o => ({ finding_id: o.findingId, key: o.key, role: o.role, source_ref: o.source_ref, local_date: o.local_date ?? null, local_time: o.local_time, timezone: o.timezone })),
        differing: observations.differing,
        overwritten: false,
        none_declared_canonical: true,
        boundary: "conflict is preserved with provenance; no observation replaces another and the Human Gate decides any resolution",
      }],
    },
    access: { tier: accessTier },
    provenance: { createdBy: null, inputRef: null, parentFindingIds: ids },
    projection: {
      anchors: anchorsFor(candidate, null),
      relations: [],
      dimensions: { eventMemberType: "source_occurrence_conflict", eventCandidate: candidate.ref },
    },
  });
}

function ordinalFinding(candidate, post, ord) {
  const anchors = [];
  if (ord.anchored) anchors.push({ space: "number", id: String(ord.ordinal) });
  return makeUniversalFinding({
    kind: "event-reported-ordinal",
    stage: "claim",
    // subject.value stays null: a day ordinal is NOT the Number 358.
    subject: { type: "day_ordinal", key: `${candidate.key}:ordinal:${ord.key}`, label: `${ord.unit} ${ord.ordinal}`, value: null },
    source: { engine: null, adapter: "event-temporal-observations-v1", sourceRef: ord.source_ref, method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: candidate.key, ordinal: ord.key, ordinalValue: ord.ordinal, unit: ord.unit, sourceRef: ord.source_ref }, entityRef: null, relationRef: ord.anchored ? `number:${ord.ordinal}` : null },
    verification: { verification_state: "not_tested" },
    evidence: {
      refs: [ord.source_ref],
      facts: [{
        type: "reported-ordinal",
        origin: "reported_ordinal",
        ordinal: ord.ordinal,
        unit: ord.unit,
        epoch_label: ord.epoch_label,
        source_wording: ord.source_wording,
        source_ref: ord.source_ref,
        counting_convention_state: ord.counting_convention_state,
        counting_convention_note: ord.counting_convention_note,
        attested_independently: ord.counting_convention_state === COUNTING_CONVENTION.ATTESTED,
        // Number anchor = research relation only (source wording carries the value).
        number_anchor: ord.anchored ? { number: ord.ordinal, relation: "source_attested_research_anchor", gematria_result: false, corroborates_number: false } : null,
        attribution: ord.attribution,
        is_fact: false,
      }],
    },
    access: { tier: ord.accessTier },
    provenance: { createdBy: null, inputRef: ord.source_ref, parentFindingIds: [] },
    projection: {
      anchors: anchorsFor(candidate, ord.source_ref.startsWith("post:") ? post : null, anchors),
      relations: [],
      dimensions: { eventMemberType: "reported_ordinal", eventCandidate: candidate.ref, attribution: ord.attribution },
    },
  });
}

function convergenceCard(candidate, ordinalFindingId, engineFinding, ordinal, accessTier) {
  return makeUniversalFinding({
    kind: "event-ordinal-engine-convergence",
    stage: "interpretation",
    subject: { type: "number", key: `number:${ordinal}`, label: String(ordinal), value: ordinal },
    source: { engine: null, adapter: "event-temporal-observations-v1", sourceRef: null, method: null, corpus: null, lang: null },
    identity: { sourceIdentity: { eventCandidate: candidate.key, ordinalFinding: ordinalFindingId, engineFinding: engineFinding.id, number: ordinal }, entityRef: `number:${ordinal}`, relationRef: null },
    verification: { verification_state: "not_tested" },
    evidence: {
      refs: [],
      facts: [{
        type: "ordinal-engine-convergence",
        number: ordinal,
        members: [
          { finding_id: ordinalFindingId, origin_role: "reported_ordinal", calculated_by_gematria: false },
          { finding_id: engineFinding.id, origin_role: "engine_gematria_result", method: engineFinding.source?.method ?? null, expression: engineFinding.identity?.sourceIdentity?.expression ?? null },
        ],
        distinct_types_meet_at_number: true,
        ordinal_was_calculated_by_gematria: false,
        independent_evidence: false,
        boundary: "two differently-typed observations meet at one Number; neither corroborates the other and no identity collapses",
      }],
    },
    access: { tier: accessTier },
    provenance: { createdBy: null, inputRef: null, parentFindingIds: [ordinalFindingId, engineFinding.id] },
    projection: {
      anchors: anchorsFor(candidate, null, [{ space: "number", id: String(ordinal) }]),
      relations: [],
      dimensions: { eventMemberType: "ordinal_engine_convergence", eventCandidate: candidate.ref },
    },
  });
}

function buildTemporal({ candidate, post, temporalObservations, reportedOrdinals, momentClockRuleVersion }) {
  const rejected = [];
  const findings = [];
  const outcomes = [];
  const versionRefs = [];
  const valid = [];
  const ruleVersion = Number.isFinite(Number(momentClockRuleVersion)) && momentClockRuleVersion !== null && momentClockRuleVersion !== "" ? Number(momentClockRuleVersion) : null;

  const seen = new Set();
  for (const raw of Array.isArray(temporalObservations) ? temporalObservations : []) {
    const key = clean(raw?.key);
    if (!key || seen.has(key)) { rejected.push({ key, reason: key ? "duplicate_observation_key" : "observation_key_missing" }); continue; }
    seen.add(key);
    if (!ROLES.has(raw.role)) { rejected.push({ key, reason: "observation_role_unknown" }); continue; }
    if (!clean(raw.source_ref)) { rejected.push({ key, reason: MOMENT_CLOCK_REASON.SOURCE_REF_MISSING }); continue; }
    const tierAdmit = admitTier(raw);
    if (!tierAdmit.ok) { rejected.push({ key, reason: tierAdmit.reason }); continue; }
    if (raw.attribution != null) {
      const a = normalizeAttribution(raw.attribution);
      if (!a.ok) { rejected.push({ key, reason: a.reason }); continue; }
    }
    // The occurrence observation is only admitted if its clock is typed and unambiguous.
    const applied = applyMomentClockLaw(raw);
    if (!applied.ok) { rejected.push({ key, reason: applied.reason }); continue; }
    const finding = observationFinding(candidate, post, { ...raw, key, accessTier: tierAdmit.tier }, applied.input);
    findings.push(finding);
    valid.push({ key, role: raw.role, source_ref: clean(raw.source_ref), local_date: clean(raw.local_date), local_time: applied.input.local_time, timezone: applied.input.timezone, findingId: finding.id, applied, selected: raw.selected === true, accessTier: tierAdmit.tier });
  }

  // Moment Clock rule applications — only with an attested rule_version; never defaulted.
  const ruleFindings = [];
  if (valid.length) {
    if (ruleVersion == null) {
      rejected.push({ key: null, reason: MOMENT_CLOCK_REASON.RULE_VERSION_UNATTESTED });
    } else {
      for (const o of valid) {
        for (const rep of o.applied.representations) {
          const rf = momentClockRuleFinding({ occurrenceKey: `${candidate.key}:occurrence:${o.key}`, input: o.applied.input, representation: rep, ruleVersion, eventRef: candidate.ref, observationFindingId: o.findingId, accessTier: o.accessTier });
          ruleFindings.push(rf);
          outcomes.push({ findingId: rf.id, evidenceRelation: EVIDENCE_RELATION.DERIVATION, dependsOn: [o.findingId], reason: `${rep.representation} of ${MOMENT_CLOCK_RULE_ID} v${ruleVersion} over one clock occurrence; SAME_OCCURRENCE derivation, never independent evidence` });
        }
        // Same occurrence -> its 24h/12h representations share one convergence group (dependent).
      }
      versionRefs.push(`${MOMENT_CLOCK_RULE_ID}:v${ruleVersion}`);
    }
  }

  // Conflict between source observations of the same event (kept, never resolved).
  let conflict = null;
  if (valid.length >= 2) {
    const differing = new Set();
    const tzs = new Set(valid.map(o => o.timezone));
    const times = new Set(valid.map(o => o.local_time));
    const dates = valid.map(o => o.local_date).filter(Boolean);
    if (tzs.size === 1 && times.size > 1) differing.add("local_time");
    if (tzs.size > 1) differing.add("timezone_not_directly_comparable");
    if (new Set(dates).size > 1) differing.add("local_date");
    if (differing.size) {
      const obsList = valid.map(o => ({ ...o, findingId: o.findingId }));
      obsList.differing = [...differing].sort();
      conflict = conflictFinding(candidate, post, obsList, mostRestrictiveTier(valid.map(o => o.accessTier)));
      findings.push(conflict);
    }
  }

  // Reported ordinals.
  const ordinals = [];
  for (const raw of Array.isArray(reportedOrdinals) ? reportedOrdinals : []) {
    const key = clean(raw?.key);
    const n = Number(raw?.ordinal);
    const wording = clean(raw?.source_wording);
    const sref = clean(raw?.source_ref);
    if (!key || !Number.isInteger(n) || n < 1 || raw?.ordinal === true) { rejected.push({ key, reason: "ordinal_invalid" }); continue; }
    if (!sref) { rejected.push({ key, reason: "ordinal_without_source_ref" }); continue; }
    const ordTier = admitTier(raw);
    if (!ordTier.ok) { rejected.push({ key, reason: ordTier.reason }); continue; }
    if (!wording) { rejected.push({ key, reason: "ordinal_without_source_wording" }); continue; }
    const attr = raw.attribution != null ? normalizeAttribution(raw.attribution) : { ok: true, attribution: null };
    if (!attr.ok) { rejected.push({ key, reason: attr.reason }); continue; }
    // The Number anchor exists ONLY if the source wording itself carries the ordinal value.
    const anchored = new RegExp(`(^|\\D)${n}(\\D|$)`).test(wording);
    const state = raw.counting_convention_state === COUNTING_CONVENTION.ATTESTED && clean(raw.counting_convention_note) ? COUNTING_CONVENTION.ATTESTED : COUNTING_CONVENTION.UNRESOLVED;
    const ord = { key, ordinal: n, unit: clean(raw.unit) || "day", epoch_label: clean(raw.epoch_label), source_wording: wording, source_ref: sref, counting_convention_state: state, counting_convention_note: clean(raw.counting_convention_note), attribution: attr.attribution, anchored, accessTier: ordTier.tier };
    const f = ordinalFinding(candidate, post, ord);
    findings.push(f);
    ordinals.push({ ...ord, findingId: f.id });
  }

  return { findings, outcomes, ruleFindings, ordinals, rejected, versionRefs, conflict, valid };
}

/**
 * Compile an event with typed temporal observations on top of the governed System Method runtime.
 *
 * @param {object} p  every compileEventObservationWithSystemMethods param, plus:
 * @param {Array}  p.temporalObservations  typed clock/occurrence observations (see applyMomentClockLaw)
 *        each: { key, role, accessTier (required), source_ref, original_display, local_time, timezone, clock_format?, meridiem?,
 *                local_date?, hebrew_date_display?, verification_state?, selected?, attribution? }
 * @param {Array}  p.reportedOrdinals      { key, accessTier (required), ordinal, unit?, epoch_label?, source_wording, source_ref,
 *                counting_convention_state?, counting_convention_note?, attribution? }
 * @param {number} p.momentClockRuleVersion rule_version attested by the live rule registry (never defaulted)
 */
export async function compileEventTemporalObservation({
  temporalObservations = [],
  reportedOrdinals = [],
  momentClockRuleVersion = null,
  ...args
} = {}) {
  const key = clean(args.candidate?.key);
  const candidate = { key, ref: eventCandidateRef(key) };
  const post = args.post?.id != null ? { id: String(args.post.id) } : null;
  const t = buildTemporal({ candidate, post, temporalObservations, reportedOrdinals, momentClockRuleVersion });

  const visibleTier = (o) => findingAccessDecision({ access: { tier: o.accessTier } }, args.accessDescriptor, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED).allowed;
  const capability = (extra = []) => capabilityResult({
    key: "event_temporal_observations",
    owner: "numeric_rule_family_index",
    status: t.findings.length || t.ruleFindings.length || extra.length ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.SKIPPED,
    findings: [...t.findings, ...t.ruleFindings, ...extra.map(e => e.finding)],
    findingOutcomes: [...t.outcomes, ...extra.map(e => e.outcome)],
    // Fails closed: a Finding without an explicit tier the descriptor allows never crosses the boundary.
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    semanticClass: SEMANTIC_CLASS.DERIVATION,
    // Capability-level refs are metadata outside the Finding filter: list only refs of visible sources.
    sourceRefs: [...new Set([...t.valid, ...t.ordinals].filter(visibleTier).map(o => o.source_ref))],
    versionRefs: t.versionRefs,
    reason: t.rejected.length ? `${t.rejected.length} temporal item(s) rejected (fail closed)` : null,
    trace: { rejected: t.rejected },
  });

  // Pass 1 locates the canonical engine receipt(s); pass 2 adds the ordinal<->engine convergence card.
  // Finding ids are deterministic, so the card's parents are the same ids in the final bundle.
  const first = await compileEventObservationWithSystemMethods({ ...args, extraCapabilities: [capability()] });
  const cards = [];
  for (const ord of t.ordinals) {
    if (!ord.anchored) continue;
    const engine = first.bundle.findings.find(f => f.source?.engine === "gematria" && Number(f.verification?.engine_result) === ord.ordinal);
    if (!engine) continue;
    // Never weaker than the ordinal parent (nor a restricted engine parent).
    const cardTier = mostRestrictiveTier([ord.accessTier, ...(clean(engine.access?.tier) ? [engine.access.tier] : [])]);
    const card = convergenceCard(candidate, ord.findingId, engine, ord.ordinal, cardTier);
    cards.push({ finding: card, outcome: { findingId: card.id, evidenceRelation: EVIDENCE_RELATION.CONVERGENCE, dependsOn: [ord.findingId, engine.id], convergenceKey: `ordinal-engine:number:${ord.ordinal}`, reason: "convergence of a reported ordinal and an engine value at one Number; distinct origin roles, not independent evidence" } });
  }
  const pack = cards.length
    ? await compileEventObservationWithSystemMethods({ ...args, extraCapabilities: [capability(cards)] })
    : first;

  // The temporal summary is composition metadata outside the Finding filter: only surface entries whose
  // Finding survived the access boundary (no restricted source_ref / local_time / ordinal leaks).
  const visibleIds = new Set(pack.bundle.findings.map(f => f.id));
  const vis = (id) => visibleIds.has(id);
  return {
    ...pack,
    temporal: {
      observations: t.valid.filter(o => vis(o.findingId)).map(o => ({ key: o.key, role: o.role, finding_id: o.findingId, local_time: o.local_time, source_ref: o.source_ref, presentation: o.selected ? "primary" : "depth" })),
      representations: t.ruleFindings.filter(f => vis(f.id)).map(f => ({ finding_id: f.id, representation: f.projection.dimensions.clockRepresentation, value: f.subject.value, occurrence: f.projection.dimensions.occurrence })),
      conflict_finding_id: t.conflict && vis(t.conflict.id) ? t.conflict.id : null,
      conflict_state: t.conflict && vis(t.conflict.id) ? OCCURRENCE_CONFLICT_STATE : null,
      reported_ordinals: t.ordinals.filter(o => vis(o.findingId)).map(o => ({ key: o.key, ordinal: o.ordinal, finding_id: o.findingId, counting_convention_state: o.counting_convention_state, number_anchored: o.anchored })),
      convergence_finding_ids: cards.filter(c => vis(c.finding.id)).map(c => c.finding.id),
      rejected: t.rejected,
    },
    invariants: {
      ...pack.invariants,
      occurrence_observations_never_overwritten: true,
      clock_representations_are_same_occurrence_derivations: true,
      reported_ordinal_is_not_number_or_gematria_result: true,
      moment_clock_rule_version_never_defaulted: true,
    },
  };
}

export default compileEventTemporalObservation;

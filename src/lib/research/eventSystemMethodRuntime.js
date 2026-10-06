import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  SEMANTIC_CLASS,
  capabilityResult,
} from "./researchResultBundle.js";
import {
  EVENT_MEMBER_TYPE,
  compileEventObservation,
  eventCandidateRef,
} from "./eventObservationCompiler.js";

// FZ1073_SYSTEM_METHOD_FANOUT_RUNTIME_V1 — composition helper over the existing Context Compiler.
//
// EXTENDS (owns nothing new): the governed System Method capability (numeric_operators from
// createCanonicalNumberW2Executors, the same path fetchNumberSystemMethods uses) is INJECTED. This
// module never recalculates shitat / zero-scale / zero-navigation logic; it validates the
// Rule-Application Universal Findings that come back, re-anchors them to the event candidate on the
// SAME finding id (one write, many surfaces) and composes a bounded convergence over them.
//
//   - convergence is DERIVATION/CONVERGENCE with dependency lineage, never INDEPENDENT_EVIDENCE and
//     never numeric equality between the inputs (1073 -> 73 <- 730 does not mean 1073 = 730).
//   - no digit permutation / reordering / decimal insertion exists here. A reading between numbers
//     may only come from a governed stored reading or rule; none is invented.
//   - supporting sources are admitted Research Admission envelopes (representation/extraction).
//     The source type is data, never a code branch. OCR / all_values are never promoted: a source is
//     linked to a number only by an explicit `supports` declaration of the caller.
//   - Truth/Gematria values still come only through canonical Trace receipts as ordinary
//     EXPRESSION_MATCH members of the compiler; this module adds no value of its own.

const RULE_ADAPTER = "numeric-rule-application-v1";
const RULE_KIND = "numeric-operator";
export const SYSTEM_METHOD_MEMBER_TYPE = "system_method_application";
export const SUPPORTING_SOURCE_MEMBER_TYPE = "supporting_source";
export const RULE_CONVERGENCE_MEMBER_TYPE = "rule_convergence";
export const DEFAULT_MAX_SUPPORTING_SOURCES = 3;

const clean = (v) => (v == null ? null : String(v).trim() || null);
const isNat = (v) => Number.isSafeInteger(Number(v)) && Number(v) >= 0 && v !== null && v !== "" && typeof v !== "boolean";

// ── Attribution (provenance/presentation DATA; never identity, truth, rank, access or evidence) ──
// Who a piece of material comes from. Governance actor (Human Gate) is a different axis and is never
// an attribution. Source/work names are data supplied by the caller — nothing here knows any name.
export const ATTRIBUTION_ROLE = Object.freeze({
  CONTRIBUTOR: "contributor",
  SOURCE_WORK: "source_work",
  SOURCE_SYSTEM: "source_system",
  SITE_INTERPRETATION: "site_interpretation",
  ENGINE: "engine",
});
export const SITE_INTERPRETATION_LABEL = "כי לה׳ המלוכה";
const SITE_INTERNAL_FORM = "מערכת כי לה׳ המלוכה";
const GOVERNANCE_ACTOR_NAMES = /צוריאל|zuriel/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fail-closed normalizer. Returns { ok, attribution } | { ok:false, reason }.
 * Absent input is valid (attribution: null). A governance actor can never be the display name, a
 * contributor needs a canonical id, and source works/systems never carry a contributor identity.
 */
export function normalizeAttribution(input) {
  if (input == null) return { ok: true, attribution: null };
  if (typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "attribution_invalid" };
  const role = clean(input.role);
  if (!Object.values(ATTRIBUTION_ROLE).includes(role)) return { ok: false, reason: "attribution_role_unknown" };
  let displayName = clean(input.display_name);
  if (role === ATTRIBUTION_ROLE.SITE_INTERPRETATION) {
    if (displayName && displayName !== SITE_INTERNAL_FORM && displayName !== SITE_INTERPRETATION_LABEL) return { ok: false, reason: "site_interpretation_label_fixed" };
    displayName = SITE_INTERPRETATION_LABEL;
  }
  if (!displayName) return { ok: false, reason: "attribution_display_name_missing" };
  if (GOVERNANCE_ACTOR_NAMES.test(displayName) || GOVERNANCE_ACTOR_NAMES.test(clean(input.work_title) || "")) return { ok: false, reason: "governance_actor_is_not_attribution" };
  const contributorId = clean(input.contributor_id);
  if (role === ATTRIBUTION_ROLE.CONTRIBUTOR && !(contributorId && UUID.test(contributorId))) return { ok: false, reason: "contributor_id_required" };
  if (role !== ATTRIBUTION_ROLE.CONTRIBUTOR && contributorId) return { ok: false, reason: "contributor_identity_not_mintable_for_role" };
  return {
    ok: true,
    attribution: {
      role,
      display_name: displayName,
      source_id: clean(input.source_id),
      work_title: clean(input.work_title),
      contributor_id: contributorId,
      channel: clean(input.channel),
    },
  };
}

export function withAttribution(finding, attribution, governance = null) {
  if (!attribution) return finding;
  const [fact, ...rest] = finding.evidence?.facts || [];
  return {
    ...finding,
    evidence: { ...finding.evidence, facts: fact ? [{ ...fact, attribution, ...(governance ? { governance } : {}) }, ...rest] : finding.evidence?.facts },
    projection: { ...finding.projection, dimensions: { ...finding.projection?.dimensions, attribution } },
  };
}

// Reads (never computes) where an already-emitted governed Rule Application points.
function ruleTarget(fact) {
  const out = fact?.output && typeof fact.output === "object" ? fact.output : {};
  const pick = (v) => (isNat(v) && v !== null ? Number(v) : null);
  if (fact.rule_id === "shitat_haechad_alef_law") return pick(out.remainder);
  if (fact.rule_id === "zero_navigation") return pick(out.core);
  if (fact.rule_id === "zero_scale_law") return pick(out.core_root);
  return null;
}

function readRuleApplication(finding) {
  if (!finding || finding.kind !== RULE_KIND || finding.source?.adapter !== RULE_ADAPTER) return null;
  const fact = Array.isArray(finding.evidence?.facts) ? finding.evidence.facts[0] : null;
  if (!fact || fact.type !== "rule-application" || !clean(fact.rule_id)) return null;
  if (!Number.isFinite(Number(fact.rule_version)) || !isNat(fact.input)) return null;
  return { fact, input: Number(fact.input), target: ruleTarget(fact) };
}

function eventAnchors(candidate, numbers) {
  const out = [{ space: "event_candidate", id: candidate.key }];
  if (candidate.post) out.push({ space: "post", id: candidate.post.id });
  for (const n of numbers) if (n != null) out.push({ space: "number", id: String(n) });
  return out;
}

// Same id, same source identity: only the projection (where it can be selected from) is extended.
function overlayRuleFinding(finding, candidate, role, target) {
  return {
    ...finding,
    projection: {
      ...finding.projection,
      anchors: [...(finding.projection?.anchors || []), ...eventAnchors(candidate, [finding.subject?.value, target])],
      dimensions: {
        ...finding.projection?.dimensions,
        eventMemberType: SYSTEM_METHOD_MEMBER_TYPE,
        eventCandidate: candidate.ref,
        eventRole: role,
        ruleTarget: target,
      },
    },
  };
}

function convergenceFinding(candidate, target, chains, humanGate = null) {
  const parents = chains.map(c => c.findingId);
  const attribution = { role: ATTRIBUTION_ROLE.SITE_INTERPRETATION, display_name: SITE_INTERPRETATION_LABEL, source_id: null, work_title: null, contributor_id: null, channel: null };
  return withAttribution(makeUniversalFinding({
    kind: "event-rule-convergence",
    stage: "interpretation",
    subject: { type: "number", key: `number:${target}`, label: String(target), value: target },
    source: { engine: null, adapter: "event-system-method-runtime-v1", sourceRef: null, method: null, corpus: null, lang: null },
    identity: {
      sourceIdentity: {
        eventCandidate: candidate.key,
        target,
        chains: chains.map(c => ({ input: c.input, ruleId: c.ruleId, ruleVersion: c.ruleVersion })),
      },
      entityRef: `number:${target}`,
      relationRef: null,
    },
    verification: { verification_state: "not_tested" },
    evidence: {
      refs: chains.map(c => `${c.ruleId}:v${c.ruleVersion}`),
      facts: [{
        type: "rule-convergence",
        target,
        chains: chains.map(c => ({ input: c.input, rule_id: c.ruleId, rule_version: c.ruleVersion, finding_id: c.findingId, role: c.role })),
        numeric_equality_between_inputs: false,
        independent_evidence: false,
        boundary: "convergence of governed derivations at one Number; not equality of the inputs and not a proof of any reading",
      }],
    },
    access: { tier: "public" },
    provenance: { createdBy: null, inputRef: eventCandidateRef(candidate.key), parentFindingIds: parents },
    projection: {
      anchors: eventAnchors(candidate, [target, ...chains.map(c => c.input)]),
      relations: [],
      dimensions: {
        eventMemberType: RULE_CONVERGENCE_MEMBER_TYPE,
        eventCandidate: candidate.ref,
        ruleTarget: target,
      },
    },
  }), attribution, clean(humanGate) ? { human_gate: clean(humanGate), is_author: false } : null);
}

/**
 * Generic supporting-source finding from an ADMITTED Research Admission envelope (any source type).
 * The envelope stays a representation: not Fact, not canonical, not the Event identity.
 */
function supportingSourceFinding(candidate, entry) {
  const env = entry.envelope;
  const attribution = normalizeAttribution(entry.attribution).attribution;
  const ref = clean(env.source?.ref);
  const supports = (Array.isArray(entry.supports) ? entry.supports : []).filter(isNat).map(Number);
  return withAttribution(makeUniversalFinding({
    kind: "event-supporting-source",
    stage: "candidate",
    subject: { type: "source", key: ref, label: clean(env.intrinsicPayload?.name) || ref, value: null },
    source: { engine: null, adapter: "research-admission-v1", sourceRef: ref, method: null, corpus: clean(env.source?.type), lang: null },
    identity: { sourceIdentity: { eventCandidate: candidate.key, sourceType: clean(env.source?.type), sourceRef: ref, supports }, entityRef: null, relationRef: null },
    verification: { verification_state: env.verification?.state || "not_tested" },
    evidence: {
      refs: [ref],
      facts: [{
        type: "supporting-source",
        source_type: clean(env.source?.type),
        source_ref: ref,
        semantic_role: env.semanticRole,
        canonical: false,
        published: false,
        // extraction text/numbers are recorded as unverified extraction, never as Fact or anchor.
        extraction: env.extraction ? { status: env.extraction.status, uncertainty: env.extraction.uncertainty, is_fact: false } : null,
        supports_numbers: supports,
        context_rank: Number.isFinite(Number(entry.rank)) ? Number(entry.rank) : null,
        context_rank_reason: clean(entry.rankReason),
        truth_score: null,
      }],
      score: null,
      confidence: null,
    },
    access: { tier: clean(entry.accessTier) },
    provenance: { createdBy: null, inputRef: ref, parentFindingIds: [] },
    projection: {
      anchors: eventAnchors(candidate, supports),
      relations: [],
      dimensions: {
        eventMemberType: SUPPORTING_SOURCE_MEMBER_TYPE,
        eventCandidate: candidate.ref,
        supportsNumbers: supports,
      },
    },
  }), attribution);
}

function rankKey(entry) {
  return Number.isFinite(Number(entry.rank)) ? Number(entry.rank) : Number.MAX_SAFE_INTEGER;
}

/**
 * Compile an event observation with governed System Method fan-out.
 *
 * @param {object} p  every eventObservationCompiler param, plus:
 * @param {Function} p.numericOperators  injected governed capability: ({identityResolution}) -> capability output
 *        with Rule-Application Universal Findings (createCanonicalNumberW2Executors().numeric_operators)
 * @param {Array<number|{number:number,source_ref?:string}>} p.supportNumbers governed support Numbers (e.g. 730)
 * @param {Array<{envelope:object,supports?:number[],rank?:number,rankReason?:string,accessTier:string}>} p.supportingSources
 *        admitted Research Admission envelopes; deeper ones are expandable, not dumped
 * @param {number} p.maxSupportingSources default sidecar bound
 * @param {string} p.humanGate optional governance actor; recorded as governance metadata only, never as attribution
 * (each supportingSources entry may carry `attribution`: see normalizeAttribution)
 */
export async function compileEventObservationWithSystemMethods({
  numericOperators = null,
  supportNumbers = [],
  supportingSources = [],
  maxSupportingSources = DEFAULT_MAX_SUPPORTING_SOURCES,
  humanGate = null,
  ...compilerArgs
} = {}) {
  const baseDeclaration = compilerArgs.candidate;
  const members = Array.isArray(compilerArgs.members) ? compilerArgs.members : [];

  // Candidate/post resolution is owned by the compiler; a first pass is not needed. Build a light
  // candidate shape for anchors from the same declaration + post it will use.
  const candidate = {
    key: clean(baseDeclaration?.key),
    ref: eventCandidateRef(clean(baseDeclaration?.key)),
    post: compilerArgs.post?.id != null ? { id: String(compilerArgs.post.id) } : null,
  };

  const subjects = [];
  const seen = new Set();
  const add = (number, role, sourceRef) => {
    if (!isNat(number) || seen.has(`${role}:${Number(number)}`)) return;
    seen.add(`${role}:${Number(number)}`);
    subjects.push({ number: Number(number), role, sourceRef: clean(sourceRef) });
  };
  for (const m of members) if (m?.type === EVENT_MEMBER_TYPE.FLIGHT_NUMBER) add(m.number, "source", m.source_ref);
  for (const s of Array.isArray(supportNumbers) ? supportNumbers : []) {
    if (s && typeof s === "object") add(s.number, "support", s.source_ref);
    else add(s, "support", null);
  }

  const rejected = [];
  const ruleFindings = [];
  const outcomes = [];
  const chains = [];
  const trace = [];
  const versionRefs = [];
  let capStatus = CAPABILITY_STATUS.SKIPPED;
  let capReason = typeof numericOperators === "function" ? "no source/support number to apply System Methods to" : "no governed numeric_operators capability injected";

  if (typeof numericOperators === "function") {
    for (const subject of subjects) {
      let result;
      try {
        result = await numericOperators({ identityResolution: { identities: [{ type: "number", value: subject.number, ref: `number:${subject.number}` }] } });
      } catch {
        rejected.push({ number: subject.number, reason: "numeric_operators_failed" });
        continue;
      }
      trace.push({ number: subject.number, role: subject.role, status: result?.status ?? null, trace: result?.trace ?? null });
      if (result?.status !== CAPABILITY_STATUS.EXECUTED) {
        rejected.push({ number: subject.number, reason: `numeric_operators_${result?.status || "no_result"}` });
        continue;
      }
      for (const finding of Array.isArray(result.findings) ? result.findings : []) {
        const app = readRuleApplication(finding);
        if (!app || app.input !== subject.number) {
          rejected.push({ number: subject.number, reason: "not_a_governed_rule_application" });
          continue;
        }
        const overlaid = overlayRuleFinding(finding, candidate, subject.role, app.target);
        ruleFindings.push(overlaid);
        versionRefs.push(`${app.fact.rule_id}:v${app.fact.rule_version}`);
        outcomes.push({
          findingId: overlaid.id,
          evidenceRelation: EVIDENCE_RELATION.DERIVATION,
          reason: `rule application of ${app.fact.rule_id} v${app.fact.rule_version}; a transform of an existing value, never independent corroboration`,
        });
        if (app.target != null) {
          chains.push({ findingId: overlaid.id, input: app.input, target: app.target, ruleId: app.fact.rule_id, ruleVersion: Number(app.fact.rule_version), role: subject.role });
        }
      }
    }
    capStatus = ruleFindings.length ? CAPABILITY_STATUS.EXECUTED : CAPABILITY_STATUS.UNVERIFIED;
    capReason = ruleFindings.length ? null : "no governed System Method rule application could be attested";
  }

  // Convergence: >=2 DISTINCT input numbers whose governed chains end at the same Number.
  const convergences = [];
  const byTarget = new Map();
  for (const c of chains) byTarget.set(c.target, [...(byTarget.get(c.target) || []), c]);
  for (const [target, group] of [...byTarget.entries()].sort((a, b) => a[0] - b[0])) {
    if (new Set(group.map(c => c.input)).size < 2) continue;
    const sorted = [...group].sort((a, b) => a.input - b.input || a.ruleId.localeCompare(b.ruleId));
    const f = convergenceFinding(candidate, target, sorted, humanGate);
    convergences.push(f);
    outcomes.push({
      findingId: f.id,
      evidenceRelation: EVIDENCE_RELATION.CONVERGENCE,
      dependsOn: sorted.map(c => c.findingId),
      convergenceKey: `rule-convergence:number:${target}`,
      reason: "convergence of dependent rule derivations; not independent evidence and not equality of the inputs",
    });
  }

  const capabilities = [
    capabilityResult({
      key: "system_method_applications",
      owner: "numeric_rule_family_index",
      status: capStatus,
      findings: [...ruleFindings, ...convergences],
      findingOutcomes: outcomes,
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: SEMANTIC_CLASS.DERIVATION,
      sourceRefs: subjects.map(s => `number:${s.number}`),
      versionRefs: [...new Set(versionRefs)],
      reason: capReason,
      trace: { numbers: trace, rejected },
    }),
  ];

  // Supporting sources — generic seam. Only admitted representation envelopes enter; rank is the
  // caller's contextual/explainable ordering, never a truth score.
  const sourceRejected = [];
  const admitted = [];
  for (const entry of Array.isArray(supportingSources) ? supportingSources : []) {
    const env = entry?.envelope;
    if (!env || env.admitted !== true || !clean(env.source?.ref)) { sourceRejected.push({ source_ref: clean(env?.source?.ref), reason: "envelope_not_admitted" }); continue; }
    if (env.semanticRole !== "representation" || env.governance?.canonical === true) { sourceRejected.push({ source_ref: env.source.ref, reason: "envelope_not_a_non_canonical_representation" }); continue; }
    const attr = normalizeAttribution(entry.attribution);
    if (!attr.ok) { sourceRejected.push({ source_ref: env.source.ref, reason: attr.reason }); continue; }
    admitted.push(entry);
  }
  const uniqueSources = [...new Map(admitted.map(e => [e.envelope.source.ref, e])).values()]
    .sort((a, b) => rankKey(a) - rankKey(b) || String(a.envelope.source.ref).localeCompare(String(b.envelope.source.ref)));
  const limit = Number.isInteger(Number(maxSupportingSources)) && Number(maxSupportingSources) > 0 ? Number(maxSupportingSources) : DEFAULT_MAX_SUPPORTING_SOURCES;
  const shown = uniqueSources.slice(0, limit);
  const expandable = uniqueSources.slice(limit).map(e => e.envelope.source.ref);
  if (uniqueSources.length || sourceRejected.length) {
    capabilities.push(capabilityResult({
      key: "event_supporting_sources",
      owner: "research_intake_foundation_contract_law",
      findings: shown.map(e => supportingSourceFinding(candidate, e)),
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      semanticClass: SEMANTIC_CLASS.CONTEXT,
      sourceRefs: shown.map(e => e.envelope.source.ref),
      reason: sourceRejected.length ? `${sourceRejected.length} source(s) not admitted as representations` : null,
      bounded: { total_count: uniqueSources.length, returned_count: shown.length, ordering: "caller_context_rank_then_source_ref" },
    }));
  }

  const pack = compileEventObservation({ ...compilerArgs, extraCapabilities: [...capabilities, ...(Array.isArray(compilerArgs.extraCapabilities) ? compilerArgs.extraCapabilities : [])] });
  return {
    ...pack,
    system_methods: {
      subjects: subjects.map(s => ({ number: s.number, role: s.role })),
      chains: chains.map(({ findingId, input, target, ruleId, ruleVersion, role }) => ({ finding_id: findingId, input, target, rule_id: ruleId, rule_version: ruleVersion, role })),
      convergence_finding_ids: convergences.map(f => f.id),
      rejected,
      supporting_sources: { total: uniqueSources.length, shown_refs: shown.map(e => e.envelope.source.ref), expandable_refs: expandable, rejected: sourceRejected },
    },
    invariants: {
      ...pack.invariants,
      rule_logic_not_recomputed_here: true,
      convergence_is_not_numeric_equality: true,
      convergence_is_not_independent_evidence: true,
      no_digit_permutation_without_governed_reading: true,
      supporting_source_is_representation_not_event_identity: true,
    },
  };
}

export default compileEventObservationWithSystemMethods;

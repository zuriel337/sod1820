import { isUniversalFinding } from "./universalFinding.js";
import { normalizeAccessDescriptor } from "./researchPlanV2.js";
import { stableIdentityDigest } from "./researchRepresentations.js";
import { normalizeOperatorRef, normalizeResearchEvaluation } from "./researchEvaluation.js";
import { composeDependencyGroups, normalizeEvidenceLineage } from "./researchDependency.js";

// Generic Research Result Bundle composer. This layer transports governed semantic output only;
// it owns no engine truth, ranking truth, dependency truth, access policy or persistence.

export const CAPABILITY_STATUS = Object.freeze({
  EXECUTED: "executed",
  NEGATIVE_RESULT: "negative_result",
  SKIPPED: "skipped",
  CONTEXT_REQUIRED: "context_required",
  ENTITLEMENT_GATED: "entitlement_gated",
  UNVERIFIED: "unverified",
  FAILED: "failed",
  MISSING_ADAPTER: "missing_adapter",
  MISSING: "missing_adapter",
});

export const EVIDENCE_RELATION = Object.freeze({
  DERIVATION: "derivation",
  CONVERGENCE: "convergence",
  INDEPENDENT_EVIDENCE: "independent_evidence",
});

export const ACCESS_CLASS = Object.freeze({
  PUBLIC_SOURCE: "public_source",
  SOURCE_ACCESS_CONTROLLED: "source_access_controlled",
  PERSONAL: "personal",
  UNCLASSIFIED: "unclassified",
});

export const SEMANTIC_CLASS = Object.freeze({
  EVIDENCE: "evidence",
  DERIVATION: "derivation",
  CONTEXT: "context",
  PROJECTION: "projection",
  RANKING: "ranking",
});

const VALID_CAPABILITY_STATUS = new Set(Object.values(CAPABILITY_STATUS));
const VALID_EVIDENCE_RELATION = new Set(Object.values(EVIDENCE_RELATION));
const VALID_ACCESS_CLASS = new Set(Object.values(ACCESS_CLASS));
const VALID_SEMANTIC_CLASS = new Set(Object.values(SEMANTIC_CLASS));
const RESTRICTED_ACCESS_TIERS = new Set(["private", "public_candidate", "personal", "user_private", "draft", "internal", "pending"]);
const RAW_AUTHORIZATION_KEYS = Object.freeze(["authorization_context", "authorizationContext", "auth_context", "authContext"]);
const PERSONAL_CONTEXT_SOURCE = "personal_context";
const ACCESS_TIER_PERSONAL = "personal";

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function stripRawAuthorizationContext(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  let touched = false;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (RAW_AUTHORIZATION_KEYS.includes(key)) { touched = true; continue; }
    out[key] = item;
  }
  if (touched) out.authorization_context_removed_at_composition_boundary = true;
  return out;
}

function allowedTiers(accessDescriptor) {
  const list = Array.isArray(accessDescriptor?.allowed_access_tiers) ? accessDescriptor.allowed_access_tiers : null;
  return new Set(list && list.length ? list.map(String) : ["public"]);
}

export function identityAccessDecision(identity, accessDescriptor) {
  const allowed = allowedTiers(accessDescriptor);
  const tier = clean(identity?.access?.tier);
  if (tier && RESTRICTED_ACCESS_TIERS.has(tier) && !allowed.has(tier)) return { allowed: false, reason: `identity_access_tier_not_permitted:${tier}` };
  if (clean(identity?.source) === PERSONAL_CONTEXT_SOURCE && !allowed.has(ACCESS_TIER_PERSONAL)) return { allowed: false, reason: "personal_context_identity_without_personal_scope" };
  return { allowed: true, reason: null };
}

function redactIdentity(identity, reason) {
  const stableSource = clean(identity?.identity_key) || clean(identity?.key) || clean(identity?.ref) || clean(identity?.label) || clean(identity?.id) || "identity";
  return {
    type: clean(identity?.type) || "entity",
    source: clean(identity?.source),
    confidence: clean(identity?.confidence),
    ref: `anon:${stableIdentityDigest(stableSource)}`,
    access: { tier: clean(identity?.access?.tier) },
    redacted: true,
    redaction_reason: reason,
  };
}

export function projectIdentityForAccess(identity, accessDescriptor) {
  if (!identity || typeof identity !== "object") return identity;
  const decision = identityAccessDecision(identity, accessDescriptor);
  return decision.allowed ? identity : redactIdentity(identity, decision.reason);
}

function projectIdentityListForAccess(list, accessDescriptor) {
  return Array.isArray(list) ? list.map(x => projectIdentityForAccess(x, accessDescriptor)) : list;
}

function projectSnapshotForAccess(snapshot, accessDescriptor) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) || !Array.isArray(snapshot.resolved_identities)) return snapshot;
  return { ...snapshot, resolved_identities: projectIdentityListForAccess(snapshot.resolved_identities, accessDescriptor) };
}

function projectQueryForAccess(query, accessDescriptor) {
  if (!query || typeof query !== "object" || Array.isArray(query) || !Array.isArray(query.identities)) return query;
  return { ...query, identities: projectIdentityListForAccess(query.identities, accessDescriptor) };
}

function projectPlanForAccess(plan, accessDescriptor) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return plan;
  const out = { ...plan };
  if (Array.isArray(out.identities)) out.identities = projectIdentityListForAccess(out.identities, accessDescriptor);
  if (out.primary_identity) out.primary_identity = projectIdentityForAccess(out.primary_identity, accessDescriptor);
  return out;
}

export function findingAccessDecision(finding, accessDescriptor, accessClass = ACCESS_CLASS.UNCLASSIFIED) {
  const tier = clean(finding?.access?.tier);
  const allowed = allowedTiers(accessDescriptor);
  const controlled = accessClass === ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED || accessClass === ACCESS_CLASS.PERSONAL;
  if (controlled && !tier) return { allowed: false, reason: "access_controlled_source_without_explicit_access_tier" };
  if (tier && !allowed.has(tier) && (controlled || RESTRICTED_ACCESS_TIERS.has(tier))) return { allowed: false, reason: `access_tier_not_permitted:${tier}` };
  return { allowed: true, reason: null };
}

function researchEvaluationAccessDecision(evaluation, accessDescriptor, accessClass = ACCESS_CLASS.UNCLASSIFIED) {
  if (!evaluation) return { allowed: true, reason: null };
  const tier = clean(evaluation?.access?.tier);
  const allowed = allowedTiers(accessDescriptor);
  const controlled = accessClass === ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED || accessClass === ACCESS_CLASS.PERSONAL;
  if (controlled && !tier) return { allowed: false, reason: "access_controlled_evaluation_without_explicit_access_tier" };
  if (tier && !allowed.has(tier) && (controlled || RESTRICTED_ACCESS_TIERS.has(tier))) return { allowed: false, reason: `evaluation_access_tier_not_permitted:${tier}` };
  return { allowed: true, reason: null };
}

function normalizeBounded(bounded) {
  if (!bounded || typeof bounded !== "object") return null;
  const total = Number(bounded.total_count ?? bounded.total), returned = Number(bounded.returned_count ?? bounded.returned);
  if (!Number.isFinite(total) && !Number.isFinite(returned)) return null;
  const totalCount = Number.isFinite(total) ? total : null, returnedCount = Number.isFinite(returned) ? returned : null;
  return {
    total_count: totalCount,
    returned_count: returnedCount,
    truncated: bounded.truncated === true || (totalCount != null && returnedCount != null && returnedCount < totalCount),
    window: bounded.window ?? null,
    ordering: clean(bounded.ordering),
    continuation: bounded.continuation ?? null,
  };
}

function normalizeFindingOutcome(outcome = {}, findingIds = new Set(), fallbackEvaluation = null) {
  const findingId = clean(outcome.finding_id || outcome.findingId);
  if (!findingId || !findingIds.has(findingId)) return null;
  const relation = clean(outcome.evidence_relation || outcome.evidenceRelation);
  if (!VALID_EVIDENCE_RELATION.has(relation)) throw new TypeError(`researchResultBundle: invalid evidence relation "${relation}" for ${findingId}`);
  const rawBaseRate = outcome.base_rate ?? outcome.baseRate;
  const baseRate = rawBaseRate == null ? null : Number(rawBaseRate);
  const lineageInput = outcome.evidence_lineage ?? outcome.evidenceLineage ?? fallbackEvaluation?.dependency ?? null;
  const span = outcome.lineage_span ?? outcome.lineageSpan ?? fallbackEvaluation?.location?.span ?? null;
  return {
    finding_id: findingId,
    evidence_relation: relation,
    evidence_lineage: normalizeEvidenceLineage(lineageInput),
    lineage_span: span && typeof span === "object" ? { ...span } : null,
    depends_on: [...new Set((Array.isArray(outcome.depends_on) ? outcome.depends_on : Array.isArray(outcome.dependsOn) ? outcome.dependsOn : []).map(clean).filter(Boolean))],
    convergence_key: clean(outcome.convergence_key || outcome.convergenceKey),
    reason: clean(outcome.reason),
    expectedness: clean(outcome.expectedness),
    expectedness_model: clean(outcome.expectedness_model || outcome.expectednessModel),
    base_rate: Number.isFinite(baseRate) ? baseRate : null,
  };
}

function normalizeCapabilityRecord(record = {}, accessDescriptor = null) {
  const key = clean(record.key || record.capability);
  if (!key) throw new TypeError("researchResultBundle: capability key is required");
  const status = clean(record.status) || CAPABILITY_STATUS.MISSING_ADAPTER;
  if (!VALID_CAPABILITY_STATUS.has(status)) throw new TypeError(`researchResultBundle: invalid capability status "${status}" for ${key}`);

  const accessClass = clean(record.access_class || record.accessClass) || ACCESS_CLASS.UNCLASSIFIED;
  if (!VALID_ACCESS_CLASS.has(accessClass)) throw new TypeError(`researchResultBundle: invalid access class "${accessClass}" for ${key}`);
  const semanticClass = clean(record.semantic_class || record.semanticClass);
  if (semanticClass && !VALID_SEMANTIC_CLASS.has(semanticClass)) throw new TypeError(`researchResultBundle: invalid semantic class "${semanticClass}" for ${key}`);

  const operatorRef = normalizeOperatorRef(record.operator_ref || record.operatorRef);
  const rawResearchEvaluation = normalizeResearchEvaluation(record.research_evaluation || record.researchEvaluation, { operatorRef });
  const evaluationDecision = researchEvaluationAccessDecision(rawResearchEvaluation, accessDescriptor, accessClass);
  const researchEvaluation = evaluationDecision.allowed ? rawResearchEvaluation : null;

  const rawFindings = (Array.isArray(record.findings) ? record.findings : []).filter(isUniversalFinding);
  if (status === CAPABILITY_STATUS.NEGATIVE_RESULT && rawFindings.length) throw new TypeError(`researchResultBundle: negative_result for ${key} cannot carry positive findings`);

  const findings = [], accessFilterReasons = new Map();
  for (const finding of rawFindings) {
    const decision = findingAccessDecision(finding, accessDescriptor, accessClass);
    if (decision.allowed) findings.push(finding);
    else accessFilterReasons.set(decision.reason, (accessFilterReasons.get(decision.reason) || 0) + 1);
  }
  const findingIds = new Set(findings.map(x => x.id));
  const findingOutcomes = (Array.isArray(record.finding_outcomes) ? record.finding_outcomes : Array.isArray(record.findingOutcomes) ? record.findingOutcomes : [])
    .map(x => normalizeFindingOutcome(x, findingIds, researchEvaluation))
    .filter(Boolean);

  return {
    key,
    owner: clean(record.owner),
    status,
    requested: record.requested !== false,
    executed: status === CAPABILITY_STATUS.EXECUTED || status === CAPABILITY_STATUS.NEGATIVE_RESULT,
    reason: clean(record.reason),
    negative_result: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? { searched: true, reason: clean(record.reason), scope: record.negative_scope ?? record.negativeScope ?? null } : null,
    source_refs: Array.isArray(record.source_refs) ? record.source_refs.filter(Boolean) : [],
    version_refs: Array.isArray(record.version_refs) ? record.version_refs.filter(Boolean) : [],
    operator_ref: operatorRef,
    research_evaluation: researchEvaluation,
    research_evaluation_access: { filtered: Boolean(rawResearchEvaluation && !evaluationDecision.allowed), reason: evaluationDecision.reason },
    finding_ids: findings.map(x => x.id),
    finding_outcomes: findingOutcomes,
    findings,
    access_class: accessClass,
    semantic_class: semanticClass,
    access_filtered: {
      count: [...accessFilterReasons.values()].reduce((a, b) => a + b, 0),
      reasons: [...accessFilterReasons.entries()].map(([reason, count]) => ({ reason, count })),
    },
    bounded: normalizeBounded(record.bounded),
    cost: record.cost ?? null,
    trace: record.trace ?? null,
  };
}

export function dedupeUniversalFindings(findings = []) {
  const byId = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) if (isUniversalFinding(finding) && !byId.has(finding.id)) byId.set(finding.id, finding);
  return [...byId.values()];
}

export function summarizeCoverage(capabilities = []) {
  const summary = { requested: 0, executed: 0, executed_empty: 0, positive_result: 0, negative_result: 0, skipped: 0, context_required: 0, entitlement_gated: 0, unverified: 0, failed: 0, missing_adapter: 0, access_filtered: 0, partial: false, complete: false };
  for (const cap of capabilities) {
    if (cap.requested) summary.requested++;
    if (cap.access_filtered?.count) summary.access_filtered += cap.access_filtered.count;
    if (cap.status === CAPABILITY_STATUS.EXECUTED) {
      summary.executed++;
      if (Array.isArray(cap.finding_ids) && cap.finding_ids.length > 0) summary.positive_result++;
      else summary.executed_empty++;
    } else if (cap.status === CAPABILITY_STATUS.NEGATIVE_RESULT) { summary.executed++; summary.negative_result++; }
    else if (summary[cap.status] != null) summary[cap.status]++;
  }
  const incomplete = summary.skipped + summary.context_required + summary.entitlement_gated + summary.unverified + summary.failed + summary.missing_adapter;
  summary.partial = summary.requested > 0 && summary.executed > 0 && incomplete > 0;
  summary.complete = summary.requested > 0 && summary.executed === summary.requested;
  return summary;
}

function normalizeRankingEntry(entry = {}, findingIds = new Set(), dependencyMap = new Map()) {
  const findingId = clean(entry.finding_id || entry.findingId);
  if (!findingId || !findingIds.has(findingId)) return null;
  return {
    finding_id: findingId,
    dependency_group: dependencyMap.get(findingId) || null,
    rank: Number.isFinite(Number(entry.rank)) ? Number(entry.rank) : null,
    score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : null,
    axes: entry.axes && typeof entry.axes === "object" ? entry.axes : {},
    reasons: Array.isArray(entry.reasons) ? entry.reasons.map(String) : [],
  };
}

export function composeResearchResultBundle({
  query,
  plan = null,
  capabilities = [],
  ranking = [],
  resolvedRunSnapshot = null,
  nextActions = [],
  synthesis = null,
  contractVersion = 1,
  accessDescriptor = null,
} = {}) {
  const effectiveAccess = normalizeAccessDescriptor(accessDescriptor || plan?.access || null);
  const safePlan = projectPlanForAccess(stripRawAuthorizationContext(plan), effectiveAccess);
  const safeSnapshot = projectSnapshotForAccess(stripRawAuthorizationContext(resolvedRunSnapshot), effectiveAccess);
  const safeQuery = projectQueryForAccess(query, effectiveAccess);
  const normalizedCapabilities = (Array.isArray(capabilities) ? capabilities : []).map(record => normalizeCapabilityRecord(record, effectiveAccess));
  const findings = dedupeUniversalFindings(normalizedCapabilities.flatMap(x => x.findings));
  const findingIds = new Set(findings.map(x => x.id));

  // Dependency classification is deliberately composed BEFORE ranking. UNKNOWN is not independence.
  const rawFindingOutcomes = normalizedCapabilities.flatMap(cap => cap.finding_outcomes.map(outcome => ({ ...outcome, capability: cap.key })));
  const dependency = composeDependencyGroups(rawFindingOutcomes);
  const findingOutcomes = rawFindingOutcomes.map(outcome => ({
    ...outcome,
    dependency_group: dependency.finding_to_group.get(outcome.finding_id) || null,
  }));
  const normalizedRanking = (Array.isArray(ranking) ? ranking : [])
    .map(x => normalizeRankingEntry(x, findingIds, dependency.finding_to_group))
    .filter(Boolean)
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

  const boundedCapabilities = normalizedCapabilities.filter(cap => cap.bounded);
  const redactedIdentityCount = [
    ...(Array.isArray(safeQuery?.identities) ? safeQuery.identities : []),
    ...(Array.isArray(safePlan?.identities) ? safePlan.identities : []),
  ].filter(x => x?.redacted === true).length;

  return {
    contract_version: contractVersion,
    query: safeQuery ?? null,
    plan: safePlan,
    access: effectiveAccess,
    identity_disclosure: {
      redacted_identity_count: redactedIdentityCount,
      free_text_may_contain_restricted_terms: redactedIdentityCount > 0,
      note: redactedIdentityCount > 0 ? 'resolved identities were redacted for this access level; query.raw_input/plan.question are caller-supplied text and may still contain the restricted term' : null,
    },
    findings,
    finding_outcomes: findingOutcomes,
    dependency_groups: dependency.groups,
    dependency_edges: dependency.edges,
    ranking: normalizedRanking,
    capability_trace: normalizedCapabilities.map(({ findings: _findings, ...cap }) => cap),
    coverage: summarizeCoverage(normalizedCapabilities),
    output_bounds: {
      truncated: boundedCapabilities.some(cap => cap.bounded.truncated),
      capabilities: boundedCapabilities.map(cap => ({ capability: cap.key, ...cap.bounded })),
    },
    resolved_run_snapshot: safeSnapshot,
    next_actions: Array.isArray(nextActions) ? nextActions : [],
    synthesis,
    invariants: {
      universal_finding_only: true,
      source_native_truth_preserved: true,
      derivation_is_not_independent_evidence: true,
      convergence_is_not_automatically_independent: true,
      dependency_grouping_precedes_ranking: true,
      unknown_dependency_is_not_independence: true,
      negative_result_requires_executed_search: true,
      missing_adapter_is_not_negative_evidence: true,
      no_ai_arithmetic_fallback: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
      access_filtered_is_not_negative_evidence: true,
      raw_authorization_context_never_in_output: true,
      personal_identity_text_never_in_output: true,
      bounded_window_is_not_source_exhaustive: true,
      research_evaluation_is_transport_not_truth: true,
      unknown_evaluation_fields_remain_unknown: true,
      evaluation_access_is_filtered_at_composition_boundary: true,
    },
  };
}

export function capabilityResult({
  key,
  owner = null,
  status = CAPABILITY_STATUS.EXECUTED,
  findings = [],
  findingOutcomes = [],
  reason = null,
  negativeScope = null,
  sourceRefs = [],
  versionRefs = [],
  operatorRef = null,
  researchEvaluation = null,
  cost = null,
  trace = null,
  requested = true,
  accessClass = ACCESS_CLASS.UNCLASSIFIED,
  semanticClass = null,
  bounded = null,
} = {}) {
  return {
    key,
    owner,
    status,
    findings,
    finding_outcomes: findingOutcomes,
    reason,
    negative_scope: negativeScope,
    source_refs: sourceRefs,
    version_refs: versionRefs,
    operator_ref: operatorRef,
    research_evaluation: researchEvaluation,
    cost,
    trace,
    requested,
    access_class: accessClass,
    semantic_class: semanticClass,
    bounded,
  };
}

export default composeResearchResultBundle;

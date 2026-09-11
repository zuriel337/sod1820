import { isUniversalFinding } from "./universalFinding.js";

// W2.1 — Generic Research Result Bundle composer.
// Stable socket only: no engine truth, ranking truth, access policy or persistence is owned here.

export const CAPABILITY_STATUS = Object.freeze({
  EXECUTED: "executed",
  NEGATIVE_RESULT: "negative_result",
  SKIPPED: "skipped",
  CONTEXT_REQUIRED: "context_required",
  ENTITLEMENT_GATED: "entitlement_gated",
  UNVERIFIED: "unverified",
  FAILED: "failed",
  MISSING_ADAPTER: "missing_adapter",
  // Compatibility alias for early W2.1 callers. New code must emit MISSING_ADAPTER explicitly.
  MISSING: "missing_adapter",
});

export const EVIDENCE_RELATION = Object.freeze({
  DERIVATION: "derivation",
  CONVERGENCE: "convergence",
  INDEPENDENT_EVIDENCE: "independent_evidence",
});

const VALID_CAPABILITY_STATUS = new Set(Object.values(CAPABILITY_STATUS));
const VALID_EVIDENCE_RELATION = new Set(Object.values(EVIDENCE_RELATION));

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeFindingOutcome(outcome = {}, findingIds = new Set()) {
  const findingId = clean(outcome.finding_id || outcome.findingId);
  if (!findingId || !findingIds.has(findingId)) return null;
  const relation = clean(outcome.evidence_relation || outcome.evidenceRelation);
  if (!VALID_EVIDENCE_RELATION.has(relation)) {
    throw new TypeError(`researchResultBundle: invalid evidence relation "${relation}" for ${findingId}`);
  }
  const rawBaseRate = outcome.base_rate ?? outcome.baseRate;
  const baseRate = rawBaseRate == null ? null : Number(rawBaseRate);
  return {
    finding_id: findingId,
    evidence_relation: relation,
    depends_on: [...new Set((Array.isArray(outcome.depends_on) ? outcome.depends_on : Array.isArray(outcome.dependsOn) ? outcome.dependsOn : []).map(clean).filter(Boolean))],
    convergence_key: clean(outcome.convergence_key || outcome.convergenceKey),
    reason: clean(outcome.reason),
    expectedness: clean(outcome.expectedness),
    expectedness_model: clean(outcome.expectedness_model || outcome.expectednessModel),
    base_rate: Number.isFinite(baseRate) ? baseRate : null,
  };
}

function normalizeCapabilityRecord(record = {}) {
  const key = clean(record.key || record.capability);
  if (!key) throw new TypeError("researchResultBundle: capability key is required");
  const status = clean(record.status) || CAPABILITY_STATUS.MISSING_ADAPTER;
  if (!VALID_CAPABILITY_STATUS.has(status)) {
    throw new TypeError(`researchResultBundle: invalid capability status "${status}" for ${key}`);
  }

  const findings = (Array.isArray(record.findings) ? record.findings : []).filter(isUniversalFinding);
  if (status === CAPABILITY_STATUS.NEGATIVE_RESULT && findings.length) {
    throw new TypeError(`researchResultBundle: negative_result for ${key} cannot carry positive findings`);
  }
  const findingIds = new Set(findings.map(x => x.id));
  const findingOutcomes = (Array.isArray(record.finding_outcomes) ? record.finding_outcomes : Array.isArray(record.findingOutcomes) ? record.findingOutcomes : [])
    .map(x => normalizeFindingOutcome(x, findingIds))
    .filter(Boolean);

  return {
    key,
    owner: clean(record.owner),
    status,
    requested: record.requested !== false,
    executed: status === CAPABILITY_STATUS.EXECUTED || status === CAPABILITY_STATUS.NEGATIVE_RESULT,
    reason: clean(record.reason),
    negative_result: status === CAPABILITY_STATUS.NEGATIVE_RESULT ? {
      searched: true,
      reason: clean(record.reason),
      scope: record.negative_scope ?? record.negativeScope ?? null,
    } : null,
    source_refs: Array.isArray(record.source_refs) ? record.source_refs.filter(Boolean) : [],
    version_refs: Array.isArray(record.version_refs) ? record.version_refs.filter(Boolean) : [],
    finding_ids: findings.map(x => x.id),
    finding_outcomes: findingOutcomes,
    findings,
    cost: record.cost ?? null,
    trace: record.trace ?? null,
  };
}

export function dedupeUniversalFindings(findings = []) {
  const byId = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    if (!isUniversalFinding(finding)) continue;
    if (!byId.has(finding.id)) byId.set(finding.id, finding);
  }
  return [...byId.values()];
}

export function summarizeCoverage(capabilities = []) {
  const summary = {
    requested: 0,
    executed: 0,
    executed_empty: 0,
    positive_result: 0,
    negative_result: 0,
    skipped: 0,
    context_required: 0,
    entitlement_gated: 0,
    unverified: 0,
    failed: 0,
    missing_adapter: 0,
    partial: false,
    complete: false,
  };

  for (const cap of capabilities) {
    if (cap.requested) summary.requested++;
    if (cap.status === CAPABILITY_STATUS.EXECUTED) {
      summary.executed++;
      if (Array.isArray(cap.finding_ids) && cap.finding_ids.length > 0) summary.positive_result++;
      else summary.executed_empty++;
    } else if (cap.status === CAPABILITY_STATUS.NEGATIVE_RESULT) {
      summary.executed++;
      summary.negative_result++;
    } else if (summary[cap.status] != null) summary[cap.status]++;
  }

  const incomplete = summary.skipped + summary.context_required + summary.entitlement_gated
    + summary.unverified + summary.failed + summary.missing_adapter;
  summary.partial = summary.requested > 0 && summary.executed > 0 && incomplete > 0;
  summary.complete = summary.requested > 0 && summary.executed === summary.requested;
  return summary;
}

function normalizeRankingEntry(entry = {}, findingIds = new Set()) {
  const findingId = clean(entry.finding_id || entry.findingId);
  if (!findingId || !findingIds.has(findingId)) return null;
  return {
    finding_id: findingId,
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
} = {}) {
  const normalizedCapabilities = (Array.isArray(capabilities) ? capabilities : []).map(normalizeCapabilityRecord);
  const findings = dedupeUniversalFindings(normalizedCapabilities.flatMap(x => x.findings));
  const findingIds = new Set(findings.map(x => x.id));
  const normalizedRanking = (Array.isArray(ranking) ? ranking : [])
    .map(x => normalizeRankingEntry(x, findingIds))
    .filter(Boolean)
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));
  const findingOutcomes = normalizedCapabilities.flatMap(cap => cap.finding_outcomes.map(outcome => ({
    ...outcome,
    capability: cap.key,
  })));

  return {
    contract_version: contractVersion,
    query: query ?? null,
    plan,
    findings,
    // First-class dependency semantics. These are not ranking labels and never mutate Finding truth.
    finding_outcomes: findingOutcomes,
    ranking: normalizedRanking,
    capability_trace: normalizedCapabilities.map(({ findings: _findings, ...cap }) => cap),
    coverage: summarizeCoverage(normalizedCapabilities),
    resolved_run_snapshot: resolvedRunSnapshot,
    next_actions: Array.isArray(nextActions) ? nextActions : [],
    synthesis,
    invariants: {
      universal_finding_only: true,
      source_native_truth_preserved: true,
      derivation_is_not_independent_evidence: true,
      convergence_is_not_automatically_independent: true,
      negative_result_requires_executed_search: true,
      missing_adapter_is_not_negative_evidence: true,
      no_ai_arithmetic_fallback: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
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
  cost = null,
  trace = null,
  requested = true,
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
    cost,
    trace,
    requested,
  };
}

export default composeResearchResultBundle;

import { isUniversalFinding } from "./universalFinding.js";

// W2.1 — Generic Research Result Bundle composer.
//
// This is the stable socket between canonical capabilities and consumers such as Raziel, World,
// Number, Person/Life and future surfaces. It owns NO engine truth, NO ranking truth, NO access
// policy and NO persistence. It only composes authorized source-native outputs that have already
// been adapted to Universal Finding v1.

export const CAPABILITY_STATUS = Object.freeze({
  EXECUTED: "executed",
  SKIPPED: "skipped",
  CONTEXT_REQUIRED: "context_required",
  ENTITLEMENT_GATED: "entitlement_gated",
  UNVERIFIED: "unverified",
  FAILED: "failed",
  MISSING: "missing",
});

const VALID_CAPABILITY_STATUS = new Set(Object.values(CAPABILITY_STATUS));

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeCapabilityRecord(record = {}) {
  const key = clean(record.key || record.capability);
  if (!key) throw new TypeError("researchResultBundle: capability key is required");
  const status = clean(record.status) || CAPABILITY_STATUS.MISSING;
  if (!VALID_CAPABILITY_STATUS.has(status)) {
    throw new TypeError(`researchResultBundle: invalid capability status "${status}" for ${key}`);
  }

  const findings = (Array.isArray(record.findings) ? record.findings : []).filter(isUniversalFinding);
  return {
    key,
    owner: clean(record.owner),
    status,
    requested: record.requested !== false,
    executed: status === CAPABILITY_STATUS.EXECUTED,
    reason: clean(record.reason),
    source_refs: Array.isArray(record.source_refs) ? record.source_refs.filter(Boolean) : [],
    version_refs: Array.isArray(record.version_refs) ? record.version_refs.filter(Boolean) : [],
    finding_ids: findings.map(x => x.id),
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
    skipped: 0,
    context_required: 0,
    entitlement_gated: 0,
    unverified: 0,
    failed: 0,
    missing: 0,
    partial: false,
    complete: false,
  };

  for (const cap of capabilities) {
    if (cap.requested) summary.requested++;
    if (summary[cap.status] != null) summary[cap.status]++;
  }

  const incomplete = summary.skipped + summary.context_required + summary.entitlement_gated
    + summary.unverified + summary.failed + summary.missing;
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

/**
 * Compose one generic cross-capability Research Result Bundle.
 *
 * Each capability record must already be authorization-filtered by its canonical owner/adapter.
 * This function deliberately cannot widen access or invent a fallback result. If an engine fails,
 * its status remains failed and the bundle simply discloses partial coverage.
 */
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

  return {
    contract_version: contractVersion,
    query: query ?? null,
    plan,
    findings,
    ranking: normalizedRanking,
    capability_trace: normalizedCapabilities.map(({ findings: _findings, ...cap }) => cap),
    coverage: summarizeCoverage(normalizedCapabilities),
    resolved_run_snapshot: resolvedRunSnapshot,
    next_actions: Array.isArray(nextActions) ? nextActions : [],
    // Deterministic composer normally leaves this null. Raziel/AI may append downstream synthesis,
    // but synthesis never rewrites the Findings, verification axes or capability trace.
    synthesis,
    invariants: {
      universal_finding_only: true,
      source_native_truth_preserved: true,
      no_ai_arithmetic_fallback: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
    },
  };
}

/**
 * Helper for future adapters: unknown capability names pass through unchanged. This proves a future
 * engine can plug into the socket without changing the consumer contract.
 */
export function capabilityResult({
  key,
  owner = null,
  status = CAPABILITY_STATUS.EXECUTED,
  findings = [],
  reason = null,
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
    reason,
    source_refs: sourceRefs,
    version_refs: versionRefs,
    cost,
    trace,
    requested,
  };
}

export default composeResearchResultBundle;

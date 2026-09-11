import { isUniversalFinding } from "./universalFinding.js";
import { normalizeAccessDescriptor } from "./researchPlanV2.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

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

// ── W2.2b · PER-LENS ACCESS CLASS ─────────────────────────────────────────────────────────
// A capability status of "executed" says nothing about whether the SOURCE behind it is publicly
// readable. fn_number_lookup is an anon-executable public contract; research_objects has no
// anon/authenticated table grant at all and is dominated by private/public_candidate rows. Both
// could previously report the same "executed" and drop their rows into the same Bundle.
// The access class is therefore declared per capability by the adapter that knows the source, and
// the composition boundary filters on it. UNCLASSIFIED is deliberately NOT a synonym for public:
// it means the adapter did not declare, which stays visible in the trace instead of being laundered.
export const ACCESS_CLASS = Object.freeze({
  PUBLIC_SOURCE: "public_source",
  SOURCE_ACCESS_CONTROLLED: "source_access_controlled",
  PERSONAL: "personal",
  UNCLASSIFIED: "unclassified",
});

// ── W2.2b · PER-LENS SEMANTIC CLASS ───────────────────────────────────────────────────────
// Not every lens that returns data returns EVIDENCE. fn_number_dossier is a composite of several
// truth families, fn_number_journey is a derivation/projection map, number_neighbors and
// fn_hot_context are ranking/candidate signals that explicitly are not truth. Those belong in the
// capability trace as context, never atomised into positive Findings (preflight de9969d1 item 9).
export const SEMANTIC_CLASS = Object.freeze({
  EVIDENCE: "evidence",
  DERIVATION: "derivation",
  CONTEXT: "context",
  PROJECTION: "projection",
  RANKING: "ranking",
});

const VALID_ACCESS_CLASS = new Set(Object.values(ACCESS_CLASS));
const VALID_SEMANTIC_CLASS = new Set(Object.values(SEMANTIC_CLASS));

// Tiers that are never public by default. A Finding carrying one of these is dropped unless the
// resolved access descriptor explicitly allows that exact tier.
const RESTRICTED_ACCESS_TIERS = new Set(["private", "public_candidate", "personal", "user_private", "draft", "internal", "pending"]);

// Keys that carry the RAW private authorization context. They must never survive to the output.
const RAW_AUTHORIZATION_KEYS = Object.freeze(["authorization_context", "authorizationContext", "auth_context", "authContext"]);

/**
 * Fail-closed composition-boundary scrub. Any raw authorization context reaching the Bundle through
 * a plan, a resolved run snapshot or a legacy caller is removed here rather than trusted to have
 * been removed upstream. Returns a shallow copy — the caller's object is never mutated.
 */
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

// ── W2.2d · PERSONAL IDENTITY ECHO ────────────────────────────────────────────────────────
// The access filter above governs FINDINGS. It never governed the RESOLVED IDENTITIES, and those
// are echoed verbatim into query.identities, plan.identities, plan.primary_identity and
// resolved_run_snapshot.resolved_identities. A Person/Name identity carries the person's name in
// label/key/ref/identity_key and their name parts in metadata, so a Bundle could withhold every
// personal Finding and still state exactly whose research it was. That is the same disclosure the
// Finding filter exists to prevent, arriving one field earlier.
//
// Identities are therefore projected through the SAME access contract before they leave. A
// restricted identity keeps only what a consumer legitimately needs to reason about shape — its
// type, how it was resolved, and its access tier — plus a stable non-reversible reference so the
// same person is still recognisably the same subject across a session, replay and continuation.
// Everything that names them is dropped, not masked in place.
//
// Identity REDACTION is deliberately narrower than Finding filtering: an ordinary number or phrase
// identity has no tier and must stay readable, or every public Bundle would become unreadable. An
// identity is redacted when it declares a restricted tier the descriptor does not allow, or when it
// was resolved from the user's personal context and the descriptor carries no personal scope.
const PERSONAL_CONTEXT_SOURCE = "personal_context";

// Redaction rebuilds an identity from an ALLOWLIST rather than deleting known-bad fields. A denylist
// would silently leak any naming field added to the identity shape later (key/ref/identity_key/
// label/value/id/metadata/provenance are all disclosing today, and metadata carries declared name
// parts).
const ACCESS_TIER_PERSONAL = "personal";

export function identityAccessDecision(identity, accessDescriptor) {
  const allowed = allowedTiers(accessDescriptor);
  const tier = clean(identity?.access?.tier);
  if (tier && RESTRICTED_ACCESS_TIERS.has(tier) && !allowed.has(tier)) {
    return { allowed: false, reason: `identity_access_tier_not_permitted:${tier}` };
  }
  if (clean(identity?.source) === PERSONAL_CONTEXT_SOURCE && !allowed.has(ACCESS_TIER_PERSONAL)) {
    return { allowed: false, reason: "personal_context_identity_without_personal_scope" };
  }
  return { allowed: true, reason: null };
}

function redactIdentity(identity, reason) {
  const stableSource = clean(identity?.identity_key) || clean(identity?.key)
    || clean(identity?.ref) || clean(identity?.label) || clean(identity?.id) || "identity";
  return {
    type: clean(identity?.type) || "entity",
    source: clean(identity?.source),
    confidence: clean(identity?.confidence),
    // Stable across runs so the same subject stays the same subject, reversible by nobody.
    ref: `anon:${stableIdentityDigest(stableSource)}`,
    access: { tier: clean(identity?.access?.tier) },
    redacted: true,
    redaction_reason: reason,
  };
}

export function projectIdentityForAccess(identity, accessDescriptor) {
  if (!identity || typeof identity !== "object") return identity;
  const decision = identityAccessDecision(identity, accessDescriptor);
  if (decision.allowed) return identity;
  return redactIdentity(identity, decision.reason);
}

function projectIdentityListForAccess(list, accessDescriptor) {
  if (!Array.isArray(list)) return list;
  return list.map(x => projectIdentityForAccess(x, accessDescriptor));
}

// The snapshot projects its own reduced identity shape, so redaction is applied to that shape too
// rather than assuming it looks like a full identity.
function projectSnapshotForAccess(snapshot, accessDescriptor) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return snapshot;
  if (!Array.isArray(snapshot.resolved_identities)) return snapshot;
  return {
    ...snapshot,
    resolved_identities: projectIdentityListForAccess(snapshot.resolved_identities, accessDescriptor),
  };
}

function projectQueryForAccess(query, accessDescriptor) {
  if (!query || typeof query !== "object" || Array.isArray(query)) return query;
  if (!Array.isArray(query.identities)) return query;
  return { ...query, identities: projectIdentityListForAccess(query.identities, accessDescriptor) };
}

function projectPlanForAccess(plan, accessDescriptor) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return plan;
  const out = { ...plan };
  if (Array.isArray(out.identities)) out.identities = projectIdentityListForAccess(out.identities, accessDescriptor);
  if (out.primary_identity) out.primary_identity = projectIdentityForAccess(out.primary_identity, accessDescriptor);
  return out;
}

function allowedTiers(accessDescriptor) {
  const list = Array.isArray(accessDescriptor?.allowed_access_tiers) ? accessDescriptor.allowed_access_tiers : null;
  // Fail-closed default: with no resolved descriptor, only genuinely public material may pass.
  return new Set(list && list.length ? list.map(String) : ["public"]);
}

/**
 * Decide whether ONE Finding may cross the composition boundary.
 *
 * An access-controlled source must state an explicit tier that the descriptor allows — silence is
 * refusal, not permission. A public source may stay tier-less (a public RPC row genuinely has no
 * per-row tier), but an explicitly restricted tier still wins and is dropped.
 */
export function findingAccessDecision(finding, accessDescriptor, accessClass = ACCESS_CLASS.UNCLASSIFIED) {
  const tier = clean(finding?.access?.tier);
  const allowed = allowedTiers(accessDescriptor);
  const controlled = accessClass === ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED || accessClass === ACCESS_CLASS.PERSONAL;

  if (controlled && !tier) {
    return { allowed: false, reason: "access_controlled_source_without_explicit_access_tier" };
  }
  if (tier && !allowed.has(tier) && (controlled || RESTRICTED_ACCESS_TIERS.has(tier))) {
    return { allowed: false, reason: `access_tier_not_permitted:${tier}` };
  }
  return { allowed: true, reason: null };
}

function normalizeBounded(bounded) {
  if (!bounded || typeof bounded !== "object") return null;
  const total = Number(bounded.total_count ?? bounded.total);
  const returned = Number(bounded.returned_count ?? bounded.returned);
  if (!Number.isFinite(total) && !Number.isFinite(returned)) return null;
  const totalCount = Number.isFinite(total) ? total : null;
  const returnedCount = Number.isFinite(returned) ? returned : null;
  return {
    total_count: totalCount,
    returned_count: returnedCount,
    truncated: bounded.truncated === true
      || (totalCount != null && returnedCount != null && returnedCount < totalCount),
    window: bounded.window ?? null,
    ordering: clean(bounded.ordering),
    continuation: bounded.continuation ?? null,
  };
}

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

function normalizeCapabilityRecord(record = {}, accessDescriptor = null) {
  const key = clean(record.key || record.capability);
  if (!key) throw new TypeError("researchResultBundle: capability key is required");
  const status = clean(record.status) || CAPABILITY_STATUS.MISSING_ADAPTER;
  if (!VALID_CAPABILITY_STATUS.has(status)) {
    throw new TypeError(`researchResultBundle: invalid capability status "${status}" for ${key}`);
  }

  const accessClass = clean(record.access_class || record.accessClass) || ACCESS_CLASS.UNCLASSIFIED;
  if (!VALID_ACCESS_CLASS.has(accessClass)) {
    throw new TypeError(`researchResultBundle: invalid access class "${accessClass}" for ${key}`);
  }
  const semanticClass = clean(record.semantic_class || record.semanticClass);
  if (semanticClass && !VALID_SEMANTIC_CLASS.has(semanticClass)) {
    throw new TypeError(`researchResultBundle: invalid semantic class "${semanticClass}" for ${key}`);
  }

  const rawFindings = (Array.isArray(record.findings) ? record.findings : []).filter(isUniversalFinding);
  if (status === CAPABILITY_STATUS.NEGATIVE_RESULT && rawFindings.length) {
    throw new TypeError(`researchResultBundle: negative_result for ${key} cannot carry positive findings`);
  }

  // COMPOSITION-BOUNDARY ACCESS FILTER. Findings are dropped here, before anything is exposed, and
  // only an aggregate reason survives — never the dropped Finding's id, label or source row, which
  // would re-leak exactly what the filter exists to withhold.
  const findings = [];
  const accessFilterReasons = new Map();
  for (const finding of rawFindings) {
    const decision = findingAccessDecision(finding, accessDescriptor, accessClass);
    if (decision.allowed) findings.push(finding);
    else accessFilterReasons.set(decision.reason, (accessFilterReasons.get(decision.reason) || 0) + 1);
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
    access_class: accessClass,
    semantic_class: semanticClass,
    // Access filtering is reported, never silent. It is NOT negative evidence: nothing was searched
    // and found absent — material exists and was withheld from THIS caller.
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
    access_filtered: 0,
    partial: false,
    complete: false,
  };

  for (const cap of capabilities) {
    if (cap.requested) summary.requested++;
    if (cap.access_filtered?.count) summary.access_filtered += cap.access_filtered.count;
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
  accessDescriptor = null,
} = {}) {
  // The descriptor the boundary filters on is the plan's own output-safe descriptor unless the
  // caller passes one explicitly. It is never read back out of a raw authorization context, and it
  // is NEVER trusted as handed in: normalizeAccessDescriptor re-derives it into the canonical frozen
  // shape, drops unknown tiers, and refuses to widen beyond public without an attested
  // authority_source. Without that, a caller could pass {allowed_access_tiers:["private"]} straight
  // into the filter that is supposed to be restraining them (GPT challenge 8621de8d finding 2).
  const effectiveAccess = normalizeAccessDescriptor(accessDescriptor || plan?.access || null);
  // Two independent boundary scrubs, applied in order: the raw authorization context can never ride
  // out, and no identity may name a subject the caller is not entitled to see.
  const safePlan = projectPlanForAccess(stripRawAuthorizationContext(plan), effectiveAccess);
  const safeSnapshot = projectSnapshotForAccess(stripRawAuthorizationContext(resolvedRunSnapshot), effectiveAccess);
  const safeQuery = projectQueryForAccess(query, effectiveAccess);
  const normalizedCapabilities = (Array.isArray(capabilities) ? capabilities : [])
    .map(record => normalizeCapabilityRecord(record, effectiveAccess));
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

  const boundedCapabilities = normalizedCapabilities.filter(cap => cap.bounded);
  // Free-text fields (query.raw_input, plan.question) are the CALLER'S OWN literal input, not
  // identity-derived data, so they are echoed back rather than redacted — a Bundle that cannot show
  // what was asked is not usable. But when a restricted identity was resolved, that text may itself
  // contain the personal term, so say so explicitly instead of leaving a persister or a sharing
  // surface to discover it.
  const redactedIdentityCount = [
    ...(Array.isArray(safeQuery?.identities) ? safeQuery.identities : []),
    ...(Array.isArray(safePlan?.identities) ? safePlan.identities : []),
  ].filter(x => x?.redacted === true).length;

  return {
    contract_version: contractVersion,
    query: safeQuery ?? null,
    // Composition-boundary scrubbed: the raw private authorization context can never ride out on the
    // plan or the snapshot, whichever caller built them.
    plan: safePlan,
    access: effectiveAccess,
    // Identity disclosure state of THIS bundle, so a consumer never has to infer it.
    identity_disclosure: {
      redacted_identity_count: redactedIdentityCount,
      free_text_may_contain_restricted_terms: redactedIdentityCount > 0,
      note: redactedIdentityCount > 0
        ? 'resolved identities were redacted for this access level; query.raw_input/plan.question are caller-supplied text and may still contain the restricted term'
        : null,
    },
    findings,
    // First-class dependency semantics. These are not ranking labels and never mutate Finding truth.
    finding_outcomes: findingOutcomes,
    ranking: normalizedRanking,
    capability_trace: normalizedCapabilities.map(({ findings: _findings, ...cap }) => cap),
    coverage: summarizeCoverage(normalizedCapabilities),
    // Bounded output: a caller can always tell how much of the source population it actually holds,
    // and how to ask for the rest, instead of silently believing a window is the whole truth.
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
      negative_result_requires_executed_search: true,
      missing_adapter_is_not_negative_evidence: true,
      no_ai_arithmetic_fallback: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
      access_filtered_is_not_negative_evidence: true,
      raw_authorization_context_never_in_output: true,
      personal_identity_text_never_in_output: true,
      bounded_window_is_not_source_exhaustive: true,
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
    cost,
    trace,
    requested,
    access_class: accessClass,
    semantic_class: semanticClass,
    bounded,
  };
}

export default composeResearchResultBundle;

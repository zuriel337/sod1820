// SOD1820 #1457 — observability-only cost cohort projection.
// NO spending cap, quota, provider call, DB read or authorization.
// Input must originate from a separately admin-authorized, server-verified aggregate.
// This module cannot verify payment/identity by itself and must never classify
// anonymous/unattributed provider calls as owner costs by guessing source names.
export const AI_COST_SEGMENT_V1 = Object.freeze({
  MY_ACCOUNT: "my_account",
  OTHER_ADMIN: "other_admin",
  PAYING_CUSTOMER: "verified_paying_customer",
  REGISTERED: "registered_customer_unknown",
  ANONYMOUS: "anonymous_visitor",
  SYSTEM: "verified_system_operation",
  UNKNOWN: "unattributed_unknown",
});
export const AI_COST_REPORTING_POLICY_V1 = Object.freeze({
  version: 1,
  mode: "observability_only",
  monthlyLimitEnabled: false,
  moneyUnit: "ILS",
  costLedger: "agent_token_costs",
  userIdentity: "canonical_users_role",
  maxPreviewRows: 5000,
  noPii: true,
});
const MICRO = 1000000n;
const parseIlsMicro = raw => {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).trim();
  if (!/^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,6})?$/.test(s)) return null;
  const [a, f = ""] = s.split(".");
  return BigInt(a) * MICRO + BigInt((f || "").padEnd(6, "0"));
};
const formatMicro = v => {
  const a = v / MICRO;
  const fraction = (v % MICRO).toString().padStart(6, "0");
  return a.toString() + "." + fraction.slice(0, 4);
};

/**
 * Admin-verified identity and payment attribution are REQUIRED upstream.
 * Paid subscriber: verified settlement matched to same user at event time;
 * a tier label or a 'pilot active' flag alone is insufficient.
 */
export function attributeAiCostCohort(row = {}, { viewerUserId = null } = {}) {
  if (row.identityVerified === true && row.userId) {
    if (row.userId === viewerUserId && row.userRole === "admin") return AI_COST_SEGMENT_V1.MY_ACCOUNT;
    if (row.userRole === "admin") return AI_COST_SEGMENT_V1.OTHER_ADMIN;
    if (row.paymentVerifiedAtEvent === true) return AI_COST_SEGMENT_V1.PAYING_CUSTOMER;
    return AI_COST_SEGMENT_V1.REGISTERED;
  }
  if (!row.userId && row.visitorPresent === true) return AI_COST_SEGMENT_V1.ANONYMOUS;
  if (!row.userId && !row.visitorPresent && row.systemOperationVerified === true) return AI_COST_SEGMENT_V1.SYSTEM;
  return AI_COST_SEGMENT_V1.UNKNOWN;
}

/** Offline projection for deterministic acceptance; never a public-cost API.
 * Every input must correspond to ONE unique ai_token_log row joined once
 * to agent_token_costs (by id), with server-computed attribution flags.
 * Unknown prices remain unknown, not zero. No source texts or user ids returned.
 */
export function previewAiCostsByCohort(rows, { viewerUserId = null, adminVerified = false } = {}) {
  if (adminVerified !== true) return Object.freeze({ state: "DENIED", reason: "admin_view_required" });
  if (!Array.isArray(rows) || rows.length > AI_COST_REPORTING_POLICY_V1.maxPreviewRows)
    return Object.freeze({ state: "DENIED", reason: "invalid_or_unbounded_rows" });
  const segments = Object.values(AI_COST_SEGMENT_V1);
  const buckets = new Map(segments.map(key => [key, { key, calls: 0, pricedCalls: 0, unpricedCalls: 0, microIls: 0n }]));
  const ids = new Set();
  let invalidDuplicateIds = 0;
  for (const row of rows) {
    const id = row?.tokenLogId;
    if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id)) {
      invalidDuplicateIds += 1;
      continue;
    }
    ids.add(id);
    const key = attributeAiCostCohort(row, { viewerUserId });
    const bucket = buckets.get(key);
    bucket.calls += 1;
    const cost = parseIlsMicro(row.costIls);
    if (cost === null) bucket.unpricedCalls += 1;
    else { bucket.pricedCalls += 1; bucket.microIls += cost; }
  }
  const bySegment = segments.map(key => {
    const row = buckets.get(key);
    return Object.freeze({
      segment: row.key, calls: row.calls, pricedCalls: row.pricedCalls,
      unpricedCalls: row.unpricedCalls,
      knownCostIls: formatMicro(row.microIls),
      costCertainty: row.unpricedCalls ? "PARTIAL" : "LEDGER_PRICED",
    });
  });
  // For totals, sum exact micro-units rather than rounded presentation fields.
  const totalMicro = [...buckets.values()].reduce((a, r) => a + r.microIls, 0n);
  return Object.freeze({
    state: invalidDuplicateIds ? "PARTIAL_DUPLICATE_OR_INVALID_ROWS" : "OK",
    costScope: "AI_PROVIDER_TOKEN_LEDGER_ONLY",
    notAnInvoice: true,
    attributionType: "server_verified_or_unknown",
    calls: ids.size,
    knownCostIls: formatMicro(totalMicro),
    unpricedCalls: bySegment.reduce((a, r) => a + r.unpricedCalls, 0),
    unassignedCalls: buckets.get(AI_COST_SEGMENT_V1.UNKNOWN).calls,
    skippedInvalidOrDuplicateRows: invalidDuplicateIds,
    bySegment,
    includesInfrastructureCosts: false,
    sourcePiiIncluded: false,
  });
}

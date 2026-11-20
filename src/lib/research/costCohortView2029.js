// Dormant Control Plane 2029 adapter for admin_ai_cost_cohorts_v1.
// Requires an independently reviewed, admin-protected SQL deployment first.
// Never call until owner explicitly approves that SQL and the feature rollout.
const DAYS = new Set([1,7,30,90,365]);
const GROUPS = new Set([
 "my_account","other_admin","verified_paying_customer","registered_customer_unknown",
 "anonymous_visitor","verified_system_operation","unattributed_unknown",
]);
const metric = raw => {
  const v = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN;
  return Number.isFinite(v) && v >= 0 ? v : null;
};
const isRecord = x => x && typeof x === "object" && !Array.isArray(x);

export function normalizeAiCostCohortResponse(raw) {
  if (!isRecord(raw) || raw.v !== 1 || raw.not_invoice !== true
    || raw.includes_infrastructure !== false || raw.unknown_not_zero !== true
    || !isRecord(raw.total) || !Array.isArray(raw.by_segment)) return null;
  if (raw.by_segment.length > 16 || !raw.by_segment.every(x =>
    isRecord(x) && GROUPS.has(x.segment) && metric(x.calls) !== null
    && metric(x.unpriced_calls) !== null && metric(x.cost_ils) !== null)) return null;
  if (!["internal_ai_token_ledger"].includes(raw.pricing_basis)) return null;
  const total = {
    calls:metric(raw.total.calls),unpricedCalls:metric(raw.total.unpriced_calls),
    knownCostIls:metric(raw.total.cost_ils),
    unassignedCalls:metric(raw.total.unattributed_calls),
  };
  if (Object.values(total).some(v=>v===null)) return null;
  return Object.freeze({
    state:"LEDGER_REPORT",notInvoice:true,
    total:Object.freeze(total),
    segments:raw.by_segment.map(x=>Object.freeze({
      key:x.segment,calls:metric(x.calls),
      unpricedCalls:metric(x.unpriced_calls),knownCostIls:metric(x.cost_ils),
    })),
    bySource:Array.isArray(raw.by_source) ? raw.by_source.slice(0,40) : [],
    byModel:Array.isArray(raw.by_model) ? raw.by_model.slice(0,40) : [],
    byDay:Array.isArray(raw.by_day) ? raw.by_day.slice(0,365) : [],
    infrastructureExcluded:true,
    unknownNotZero:true,
  });
}

/** Read-only after explicit deploy; must be called only from verified admin UI.
 * Client can NEVER bypass SQL admin check. Missing/denied/invalid data is UNKNOWN.
 */
export async function readAiCostCohorts2029({client,days=30}={}) {
  if (!DAYS.has(days) || typeof client?.rpc !== "function")
    return {state:"UNKNOWN",reason:"invalid_requested_range_or_client"};
  try{
    const {data,error}=await client.rpc("admin_ai_cost_cohorts_v1",{p_days:days});
    if(error) return {state:"UNKNOWN",reason:"admin_rpc_unavailable_or_denied"};
    return normalizeAiCostCohortResponse(data) || {state:"UNKNOWN",reason:"invalid_untrusted_cost_response"};
  }catch {
    return {state:"UNKNOWN",reason:"cost_read_failed"};
  }
}

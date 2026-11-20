// SOD1820 #1457 — PREVIEW ONLY composition over the existing Intake and
// Operational Cost owners. No I/O, no provider invocation and no new store.
// A planning result MUST NOT be treated as server authorization.
import { INTAKE_ACTION, classifyOperationalIntakeEvent } from "./intakeOperationalPolicy2029.js";
import { operationalBudgetMonth, previewOperationalAiBudget, quoteOperationalAiUpperBound } from "./intakeOperationalCostPreview2029.js";

const GRANT_ID = /^[a-z][a-z0-9:_-]{5,100}$/i;
const ALLOWED_ACTION = "operational_readonly_diagnosis";
const sourceCounts = arr => arr.reduce((out,record) => {
  out[record.action] = (out[record.action] || 0) + 1;
  return out;
}, {});

/**
 * Model the authorization questions a privileged server MUST ask. No grant,
 * quote, ledger or other argument supplied here is trusted as source truth.
 * Real server needs to load the signed owner grant and validate event evidence.
 */
export function previewOperationalL1Task({event, grant, pricing, costLedger, nowIso} = {}) {
  const classified = classifyOperationalIntakeEvent(event);
  if (classified.action !== INTAKE_ACTION.L1_CANDIDATE) return Object.freeze({
    state: "NO_L1_CALL", intent: classified.action, reason: classified.reason, providerCallAuthorized: false,
  });
  const now = new Date(nowIso);
  if (!Number.isFinite(now.getTime()) || !grant || grant.enabled !== true
    || !GRANT_ID.test(String(grant.id || ""))
    || grant.action !== ALLOWED_ACTION
    || !Array.isArray(grant.eventClasses)
    || !grant.eventClasses.includes(event.kind)
    || !grant.model || typeof grant.model !== "string"
    || !grant.expiresAt || !Number.isFinite(Date.parse(grant.expiresAt))
    || Date.parse(grant.expiresAt) <= now.getTime()) {
    return Object.freeze({state:"NO_L1_CALL",intent:classified.action,reason:"standing_grant_missing_or_invalid",providerCallAuthorized:false});
  }
  if (!pricing || pricing.model !== grant.model
    || !costLedger || costLedger.month !== operationalBudgetMonth(nowIso)
    || costLedger.ledgerCoverageVerified !== true) {
    return Object.freeze({state:"NO_L1_CALL",intent:classified.action,reason:"pricing_or_budget_state_unavailable",providerCallAuthorized:false});
  }
  const quote = quoteOperationalAiUpperBound({
    ...pricing,
    maxInputTokens: grant.maxInputTokens, maxOutputTokens: grant.maxOutputTokens,
  });
  if (quote.state !== "QUOTED") return Object.freeze({
    state:"NO_L1_CALL",intent:classified.action,reason:quote.reason,providerCallAuthorized:false,
  });
  const budget = previewOperationalAiBudget({
    spentAgorot:costLedger.spentAgorot,
    reservedAgorot:costLedger.reservedAgorot,
    upperBoundAgorot:quote.upperBoundAgorot,
  });
  if (budget.state !== "WOULD_FIT_UNDER_SNAPSHOT") return Object.freeze({
    state:"NO_L1_CALL",intent:classified.action,reason:budget.reason,providerCallAuthorized:false,
  });
  return Object.freeze({
    state:"AWAITING_ATOMIC_SERVER_RESERVATION",
    intent:classified.action, reason:"standing_scope_price_and_snapshot_preview_match",
    maxQuoteAgorot:quote.upperBoundAgorot,
    budgetPeriod:costLedger.month,
    requiredApprovalRef:grant.id,
    providerCallAuthorized:false,
    requiredServerChecks:Object.freeze([
      "verify_active_owner_grant_and_source_revision_again",
      "verify_model_pricing_and_fx_authoritatively",
      "atomic_reserve_with_idempotent_task_key",
      "enforce_model_timeout_and_token_limit",
      "reconcile_actual_cost_and_release_unused_hold",
    ]),
  });
}

/** Bounded daily intake summary; counts only. No source text, author or PII. */
export function previewOperationalIntakeDigest(events) {
  if (!Array.isArray(events) || events.length > 500) {
    return Object.freeze({state:"INVALID_BATCH", reason:"bounded_500_events", providerCallAuthorized:false});
  }
  const classified = events.map(classifyOperationalIntakeEvent);
  const byAction = sourceCounts(classified);
  const counts = Object.freeze({
    received: classified.length,
    free: byAction[INTAKE_ACTION.FREE] || 0,
    duplicateReused:byAction[INTAKE_ACTION.REUSE] || 0,
    l1Candidates:byAction[INTAKE_ACTION.L1_CANDIDATE] || 0,
    needsOwnerApproval:byAction[INTAKE_ACTION.OWNER_APPROVAL] || 0,
    immediateIncidents:byAction[INTAKE_ACTION.ALERT] || 0,
    invalidSources:byAction[INTAKE_ACTION.QUARANTINE] || 0,
    autoModelCalls:0,
  });
  return Object.freeze({
    state:"PREVIEW_ONLY",counts,providerCallAuthorized:false,
    digestPeriod:"not_measured",
    inputDataRetained:false,
    requiresRealSourceReceiptsBeforePublish:true,
  });
}

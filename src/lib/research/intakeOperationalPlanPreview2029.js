// SOD1820 #1457 — read-only decision preview for AI site operations.
// No spending cap, no automatic dispatch, no provider call or database I/O.
import { INTAKE_ACTION, classifyOperationalIntakeEvent } from "./intakeOperationalPolicy2029.js";

const GRANT_ID = /^[a-z][a-z0-9:_-]{5,100}$/i;
const ACTION = "operational_readonly_diagnosis";
const safeInt = (n, upper) => Number.isSafeInteger(n) && n >= 1 && n <= upper;

export function previewOperationalL1Task({event, grant, nowIso} = {}) {
  const decision = classifyOperationalIntakeEvent(event);
  if (decision.action !== INTAKE_ACTION.L1_CANDIDATE) {
    return Object.freeze({state:"NO_L1_CALL",intent:decision.action,reason:decision.reason,providerCallAuthorized:false});
  }
  const now = Date.parse(nowIso || "");
  if (!Number.isFinite(now) || !grant || grant.enabled !== true ||
      !GRANT_ID.test(String(grant.id || "")) || grant.action !== ACTION ||
      !Array.isArray(grant.eventClasses) || !grant.eventClasses.includes(event.kind) ||
      typeof grant.model !== "string" || !grant.model.trim() ||
      !safeInt(grant.maxInputTokens,4096) || !safeInt(grant.maxOutputTokens,512) ||
      !Number.isFinite(Date.parse(grant.expiresAt || "")) || Date.parse(grant.expiresAt) <= now) {
    return Object.freeze({state:"NO_L1_CALL",reason:"standing_operational_grant_invalid",providerCallAuthorized:false});
  }
  return Object.freeze({
    state:"L1_DIAGNOSIS_CANDIDATE",
    intent:decision.action,
    approvalScope:grant.id,
    action:ACTION,
    providerCallAuthorized:false,
    needServerChecks:Object.freeze([
      "verify_exact_owner_grant_and_source_revision",
      "verify_current_identity_and_redacted_minimal_context",
      "ensure_no_previous_or_inflight_analysis_for_exact_revision",
      "enforce_tokens_model_and_timeout_server_side",
      "record_model_cost_and_identity_attribution_after_call",
    ]),
    allowedOutput:"read_only_diagnosis_or_fix_proposal",
  });
}

export function previewOperationalIntakeDigest(events) {
  if (!Array.isArray(events) || events.length > 500)
    return Object.freeze({state:"INVALID_BATCH",reason:"bounded_500_events",providerCallAuthorized:false});
  const counts={received:0,free:0,duplicateReused:0,l1Candidates:0,
    needsOwnerApproval:0,immediateIncidents:0,invalidSources:0,autoModelCalls:0};
  for(const event of events){
    const d=classifyOperationalIntakeEvent(event);
    counts.received++;
    if(d.action===INTAKE_ACTION.FREE) counts.free++;
    else if(d.action===INTAKE_ACTION.REUSE) counts.duplicateReused++;
    else if(d.action===INTAKE_ACTION.L1_CANDIDATE) counts.l1Candidates++;
    else if(d.action===INTAKE_ACTION.OWNER_APPROVAL) counts.needsOwnerApproval++;
    else if(d.action===INTAKE_ACTION.ALERT) counts.immediateIncidents++;
    else if(d.action===INTAKE_ACTION.QUARANTINE) counts.invalidSources++;
  }
  return Object.freeze({state:"PREVIEW_ONLY",counts:Object.freeze(counts),
    providerCallAuthorized:false,sourceDataRetained:false,
    needsRealServerReceiptsBeforePublishing:true});
}

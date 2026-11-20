// SOD1820 #1457 — deterministic operational-intake decision policy (PROPOSAL / BRANCH ONLY).
// No I/O, no DB writes, no model dispatch, no authority to approve money or publication.
// Research Intake v14 owns source intake; System Operations handles events;
// Strategy v17/Raziel Routing v2 may plan L1 work, and Truth Axes v3 governs truth/access.
export const OPERATIONAL_INTAKE_POLICY_V1 = Object.freeze({
  version: 1,
  status: "design_only",
  productionEnabled: false,
  timeZone: "Asia/Jerusalem",
  additionalMonthlyAiCapIls: 50,
  allowAutonomousOperationalTriageCandidate: true,
  allowAutonomousDeepResearch: false,
  defaultDigest: "daily",
});

export const INTAKE_ACTION = Object.freeze({
  QUARANTINE: "QUARANTINE_SOURCE",
  FREE: "FREE_INTAKE_AND_CLASSIFY",
  REUSE: "REUSE_EXISTING_ANALYSIS",
  ALERT: "HALT_AND_ALERT_OWNER",
  OWNER_APPROVAL: "WAIT_FOR_OWNER_APPROVAL",
  L1_CANDIDATE: "BOUNDED_OPERATIONAL_AI_CANDIDATE",
});

const INCIDENTS = new Set([
  "credential_exposure",
  "private_to_public_leak",
  "identity_link_conflict",
  "unauthorized_publication",
]);
const ESSENTIAL_DIAGNOSTICS = new Set([
  "repeated_ingest_failure",
  "repeated_public_link_failure",
  "public_projection_inconsistency",
  "new_source_intersects_active_research",
  "verified_canonical_discrepancy",
  "repeated_runtime_failure",
]);
const DEEP_RESEARCH = new Set([
  "bulk_corpus_scan",
  "full_document_interpretation",
  "research_extraction",
  "mass_ocr",
  "mass_transcription",
  "semantic_corpus_reanalysis",
]);

const SHA256 = /^[a-f0-9]{64}$/i;
const SOURCE_REF = /^(?:channel_updates|gallery_images|posts|research_objects|community_messages|op_trace):[a-zA-Z0-9_-]{1,120}$/;

function result(action, priority, reason, extra = {}) {
  return Object.freeze({
    action,
    priority,
    reason,
    // Classification is only an INTENT. It cannot authorize any real provider call.
    providerCallAuthorized: false,
    productionMutationAuthorized: false,
    ...extra,
  });
}

/**
 * Pure event classification over SERVER-PROVEN facts. This MUST NOT be used as
 * an access, identity, publication or monetary authorization check. An executor
 * must independently validate standing authorization, owner policy version,
 * a safe redacted Context Pack, atomic ILS reservation and idempotency.
 *
 * Expected input: kind, sourceRef, sourceRevisionSha256, sourceAccess,
 * serverEvidenceVerified, safeRedactedContext, consecutiveFailures,
 * existingAnalysisSameRevision. Do not pass source text/secrets here.
 */
export function classifyOperationalIntakeEvent(event = {}) {
  const kind = typeof event.kind === "string" ? event.kind : "";
  const sourceRef = typeof event.sourceRef === "string" ? event.sourceRef : "";
  if (!SOURCE_REF.test(sourceRef)) {
    return result(INTAKE_ACTION.QUARANTINE, "HIGH", "invalid_or_missing_canonical_source");
  }
  // Security and identity incidents require immediate containment even if
  // duplicates. AI may later advise on a redacted incident, but cannot act here.
  if (INCIDENTS.has(kind)) {
    return result(INTAKE_ACTION.ALERT, "CRITICAL", "security_or_identity_gate", {
      notifyOwnerImmediately: true,
      requiresHumanReleaseDecision: true,
    });
  }
  // A distinct occurrence must always remain distinct in source storage.
  if (event.existingAnalysisSameRevision === true &&
      SHA256.test(String(event.sourceRevisionSha256 || ""))) {
    return result(INTAKE_ACTION.REUSE, "LOW", "exact_existing_revision_result", {
      preserveOccurrenceIdentity: true,
    });
  }
  if (DEEP_RESEARCH.has(kind) || event.requestsDeepResearch === true) {
    return result(INTAKE_ACTION.OWNER_APPROVAL, "NORMAL", "deep_research_is_opt_in", {
      eligibleForStandingOperationalGrant: false,
    });
  }
  if (!ESSENTIAL_DIAGNOSTICS.has(kind)) {
    return result(INTAKE_ACTION.FREE, "LOW", "ordinary_intake_is_deterministic_only", {
      needsMetadataPrepass: kind === "new_public_link" || kind === "missing_video_title",
    });
  }

  // Essential is evidence-led, not inferred from message count or model interest.
  const enoughFailures = !["repeated_ingest_failure", "repeated_public_link_failure", "repeated_runtime_failure"].includes(kind)
    || (Number.isInteger(event.consecutiveFailures) && event.consecutiveFailures >= 2);
  const sourceNoveltyVerified = kind !== "new_source_intersects_active_research"
    || (event.activeResearchMatchVerified === true && event.sourceNoveltyVerified === true);
  const discrepancyVerified = kind !== "verified_canonical_discrepancy"
    || event.canonicalDiscrepancyVerified === true;
  if (!enoughFailures || !sourceNoveltyVerified || !discrepancyVerified || event.serverEvidenceVerified !== true) {
    return result(INTAKE_ACTION.FREE, "NORMAL", "essential_evidence_not_yet_proved");
  }
  if (event.sourceAccess !== "public" ||
      event.safeRedactedContext !== true ||
      !SHA256.test(String(event.sourceRevisionSha256 || ""))) {
    return result(INTAKE_ACTION.OWNER_APPROVAL, "HIGH", "private_or_unbounded_context", {
      notifyOwnerImmediately: true,
      eligibleForStandingOperationalGrant: false,
    });
  }
  return result(INTAKE_ACTION.L1_CANDIDATE, "HIGH", "verified_operational_failure", {
    notifyOwnerImmediately: false,
    eligibleForStandingOperationalGrant: true,
    requiredBeforePaidExecution: Object.freeze([
      "verify_provenance_and_standing_policy_server_side",
      "check_same_revision_and_inflight_dedup",
      "reserve_monthly_ils_budget_atomically",
      "enforce_strict_one_call_task_limits",
      "redact_minimum_context_and_record_receipt",
    ]),
    allowedOutput: "diagnosis_or_fix_proposal_only",
  });
}

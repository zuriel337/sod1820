import test from "node:test";
import assert from "node:assert/strict";
import {
  INTAKE_ACTION,
  OPERATIONAL_INTAKE_POLICY_V1,
  classifyOperationalIntakeEvent,
} from "../src/lib/research/intakeOperationalPolicy2029.js";

const sourceRef = "channel_updates:10000000-0000-4000-8000-000000000001";
const revision = "a".repeat(64);
const verified = (kind, overrides = {}) => ({
  kind, sourceRef, sourceRevisionSha256: revision, sourceAccess: "public",
  serverEvidenceVerified: true, safeRedactedContext: true,
  consecutiveFailures: 2, ...overrides,
});

test("policy is design-only, 50 ILS, never an execution or production authorization", () => {
  assert.equal(OPERATIONAL_INTAKE_POLICY_V1.monthlySpendingCapEnabled, false);
  assert.equal(OPERATIONAL_INTAKE_POLICY_V1.costReportingMode, "observability_only");
  assert.equal(OPERATIONAL_INTAKE_POLICY_V1.productionEnabled, false);
  assert.equal(OPERATIONAL_INTAKE_POLICY_V1.allowAutonomousDeepResearch, false);
  const decision = classifyOperationalIntakeEvent(verified("repeated_ingest_failure"));
  assert.equal(decision.action, INTAKE_ACTION.L1_CANDIDATE);
  assert.equal(decision.providerCallAuthorized, false);
  assert.equal(decision.productionMutationAuthorized, false);
  assert.ok(decision.requiredBeforePaidExecution.includes("reserve_monthly_ils_budget_atomically"));
});

test("ordinary incoming links, messages and metadata use free deterministic prepass", () => {
  for (const kind of ["new_source", "new_public_link", "missing_video_title", "new_group_message"]) {
    const d = classifyOperationalIntakeEvent(verified(kind));
    assert.equal(d.action, INTAKE_ACTION.FREE);
    assert.equal(d.providerCallAuthorized, false);
  }
  assert.equal(classifyOperationalIntakeEvent(verified("missing_video_title")).needsMetadataPrepass, true);
});

test("security and identity incidents immediately halt even if a duplicate exists", () => {
  for (const kind of ["credential_exposure", "private_to_public_leak", "identity_link_conflict", "unauthorized_publication"]) {
    const d = classifyOperationalIntakeEvent(verified(kind, { existingAnalysisSameRevision: true }));
    assert.equal(d.action, INTAKE_ACTION.ALERT);
    assert.equal(d.notifyOwnerImmediately, true);
    assert.equal(d.providerCallAuthorized, false);
    assert.equal(d.requiresHumanReleaseDecision, true);
  }
});

test("exact existing revision is reused without fusing distinct source occurrences", () => {
  const d = classifyOperationalIntakeEvent(verified("repeated_ingest_failure", {
    existingAnalysisSameRevision: true,
  }));
  assert.equal(d.action, INTAKE_ACTION.REUSE);
  assert.equal(d.preserveOccurrenceIdentity, true);
});

test("bulk corpus and semantic extraction always require an explicit separate approval", () => {
  for (const kind of ["bulk_corpus_scan", "full_document_interpretation", "research_extraction",
    "mass_ocr", "mass_transcription", "semantic_corpus_reanalysis"]) {
    const d = classifyOperationalIntakeEvent(verified(kind));
    assert.equal(d.action, INTAKE_ACTION.OWNER_APPROVAL);
    assert.equal(d.eligibleForStandingOperationalGrant, false);
  }
});

test("L1 AI candidate requires verified incident, repeated failure, public scope and safe exact revision", () => {
  for (const kind of ["repeated_ingest_failure", "repeated_public_link_failure",
    "public_projection_inconsistency"]) {
    const d = classifyOperationalIntakeEvent(verified(kind));
    assert.equal(d.action, INTAKE_ACTION.L1_CANDIDATE);
    assert.equal(d.eligibleForStandingOperationalGrant, true);
    assert.equal(d.allowedOutput, "diagnosis_or_fix_proposal_only");
  }
  for (const kind of ["repeated_ingest_failure", "repeated_public_link_failure"]) {
    assert.equal(classifyOperationalIntakeEvent(verified(kind, { consecutiveFailures: 1 })).action, INTAKE_ACTION.FREE);
  }
  assert.equal(classifyOperationalIntakeEvent(verified("public_projection_inconsistency",
    { serverEvidenceVerified: false })).action, INTAKE_ACTION.FREE);
});

test("new sources touching active research need independently proven novelty and active match", () => {
  const kind = "new_source_intersects_active_research";
  assert.equal(classifyOperationalIntakeEvent(verified(kind)).action, INTAKE_ACTION.FREE);
  assert.equal(classifyOperationalIntakeEvent(verified(kind, { activeResearchMatchVerified: true })).action, INTAKE_ACTION.FREE);
  const approvedCandidate = classifyOperationalIntakeEvent(verified(kind, {
    activeResearchMatchVerified: true, sourceNoveltyVerified: true,
  }));
  assert.equal(approvedCandidate.action, INTAKE_ACTION.L1_CANDIDATE);
  assert.equal(approvedCandidate.providerCallAuthorized, false);
});

test("verified canonical discrepancies and repeated runtime failures may be L1 candidates only", () => {
  assert.equal(classifyOperationalIntakeEvent(verified("verified_canonical_discrepancy")).action, INTAKE_ACTION.FREE);
  assert.equal(classifyOperationalIntakeEvent(verified("verified_canonical_discrepancy", {
    canonicalDiscrepancyVerified: true,
  })).action, INTAKE_ACTION.L1_CANDIDATE);
  const runtime = "op_trace:10000000-0000-4000-8000-000000000001";
  assert.equal(classifyOperationalIntakeEvent(verified("repeated_runtime_failure", {
    sourceRef: runtime, consecutiveFailures: 1,
  })).action, INTAKE_ACTION.FREE);
  assert.equal(classifyOperationalIntakeEvent(verified("repeated_runtime_failure", {
    sourceRef: runtime,
  })).action, INTAKE_ACTION.L1_CANDIDATE);
});

test("unsafe/private/unhashed incidents cannot use a standing operational grant", () => {
  for (const overrides of [
    { sourceAccess: "private" }, { sourceAccess: "personal" },
    { safeRedactedContext: false }, { sourceRevisionSha256: null },
    { sourceRevisionSha256: "bad" },
  ]) {
    const d = classifyOperationalIntakeEvent(verified("repeated_ingest_failure", overrides));
    assert.equal(d.action, INTAKE_ACTION.OWNER_APPROVAL);
    assert.equal(d.eligibleForStandingOperationalGrant, false);
  }
});

test("unknown/malformed source fails closed and cannot trigger model work", () => {
  for (const bad of [undefined, "", "https://evil.example/x", "channel_updates:abc/../x"]) {
    const d = classifyOperationalIntakeEvent({ kind: "repeated_ingest_failure", sourceRef: bad });
    assert.equal(d.action, INTAKE_ACTION.QUARANTINE);
    assert.equal(d.providerCallAuthorized, false);
  }
});

// Skeleton, not wired into CI. Approval and verification are separate and both always present.
import test from "node:test";
import assert from "node:assert/strict";
import { approvalLabel, verificationLabel, viewerAccess } from "../elsFindingShare.draft.mjs";
import { approvedExact, approvedLegacy, ownerSharedDraft, dossierOnly, privateDraft, memberPendingSubmission } from "./fixtures.mjs";

test("approval label follows status, never inferred from an image or a title", () => {
  assert.equal(approvalLabel(approvedExact, "public-approved").key, "approved");
  assert.equal(approvalLabel(ownerSharedDraft, "public-unapproved").key, "shared-unreviewed");
  assert.equal(approvalLabel({ ...memberPendingSubmission }, "public-unapproved").key, "shared-pending");
  assert.equal(approvalLabel(dossierOnly, "public-unapproved").key, "shared-not-library");
  assert.equal(approvalLabel(privateDraft, viewerAccess(privateDraft, { viewerId: privateDraft.owner_user_id })).key, "private");
});

test("every unapproved public label says 'לא אושר'", () => {
  for (const row of [ownerSharedDraft, dossierOnly, memberPendingSubmission]) {
    assert.match(approvalLabel(row, "public-unapproved").text, /לא אושר/);
  }
});

test("published does not imply verified (els_research_layer_law v9 §9)", () => {
  assert.equal(verificationLabel({ exact: false }).key, "legacy");
  assert.equal(verificationLabel({ exact: true }).key, "verifying");
  assert.equal(verificationLabel({ exact: true, state: "MATCH" }).key, "verified");
});

test("failure labels never imply that another occurrence is shown", () => {
  for (const state of ["MISMATCH", "corpus-mismatch", "occurrence-mismatch"]) {
    assert.match(verificationLabel({ exact: true, state }).text, /לא מוצג מופע אחר/);
  }
  assert.equal(verificationLabel({ exact: true, state: "UNAVAILABLE", error: "rate_limited" }).key, "rate-limited");
  assert.equal(verificationLabel({ exact: true, state: "UNAVAILABLE", error: "bridge_error" }).key, "verify-unavailable");
});

test("legacy record label is honest about the missing locator", () => {
  assert.match(verificationLabel({ exact: false }).text, /המיקום המדויק לא נשמר/);
  assert.ok(approvedLegacy.start_index === null);
});

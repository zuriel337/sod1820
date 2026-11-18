// Skeleton, not wired into CI. Documents the live RLS rule and the contract rule side by side.
import test from "node:test";
import assert from "node:assert/strict";
import { currentGuestRlsReadable, contractPublicBasis, viewerAccess } from "../elsFindingShare.draft.mjs";
import { approvedExact, memberPendingSubmission, ownerSharedDraft, dossierOnly, privateDraft } from "./fixtures.mjs";

test("approved (published+public) is public under both rules", () => {
  assert.equal(currentGuestRlsReadable(approvedExact), true);
  assert.equal(contractPublicBasis(approvedExact), "approved");
  assert.equal(viewerAccess(approvedExact), "public-approved");
});

test("CONFLICT D-1: a member's pending submission is guest-readable today but not public under decision 1", () => {
  // save_els_matrix (migration 20261010231453 line 86; live body same rule): self_published = (v_status <> 'draft').
  // RLS public_read_self_published_els: qual (self_published = true), roles {public}.
  assert.equal(currentGuestRlsReadable(memberPendingSubmission), true);
  assert.equal(contractPublicBasis(memberPendingSubmission), null);
  assert.equal(viewerAccess(memberPendingSubmission), "unavailable");
});

test("explicit owner share (self_publish_matrix) is public but labelled unapproved", () => {
  assert.equal(viewerAccess(ownerSharedDraft, { explicitShare: true }), "public-unapproved");
  assert.equal(viewerAccess(dossierOnly, { explicitShare: true }), "public-unapproved");
});

test("private: owner and admin only; a guest gets the same answer as for a removed row", () => {
  assert.equal(viewerAccess(privateDraft, { viewerId: privateDraft.owner_user_id }), "owner-only");
  assert.equal(viewerAccess(privateDraft, { isAdmin: true }), "admin-only");
  assert.equal(viewerAccess(privateDraft), "unavailable");
  assert.equal(viewerAccess(null), "unavailable");
});

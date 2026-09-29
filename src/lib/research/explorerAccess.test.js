import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPLORER_DEPTH, resolveExplorerDepth } from "./explorerAccess.js";

function assertPublicSurfacePreserved(profile) {
  assert.equal(profile.publicListsVisible, true);
  assert.equal(profile.publicRoutesVisible, true);
  assert.equal(profile.publicTopicDetailVisible, true);
  assert.equal(profile.premiumDepthEnabled, false);
  assert.equal(profile.adminInspectionEnabled, false);
}

test("keeps anonymous users on L0 without hiding any existing public Explorer surface", () => {
  const p = resolveExplorerDepth();
  assert.equal(p.depth, EXPLORER_DEPTH.PUBLIC);
  assert.equal(p.registeredIdentity, false);
  assert.equal(p.memberIdentityRecognized, false);
  assertPublicSurfacePreserved(p);
});

test("recognizes an existing authenticated session as L1 without inventing extra data access", () => {
  const p = resolveExplorerDepth({ verified: true });
  assert.equal(p.depth, EXPLORER_DEPTH.REGISTERED);
  assert.equal(p.registeredIdentity, true);
  assert.equal(p.memberIdentityRecognized, false);
  assertPublicSurfacePreserved(p);
});

test("recognizes member identity but never equates it with a live Premium entitlement", () => {
  const p = resolveExplorerDepth({ verified: true, isMember: true });
  assert.equal(p.depth, EXPLORER_DEPTH.MEMBER_RECOGNIZED);
  assert.equal(p.registeredIdentity, true);
  assert.equal(p.memberIdentityRecognized, true);
  assert.equal(p.premiumDepthEnabled, false);
  assertPublicSurfacePreserved(p);
});

test("recognizes admin with highest precedence but exposes no new admin inspection data", () => {
  const p = resolveExplorerDepth({ verified: true, isMember: true, isAdmin: true });
  assert.equal(p.depth, EXPLORER_DEPTH.ADMIN);
  assert.equal(p.registeredIdentity, true);
  assert.equal(p.memberIdentityRecognized, true);
  assert.equal(p.adminInspectionEnabled, false);
  assertPublicSurfacePreserved(p);
});

test("never changes public visibility as identity depth increases", () => {
  const profiles = [
    resolveExplorerDepth(),
    resolveExplorerDepth({ verified: true }),
    resolveExplorerDepth({ verified: true, isMember: true }),
    resolveExplorerDepth({ verified: true, isAdmin: true }),
  ];
  for (const profile of profiles) assertPublicSurfacePreserved(profile);
});

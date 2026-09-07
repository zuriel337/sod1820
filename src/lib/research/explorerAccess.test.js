import { describe, expect, it } from "vitest";
import { EXPLORER_DEPTH, resolveExplorerDepth } from "./explorerAccess.js";

function expectPublicSurfacePreserved(profile) {
  expect(profile.publicListsVisible).toBe(true);
  expect(profile.publicRoutesVisible).toBe(true);
  expect(profile.publicTopicDetailVisible).toBe(true);
  expect(profile.premiumDepthEnabled).toBe(false);
  expect(profile.adminInspectionEnabled).toBe(false);
}

describe("Explorer Slice 6 progressive depth/access projection", () => {
  it("keeps anonymous users on L0 without hiding any existing public Explorer surface", () => {
    const p = resolveExplorerDepth();
    expect(p.depth).toBe(EXPLORER_DEPTH.PUBLIC);
    expect(p.registeredIdentity).toBe(false);
    expect(p.memberIdentityRecognized).toBe(false);
    expectPublicSurfacePreserved(p);
  });

  it("recognizes an existing authenticated session as L1 without inventing extra data access", () => {
    const p = resolveExplorerDepth({ verified: true });
    expect(p.depth).toBe(EXPLORER_DEPTH.REGISTERED);
    expect(p.registeredIdentity).toBe(true);
    expect(p.memberIdentityRecognized).toBe(false);
    expectPublicSurfacePreserved(p);
  });

  it("recognizes member identity but never equates it with a live Premium entitlement", () => {
    const p = resolveExplorerDepth({ verified: true, isMember: true });
    expect(p.depth).toBe(EXPLORER_DEPTH.MEMBER_RECOGNIZED);
    expect(p.registeredIdentity).toBe(true);
    expect(p.memberIdentityRecognized).toBe(true);
    expect(p.premiumDepthEnabled).toBe(false);
    expectPublicSurfacePreserved(p);
  });

  it("recognizes admin with highest precedence but exposes no new admin inspection data", () => {
    const p = resolveExplorerDepth({ verified: true, isMember: true, isAdmin: true });
    expect(p.depth).toBe(EXPLORER_DEPTH.ADMIN);
    expect(p.registeredIdentity).toBe(true);
    expect(p.memberIdentityRecognized).toBe(true);
    expect(p.adminInspectionEnabled).toBe(false);
    expectPublicSurfacePreserved(p);
  });

  it("never changes public visibility as identity depth increases", () => {
    const profiles = [
      resolveExplorerDepth(),
      resolveExplorerDepth({ verified: true }),
      resolveExplorerDepth({ verified: true, isMember: true }),
      resolveExplorerDepth({ verified: true, isAdmin: true }),
    ];
    for (const profile of profiles) expectPublicSurfacePreserved(profile);
  });
});

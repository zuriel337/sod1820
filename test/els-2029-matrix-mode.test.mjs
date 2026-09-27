import test from "node:test";
import assert from "node:assert/strict";
import {
  ELS_MATRIX_PROFILE,
  normalizeElsMatrixProfile,
  projectElsMatrixProfile,
  transitionElsMatrixProfile,
  getElsMatrixProfileCapabilities,
} from "../src/lib/research/els2029MatrixMode.js";

test("Research is the 2029 default but entry itself is low-cost", () => {
  const out = projectElsMatrixProfile({});
  assert.equal(out.profile, ELS_MATRIX_PROFILE.RESEARCH);
  assert.equal(out.representation.primary, "2D");
  assert.equal(out.compute.heavyIoOnEntry, false);
  assert.equal(out.compute.modeSwitchTriggersSearch, false);
  assert.equal(out.ai.required, false);
  assert.equal(out.ai.autoInvoke, false);
});

test("Classic is a direct 2D/manual profile over the same engine", () => {
  const out = projectElsMatrixProfile({
    profile: "classic",
    replayMatched: true,
    razielAvailable: true,
    researchSignal: "HOT",
  });
  assert.equal(out.profile, ELS_MATRIX_PROFILE.CLASSIC);
  assert.equal(out.representation.layeredAllowed, false);
  assert.equal(out.representation.matrixVolumeAllowed, false);
  assert.equal(out.interaction.directMatrix, true);
  assert.equal(out.interaction.manualFindingActions, true);
  assert.equal(out.ai.razielSurfaceAction, false);
  assert.equal(out.semantics.oneEngine, true);
  assert.equal(out.semantics.oneResearchState, true);
});

test("Research progressively enables deeper capabilities without forcing 3D or AI", () => {
  const cold = projectElsMatrixProfile({
    profile: "research",
    researchSignal: "COLD",
    razielAvailable: false,
  });
  assert.equal(cold.representation.layeredAllowed, true);
  assert.equal(cold.representation.matrixVolumeAllowed, true);
  assert.equal(cold.representation.true3dRequired, false);
  assert.equal(cold.compute.deepResearchEligible, false);
  assert.equal(cold.ai.razielSurfaceAction, false);

  const hot = projectElsMatrixProfile({
    profile: "research",
    researchSignal: "HOT",
    razielAvailable: true,
  });
  assert.equal(hot.compute.deepResearchEligible, true);
  assert.equal(hot.ai.razielSurfaceAction, true);
  assert.equal(hot.ai.required, false);
});

test("Classic -> Research -> Classic preserves the exact same state object", () => {
  const state = {
    corpusId: "torah-v1",
    occurrenceId: "els:golden",
    findings: ["a","b"],
    selection: { locator: "x" },
    journey: { id: "j1" },
    viewport: { zoom: 1.25, focus: [4,7] },
    researchOnly: { vectorGeometry: { ready: true } },
  };

  const toResearch = transitionElsMatrixProfile({
    from: "CLASSIC",
    to: "RESEARCH",
    state,
  });
  const backToClassic = transitionElsMatrixProfile({
    from: "RESEARCH",
    to: "CLASSIC",
    state: toResearch.state,
  });

  assert.strictEqual(toResearch.state, state);
  assert.strictEqual(backToClassic.state, state);
  assert.equal(toResearch.requiresReplay, false);
  assert.equal(backToClassic.clearsFindings, false);
  assert.equal(backToClassic.hiddenResearchStatePolicy, "PRESERVE_HIDE_RESEARCH_ONLY_PROJECTIONS");
});

test("AI availability never changes the profile identity", () => {
  const a = projectElsMatrixProfile({ profile: "RESEARCH", razielAvailable: false });
  const b = projectElsMatrixProfile({ profile: "RESEARCH", razielAvailable: true });
  assert.equal(a.profile, b.profile);
  assert.equal(a.ai.required, false);
  assert.equal(b.ai.required, false);
  assert.equal(a.semantics.profileChangesTruth, false);
  assert.equal(b.semantics.profileChangesEvidence, false);
});

test("capability sets preserve Classic baseline and extend it in Research", () => {
  const classic = getElsMatrixProfileCapabilities("CLASSIC");
  const research = getElsMatrixProfileCapabilities("RESEARCH");

  for (const capability of classic) {
    assert.ok(research.includes(capability));
  }
  assert.ok(!classic.includes("MATRIX_VOLUME"));
  assert.ok(research.includes("MATRIX_VOLUME"));
  assert.ok(research.includes("OPTIONAL_RAZIEL"));
});

test("unknown profile normalizes to Research", () => {
  assert.equal(normalizeElsMatrixProfile("something"), ELS_MATRIX_PROFILE.RESEARCH);
});

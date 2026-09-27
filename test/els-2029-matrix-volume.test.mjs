import test from "node:test";
import assert from "node:assert/strict";
import {
  buildElsMatrixVolumeBasis,
  mapElsVolumeCell,
  normalizeElsDirection3d,
  evaluateElsAdaptiveBox,
  evaluateElsCandidateEligibility,
} from "../src/lib/research/els2029MatrixVolume.js";

test("true volume Z is independent from the +S slice shift", () => {
  const basis = buildElsMatrixVolumeBasis({
    origin: 0,
    axisWidth: 50,
    planeHeight: 4,
    corpusLength: 304805,
  });
  assert.deepEqual(basis.basis, { eX: 1, eY: 50, eZ: 200 });
  assert.equal(basis.semantics.sliceShiftStep, 50);
  assert.equal(basis.semantics.sliceShiftIsIndependentZ, false);

  const z1 = mapElsVolumeCell(basis, { x: 5, y: 0, z: 1 });
  assert.equal(z1.corpusIndex, 205);
  assert.notEqual(z1.corpusIndex, 55);
});

test("large-skip true volume uses the same basis law", () => {
  const basis = buildElsMatrixVolumeBasis({
    origin: 1200,
    axisWidth: 10000,
    planeWidth: 80,
    planeHeight: 6,
    corpusLength: 304805,
  });
  assert.deepEqual(basis.basis, { eX: 1, eY: 10000, eZ: 60000 });
  assert.equal(mapElsVolumeCell(basis, { x: 37, y: 2, z: 1 }).corpusIndex, 81237);
});

test("all 3D directions normalize to one primitive vector contract", () => {
  assert.deepEqual(normalizeElsDirection3d([2,2,2]).primitive, [1,1,1]);
  assert.deepEqual(normalizeElsDirection3d([-2,-4,-2]).primitive, [1,2,1]);
  assert.equal(normalizeElsDirection3d([-2,-4,-2]).traversalSign, -1);
  assert.equal(normalizeElsDirection3d([0,0,0]), null);
});

test("a cold box does not scan short tokens merely because one exists", () => {
  const interest = evaluateElsAdaptiveBox({ onlyShortTokenSignal: true });
  assert.equal(interest.planningState, "COLD");
  assert.equal(interest.shortTokenScanAllowed, false);

  const candidate = evaluateElsCandidateEligibility({
    termLength: 3,
    boxInterest: interest,
    structuralRelation: true,
  });
  assert.equal(candidate.eligible, false);
  assert.equal(candidate.reason, "SHORT_TERM_REQUIRES_HOT_CONTEXT");
});

test("the 1820 long continuation heats the box and enables structural short-token follow-up", () => {
  const interest = evaluateElsAdaptiveBox({
    sameLineExtensionLength: 18,
  });
  assert.equal(interest.planningState, "HOT");
  assert.ok(interest.hotReasons.includes("LONG_SAME_LINE_EXTENSION"));
  assert.ok(interest.expansionHints.includes("ALONG_ACTIVE_VECTOR"));
  assert.equal(interest.shortTokenScanAllowed, true);

  const candidate = evaluateElsCandidateEligibility({
    termLength: 3,
    boxInterest: interest,
    structuralRelation: true,
  });
  assert.equal(candidate.eligible, true);
  assert.equal(candidate.reason, "HOT_CONTEXT_STRUCTURAL_SHORT_TERM");
});

test("a short seed may survive when it deterministically extends into a longer expression", () => {
  const cold = evaluateElsAdaptiveBox({});
  const candidate = evaluateElsCandidateEligibility({
    termLength: 3,
    boxInterest: cold,
    extendsToLength: 8,
  });
  assert.equal(candidate.eligible, true);
  assert.equal(candidate.reason, "SHORT_SEED_EXTENDS_LONG");
});

test("adaptive expansion can be asymmetric instead of widening the whole volume", () => {
  const interest = evaluateElsAdaptiveBox({
    sameLineExtensionLength: 8,
    crossSliceContinuation: true,
    parallelFamily: true,
  });
  assert.deepEqual(
    new Set(interest.expansionHints),
    new Set(["ALONG_ACTIVE_VECTOR","DEPTH_FACE","LOCAL_XY_RING"])
  );
});

test("three/four-letter terms do not gain truth by entering a hot box", () => {
  const interest = evaluateElsAdaptiveBox({ exactIntersection: true, rareReplayableCandidate: true });
  const candidate = evaluateElsCandidateEligibility({
    termLength: 4,
    boxInterest: interest,
    structuralRelation: true,
  });
  assert.equal(candidate.eligible, true);
  assert.equal(candidate.truthPromotion, false);
  assert.equal(interest.truthPromotion, false);
});

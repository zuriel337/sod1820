import test from "node:test";
import assert from "node:assert/strict";
import { projectEls2029Layers } from "../src/lib/research/els2029Layers.js";

test("selected occurrence becomes axis layer without changing occurrence truth", () => {
  const out = projectEls2029Layers({
    contract: "els_2029_projection_v1",
    status: "OK",
    corpusId: "torah-v1",
    term: "משיח",
    selectedOccurrence: { occurrenceId: "occ-2" },
    occurrences: [
      { occurrenceId: "occ-1", corpusId: "torah-v1", skip: 7, dir: 1, start: 10, positions: [10,17,24,31], dependencyGroup: "g1" },
      { occurrenceId: "occ-2", corpusId: "torah-v1", skip: 11, dir: -1, start: 90, positions: [90,79,68,57], dependencyGroup: "g2" },
    ],
  });

  assert.equal(out.axisOccurrenceId, "occ-2");
  assert.equal(out.layers[0].occurrenceId, "occ-2");
  assert.equal(out.layers[0].role, "axis");
  assert.equal(out.layers[0].truthPromotion, false);
  assert.equal(out.layers[1].role, "occurrence");
});

test("layer cells preserve corpus positions but do not mint glyph identity or rendering truth", () => {
  const out = projectEls2029Layers({
    contract: "els_2029_projection_v1",
    status: "OK",
    corpusId: "torah-v1",
    term: "דוד",
    selectedOccurrence: null,
    occurrences: [{ occurrenceId: "occ-a", corpusId: "torah-v1", skip: 9, dir: 1, start: 50, positions: [50,59,68], dependencyGroup: "same-window" }],
  });

  const cell = out.layers[0].cells[0];
  assert.equal(cell.corpusIndex, 50);
  assert.equal(cell.characterIdentityRef, "corpus-index:50");
  assert.equal(cell.glyphIdentity, null);
  assert.equal(cell.renderingInstance, null);
});

test("projection preserves dependency groups and refuses proximity/evidence inference", () => {
  const out = projectEls2029Layers({
    contract: "els_2029_projection_v1",
    status: "OK",
    corpusId: "torah-v1",
    term: "אלהים",
    occurrences: [{ occurrenceId: "occ-x", corpusId: "torah-v1", skip: 4, dir: 1, start: 5, positions: [5,9,13,17,21], dependencyGroup: "window-1" }],
  });

  assert.equal(out.layers[0].dependencyGroup, "window-1");
  assert.equal(out.layers[0].evidenceWeight, null);
  assert.equal(out.layers[0].proximityStrength, null);
  assert.equal(out.semantics.visualProximityIsEvidence, false);
  assert.equal(out.semantics.dependencyPreserved, true);
  assert.equal(out.semantics.glyphIdentityCanonicalized, false);
  assert.equal(out.semantics.rendererMayChange, true);
});

console.log("ELS 2029 layered projection: PASS");

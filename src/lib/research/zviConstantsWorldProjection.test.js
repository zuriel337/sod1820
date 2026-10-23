import test from "node:test";
import assert from "node:assert/strict";
import {
  ZVI_CONSTANT_CASES,
  buildZviConstantsWorldProjection,
  verifyConstantCase,
} from "./zviConstantsWorldProjection.js";

test("pi/e cases are verified deterministically and labelled approximation, never equality", () => {
  const crown = verifyConstantCase(ZVI_CONSTANT_CASES[0]);
  assert.equal(crown.relation, "approximation");
  assert.equal(crown.label, "קירוב — לא שוויון");
  assert.ok(Math.abs(crown.actual - 19.99909997918947) < 1e-12);

  const powers = verifyConstantCase(ZVI_CONSTANT_CASES[1]);
  assert.equal(powers.relation, "approximation");
  assert.ok(powers.absoluteError > 0);
  assert.ok(powers.relativeError < 0.000001);
});

test("public constants projection requires approved public live research and source rows", () => {
  const spec = ZVI_CONSTANT_CASES[0];
  const research = [{ id: spec.researchId, statement: "row", status: "approved", privacy_scope: "public" }];
  const sources = [
    { id: spec.sourceRef.split(":")[1], text: "טענת המקור", image_url: null, thumb_url: null },
    { id: spec.mediaRef.split(":")[1], text: "📷", image_url: "https://example.com/pi.jpg", thumb_url: null },
  ];
  const projection = buildZviConstantsWorldProjection(research, sources);
  assert.equal(projection.cards.length, 1);
  assert.equal(projection.cards[0].geometryLink, null);
  assert.equal(projection.cards[0].diagramKind, "constant-orbit");
  assert.equal(projection.cards[0].image, "https://example.com/pi.jpg");
  assert.equal(projection.rules.noGeometryLinkWithoutGeometry, true);
});

test("candidate or non-public constants never enter the public series", () => {
  const spec = ZVI_CONSTANT_CASES[0];
  const source = [{ id: spec.sourceRef.split(":")[1], text: "source" }];
  assert.equal(buildZviConstantsWorldProjection([{ id: spec.researchId, status: "candidate", privacy_scope: "public" }], source).cards.length, 0);
  assert.equal(buildZviConstantsWorldProjection([{ id: spec.researchId, status: "approved", privacy_scope: "private" }], source).cards.length, 0);
});

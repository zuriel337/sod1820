import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveElsLineGeometry,
  extractElsVectorGeometry,
} from "../src/lib/research/els2029VectorGeometry.js";
import { projectEls2029Layers } from "../src/lib/research/els2029Layers.js";

const width = 10065;
const findings = [
  { occurrenceId: "hatorah", term: "התורה", dir: -1, positions: [131400,111268,91136,71004,50872] },
  { occurrenceId: "amitit", term: "אמיתית", dir: -1, positions: [111271,101205,91139,81073,71007,60941] },
  { occurrenceId: "yirah", term: "יראה", dir: -1, positions: [191787,181721,171655,161589,151523] },
  { occurrenceId: "brit-or", term: "בריתאור", dir: 1, positions: [60935,60937,60939,60941,60943,60945,60947] },
];

test("Torah Kedosha scale-equivalent diagonals reduce to one direction family", () => {
  const out = extractElsVectorGeometry({ axisWidth: width, occurrences: findings });
  const hatorah = out.lines.find((line) => line.occurrenceId === "hatorah");
  const amitit = out.lines.find((line) => line.occurrenceId === "amitit");

  assert.deepEqual(hatorah.rawStep, [-2,-2]);
  assert.deepEqual(amitit.rawStep, [-1,-1]);
  assert.deepEqual(hatorah.primitiveVector, [1,1]);
  assert.deepEqual(amitit.primitiveVector, [1,1]);

  const relation = out.relations.find((item) =>
    new Set([item.a,item.b]).has("hatorah") && new Set([item.a,item.b]).has("amitit")
  );
  assert.equal(relation.type, "EXACT_PARALLEL");
  assert.equal(relation.latticeOffset, 3);
  assert.equal(Number(relation.euclideanPerpendicularOffset.toFixed(6)), 2.12132);
  assert.equal(relation.support.count, 3);
  assert.deepEqual(relation.support.gaps, [3,3,3]);
  assert.equal(relation.support.constantGap, true);
  assert.equal(relation.truthPromotion, false);
});

test("Torah Kedosha exposes a three-member parallel cluster plus transversal", () => {
  const out = extractElsVectorGeometry({ axisWidth: width, occurrences: findings });
  const cluster = out.clusters.find((item) =>
    item.primitiveVector[0] === 1 && item.primitiveVector[1] === 1
  );
  assert.equal(cluster.type, "PARALLEL_CLUSTER");
  assert.deepEqual(new Set(cluster.occurrenceIds), new Set(["hatorah","amitit","yirah"]));

  const transversal = out.transversals.find((item) => item.occurrenceId === "brit-or");
  assert.ok(transversal);
  assert.deepEqual(transversal.crossedMembers, ["amitit"]);
  assert.deepEqual(transversal.positions, [60941]);
  assert.equal(transversal.truthPromotion, false);
});

test("reverse traversal preserves orientation-independent primitive direction", () => {
  const back = deriveElsLineGeometry(
    { occurrenceId: "back", dir: -1, positions: [111271,101205,91139] },
    width
  );
  const fwd = deriveElsLineGeometry(
    { occurrenceId: "fwd", dir: 1, positions: [91139,101205,111271] },
    width
  );
  assert.deepEqual(back.primitiveVector, [1,1]);
  assert.deepEqual(fwd.primitiveVector, [1,1]);
  assert.equal(back.traversalDirection, "back");
  assert.equal(fwd.traversalDirection, "fwd");
});

test("cyclic wrap preserves the topological line step", () => {
  const line = deriveElsLineGeometry(
    { occurrenceId: "wrap", dir: 1, positions: [9,20,31,42] },
    10
  );
  assert.equal(line.linear, true);
  assert.deepEqual(line.rawStep, [1,1]);
  assert.deepEqual(line.primitiveVector, [1,1]);
});

test("non-parallel negative control does not create an exact parallel relation", () => {
  const out = extractElsVectorGeometry({
    axisWidth: width,
    occurrences: [
      findings[1],
      { occurrenceId: "other", dir: 1, positions: [60935,60937,60939,60941] },
    ],
  });
  assert.equal(out.relations.length, 0);
});

test("2029 Layers carries renderer-neutral vector geometry without truth promotion", () => {
  const out = projectEls2029Layers({
    contract: "els_2029_projection_v1",
    status: "OK",
    corpusId: "torah-v1",
    term: "תורהקדשה",
    selectedOccurrence: { occurrenceId: "axis" },
    occurrences: [
      { occurrenceId: "axis", skip: width, dir: 1, positions: [50890,60955,71020,81085,91150,101215,111280,121345] },
      ...findings,
    ],
  });

  assert.equal(out.vectorGeometry.contract, "els_vector_geometry_v1");
  assert.equal(out.vectorGeometry.axisWidth, width);
  assert.equal(out.vectorGeometry.semantics.structuralRelationIsNotTruthPromotion, true);
  assert.equal(out.semantics.vectorGeometryDerivedFromCoordinates, true);
  assert.equal(out.layers.every((layer) => layer.truthPromotion === false), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildElsDepthStack, projectElsDepthSlice } from "../src/lib/research/els2029SpatialDepth.js";
import { deriveElsLineGeometry } from "../src/lib/research/els2029VectorGeometry.js";

test("Torah/50 maps the same local cell through corpus-native depth", () => {
  const stack = buildElsDepthStack({
    axisWidth: 50,
    zMin: 0,
    zMax: 3,
    baseWindowOrigin: 0,
    localCells: [{ localRow: 0, localCol: 5 }],
    corpusLength: 304805,
  });

  assert.deepEqual(
    stack.slices.map((slice) => slice.cells[0].corpusIndex),
    [5,55,105,155]
  );
  assert.deepEqual(
    stack.slices.map((slice) => [slice.cells[0].localRow, slice.cells[0].localCol]),
    [[0,5],[0,5],[0,5],[0,5]]
  );
});

test("whole window shifts together and preserves relative geometry", () => {
  const base = [
    { localRow: 0, localCol: 4 },
    { localRow: 0, localCol: 7 },
    { localRow: 0, localCol: 10 },
    { localRow: 1, localCol: 4 },
  ];
  const slice = projectElsDepthSlice({
    axisWidth: 50,
    depth: 1,
    baseWindowOrigin: 250,
    localCells: base,
    corpusLength: 304805,
  });

  assert.deepEqual(
    slice.cells.map((cell) => cell.corpusIndex),
    [304,307,310,354]
  );
  assert.deepEqual(
    slice.cells.map((cell) => [cell.localRow,cell.localCol]),
    [[0,4],[0,7],[0,10],[1,4]]
  );
  assert.equal(slice.depthOffset, 50);
  assert.equal(slice.semantics.wholeWindowTransform, true);
  assert.equal(slice.semantics.createsIndependentEvidence, false);
});

test("large skip uses the same depth law", () => {
  const slice = projectElsDepthSlice({
    axisWidth: 10000,
    depth: 1,
    baseWindowOrigin: 1200,
    localCells: [
      { localRow: 0, localCol: 37 },
      { localRow: 0, localCol: 99 },
    ],
    corpusLength: 304805,
  });

  assert.deepEqual(slice.cells.map((cell) => cell.baseCorpusIndex), [1237,1299]);
  assert.deepEqual(slice.cells.map((cell) => cell.corpusIndex), [11237,11299]);
  assert.equal(slice.depthOffset, 10000);
});

test("negative depth is allowed only while corpus coordinates stay in bounds", () => {
  const ok = projectElsDepthSlice({
    axisWidth: 50,
    depth: -1,
    baseWindowOrigin: 100,
    localCells: [{ localRow: 0, localCol: 5 }],
    corpusLength: 304805,
  });
  const bad = projectElsDepthSlice({
    axisWidth: 50,
    depth: -1,
    baseWindowOrigin: 0,
    localCells: [{ localRow: 0, localCol: 5 }],
    corpusLength: 304805,
  });

  assert.equal(ok.cells[0].corpusIndex, 55);
  assert.equal(ok.cells[0].inCorpus, true);
  assert.equal(bad.cells[0].corpusIndex, null);
  assert.equal(bad.cells[0].requestedCorpusIndex, -45);
  assert.equal(bad.cells[0].outOfCorpus, true);
});

test("depth-shifting an occurrence preserves vector geometry and does not mint new truth", () => {
  const basePositions = [5,55,105,155];
  const shifted = basePositions.map((position) => position + 50);
  const a = deriveElsLineGeometry({ occurrenceId: "torah-z0", dir: 1, positions: basePositions }, 50);
  const b = deriveElsLineGeometry({ occurrenceId: "torah-z1", dir: 1, positions: shifted }, 50);

  assert.deepEqual(a.primitiveVector, b.primitiveVector);
  assert.deepEqual(a.rawStep, b.rawStep);
});

test("depth numbering is relative to the declared base window origin", () => {
  const a = projectElsDepthSlice({
    axisWidth: 50,
    depth: 1,
    baseWindowOrigin: 0,
    localCells: [{ localRow: 0, localCol: 5 }],
  });
  const b = projectElsDepthSlice({
    axisWidth: 50,
    depth: 1,
    baseWindowOrigin: 250,
    localCells: [{ localRow: 0, localCol: 5 }],
  });

  assert.equal(a.cells[0].corpusIndex, 55);
  assert.equal(b.cells[0].corpusIndex, 305);
  assert.equal(a.cells[0].localCol, b.cells[0].localCol);
});

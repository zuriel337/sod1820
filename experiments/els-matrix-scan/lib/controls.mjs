// Optional control comparison: how does the target region's finding count compare with the same count in every other full tile of the
// same size on the same matrix (same text, same width, same dictionary, same engine, same direction set)?
import { applySignificanceLabels, benjaminiHochberg } from "../../../src/lib/research/els2029StatisticalControls.js";

export const TILE_NULL_MODEL_ID = "els_tile_translation_v1";

export const STATISTICS = Object.freeze({
  cd: "hits_cd — dictionary-word occurrences (any length ≥ minLen) on columns and diagonals (true ELS skips W-1, W, W+1)",
  cd5: "hits_cd_len5 — same, restricted to words of ≥ 5 letters (less noise from short words)",
  row: "hits_row — dictionary words read along rows (skip 1: ordinary text, shown separately, not ELS)",
  row5: "hits_row_len5 — rows, words of ≥ 5 letters",
});

export function describeMethod() {
  return [
    "Tile-translation comparison (declared null model, not a random-text model).",
    "1. The matrix has the declared width W; the target region is rows r0..r1 x columns c0..c0+cols-1.",
    "2. The same-size tiling anchored at the target is laid over the whole matrix; only tiles that fit entirely inside it are used (partial edge tiles are dropped).",
    "3. In every tile we count engine-reported occurrences of dictionary words that lie ENTIRELY inside that tile and do not wrap around a row boundary.",
    "4. The target tile (rb=0, cb=0) is excluded from the control set. extreme = number of control tiles with count >= the target's count; n = number of control tiles.",
    "5. Empirical p = (extreme + 1) / (n + 1)  (add-one, never exactly 0 — the same convention as runSeededControls).",
    "6. Limits: tiles are neighbours in the same text, so they are not independent; the dictionary and region size are fixed before looking; a selected target is a post-hoc choice. p answers only 'is this region unusually dense in dictionary words compared with other places in this matrix', never 'is it meaningful'.",
    "7. Several statistics can be reported; they form one declared family and are corrected together with Benjamini-Hochberg (existing helper) before any label is shown.",
  ].join("\n");
}

/** Tile vectors travel sparse ({"ordinal": count} for non-zero tiles), as comma-joined strings, or as arrays; missing means all zeros. */
export const decodeVector = (value, size) => {
  if (value == null) return new Array(size).fill(0);
  if (Array.isArray(value) || typeof value === "string") {
    const vector = (Array.isArray(value) ? value : String(value).split(",")).map(Number);
    if (vector.some((n) => !Number.isInteger(n) || n < 0) || vector.length !== size) throw new RangeError("tile vector must be non-negative integers of the grid size");
    return vector;
  }
  const vector = new Array(size).fill(0);
  for (const [ordinal, count] of Object.entries(value)) {
    const index = Number(ordinal);
    if (!Number.isInteger(index) || index < 0 || index >= size || !Number.isInteger(Number(count)) || Number(count) < 0) throw new RangeError(`bad sparse tile entry ${ordinal}:${count}`);
    vector[index] = Number(count);
  }
  return vector;
};

const sumVectors = (vectors) => {
  const length = vectors[0].length;
  const out = new Array(length).fill(0);
  for (const vector of vectors) {
    if (vector.length !== length) throw new RangeError("tile vectors of different length");
    for (let i = 0; i < length; i += 1) out[i] += vector[i];
  }
  return out;
};

/** batchVectors: [{cd:[...], cd5:[...], row:[...], row5:[...]}] one per batch, all in the same tile order (rb asc, cb asc). */
export function mergeTileVectors(batchVectors, size) {
  if (!batchVectors.length) throw new RangeError("no batches");
  return Object.fromEntries(Object.keys(STATISTICS).map((name) => [name, sumVectors(batchVectors.map((v) => decodeVector(v[name], size)))]));
}

export const targetIndexOf = (grid) => {
  const columns = grid.cbMax - grid.cbMin + 1;
  return (0 - grid.rbMin) * columns + (0 - grid.cbMin);
};

export function compareStatistic({ merged, grid, name }) {
  const vector = merged[name];
  if (!vector || vector.length !== grid.count) throw new RangeError(`vector ${name} does not match the grid`);
  const targetIndex = targetIndexOf(grid);
  const observed = vector[targetIndex];
  const controls = vector.filter((_, index) => index !== targetIndex);
  const extreme = controls.filter((value) => value >= observed).length;
  const n = controls.length;
  const mean = controls.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(controls.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return Object.freeze({
    statistic: name, observed, controls: n, extreme, pValue: (extreme + 1) / (n + 1),
    controlMean: Number(mean.toFixed(3)), controlSd: Number(sd.toFixed(3)), controlMax: Math.max(...controls),
    rank: controls.filter((value) => value > observed).length + 1,
  });
}

/** One declared family (the reported statistics) + BH; labels exist only when controls and FDR are both present. */
export function compareToTiles({ merged, grid, statistics = ["cd", "cd5"], familyId = "els_tile_translation_family_v1", alpha = 0.05 }) {
  const results = statistics.map((name) => compareStatistic({ merged, grid, name }));
  const fdr = benjaminiHochberg(results.map((result) => result.pValue), { alpha, familyId });
  return Object.freeze({
    method: describeMethod(), nullModelId: TILE_NULL_MODEL_ID, familyId, alpha,
    results: results.map((result, index) => Object.freeze({
      ...result, qValue: fdr.qValues[index] ?? null,
      label: applySignificanceLabels({ controls: { status: "EXECUTED", nullModel: { id: TILE_NULL_MODEL_ID } }, fdr, index }).significanceLabel,
    })),
  });
}

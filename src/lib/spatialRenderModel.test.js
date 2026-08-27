// Tests for spatialRenderModel.js — run with: node --test src/lib/spatialRenderModel.test.js
// Zero external dependencies (Node's built-in test runner), mirrors middleware.test.js convention.
//
// SPATIAL_V2_RENDERER_MODEL_DRIVEN_CLOSURE (27.8.2026) — proves the compound-shape derivation layer
// is genuinely model-driven, not a disguised 3060 renderer, in two complementary ways:
//   1. Behavioral: feed a SYNTHETIC fixture (different shape values/words/quantities/sides — never the
//      real Zvi 3060 specimen) through the exact same functions the renderer calls, and assert the
//      output tracks the fixture exactly.
//   2. Lexical: read GematriaCube.jsx's own source and assert none of the real 3060 specimen's content
//      (765, 3060, ברית, טוב, ישר, 510, 612, 180, 1020) appears in its executable code (comments are
//      stripped first — explaining a design decision by referencing the real example in a comment is
//      fine and matches this codebase's existing convention; the CODE itself must not know it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  regionFor,
  sidesOf,
  cubeFacesOf,
  deriveCompoundPaths,
  isCompoundPentagonModel,
} from "./spatialRenderModel.js";

const COLORS = { outer: "#outer", inner: "#inner", triangles: "#tri", cube: "#cube" };

// A synthetic compound fixture — same shape FAMILY (pentagon+pentagon+triangles, per the task's own
// "change quantity/value/assignment" instruction) but every word/number is deliberately different from
// the real Zvi 3060 specimen, including the ring side-counts (6, not 5) — precisely so a renderer that
// secretly hardcoded "5" anywhere would fail this test.
const FIXTURE_SPATIAL = {
  shapeIdentity: "compound: cube + pentagon + nested triangles",
  structuralProperties: [{ key: "cube_faces", value: 8 }],
  regions: [
    { id: "outer", role: "outer_pentagon", assignment: "חן", quantity: 7, sides: 6 },
    { id: "inner", role: "inner_pentagon", assignment: "אמת", quantity: 27, sides: 6 },
    { id: "triangles", role: "nested_triangles", assignment: "333", quantity: 9 },
  ],
  operations: [
    { operationKey: "multiply", expression: "6 × 7 × ...", result: 999 },
    { operationKey: "multiply", expression: "27 × 37", result: 999 },
  ],
  convergences: [{ value: 999, independentPaths: 2 }],
};
const FIXTURE_CUBE_PROPS = { faceWord: "פלא", cols: 1, rows: 1 };

test("regionFor finds by role regardless of fixture content", () => {
  const outer = regionFor(FIXTURE_SPATIAL.regions, "outer_pentagon");
  assert.equal(outer.assignment, "חן");
  assert.equal(regionFor(FIXTURE_SPATIAL.regions, "does_not_exist"), null);
});

test("sidesOf reads the region's own `sides` field, not a fixed constant", () => {
  const outer = regionFor(FIXTURE_SPATIAL.regions, "outer_pentagon");
  const inner = regionFor(FIXTURE_SPATIAL.regions, "inner_pentagon");
  assert.equal(sidesOf(outer), 6, "fixture says 6 sides, not the real specimen's 5");
  assert.equal(sidesOf(inner), 6);
});

test("sidesOf falls back to quantity only when `sides` is genuinely absent (defensive, not a guess)", () => {
  assert.equal(sidesOf({ quantity: 41 }), 41);
  assert.equal(sidesOf({}), 0);
});

test("cubeFacesOf reads spatial.structuralProperties, not a literal 6", () => {
  assert.equal(cubeFacesOf(FIXTURE_SPATIAL), 8, "fixture declares cube_faces=8, not 6");
  assert.equal(cubeFacesOf({ structuralProperties: [] }), 6, "geometric default only when metadata is absent");
});

test("isCompoundPentagonModel matches on shape family, not on any specimen's value", () => {
  assert.equal(isCompoundPentagonModel(FIXTURE_SPATIAL), true);
  assert.equal(isCompoundPentagonModel({ shapeIdentity: "cube", regions: [] }), false);
  assert.equal(isCompoundPentagonModel(null), false);
});

test("deriveCompoundPaths on a synthetic fixture produces labels that track the fixture exactly", () => {
  const paths = deriveCompoundPaths(FIXTURE_SPATIAL, FIXTURE_CUBE_PROPS, COLORS);
  const byId = Object.fromEntries(paths.map(p => [p.id, p]));
  assert.equal(byId.outer.label, "חן × 7");
  assert.equal(byId.inner.label, "אמת × 27");
  assert.equal(byId.triangles.label, "333 × 9");
  assert.equal(byId.cube.label, "פלא × 8", "cube face-count comes from structuralProperties (8), not a literal 6");
  const asText = JSON.stringify(paths);
  for (const forbidden of ["765", "3060", "ברית", "טוב", "ישר", "510", "612", "180", "1020"]) {
    assert.ok(!asText.includes(forbidden), `derived paths must not leak the real specimen's "${forbidden}"`);
  }
});

test("changing the fixture changes the output with zero code change — the point of this whole suite", () => {
  const altered = {
    ...FIXTURE_SPATIAL,
    regions: FIXTURE_SPATIAL.regions.map(r => r.role === "outer_pentagon" ? { ...r, assignment: "שלום", quantity: 3, sides: 4 } : r),
  };
  const paths = deriveCompoundPaths(altered, FIXTURE_CUBE_PROPS, COLORS);
  const outerPath = paths.find(p => p.id === "outer");
  assert.equal(outerPath.label, "שלום × 3");
  const outerRegion = regionFor(altered.regions, "outer_pentagon");
  assert.equal(sidesOf(outerRegion), 4, "ring panel-count follows the fixture, not a baked-in 5");
});

// ── Lexical guard on the renderer component itself ──────────────────────────────────────────────
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")   // /* ... */
    .replace(/\/\/[^\n]*$/gm, " ");       // // ... to end of line
}

test("GematriaCube.jsx's executable code (comments stripped) contains none of the real Zvi 3060 specimen's content", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, "..", "components", "GematriaCube.jsx"), "utf8");
  const code = stripComments(src);
  const forbidden = ["765", "3060", "ברית", "טוב", "ישר", "510", "612", "1020", "180"];
  const leaked = forbidden.filter(f => code.includes(f));
  assert.deepEqual(leaked, [], `renderer code must not hardcode any of: ${leaked.join(", ")}`);
});

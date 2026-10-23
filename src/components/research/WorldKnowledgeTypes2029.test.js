import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./WorldKnowledgeTypes2029.jsx", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../pages/worldComposition2029.css", import.meta.url)), "utf8");

test("3D renderer is code-split and mounted only after an explicit action", () => {
  assert.match(source, /React\.lazy\(\(\) => import\("\.\/SpatialStructure3D\.jsx"\)\)/);
  assert.match(source, /show3d \? <React\.Suspense/);
  assert.match(source, /onClick=\{\(\) => setShow3d/);
  assert.doesNotMatch(source, /import SpatialStructure3D from/);
});

test("spatial UI keeps calculation, structure, interpretation and publication separate", () => {
  for (const label of ["טענת מקור", "חישוב", "פעולות", "מבנה", "צורה", "המחשה", "פרשנות רוחנית", "פרסום", "מקורות עצמאיים"]) {
    assert.ok(source.includes(label), label);
  }
});

test("admin audit and queue are gated by isAdmin", () => {
  assert.match(source, /isAdmin \? <details className="sod29-world-spatial-admin-audit"/);
  assert.match(source, /isAdmin \? <SpatialAdminQueue/);
});

test("responsive contract covers 390px and 320px layouts without a second component", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /sod29-world-spatial-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("deep links target an exact spatial case or constants case after live data loads", () => {
  assert.match(source, /params\.get\("spatial"\)/);
  assert.match(source, /params\.get\("constant"\)/);
  assert.match(source, /document\.getElementById\(targetId\)/);
});

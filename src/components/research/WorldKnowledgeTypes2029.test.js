import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./WorldKnowledgeTypes2029.jsx", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../pages/worldComposition2029.css", import.meta.url)), "utf8");

test("3D renderer is code-split and mounted only after an explicit action", () => {
  assert.match(source, /React\.lazy\(\(\) => import\("\.\/SpatialStructure3D\.jsx"\)\)/);
  assert.match(source, /layer === "3d" && has3d \? <React\.Suspense/);
  assert.match(source, /onClick=\{\(\) => setLayer\("3d"\)\}/);
  assert.doesNotMatch(source, /import SpatialStructure3D from/);
});

test("visual evidence, decoded diagram and schematic 3D remain explicit layers", () => {
  assert.match(source, /<SpatialDiagram2029/);
  assert.match(source, />שרטוט<\/button>/);
  assert.match(source, />מקור<\/button>/);
  assert.match(source, />תלת־ממד<\/button>/);
  assert.match(source, /תמונת מקור/);
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

test("spatial cards reveal in bounded pages while deep links expand to their target", () => {
  assert.match(source, /const SPATIAL_PAGE_SIZE = 6/);
  assert.match(source, /allCards\.slice\(0, visibleCount\)/);
  assert.match(source, /Math\.ceil\(\(selectedDeepLinkIndex \+ 1\) \/ SPATIAL_PAGE_SIZE\)/);
  assert.match(source, /להציג עוד/);
});

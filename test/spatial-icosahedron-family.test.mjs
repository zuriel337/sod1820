import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPATIAL_MODELS } from "../src/lib/spatialModels.js";
import { buildZviSpatialWorldProjection } from "../src/lib/research/zviSpatialWorldProjection.js";
import { ICOSAHEDRON_FACES, STRUCTURE_PART_LABEL, bindPathsToStructure, deriveConvergencePaths, describePathSource, describeStructurePart, evaluateConvergencePaths, icosahedronStructureSpec, structureSpecFor } from "../src/lib/spatialRenderModel.js";
import { ICOSA_3D, faceFrame, facePlacement, faceTriangle2D, icosaConnectorPoints, icosaExtent, icosaFocusPose, icosaOverviewPose, icosahedronSolid } from "../src/lib/spatial/icosahedronLayout3D.js";
import { buildLabRows, buildRevealSteps } from "../src/lib/spatial/labRows.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const model = SPATIAL_MODELS.find((m) => m.slug === "keter-esrimon-620");
const projection = buildZviSpatialWorldProjection();
const card = projection.cards.find((c) => c.slug === "keter-esrimon-620");
const specInput = (patch = {}) => ({ shapeIdentity: card.structure.shapeIdentity, regions: card.structure.regions, structuralProperties: card.quantities, gematria: card.gematria, cubeFaceWord: card.structure.cubeFaceWord, ...patch });
const spec = structureSpecFor(specInput());
const derived = deriveConvergencePaths({ value: card.value, operations: card.operations, gematria: card.gematria, quantities: card.quantities });
const evaluated = evaluateConvergencePaths(derived, { אל: { state: "ready", trace: {} } }, () => true).paths;
const paths = bindPathsToStructure(evaluated, spec);

test("the icosahedron spec is read from the model: face word + its declared value; 20 faces is the solid's own geometry", () => {
  assert.deepEqual(spec, { family: "icosahedron", faces: 20, word: "אל", wordValue: 31 });
  assert.equal(ICOSAHEDRON_FACES, 20);
  assert.equal(card.labFamily, "icosahedron");
  assert.equal(projection.cards.find((c) => c.slug === "yesharim-cube-3060").labFamily, "compound_pentagon");
  assert.equal(projection.cards.find((c) => c.slug === "emunah-cube-612").labFamily, "cube", "the cube family draws the models whose operation is carried by the cube");
  assert.equal(projection.cards.find((c) => c.slug === "raza-deshabbat-910").labFamily, null, "a cube-shaped model whose operations never use the faces is not drawn as a cube");
});

test("fails closed: another face count, no face word, no declared word value, or another shape is NOT drawn as an icosahedron", () => {
  assert.equal(icosahedronStructureSpec(specInput({ structuralProperties: [{ key: "faces", value: 12 }] })), null);
  assert.equal(icosahedronStructureSpec(specInput({ cubeFaceWord: null })), null);
  assert.equal(icosahedronStructureSpec(specInput({ gematria: [["עשרים", 620]] })), null, "the word value must be declared by the model");
  assert.equal(structureSpecFor(specInput({ shapeIdentity: "cube" })), null);
  assert.equal(structureSpecFor(specInput({ shapeIdentity: "dodecahedron" })), null);
});

test("orientation: '20 × 31' (quantity × value) is read from what the model declares, and written order stands everywhere else", () => {
  assert.equal(derived.length, 1);
  assert.deepEqual([derived[0].operand, derived[0].quantity, derived[0].orientation, derived[0].phrase], [31, 20, "quantity_first", "אל"]);
  assert.equal(derived[0].resultMatches, true);
  assert.equal(derived[0].quantityKey, "faces"); assert.equal(derived[0].quantityProvenance, "icosahedron geometry");
  // the 3060 paths are written value × quantity and must not change
  const c3060 = projection.cards.find((c) => c.slug === "yesharim-cube-3060");
  const p3060 = deriveConvergencePaths({ value: c3060.value, operations: c3060.operations, gematria: c3060.gematria, quantities: c3060.quantities });
  assert.deepEqual(p3060.map((p) => p.orientation), Array(5).fill("value_first"));
  // no declared phrase for either factor: nothing is swapped on a guess
  const unknown = deriveConvergencePaths({ value: 620, operations: [{ expression: "20 × 31", result: 620 }], gematria: [], quantities: [{ key: "faces", value: 20 }] })[0];
  assert.equal(unknown.orientation, "value_first"); assert.equal(unknown.phrase, null);
});

test("the single path binds to the one solid; facts keep the shape count and the quantity with their origins; 765-style unverified never promoted", () => {
  assert.deepEqual(paths.map((p) => [p.part, p.geometric, p.status]), [["solid", true, "verified"]]);
  assert.equal(STRUCTURE_PART_LABEL.solid, "עשרימון");
  const info = describeStructurePart(paths[0], spec);
  assert.deepEqual(info.facts.map((f) => [f.key, f.value]), [["פאות בצורה", 20], ["כמות במסלול", 20]]);
  assert.equal(info.facts[1].origin, "icosahedron geometry");
  const unverified = bindPathsToStructure(evaluateConvergencePaths(derived, {}, () => false).paths, spec);
  const rows = buildLabRows({ paths: unverified, spec, locators: card.source.locators, statusLabels: { unavailable: "אימות המנוע אינו זמין" } });
  assert.equal(rows[0].counted, false);
  assert.equal(buildRevealSteps(rows[0]).some((s) => s.kind === "result"), false);
  const wrongSolid = bindPathsToStructure(evaluated.map((p) => ({ ...p, terms: p.terms.map((t) => (t.role === "geometry" ? { ...t, value: 12, text: "12" } : t)) })), spec);
  assert.deepEqual([wrongSolid[0].part, wrongSolid[0].geometric], ["relation", false], "a path that does not fit the declared solid has no geometry");
  assert.equal(describePathSource(paths[0], card.source.locators).quantity.state, "declared");
});

test("solid geometry: V=12, E=30, F=20 (Euler), regular faces, outward normals, equal apothem — derived, not typed", () => {
  const solid = icosahedronSolid();
  assert.equal(solid.vertices.length, 12); assert.equal(solid.edges.length, 30); assert.equal(solid.faces.length, 20);
  assert.equal(solid.vertices.length - solid.edges.length + solid.faces.length, 2);
  for (const v of solid.vertices) assert.ok(Math.abs(Math.hypot(...v) - ICOSA_3D.radius) < 1e-6, "all vertices on the circumsphere");
  const apothem = (solid.edge * (3 * Math.sqrt(3) + Math.sqrt(15))) / 12;
  for (const f of solid.faces) {
    assert.ok(Math.abs(f.apothem - apothem) < 1e-6, "every face is at the icosahedron's inradius");
    assert.ok(f.vertexIndices.every((i) => solid.vertices[i].reduce((a, c, k) => a + c * f.normal[k], 0) > 0), "outward");
    const tri = faceTriangle2D(solid, f);
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    assert.ok(Math.abs(d(tri[0], tri[1]) - solid.edge) < 1e-6 && Math.abs(d(tri[1], tri[2]) - solid.edge) < 1e-6 && Math.abs(d(tri[0], tri[2]) - solid.edge) < 1e-6, "equilateral in its own frame");
    const fr = faceFrame(f.normal); assert.ok(Math.abs(Math.hypot(...fr.x) - 1) < 1e-9 && Math.abs(fr.x[0] * fr.y[0] + fr.x[1] * fr.y[1] + fr.x[2] * fr.y[2]) < 1e-9);
  }
  assert.equal(new Set(solid.faces.map((f) => f.vertexIndices.join())).size, 20, "20 distinct faces");
});

test("explode moves every face out along its own normal; extent and camera poses frame the solid, the apex and the stand at any aspect", () => {
  const solid = icosahedronSolid();
  for (const f of solid.faces) {
    const a = facePlacement(f, 0), b = facePlacement(f, 1);
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) - ICOSA_3D.explode) < 1e-9);
  }
  const tanV = Math.tan((ICOSA_3D.fovDeg * Math.PI) / 360);
  for (const k of [0, 1]) for (const aspect of [1.6, 0.75, 0.5]) {
    const ext = icosaExtent(k), pose = icosaOverviewPose(aspect, k), d = Math.hypot(pose.position.y - pose.target.y, pose.position.z - pose.target.z);
    assert.ok((ext.maxX - ext.minX) / 2 <= d * tanV * aspect + 1e-6 && (ext.maxY - ext.minY) / 2 <= d * tanV + 1e-6, `fits at aspect ${aspect}, explode ${k}`);
  }
  const focus = icosaFocusPose(solid, 3, 0.75, 0);
  assert.ok(Math.hypot(focus.position.x - focus.target.x, focus.position.y - focus.target.y, focus.position.z - focus.target.z) < Math.hypot(icosaOverviewPose(0.75, 0).position.y, icosaOverviewPose(0.75, 0).position.z), "focus is closer than the overview");
  const pts = icosaConnectorPoints(); assert.equal(pts.length, 4); assert.deepEqual([pts[3].x, pts[3].z], [ICOSA_3D.apex.x, ICOSA_3D.apex.z], "the route ends at the apex");
});

test("same engine: the icosahedron scene is one more lazy 3D module of the closed set, reuses the lab's shared drivers, and adds no calculator or color literal", () => {
  const scene = read("../src/components/gematria2029/IcosaScene3D2029.jsx");
  const code = scene.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.match(scene, /from "\.\/StructureScene3D2029\.jsx"/); assert.match(scene, /from "\.\/MistaterScene3D2029\.jsx"/);
  for (const shared of ["ExplodeDriver", "LabRig", "GlyphWord", "useGlyphMap", "RoyalLights", "GpuStats"]) assert.match(scene, new RegExp(shared));
  assert.doesNotMatch(code, /@react-three\/drei|fetch\(|rpc\(|supabase|Math\.(random|sqrt)/);
  assert.doesNotMatch(code, /#[0-9a-fA-F]{6}\b|rgba?\(/, "colors come from the brand tokens");
  assert.doesNotMatch(code, /\b(quantity|operand|result|value)\s*[*+/]\s*\w/, "no arithmetic on model numbers");
  assert.match(code, /raycast=\{noRaycast\}/, "ornament is not a pick target");
  const stage = read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx");
  assert.equal((stage.match(/lazy\(\(\) => import\("\.\/IcosaScene3D2029\.jsx"\)\)/g) || []).length, 1);
  assert.match(stage, /paths\.length < \(isSingleSolid\(spec\) \? 1 : 2\)/, "only a single solid (icosahedron, cube) may be a single-path structure view");
  const shelf = read("../src/components/research/WorldKnowledgeTypes2029.jsx");
  assert.match(shelf, /card\.operations\?\.length === 1 && card\.labFamily/);
  assert.match(model.cube.faceWord, /אל/);
});

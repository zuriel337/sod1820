import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPATIAL_MODELS } from "../src/lib/spatialModels.js";
import { buildZviSpatialWorldProjection } from "../src/lib/research/zviSpatialWorldProjection.js";
import {
  CUBE_FACES, STRUCTURE_PART_LABEL, bindPathsToStructure, cubeStructureSpec, deriveConvergencePaths, describePathSource, describeStructurePart, drawableSpec, evaluateConvergencePaths, structureSpecFor,
} from "../src/lib/spatialRenderModel.js";
import { CUBE_3D, cubeConnectorPoints, cubeExtent, cubeFocusPose, cubeLetterBudget, cubeOverviewPose, cubeProbePoints, cubeSolid, cubeWordLayout, facePlacement, plinthPlacement, pointsFitFrustum } from "../src/lib/spatial/cubeLayout3D.js";
import { buildLabRows, buildRevealSteps } from "../src/lib/spatial/labRows.js";
import { pathAriaLabel, pathEquationText, pathTagText, razielSemanticFocus } from "../src/lib/spatial/pathSemantics.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const projection = buildZviSpatialWorldProjection();
const cardOf = (slug) => projection.cards.find((c) => c.slug === slug);
const modelOf = (slug) => SPATIAL_MODELS.find((m) => m.slug === slug);
const inputOf = (card, patch = {}) => ({ shapeIdentity: card.structure.shapeIdentity, regions: card.structure.regions, structuralProperties: card.quantities, gematria: card.gematria,
  cubeFaceWord: card.structure.cubeFaceWord, assignments: card.assignments, cubeLayout: card.cubeLayout, ...patch });
const derive = (card) => deriveConvergencePaths({ value: card.value, operations: card.operations, gematria: card.gematria, quantities: card.quantities, assignments: card.assignments });
const evaluate = (card, word) => evaluateConvergencePaths(derive(card), { [word]: { state: "ready", trace: {} } }, () => true).paths;

const c1020 = cardOf("hashgacha-pratit-1020"), c612 = cardOf("emunah-cube-612"), c1254 = cardOf("matamim-cube-1254"), c910 = cardOf("raza-deshabbat-910");
const spec1020 = structureSpecFor(inputOf(c1020));

test("the cube spec is read from the model: 6 faces by definition, the face word + its declared value, repetitions per face from the assignment, the grid from the model", () => {
  assert.deepEqual(spec1020, { family: "cube", faces: 6, word: "טוב", wordValue: 17, repetitions: 10, grid: { cols: 2, rows: 5 }, facesOrigin: "cube geometry" });
  assert.equal(CUBE_FACES, 6);
  const s612 = structureSpecFor(inputOf(c612)), s1254 = structureSpecFor(inputOf(c1254));
  assert.deepEqual([s612.word, s612.wordValue, s612.repetitions, s612.grid], ["אמונה", 102, 1, { cols: 1, rows: 1 }]);
  assert.deepEqual([s1254.word, s1254.wordValue, s1254.repetitions, s1254.grid], ["מטעמים", 209, 1, { cols: 1, rows: 1 }]);
  assert.equal(s612.facesOrigin, "source-declared orientation", "612 declares the source's directions, not a geometry fact");
});

test("fails closed: another face count, no face word, no declared word value, a bad repetition count, or another shape is NOT drawn as a cube", () => {
  const base = inputOf(c1020);
  assert.equal(cubeStructureSpec({ ...base, structuralProperties: [{ key: "faces", value: 8 }] }), null);
  assert.equal(cubeStructureSpec({ ...base, structuralProperties: [{ key: "faces", value: 6 }, { key: "directions", value: 5 }] }), null);
  assert.equal(cubeStructureSpec({ ...base, faceWord: null, cubeFaceWord: null }), null);
  assert.equal(cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, gematria: [["אמונה", 102]] }), null, "the word value must be declared by the model");
  for (const bad of [0, -3, 2.5, 25, 100, "10"]) assert.equal(cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, assignments: [{ target: "each_face", expression: "טוב", repetitionsPerPart: bad, value: 17 }] }), null, `repetitions ${bad}`);
  assert.equal(cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, shapeIdentity: "icosahedron" }), null);
  assert.equal(cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, shapeIdentity: "compound_pentagon" }), null);
  // a declared grid whose product is not the repetition count is not trusted: the exact near-square factor pair is used instead
  const mismatch = cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, layout: { cols: 3, rows: 3 } });
  assert.deepEqual(mismatch.grid, { cols: 2, rows: 5 });
  const prime = cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, layout: null, assignments: [{ target: "each_face", expression: "טוב", repetitionsPerPart: 7, value: 17 }] });
  assert.deepEqual(prime.grid, { cols: 1, rows: 7 });
  assert.equal(cubeStructureSpec({ ...base, faceWord: base.cubeFaceWord, layout: null }).grid.cols * 5, 10);
});

test("only a model whose OWN operation is carried by the cube is drawn: 910 is cube-shaped but its operations never use the faces", () => {
  assert.equal(c1020.labFamily, "cube"); assert.equal(c612.labFamily, "cube"); assert.equal(c1254.labFamily, "cube");
  assert.equal(c910.labFamily, null, "no cube for 910");
  const s910 = structureSpecFor(inputOf(c910));
  assert.equal(s910?.family, "cube", "the spec alone exists");
  assert.equal(drawableSpec(s910, derive(c910)), null, "but no path binds to it");
  assert.equal(drawableSpec(spec1020, derive(c1020)), spec1020);
  assert.equal(cardOf("keter-esrimon-620").labFamily, "icosahedron"); assert.equal(cardOf("yesharim-cube-3060").labFamily, "compound_pentagon");
});

test("1020 is a three-factor product with every factor sourced: 6 (cube geometry) × 10 (the model's repetitions) × טוב (engine)", () => {
  const [path] = evaluate(c1020, "טוב");
  assert.equal(path.status, "verified");
  assert.deepEqual(path.terms.map((t) => [t.role, t.text, t.value]), [["geometry", "6", 6], ["quantity", "10", 10], ["expression", "טוב", 17]]);
  assert.equal(path.terms[0].origin, "cube geometry"); assert.match(path.terms[1].origin, /assignment/);
  assert.equal(pathEquationText(path, { numeric: true }), "6 × 10 × 17 = 1020");
  assert.equal(pathEquationText(path), "6 × 10 × טוב = 1020");
  assert.equal(pathTagText(path), "× 6 × 10", "the 3D tag carries every shape quantity of the path, with the registry's sign");
  assert.match(pathAriaLabel(path, "אומת"), /טוב 17/);
  assert.equal(path.operationKey, "multiply");
});

test("the 1020 path binds to the cube; facts keep the faces and the repetitions as two sourced facts; an unverified path is never promoted", () => {
  const paths = bindPathsToStructure(evaluate(c1020, "טוב"), spec1020);
  assert.deepEqual(paths.map((p) => [p.part, p.geometric, p.status]), [["cube", true, "verified"]]);
  assert.equal(STRUCTURE_PART_LABEL.cube, "קובייה");
  const info = describeStructurePart(paths[0], spec1020);
  assert.deepEqual(info.facts.map((f) => [f.key, f.value]), [["פאות בצורה", 6], ["חזרות של «טוב» בכל פאה", 10]]);
  assert.equal(info.facts[0].origin, "cube geometry"); assert.match(info.facts[1].origin, /assignment/);
  assert.equal(info.label, "קובייה");
  const unverified = bindPathsToStructure(evaluateConvergencePaths(derive(c1020), {}, () => false).paths, spec1020);
  const rows = buildLabRows({ paths: unverified, spec: spec1020, locators: c1020.source.locators, statusLabels: { unavailable: "אימות המנוע אינו זמין" } });
  assert.equal(rows[0].counted, false);
  assert.equal(buildRevealSteps(rows[0]).some((s) => s.kind === "result"), false);
  assert.equal(describePathSource(paths[0], c1020.source.locators).quantity.state, "declared");
  // a single-face cube model (612/1254) carries only the faces fact
  const p612 = bindPathsToStructure(evaluate(c612, "אמונה"), structureSpecFor(inputOf(c612)));
  assert.deepEqual(describeStructurePart(p612[0], structureSpecFor(inputOf(c612))).facts.map((f) => f.key), ["פאות בצורה"]);
  assert.equal(describeStructurePart(p612[0], structureSpecFor(inputOf(c612))).facts[0].origin, "source-declared orientation", "612's six is the source's directions — said so, not relabelled as geometry");
});

test("a path that does not fit the declared cube has no geometry: wrong repetitions, a missing quantity, a bare number, a sum, or another word", () => {
  const verified = evaluate(c1020, "טוב")[0];
  const bind = (path) => bindPathsToStructure([path], spec1020)[0];
  assert.equal(bind(verified).geometric, true);
  const swapTerm = (index, patch) => ({ ...verified, terms: verified.terms.map((t, i) => (i === index ? { ...t, ...patch } : t)) });
  assert.equal(bind(swapTerm(1, { value: 9, text: "9" })).geometric, false, "9 repetitions are not the declared 10");
  assert.equal(bind({ ...verified, terms: verified.terms.filter((_, i) => i !== 1) }).geometric, false, "the repetitions factor is missing");
  assert.equal(bind(swapTerm(1, { role: "value" })).geometric, false, "a bare number with no source is not a shape quantity");
  assert.equal(bind({ ...verified, operationKey: "add" }).geometric, false, "a sum is not the cube's product");
  assert.equal(bind(swapTerm(2, { text: "אמונה" })).geometric, false, "another word");
  assert.equal(bind({ ...verified, result: 1021 }).geometric, false, "the result must be faces × repetitions × the word's value");
  assert.equal(bind(swapTerm(0, { value: 8, text: "8" })).geometric, false);
  assert.equal(bind(verified).part, "cube");
  assert.equal(bind({ ...verified, operationKey: "add" }).part, "relation");
});

test("solid geometry: six faces from the axes, outward normals, an upright right-handed frame per face, first Hebrew letter on the viewer's right", () => {
  const solid = cubeSolid();
  assert.equal(solid.faces.length, 6);
  assert.equal(new Set(solid.faces.map((f) => f.normal.join())).size, 6, "six distinct directions");
  for (const f of solid.faces) {
    const { x, y, z } = f.frame, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], c = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    assert.ok(Math.abs(dot(x, y)) < 1e-9 && Math.abs(dot(y, z)) < 1e-9 && Math.abs(dot(x, z)) < 1e-9, "orthonormal");
    const handed = c(x, y); assert.ok(handed.every((v, i) => Math.abs(v - z[i]) < 1e-9), "right-handed: x × y = outward normal");
    assert.ok(Math.abs(Math.hypot(...f.centroid) - (solid.size / 2 - solid.depth / 2)) < 1e-9, "the plate's outer surface lies on the cube");
    // the viewer standing outside the face looks along −normal with the face's up above: their right is forward × up
    const forward = f.normal.map((v) => -v), right = c(forward, y);
    assert.ok(right.every((v, i) => Math.abs(v - x[i]) < 1e-9), `face ${f.name}: local +x is the viewer's right`);
  }
  for (const f of solid.faces.filter((face) => Math.abs(face.normal[1]) < 0.5)) assert.deepEqual(f.frame.y, [0, 1, 0], "side faces are upright");
});

test("the word layout: exactly `repetitions` cells in the model's grid, first cell top-right, inside the face, letters fitted by the lab's single rule", () => {
  const layout = cubeWordLayout(spec1020);
  assert.equal(layout.cells.length, 10); assert.deepEqual([layout.cols, layout.rows], [2, 5]);
  assert.equal(new Set(layout.cells.map((c) => `${c.x}|${c.y}`)).size, 10, "ten distinct cells");
  assert.ok(layout.cells[0].x > 0 && layout.cells[0].y > 0, "the first repetition is top-right");
  const last = layout.cells[9]; assert.ok(last.x < 0 && last.y < 0, "the last is bottom-left");
  const half = (CUBE_3D.size * CUBE_3D.wordArea) / 2;
  for (const c of layout.cells) assert.ok(Math.abs(c.x) + layout.box.width / 2 <= half + 1e-6 && Math.abs(c.y) + layout.box.height / 2 <= half + 1e-6, "every word box stays on the face");
  assert.equal(layout.letters.length, 3); assert.ok(layout.letters[0].x > layout.letters[2].x, "ט on the right, ב on the left");
  const single = cubeWordLayout(structureSpecFor(inputOf(c612)));
  assert.equal(single.cells.length, 1); assert.deepEqual([single.cells[0].x, single.cells[0].y], [0, 0]);
});

test("the draw budget is small and pinned: 1020 has 6 × 10 × 3 = 180 letters but one instanced mesh per distinct letter per face (18 draw calls)", () => {
  const budget = cubeLetterBudget(spec1020);
  assert.deepEqual([budget.faces, budget.wordsPerFace, budget.lettersPerWord, budget.lettersPerFace, budget.letters, budget.drawCalls], [6, 10, 3, 30, 180, 18]);
  assert.equal(cubeLetterBudget(structureSpecFor(inputOf(c612))).letters, 30, "612: 6 faces × אמונה (5 letters)");
  assert.equal(cubeLetterBudget(structureSpecFor(inputOf(c1254))).letters, 36, "1254: 6 faces × מטעמים (6 letters)");
  assert.ok(budget.drawCalls <= 24);
});

test("explode moves every face out along its own normal; extent and camera poses frame the cube, the apex and the stand at any aspect", () => {
  const solid = cubeSolid();
  for (const f of solid.faces) {
    const a = facePlacement(f, 0), b = facePlacement(f, 1);
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) - CUBE_3D.explode) < 1e-9);
    assert.ok([b.x - a.x, b.y - a.y, b.z - a.z].every((v, i) => Math.abs(v - f.normal[i] * CUBE_3D.explode) < 1e-9), "exactly along the normal");
  }
  for (const k of [0, 1]) for (const aspect of [1.6, 1, 0.75, 0.5, 0.4]) for (const elevation of [Math.PI / 7.4, Math.PI / 6.4]) {
    const ext = cubeExtent(k), pose = cubeOverviewPose(aspect, k, { elevation, padding: 1 });
    // a REAL perspective projection of every plate corner, the stand, the apex with its label and the tag: all inside the frame, at any aspect, assembled or exploded
    assert.ok(pointsFitFrustum(cubeProbePoints(k), pose.position, pose.target, aspect, CUBE_3D.fovDeg, 1), `everything is on screen at aspect ${aspect}, explode ${k}, elevation ${elevation.toFixed(2)}`);
    // every exploded face centre stays inside the extent
    for (const f of solid.faces) { const p = facePlacement(f, k); assert.ok(p.x >= ext.minX && p.x <= ext.maxX && p.y >= ext.minY && p.y <= ext.maxY, `face ${f.name} inside the frame`); }
  }
  assert.ok(cubeOverviewPose(1, 0).position.x > 0, "the overview looks from a corner, so two sides and the top are visible");
  assert.ok(plinthPlacement(1).y < facePlacement(solid.faces[5], 1).y - solid.depth / 2, "the stand follows the lowered bottom face, never crossing it");
  assert.equal(plinthPlacement(0).y, CUBE_3D.plinthY);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const focus = cubeFocusPose(solid, 1, 0.75, 0), overview = cubeOverviewPose(0.75, 0);
  assert.ok(dist(focus.position, focus.target) < dist(overview.position, overview.target), "focus is closer than the overview");
  const top = cubeFocusPose(solid, 4, 0.75, 1); assert.ok(Math.abs(top.position.z - top.target.z) > 1, "the top face is not viewed straight along the up axis");
  const pts = cubeConnectorPoints(); assert.equal(pts.length, 4);
  assert.deepEqual([pts[3].x, pts[3].z], [CUBE_3D.apex.x, CUBE_3D.apex.z], "the route ends at the apex");
  const liftedTop = facePlacement(solid.faces[4], 1), half = CUBE_3D.size / 2;
  for (const p of pts.slice(1)) assert.ok(p.y < liftedTop.y || p.z < -half - 0.5, "the route never crosses the lifted top face");
});

test("Raziel and the shelf read the three-factor product through the shared semantic layer, with roles and origins", () => {
  const [path] = bindPathsToStructure(evaluate(c1020, "טוב"), spec1020);
  const focus = razielSemanticFocus(path, { statusLabel: "אומת" });
  assert.match(focus.primary, /6 \(גיאומטריה\) × 10 \(כמות מהמקור\) × טוב \(17, מנוע\) = 1020/);
  assert.ok(focus.primary.length <= 160 && focus.label.length <= 120);
  const view = c1020.operationsView[0];
  assert.deepEqual(view.parts.map((p) => p.roleLabel), ["גיאומטריה", "כמות", "ביטוי"]);
  assert.equal(c1020.operationsView[0].text, "6 × 10 × טוב (17) = 1020");
});

test("same engine: the cube scene is one more lazy 3D module of the closed set, reuses the lab's shared drivers, and adds no calculator or color literal", () => {
  const scene = read("../src/components/gematria2029/CubeScene3D2029.jsx");
  const code = scene.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.match(scene, /from "\.\/StructureScene3D2029\.jsx"/); assert.match(scene, /from "\.\/MistaterScene3D2029\.jsx"/);
  for (const shared of ["ExplodeDriver", "LabRig", "useGlyphMap", "RoyalLights", "GpuStats", "useInView"]) assert.match(scene, new RegExp(shared));
  assert.doesNotMatch(code, /@react-three\/drei|fetch\(|rpc\(|supabase|Math\.(random|sqrt)/);
  assert.doesNotMatch(code, /#[0-9a-fA-F]{6}\b|rgba?\(/, "colors come from the brand tokens");
  assert.doesNotMatch(code, /\b(quantity|operand|result|value|repetitions|faces)\s*[*+/]\s*\w/, "no arithmetic on model numbers");
  assert.match(code, /raycast=\{noRaycast\}/, "ornament and letters are not pick targets");
  const stage = read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx");
  assert.equal((stage.match(/lazy\(\(\) => import\("\.\/CubeScene3D2029\.jsx"\)\)/g) || []).length, 1);
  assert.match(stage, /paths\.length < \(isSingleSolid\(spec\) \? 1 : 2\)/, "only a single solid may be a single-path structure view");
  const shelf = read("../src/components/research/WorldKnowledgeTypes2029.jsx");
  assert.match(shelf, /card\.operations\?\.length === 1 && card\.labFamily/);
  for (const file of ["../src/lib/spatial/cubeLayout3D.js"]) assert.doesNotMatch(read(file), /from "(three|react|@react-three)/, "the layout is pure");
  for (const file of ["../src/components/gematria2029/StructureScene3D2029.jsx", "../src/components/gematria2029/IcosaScene3D2029.jsx"]) assert.doesNotMatch(read(file), /CubeScene3D2029/, "scenes do not import each other's family");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPATIAL_MODELS } from "../src/lib/spatialModels.js";
import { buildZviSpatialWorldProjection } from "../src/lib/research/zviSpatialWorldProjection.js";
import { bindPathsToStructure, compoundStructureSpec, deriveConvergencePaths, describePathSource, evaluateConvergencePaths, sidesOf } from "../src/lib/spatialRenderModel.js";
import { STRUCTURE_3D, overviewPose, partCenter, structureExtent } from "../src/lib/spatial/structureLayout3D.js";
import { DEFAULT_ROYAL_LAB_DIRECTION, LAB_PRIMARY_ACTIONS, ROYAL_LAB_DIRECTIONS, ROYAL_LAB_DIRECTION_ORDER, pickLabQuality, resolveRoyalLabDirection } from "../src/lib/spatial/royalLabDirections.js";
import { buildLabRows, buildRevealSteps } from "../src/lib/spatial/labRows.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const card = buildZviSpatialWorldProjection().cards.find((c) => c.slug === "yesharim-cube-3060");
const spatialOf = (patch = {}) => ({ shapeIdentity: card.structure.shapeIdentity, regions: card.structure.regions, structuralProperties: card.quantities, ...patch });
const specOf = (patch) => compoundStructureSpec(spatialOf(patch), { faceWord: card.structure.cubeFaceWord });
const derived = deriveConvergencePaths({ value: card.value, operations: card.operations, gematria: card.gematria, quantities: card.quantities });
// engine truth stand-in: the first four phrases verified, the 765 path has no phrase (as in the model) — mirrors the real evaluation
const traces = Object.fromEntries(derived.filter((p) => p.phrase).map((p) => [p.phrase, { state: "ready", trace: { ok: true } }]));
const evaluated = evaluateConvergencePaths(derived, traces, () => true).paths;
const spec = specOf();
const paths = bindPathsToStructure(evaluated, spec);
const STATUS = { verified: "אומת במנוע", no_phrase: "אין ביטוי מאומת למספר הזה" };

test("hardened sidesOf: a shape is never created from a missing side count or from an arithmetic quantity", () => {
  assert.equal(sidesOf({ sides: 5, quantity: 180 }), 5);
  for (const bad of [{ quantity: 180 }, { quantity: 41 }, {}, { sides: 2 }, { sides: 13 }, { sides: "5" }, { sides: 5.5 }, null, undefined]) assert.equal(sidesOf(bad), 0, JSON.stringify(bad));
  // a model whose inner region has NO `sides` is not drawn as a pentagon with 180 petals: the part is absent and its path falls back to a relation layer
  const noSides = specOf({ regions: card.structure.regions.map((r) => (r.role === "inner_pentagon" ? { ...r, sides: undefined } : r)) });
  assert.equal(noSides.inner, null);
  assert.equal(noSides.outer.panels, 5);
  const bound = bindPathsToStructure(evaluated, noSides);
  assert.equal(bound.find((p) => p.phrase === "טוב").part, "relation");
  assert.equal(bound.find((p) => p.phrase === "טוב").geometric, false);
});

test("the triangle count is the model's own source-diagram property, never inferred from the region quantity", () => {
  assert.equal(spec.triangles.count, 4);
  assert.equal(spec.triangles.quantity, 4);
  const withoutProperty = specOf({ structuralProperties: card.quantities.filter((q) => q.key !== "inner_triangles") });
  assert.equal(withoutProperty.triangles, null, "no declared triangle count → no triangles drawn");
  const odd = specOf({ regions: card.structure.regions.map((r) => (r.role === "nested_triangles" ? { ...r, quantity: 99 } : r)) });
  assert.equal(odd.triangles.count, 4, "quantity 99 does not create 99 triangles");
});

test("quantity attribution is exact: one declared property per quantity, otherwise not attributed (never a guess)", () => {
  const byQuantity = Object.fromEntries(paths.map((p) => [p.quantity, p]));
  assert.deepEqual(Object.entries(byQuantity).map(([q, p]) => [Number(q), p.quantityKey, p.quantityProvenance]),
    [[3, "patriarch_count", "source semantic quantity"], [4, "inner_triangles", "source diagram"], [5, "pentagon_outer_parts", "source diagram"], [6, "cube_faces", "cube geometry"], [180, "inner_good_units", "source claim/diagram"]]);
  const dup = deriveConvergencePaths({ value: 3060, operations: [{ expression: "612 × 5", result: 3060 }], gematria: [], quantities: [{ key: "a", value: 5, provenance: "x" }, { key: "b", value: 5, provenance: "y" }] })[0];
  assert.equal(dup.quantityKey, null); assert.equal(dup.quantityProvenance, null); assert.equal(dup.quantityAmbiguous, true);
  const source = describePathSource(dup, []);
  assert.equal(source.quantity.state, "ambiguous");
  assert.equal(describePathSource({ quantity: 7, quantityProvenance: null }, []).quantity.state, "not_stated");
});

test("every path reports its facts separately: phrase → engine, quantity → declared property, document → card-level only (stated as such)", () => {
  const rows = buildLabRows({ paths, spec, locators: card.source.locators, statusLabels: STATUS });
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.equal(row.source.quantity.state, "declared", `${row.part} has a declared quantity origin`);
    assert.equal(row.source.document.scope, "card");
    assert.match(row.source.document.note, /אינו מצמיד הופעה לאזור/);
    assert.ok(row.source.document.locators.length <= 4);
  }
  assert.equal(rows.find((r) => r.phrase === "ישר").source.phrase.origin, "gematria_method_trace");
  assert.equal(rows.find((r) => r.operand === 765).source.phrase, null);
});

test("765 stays unverified in every presentation: not counted, never promoted, reveal says it is only the model's declared operation", () => {
  const rows = buildLabRows({ paths, spec, locators: [], statusLabels: STATUS });
  const row765 = rows.find((r) => r.operand === 765);
  assert.equal(row765.verified, false); assert.equal(row765.counted, false); assert.equal(row765.part, "triangles");
  assert.equal(rows.filter((r) => r.counted).length, 4);
  const steps = buildRevealSteps(row765);
  assert.equal(steps[0].kind, "missing"); assert.equal(steps[1].kind, "unverified");
  assert.equal(steps[3].kind, "declared"); assert.match(steps[3].note, /לא אומתה במנוע ולא נספרת/);
  assert.equal(steps.some((s) => s.kind === "result" || s.kind === "engine"), false);
  const verifiedSteps = buildRevealSteps(rows.find((r) => r.phrase === "ישר"));
  assert.deepEqual(verifiedSteps.map((s) => s.kind), ["text", "engine", "quantity", "result"]);
  assert.deepEqual(verifiedSteps.map((s) => s.text), ["ישר", 510, 6, 3060]);
});

test("the main structure is framed without being widened by the relation layer, and the plaque stays inside the shot", () => {
  const c = STRUCTURE_3D;
  for (const explode of [0, 1]) {
    const ext = structureExtent(explode);
    const relation = partCenter("relation", explode);
    assert.ok(relation.x - c.relation.w / 2 >= ext.minX && relation.x + c.relation.w / 2 <= ext.maxX, `relation plaque inside the frame (explode ${explode})`);
    assert.ok(ext.maxX - ext.minX <= (c.outerR + c.petal.outer + 30) * 2 + 1, "the frame is the main structure's width (+ tag padding), not a side-layer width");
    assert.ok(Math.abs((ext.maxX + ext.minX) / 2) < 25, "the structure is centred");
  }
  // compact enough that the whole finding is large on a phone: the assembled height is smaller than the previous 700
  const a = structureExtent(0); assert.ok(a.maxY - a.minY < 640);
  const phone = overviewPose(0.82, 0), wide = overviewPose(1.6, 0);
  assert.ok(phone.position.z > wide.position.z, "a narrower shot is simply further away; nothing is cropped");
});

test("directions: three experiments + the previous look, one engine, one dataset; presentation parameters only", () => {
  assert.deepEqual(ROYAL_LAB_DIRECTION_ORDER, ["museum", "discovery", "lab", "v1"]);
  assert.equal(DEFAULT_ROYAL_LAB_DIRECTION, "museum");
  for (const id of ROYAL_LAB_DIRECTION_ORDER) {
    const d = ROYAL_LAB_DIRECTIONS[id];
    assert.equal(d.id, id); assert.ok(Object.isFrozen(d) && Object.isFrozen(d.look));
    assert.deepEqual(Object.keys(d.look).sort(), ["bezel", "drift", "elevation", "padding", "rig", "shadows", "style"]);
    assert.doesNotMatch(JSON.stringify(d), /3060|510|612|180|765|1020/, "a direction carries no research value");
  }
  assert.equal(ROYAL_LAB_DIRECTIONS.v1.look.style, "v1");
  assert.equal(ROYAL_LAB_DIRECTIONS.v1.look.bezel, false); assert.equal(ROYAL_LAB_DIRECTIONS.v1.look.shadows, false); assert.equal(ROYAL_LAB_DIRECTIONS.v1.chrome, "v1");
  assert.equal(resolveRoyalLabDirection("B").id, "discovery"); assert.equal(resolveRoyalLabDirection("lab").id, "lab"); assert.equal(resolveRoyalLabDirection("v1").id, "v1");
  for (const junk of ["", null, undefined, "<script>", "constructor", "__proto__", 7]) assert.equal(resolveRoyalLabDirection(junk).id, "museum", String(junk));
  assert.deepEqual(LAB_PRIMARY_ACTIONS.map((a) => a.label), ["חקור", "פרק שכבות", "מסלולים"]);
});

test("quality tiers: phones and data-saver get the lite tier (no shadow pass); desktop gets rich", () => {
  assert.equal(pickLabQuality({ width: 390, cores: 8 }), "lite");
  assert.equal(pickLabQuality({ width: 1280, cores: 8, saveData: true }), "lite");
  assert.equal(pickLabQuality({ width: 1280, cores: 2 }), "lite");
  assert.equal(pickLabQuality({ width: 1280, cores: 8 }), "rich");
});

test("one engine: the directions are DOM chrome + look flags; no second scene, calculator, store, contract or 3D import", () => {
  const dom = read("../src/components/gematria2029/SpatialLabDirections2029.jsx");
  assert.doesNotMatch(dom, /from\s+["'](three|@react-three)/);
  assert.doesNotMatch(dom, /fetch\(|rpc\(|supabase|localStorage|Math\.(random|sqrt)|gematria_method_trace\(/);
  const stage = read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx");
  assert.equal((stage.match(/lazy\(\(\) => import\("\.\/StructureScene3D2029\.jsx"\)\)/g) || []).length, 1, "exactly one structure scene, lazily loaded");
  assert.equal((stage.match(/<StructureScene3D\b/g) || []).length, 1, "every direction renders that one scene");
  const scene = read("../src/components/gematria2029/StructureScene3D2029.jsx").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(scene, /@react-three\/drei|MeshPortalMaterial|useGLTF|theatre/i);
  assert.match(scene, /look = ROYAL_LAB_DIRECTIONS\.v1\.look/, "the scene defaults to the previous look (rollback)");
  assert.match(scene, /shadows=\{rig\.shadows \? "percentage" : false\}/);
  assert.match(scene, /rig\.shadows = .*quality === "rich"|Boolean\(look\.shadows\) && quality === "rich"/);
});

test("durability: a glyph that cannot load as 3D falls back to a readable text plane; the lab never shows an empty face", () => {
  const scene = read("../src/components/gematria2029/StructureScene3D2029.jsx");
  assert.match(scene, /status: ok\.length === unique\.size \? "ready" : "failed"/);
  assert.match(scene, /glyphs\.status !== "loading" && letters\.some\(\(letter\) => !glyphs\.map\.get\(key\(letter\.char, size\)\)\)/);
  assert.match(scene, /data-glyph-fallback="true"/);
  assert.match(scene, /data-glyph-status=\{glyphs\.status\}/);
});

test("typography (Design V2): Hebrew keeps the UI face; the numeric face is scoped to numbers; titles use the type tokens", () => {
  const css = read("../src/components/gematria2029/spatialMethodStage2029.css");
  const v2 = css.slice(css.indexOf("ROYAL V2 (directions"));
  assert.match(v2, /\.sod29-lab-num\{font-family:var\(--s29-font-numeric/);
  assert.doesNotMatch(css, /sod29-spatial-convergence__phrase b\{[^}]*font-numeric/, "a Hebrew phrase never gets the numeric face");
  assert.match(css, /sod29-spatial-convergence__phrase b\{[^}]*font-family:var\(--s29-font-ui/);
  assert.match(v2, /font-size:var\(--s29-type-title/); assert.match(v2, /font-size:var\(--s29-type-small,15px\)/); assert.match(v2, /font-size:var\(--s29-type-ui,16px\)/);
  assert.doesNotMatch(v2, /font-size:1[0-4]px|font-size:\.?[0-9]+(?:\.[0-9]+)?rem/, "no page-local literal size below the contract");
  assert.doesNotMatch(v2, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, "no color literals in the Royal V2 styles");
  const dom = read("../src/components/gematria2029/SpatialLabDirections2029.jsx");
  assert.doesNotMatch(dom, /font-?family|style=\{\{/, "the DOM chrome carries no inline typography");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SPATIAL_MODELS } from "../src/lib/spatialModels.js";
import { buildZviSpatialWorldProjection } from "../src/lib/research/zviSpatialWorldProjection.js";
import { bindPathsToStructure, compoundStructureSpec, deriveConvergencePaths, describeStructurePart, STRUCTURE_PART_LABEL } from "../src/lib/spatialRenderModel.js";
import { STRUCTURE_3D, connectorPoints, focusPose, overviewPose, partCenter, partsPresent, ringPetals, structureExtent, trianglePositions } from "../src/lib/spatial/structureLayout3D.js";

const card = buildZviSpatialWorldProjection().cards.find((c) => c.slug === "yesharim-cube-3060");
const spec = compoundStructureSpec({ shapeIdentity: card.structure.shapeIdentity, regions: card.structure.regions, structuralProperties: card.quantities }, { faceWord: card.structure.cubeFaceWord });
const paths = bindPathsToStructure(deriveConvergencePaths({ value: card.value, operations: card.operations, gematria: card.gematria, quantities: card.quantities }), spec);
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("the spec is read from the model: panels = sides, quantity kept apart, triangles = region quantity, cube leg separate", () => {
  assert.deepEqual(spec, { family: "compound_pentagon", cube: { word: "ישר", faces: 6 }, outer: { assignment: "ברית", quantity: 5, panels: 5 },
    inner: { assignment: "טוב", quantity: 180, panels: 5 }, triangles: { assignment: "765", quantity: 4, count: 4 } });
  assert.equal(spec.inner.panels, 5); assert.equal(spec.inner.quantity, 180);
  assert.equal(compoundStructureSpec({ shapeIdentity: "cube", regions: [] }, {}), null, "non-compound models are not drawn by this family");
});

test("each path binds to the part that carries it; the fifth has NO approved geometry and becomes a relation layer", () => {
  assert.deepEqual(paths.map((p) => p.part), ["cube", "outer", "inner", "triangles", "relation"]);
  assert.deepEqual(paths.map((p) => p.geometric), [true, true, true, true, false]);
  assert.equal(new Set(paths.map((p) => p.part)).size, 5, "a part is claimed by at most one path");
  assert.deepEqual(partsPresent(spec, true), ["cube", "outer", "inner", "triangles", "relation"]);
  assert.deepEqual(partsPresent(spec, false), ["cube", "outer", "inner", "triangles"]);
});

test("part facts never present a shape count as the source quantity", () => {
  const inner = describeStructurePart(paths[2], spec);
  assert.deepEqual(inner.facts.map((f) => [f.key, f.value, f.origin]), [["צלעות בצורה", 5, "מבנה הצורה במודל"], ["כמות במסלול", 180, "source claim/diagram"]]);
  assert.match(inner.note, /אינם אותו דבר/);
  assert.equal(describeStructurePart(paths[1], spec).note, null, "equal counts need no warning");
  const relation = describeStructurePart(paths[4], spec);
  assert.equal(relation.label, STRUCTURE_PART_LABEL.relation);
  assert.match(relation.note, /אין מבנה גאומטרי מאושר/);
  assert.deepEqual(relation.facts.map((f) => f.value), [3]);
});

test("layout is pure and exact: n petals for n sides, count triangles, deterministic, explode only moves y/x of the stated parts", () => {
  assert.equal(ringPetals(spec.outer.panels, STRUCTURE_3D.outerR).length, 5);
  assert.equal(ringPetals(spec.inner.panels, STRUCTURE_3D.innerR).length, 5);
  assert.equal(trianglePositions(spec.triangles.count, STRUCTURE_3D.tri.r).length, 4);
  assert.deepEqual(ringPetals(5, 100), ringPetals(5, 100));
  const top = ringPetals(5, 100)[0]; assert.ok(Math.abs(top.x) < 1e-9 && top.z < 0, "first petal at the top of the circle");
  assert.deepEqual(partCenter("outer", 1), partCenter("outer", 0), "the base plate does not move");
  assert.ok(partCenter("cube", 1).y < partCenter("cube", 0).y && partCenter("triangles", 1).y > partCenter("triangles", 0).y);
  assert.ok(partCenter("relation", 1).x > partCenter("relation", 0).x);
  for (const part of ["cube", "outer", "inner", "triangles", "relation"]) {
    const pts = connectorPoints(part, 0);
    assert.equal(pts.length, 4);
    assert.deepEqual([pts[3].x, pts[3].z], [STRUCTURE_3D.apex.x, STRUCTURE_3D.apex.z], "every route ends at the ONE apex");
  }
});

test("camera poses fit the structure at the current explode level and any aspect; focus frames one part", () => {
  const tanV = Math.tan((STRUCTURE_3D.fovDeg * Math.PI) / 360);
  for (const explode of [0, 1]) {
    const ext = structureExtent(explode);
    let last = 0;
    for (const aspect of [2.2, 1.2, 0.8, 0.55]) {
      const pose = overviewPose(aspect, explode), d = Math.hypot(pose.position.y - pose.target.y, pose.position.z - pose.target.z);
      assert.ok((ext.maxX - ext.minX) / 2 <= d * tanV * aspect + 1e-6, `width fits at aspect ${aspect}, explode ${explode}`);
      assert.ok((ext.maxY - ext.minY) / 2 <= d * tanV + 1e-6, `height fits at aspect ${aspect}, explode ${explode}`);
      assert.ok(d >= last); last = d;
      assert.ok(pose.position.y > pose.target.y, "the overview looks from above so rings read as rings");
    }
  }
  const a = structureExtent(0), b = structureExtent(1);
  assert.ok(a.maxY - a.minY < b.maxY - b.minY, "assembled structure is more compact than the exploded one");
  const focus = focusPose("inner", 1.2), over = overviewPose(1.2, 0);
  assert.ok(Math.hypot(focus.position.y - focus.target.y, focus.position.z - focus.target.z) < Math.hypot(over.position.y - over.target.y, over.position.z - over.target.z), "focus is closer than overview");
  assert.deepEqual(focus.target, partCenter("inner", 0));
});

test("1020 and 620 are NOT the compound family: they stay out of this renderer until a shape family exists for them", () => {
  for (const slug of ["hashgacha-pratit-1020", "keter-esrimon-620"]) {
    const m = SPATIAL_MODELS.find((x) => x.slug === slug);
    assert.equal(compoundStructureSpec(m.spatial, m.cube), null, slug);
    assert.equal(m.spatial.operations.length, 1, `${slug} has a single operation (no convergence to show)`);
  }
});

test("pure layers import no renderer and hold no literal colors", () => {
  for (const f of ["../src/lib/spatial/structureLayout3D.js", "../src/lib/spatialRenderModel.js"]) {
    const src = read(f);
    assert.doesNotMatch(src, /from\s+["'](three|@react-three|react)/, f);
    assert.doesNotMatch(src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, `${f} must not carry colors`);
  }
});

// ---- Raziel hand-off: the EXISTING bounded request contract accepts (and bounds) the selected-path context; nothing new is added to it ----
const { buildRazielPathFocus, razielSampleQuestions } = await import("../src/lib/spatial/spatialLabRaziel.js");
const { createRazielRequestContextSnapshot } = await import("../src/lib/research/razielSessionRequest2029.js");

test("selected-path context flows through the existing Raziel request snapshot unchanged in shape (no new field, no new contract)", () => {
  const selected = paths[2];
  const focus = buildRazielPathFocus({ card, path: selected, partInfo: describeStructurePart(selected, spec), statusLabel: null });
  assert.deepEqual(Object.keys(focus).sort(), ["numberCoreFocus", "readingFocus"], "only the two existing channels are filled");
  const snapshot = createRazielRequestContextSnapshot({ lens: "research", subject: { type: "zvi_card", id: card.slug, label: card.title } },
    { numberFocus: focus.numberCoreFocus, readingFocus: focus.readingFocus });
  assert.equal(snapshot.v, 1);
  assert.equal(snapshot.focus.number.root, String(card.value));
  assert.equal(snapshot.focus.number.result, selected.operand);
  assert.equal(snapshot.focus.reading.primary, `${selected.operand} × ${selected.quantity} = ${selected.result}`);
  assert.ok(snapshot.focus.reading.label.length > 0 && snapshot.focus.reading.label.length <= 120);
  assert.match(snapshot.description, new RegExp(String(selected.operand)));
  assert.deepEqual(Object.keys(snapshot).filter((k) => !["v", "surface", "lens", "subjectHref", "subject", "focus", "journey", "sourceNames", "capturedAt", "description", "surfaceContext"].includes(k)), [], "no foreign key leaks into the snapshot");
});

test("every path (including the unverified 765 and the relation layer) yields a bounded context; unverified is marked and not counted", () => {
  for (const path of paths) {
    const focus = buildRazielPathFocus({ card, path, partInfo: describeStructurePart(path, spec), statusLabel: path.status === "verified" ? null : "לא אומת" });
    assert.ok(focus.readingFocus.label.length <= 120 && focus.readingFocus.primary.length <= 160);
    assert.ok(focus.readingFocus.signals.every((s) => s.length <= 160));
    if (path.status !== "verified") assert.ok(focus.readingFocus.signals.some((s) => /לא נספר/.test(s)), `${path.id} says it is not counted`);
  }
  assert.equal(buildRazielPathFocus({ card, path: null }), null);
});

test("the five sample questions are plain text for the existing chat: no action, no calculation outside the model", () => {
  const qs = razielSampleQuestions(paths[0], card.value);
  assert.equal(qs.length, 5);
  assert.match(qs[0], new RegExp(`${paths[0].operand}.*${paths[0].quantity}.*${card.value}`));
  assert.ok(qs.every((q) => typeof q === "string" && !/\{|\}|\$\{/.test(q)));
});

test("scene and panel hold no color literals and no arithmetic on model numbers (display only)", () => {
  for (const f of ["../src/components/gematria2029/StructureScene3D2029.jsx", "../src/components/gematria2029/SpatialLabPanel2029.jsx"]) {
    const src = read(f).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b|rgba?\(/, `${f} must resolve colors from tokens`);
    assert.doesNotMatch(src, /\b(quantity|operand|result|value)\s*[*+\/]\s*\w/, `${f} must not compute from model numbers`);
    assert.doesNotMatch(src, /fetch\(|rpc\(|supabase/, `${f} must not reach the database`);
  }
});

test("royal mode uses the SHARED Royal layer and the canonical brand roles; no parallel palette", () => {
  const stage = read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx");
  assert.match(stage, /import "\.\.\/experience2029\/royal2029\.css"/);
  assert.match(stage, /className="r29 r29-hall sod29-spatial-lab-hall"/);
  const panel = read("../src/components/gematria2029/SpatialLabPanel2029.jsx");
  assert.ok((panel.match(/r29-chip/g) || []).length >= 6 && /r29-btn is-primary/.test(panel) && /r29-btn is-quiet/.test(panel));
  const css = read("../src/components/gematria2029/spatialMethodStage2029.css");
  const royal = css.slice(css.indexOf("ROYAL mode of the 3D lab"));
  assert.ok(royal.length > 500);
  assert.doesNotMatch(royal, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, "royal CSS carries no color literal");
  assert.match(css, /--sms-gold:var\(--s29-brand-gold/);
  assert.match(css, /--sms-sapphire:var\(--s29-brand-sapphire/);
  const toolkit = read("../src/components/gematria2029/MistaterScene3D2029.jsx");
  assert.match(toolkit, /gold: "--sms-gold", sapphire: "--sms-sapphire"/, "scene colors resolve from the same brand tokens");
  assert.doesNotMatch(read("../src/components/gematria2029/StructureScene3D2029.jsx").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"), /@react-three\/drei|MeshPortalMaterial|useGLTF/, "no drei");
});

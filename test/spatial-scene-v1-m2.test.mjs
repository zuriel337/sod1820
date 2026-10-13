import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { compileMistaterSceneV1 } from "../src/lib/spatial/semanticSceneCompiler.js";
import { exportSceneV1, compareBlenderParity, SCENE_V1_EXPORT_SCHEMA, SCENE_V1_BLENDER_PARITY_SCHEMA } from "../src/lib/spatial/sceneExport.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const json = (p) => JSON.parse(read(p));
const trace = json("./fixtures/spatial/mistater-1237-trace.json");
const golden = json("./fixtures/spatial/scene-v1-mistater-1237.export.json");
const stress = json("./fixtures/spatial/scene-v1-mistater-1237.stress.export.json");
const py = read("../scripts/spatial/scene_v1_to_blender.py");
const m1 = read("./spatial-scene-v1-m1.test.mjs");

test("fixture trace is the same canonical 1237 trace used by M1 tests (same pairs/letters/result)", () => {
  for (const v of [...trace.steps[0].letter_values, ...trace.steps[0].pairs.map((p) => p.difference), trace.result]) {
    assert.ok(m1.includes(String(v)), `M1 trace shares ${v}`);
  }
  assert.equal(trace.result, 1237);
  assert.equal(trace.steps[0].word, "התגלות");
});

test("golden export is regenerated deterministically from the compiler (no independent arithmetic)", () => {
  const scene = compileMistaterSceneV1({ expression: trace.input, methodTrace: trace });
  const again = JSON.parse(JSON.stringify(exportSceneV1({ scene, camera: golden.projection.camera })));
  assert.deepEqual(again, golden);
  assert.equal(golden.export_schema, SCENE_V1_EXPORT_SCHEMA);
  assert.equal(golden.parity_reference.schema, SCENE_V1_BLENDER_PARITY_SCHEMA);
});

test("fixture topology: 6 letter nodes / 5 connectors; scene_id + projection_signature preserved", () => {
  const scene = golden.scene;
  assert.equal(scene.nodes.filter((n) => n.kind === "letter_anchor").length, 6);
  assert.equal(scene.connectors.length, 5);
  assert.equal(golden.scene_id, scene.scene_id);
  assert.equal(golden.projection_signature, scene.projection_signature);
  assert.match(golden.projection_signature, /^projsig\.v1:cyrb53:/);
  assert.equal(stress.scene_id, golden.scene_id);
});

test("display values live only in derived `display` payload, resolved via identityRef — never in identity", () => {
  assert.equal(golden.display.derived, true);
  assert.deepEqual(golden.display.connectors["tension:0:0"], { difference: 395, leftValue: 5, rightValue: 400 });
  for (const c of golden.scene.connectors) assert.ok(!("difference" in c.identityRef) && !("value" in c.identityRef));
  for (const n of golden.scene.nodes) assert.ok(!("value" in (n.identityRef || {})));
});

test("exporter parity schema is deterministic and covers nodes/sockets/connectors/camera", () => {
  const ref = golden.parity_reference;
  assert.equal(Object.keys(ref.nodes).length, 9);
  assert.equal(Object.keys(ref.sockets).length, 12);
  assert.equal(Object.keys(ref.connectors).length, 5);
  assert.ok(ref.camera.world_matrix.length === 16);
  assert.ok(Object.values(ref.connectors).every((c) => c.points.length === 4));
  assert.ok(compareBlenderParity(ref, ref).pass);
});

test("parity comparator fails on a convention error (negative control)", () => {
  const bad = JSON.parse(JSON.stringify(golden.parity_reference));
  bad.sockets[Object.keys(bad.sockets)[0]].normal.x *= -1;
  bad.nodes[Object.keys(bad.nodes)[3]].world_matrix[12] += 5;
  const res = compareBlenderParity(golden.parity_reference, bad);
  assert.equal(res.pass, false);
  assert.ok(res.failures.length >= 2);
});

test("Blender importer: exact convention, no Gematria/ELS/Mistater logic, metadata preserved (static)", () => {
  assert.match(py, /Rx \* Ry \* Rz/);
  assert.match(py, /Matrix\.Rotation\(a, 4, "X"\) @ Matrix\.Rotation\(b, 4, "Y"\) @ Matrix\.Rotation\(c, 4, "Z"\)/);
  assert.match(py, /Translation\(.*\) @ _rot_xyz_matrix\(.*\) @ scale/);
  assert.match(py, /matrix_parent_inverse = Matrix\.Identity\(4\)/);
  assert.match(py, /inverted\(\)\.transposed\(\)/);
  for (const forbidden of [/left_value|right_value|word_subtotal|letter_values|\bpairs\b/, /gematria\s*\(|fn_misratar|mispar|els_|skip\s*=/i, /difference\s*[-+*]|abs\(\s*\w+\s*-\s*\w+\s*\)/]) {
    assert.doesNotMatch(py.replace(/"""[\s\S]*?"""/, ""), forbidden);
  }
  for (const prop of ["scene_id", "projection_signature", "node_id", "identityRef", "tracePath", "socket_id", "connector_id", "asset_ref"]) {
    assert.ok(py.includes(`${prop}=`), `custom prop ${prop}`);
  }
  assert.doesNotMatch(py, /font|text_add|FONT/i, "no font-baked canonical Hebrew in M2");
  assert.match(py, /export_extras=True/);
});

// ---- Blender runtime gate: runs only if a Blender python (bpy) is configured; otherwise reported, never faked ----
const bpyPython = process.env.SOD_BPY_PYTHON || "";
const blenderBin = process.env.SOD_BLENDER_BIN || "";
const hasRuntime = Boolean(bpyPython || blenderBin);
for (const [name, fx] of [["golden", "scene-v1-mistater-1237.export.json"], ["stress-TRS", "scene-v1-mistater-1237.stress.export.json"]]) {
  test(`Blender headless parity (${name}) vs JS resolver`, { skip: hasRuntime ? false : "BLENDER_RUNTIME_NOT_AVAILABLE (set SOD_BPY_PYTHON or SOD_BLENDER_BIN)" }, () => {
    const dir = mkdtempSync(join(tmpdir(), "sod-m2-"));
    const out = join(dir, "parity.json");
    const script = new URL("../scripts/spatial/scene_v1_to_blender.py", import.meta.url).pathname;
    const scene = new URL(`./fixtures/spatial/${fx}`, import.meta.url).pathname;
    const r = bpyPython
      ? spawnSync(bpyPython, [script, "--scene", scene, "--parity", out], { encoding: "utf8" })
      : spawnSync(blenderBin, ["-b", "-P", script, "--", "--scene", scene, "--parity", out], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const actual = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(actual.scene_id, golden.scene_id);
    const res = compareBlenderParity(JSON.parse(readFileSync(new URL(`./fixtures/spatial/${fx}`, import.meta.url), "utf8")).parity_reference, actual);
    assert.ok(res.pass, res.failures.join("\n"));
    assert.equal(res.checks, 54);
  });
}

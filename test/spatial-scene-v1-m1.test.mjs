import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Object3D, Vector3, Matrix3, CubicBezierCurve3 } from "three";
import {
  compileMistaterSceneV1, resolveSceneSocketWorld, resolveSceneWorldPosition, resolveSceneSocketNormalWorld,
  resolveSceneWorldMatrix, resolveSceneConnectorCurve, SCENE_V1_TRANSFORM_CONVENTION,
} from "../src/lib/spatial/semanticSceneCompiler.js";
import { evaluateS4Capability, isLowPowerContext } from "../src/lib/spatial/gpuCapability.js";

const trace = () => ({
  input: "התגלות",
  steps: [{
    word: "התגלות",
    pairs: [
      { difference: 395, left_value: 5, right_value: 400 }, { difference: 397, left_value: 400, right_value: 3 },
      { difference: 27, left_value: 3, right_value: 30 }, { difference: 24, left_value: 30, right_value: 6 },
      { difference: 394, left_value: 6, right_value: 400 },
    ],
    letter_values: [5, 400, 3, 30, 6, 400], word_subtotal: 1237,
  }],
  result: 1237, method_key: "מסתתר", trace_kind: "ADJACENT_DIFFERENCE",
  verification: { parity: true, trace_value: 1237, canonical_value: 1237 },
  provenance: { engine: "gematria", function: "fn_misratar", method_version: 1 },
});
const compile = () => compileMistaterSceneV1({ expression: "התגלות", methodTrace: trace() });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

// Transform the compiled scene (parents + letters) with non-trivial TRS to exercise the resolver.
function transformed() {
  const s = compile();
  const word = s.nodes.find((n) => n.kind === "word_group");
  word.transform = { position: { x: 30, y: -12, z: 7 }, rotation: { x: 0.3, y: -0.7, z: 1.1 }, scale: { x: 1.5, y: 0.8, z: 2 } };
  s.nodes.filter((n) => n.kind === "letter_anchor").forEach((n, i) => {
    n.transform = { ...n.transform, rotation: { x: 0.1 * i, y: 0.2, z: -0.15 * i }, scale: { x: 1, y: 1.2, z: 0.9 } };
  });
  return s;
}

function threeWorld(scene, nodeId) {
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const objs = new Map(scene.nodes.map((n) => {
    const o = new Object3D();
    o.position.set(n.transform.position.x, n.transform.position.y, n.transform.position.z);
    o.rotation.set(n.transform.rotation.x, n.transform.rotation.y, n.transform.rotation.z, "XYZ");
    o.scale.set(n.transform.scale.x, n.transform.scale.y, n.transform.scale.z);
    return [n.id, o];
  }));
  scene.nodes.forEach((n) => { if (n.parent) objs.get(n.parent).add(objs.get(n.id)); });
  objs.get(scene.subjectId).updateMatrixWorld(true);
  return { obj: objs.get(nodeId), byId };
}

test("convention is explicit and matches Three XYZ Euler / T*R*S", () => {
  assert.equal(SCENE_V1_TRANSFORM_CONVENTION.rotation.euler, "XYZ");
  assert.equal(compile().layout.transformConvention.local, "T*R*S");
});

test("full TRS world matrix + socket world/normal parity with an independent Three.js hierarchy", () => {
  const s = transformed();
  s.nodes.forEach((n) => {
    const { obj } = threeWorld(s, n.id);
    const m = resolveSceneWorldMatrix(s, n.id);
    obj.matrixWorld.elements.forEach((v, i) => near(v, m[i], 1e-9));
    const w = resolveSceneWorldPosition(s, n.id);
    near(w.x, obj.matrixWorld.elements[12]); near(w.y, obj.matrixWorld.elements[13]); near(w.z, obj.matrixWorld.elements[14]);
    (n.sockets || []).forEach((sock) => {
      const ref = { node: n.id, socket: sock.id };
      const expected = new Vector3(sock.position.x, sock.position.y, sock.position.z).applyMatrix4(obj.matrixWorld);
      const got = resolveSceneSocketWorld(s, ref);
      near(got.x, expected.x, 1e-7); near(got.y, expected.y, 1e-7); near(got.z, expected.z, 1e-7);
      // normal = inverse-transpose direction, unit length
      const nrm = resolveSceneSocketNormalWorld(s, ref);
      near(Math.hypot(nrm.x, nrm.y, nrm.z), 1);
      const en = new Vector3(sock.normal.x, sock.normal.y, sock.normal.z).applyMatrix3(new Matrix3().getNormalMatrix(obj.matrixWorld)).normalize();
      near(nrm.x, en.x, 1e-7); near(nrm.y, en.y, 1e-7); near(nrm.z, en.z, 1e-7);
    });
  });
});

test("sockets carry unit outward normals; M0 (identity) world positions unchanged", () => {
  const s = compile();
  s.nodes.filter((n) => n.kind === "letter_anchor").forEach((n) => {
    const inn = n.sockets.find((x) => x.role === "tension_in"), out = n.sockets.find((x) => x.role === "tension_out");
    assert.deepEqual(inn.normal, { x: 1, y: 0, z: 0 });
    assert.deepEqual(out.normal, { x: -1, y: 0, z: 0 });
    assert.ok(n.bounds.depth > 0);
  });
  const c = s.connectors[0];
  const a = resolveSceneSocketWorld(s, c.from);
  const w = resolveSceneWorldPosition(s, c.from.node);
  assert.equal(a.x - w.x, -s.layout.constants.letterWidth / 2);
  // out normal points toward the neighbour (-x) and the neighbour's in-normal points back at us (+x)
  assert.ok(resolveSceneSocketNormalWorld(s, c.from).x < 0 && resolveSceneSocketNormalWorld(s, c.to).x > 0);
});

test("connector curve: endpoints == socket world positions (also under transformed parents); 6 nodes / 5 connectors", () => {
  for (const s of [compile(), transformed()]) {
    assert.equal(s.nodes.filter((n) => n.kind === "letter_anchor").length, 6);
    assert.equal(s.connectors.length, 5);
    s.connectors.forEach((c) => {
      const { points } = resolveSceneConnectorCurve(s, c);
      const a = resolveSceneSocketWorld(s, c.from), b = resolveSceneSocketWorld(s, c.to);
      assert.deepEqual(points[0], a); assert.deepEqual(points[3], b);
      const bez = new CubicBezierCurve3(...points.map((p) => new Vector3(p.x, p.y, p.z)));
      near(bez.getPoint(0).distanceTo(new Vector3(a.x, a.y, a.z)), 0); near(bez.getPoint(1).distanceTo(new Vector3(b.x, b.y, b.z)), 0);
    });
  }
  // tangent leaves along the socket normal (+ lift axis): handle direction dot normal > 0
  const s = compile();
  const c = s.connectors[0];
  const { points } = resolveSceneConnectorCurve(s, c);
  assert.ok(points[1].x < points[0].x && points[2].x > points[3].x);
  assert.ok(points[1].y > points[0].y);
});

test("S2 and S4 consume the SAME scene.v1: identity passes through the lazy boundary untouched", () => {
  const stage = readFileSync(new URL("../src/components/gematria2029/SpatialMethodStage2029.jsx", import.meta.url), "utf8");
  assert.match(stage, /<MistaterScene3D scene=\{scene\}/);
  assert.match(stage, /lazy\(\(\) => import\("\.\/MistaterScene3D2029\.jsx"\)\)/);
  const r3f = readFileSync(new URL("../src/components/gematria2029/MistaterScene3D2029.jsx", import.meta.url), "utf8");
  assert.match(r3f, /data-scene-id=\{scene\.scene_id\}/);
  assert.match(r3f, /data-projection-signature=\{scene\.projection_signature\}/);
  assert.equal(/compileMistater|fetch\(|supabase/i.test(r3f), false);
});

test("R3F renderer performs no pair arithmetic and no duplicate Mistater semantics", () => {
  const r3f = readFileSync(new URL("../src/components/gematria2029/MistaterScene3D2029.jsx", import.meta.url), "utf8");
  const code = r3f.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.equal(/left_value|right_value|leftValue|rightValue|word_subtotal|letter_values|\.pairs\b|\.steps\b/.test(code), false);
  assert.equal(/difference\s*[-+*]|[-+*]\s*difference|Math\.abs\(/.test(code), false);
  assert.match(code, /resolveSceneTraceValue/);
  assert.match(code, /resolveSceneConnectorCurve/);
});

test("lazy boundary: three/@react-three only imported by the S4 module; default render is S2 and never touches WebGL", async () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const root = new URL("../src/", import.meta.url).pathname;
  const offenders = walk(root).filter((f) => /\.(jsx?|mjs)$/.test(f))
    .filter((f) => /from\s+["'](three|three\/[^"']*|@react-three\/[^"']*)["']|import\(["']three/.test(readFileSync(f, "utf8")))
    .map((f) => f.slice(root.length));
  assert.deepEqual(offenders, ["components/gematria2029/MistaterScene3D2029.jsx"]);
  const cap = readFileSync(new URL("../src/lib/spatial/gpuCapability.js", import.meta.url), "utf8");
  assert.equal(/from\s+["']three/.test(cap), false);

  const cache = new URL("../node_modules/.cache/", import.meta.url).pathname;
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, "scene-v1-m1-"));
  await build({
    configFile: false, logLevel: "silent", root: dir,
    build: {
      ssr: new URL("../src/components/gematria2029/SpatialMethodStage2029.jsx", import.meta.url).pathname,
      outDir: dir, emptyOutDir: false, minify: false,
      rollupOptions: { external: ["react", "react-dom"], output: { format: "esm", entryFileNames: "stage.mjs" } },
    },
  });
  const entry = readFileSync(join(dir, "stage.mjs"), "utf8");
  assert.equal(/from\s+["'](three|@react-three)/.test(entry), false);
  const { default: Stage } = await import(pathToFileURL(join(dir, "stage.mjs")).href);
  const html = renderToStaticMarkup(React.createElement(Stage, { expression: "התגלות", methodKey: "מסתתר", trace: trace(), expectedValue: 1237 }));
  assert.equal(/<canvas|data-renderer="r3f"/.test(html), false);
  assert.match(html, /data-depth="S2"/);
  assert.match(html, /data-s4-action="deepen"[^>]*>תלת־ממד</);
  assert.equal((html.match(/data-connector-id=/g) || []).length, 5);
  // fallback truth/actions preserved in S2: values + actions identical
  [395, 397, 27, 24, 394, 1237].forEach((n) => assert.ok(html.includes(`>${n}<`)));
  const withActions = renderToStaticMarkup(React.createElement(Stage, { expression: "התגלות", methodKey: "מסתתר", trace: trace(), expectedValue: 1237, onRazielAction() {}, onOpenHeichal() {} }));
  assert.match(withActions, /data-icon-shape="spark"/); assert.match(withActions, /data-icon-shape="heichal"/);
  assert.match(withActions, /רזיאל/); assert.match(withActions, /פתח בהיכל/);
});

test("S4 capability gate: SSR, low-power and no-WebGL fall back to S2; healthy context passes", () => {
  assert.deepEqual(evaluateS4Capability(), { ok: false, reason: "ssr" });
  assert.equal(isLowPowerContext({ connection: { saveData: true } }), true);
  assert.equal(isLowPowerContext({ deviceMemory: 1 }), true);
  assert.equal(isLowPowerContext({ deviceMemory: 8, hardwareConcurrency: 8 }), false);
  const docWith = (gl) => ({ createElement: () => ({ getContext: () => gl }) });
  assert.deepEqual(evaluateS4Capability({ nav: { deviceMemory: 1 }, doc: docWith({}) }), { ok: false, reason: "low_power" });
  assert.deepEqual(evaluateS4Capability({ nav: {}, doc: docWith(null) }), { ok: false, reason: "no_webgl" });
  assert.deepEqual(evaluateS4Capability({ nav: {}, doc: docWith({ getExtension: () => null }) }), { ok: true });
});

test("S4 renderer wiring: error boundary, context-loss fallback, DPR cap, controls, no extra deps", () => {
  const r3f = readFileSync(new URL("../src/components/gematria2029/MistaterScene3D2029.jsx", import.meta.url), "utf8");
  assert.match(r3f, /webglcontextlost/);
  assert.match(r3f, /dpr=\{\[1, 2\]\}/);
  assert.match(r3f, /OrbitControls/);
  assert.match(r3f, /boxGeometry/); assert.match(r3f, /tubeGeometry/);
  const stage = readFileSync(new URL("../src/components/gematria2029/SpatialMethodStage2029.jsx", import.meta.url), "utf8");
  assert.match(stage, /S4ErrorBoundary/); assert.match(stage, /data-s4-action="return"/);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies.three, "0.186.0"); assert.equal(pkg.dependencies["@react-three/fiber"], "9.8.0");
  assert.equal(Object.keys(pkg.dependencies).some((k) => /drei|postprocessing/.test(k)), false);
});

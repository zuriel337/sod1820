import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  compileMistaterSceneV1, serializeSceneProjectionV1, computeSceneProjectionSignatureV1, resolveSceneSocketWorld, resolveSceneWorldPosition, resolveSceneTraceValue, SCENE_V1_SCHEMA,
} from "../src/lib/spatial/semanticSceneCompiler.js";

const trace = () => ({
  input: "התגלות",
  steps: [{
    word: "התגלות",
    pairs: [
      { difference: 395, left_value: 5, right_value: 400 },
      { difference: 397, left_value: 400, right_value: 3 },
      { difference: 27, left_value: 3, right_value: 30 },
      { difference: 24, left_value: 30, right_value: 6 },
      { difference: 394, left_value: 6, right_value: 400 },
    ],
    letter_values: [5, 400, 3, 30, 6, 400],
    word_subtotal: 1237,
  }],
  result: 1237,
  method_key: "מסתתר",
  trace_kind: "ADJACENT_DIFFERENCE",
  verification: { parity: true, trace_value: 1237, canonical_value: 1237 },
  provenance: { engine: "gematria", function: "fn_misratar", method_version: 1 },
});
const compile = (t = trace()) => compileMistaterSceneV1({ expression: "התגלות", methodTrace: t });

test("scene.v1: same canonical trace => deterministic topology and ids", () => {
  const a = compile(), b = compile();
  assert.equal(a.schema, SCENE_V1_SCHEMA);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("scene.v1: 6 letter nodes + 5 connectors + one result, with parent hierarchy", () => {
  const s = compile();
  assert.equal(s.nodes.filter((n) => n.kind === "letter_anchor").length, 6);
  assert.equal(s.connectors.length, 5);
  assert.equal(s.nodes.filter((n) => n.kind === "engine_result").length, 1);
  const ids = new Set(s.nodes.map((n) => n.id));
  assert.equal(ids.size, s.nodes.length);
  s.nodes.filter((n) => n.parent).forEach((n) => assert.ok(ids.has(n.parent)));
  s.nodes.filter((n) => n.kind === "letter_anchor").forEach((n) => {
    assert.equal(s.nodes.find((p) => p.id === n.parent).kind, "word_group");
    assert.equal(n.sockets.length, 2);
    assert.equal(n.identityRef.type, "method_trace_letter");
  });
});

test("scene.v1: connectors reference existing sockets of adjacent letters and meet them in world space", () => {
  const s = compile();
  s.connectors.forEach((c, i) => {
    const from = s.nodes.find((n) => n.id === c.from.node), to = s.nodes.find((n) => n.id === c.to.node);
    assert.ok(from.sockets.some((x) => x.id === c.from.socket));
    assert.ok(to.sockets.some((x) => x.id === c.to.socket));
    assert.equal(to.identityRef.letterIndex, from.identityRef.letterIndex + 1);
    const a = resolveSceneSocketWorld(s, c.from), b = resolveSceneSocketWorld(s, c.to);
    const fw = resolveSceneWorldPosition(s, from.id), tw = resolveSceneWorldPosition(s, to.id);
    assert.ok(Math.abs(a.x - fw.x) === s.layout.constants.letterWidth / 2 && Math.abs(b.x - tw.x) === s.layout.constants.letterWidth / 2);
    assert.ok(Math.abs(a.x - b.x) > 0 && a.y === b.y);
    assert.ok(c.curve && c.style && c.occlusion && c.motion);
  });
  assert.deepEqual(s.connectors.map((c) => resolveSceneTraceValue(s, c.identityRef).difference), [395, 397, 27, 24, 394]);
  assert.equal(resolveSceneTraceValue(s, s.nodes.find((n) => n.id === s.resultId).identityRef).value, 1237);
});

test("scene.v1: no connector/node stores duplicate arithmetic truth", () => {
  const s = compile();
  const forbidden = ["difference", "value", "left_value", "right_value", "leftValue", "rightValue", "result"];
  [...s.connectors, ...s.nodes].forEach((o) => {
    forbidden.forEach((k) => assert.equal(k in o, false, `${o.id} stores ${k}`));
    forbidden.forEach((k) => assert.equal(k in o.identityRef, false, `${o.id}.identityRef stores ${k}`));
  });
});

test("scene.v1: unknown/unverified trace fails closed", () => {
  const unverified = trace(); unverified.verification.parity = false;
  assert.throws(() => compile(unverified), /VERIFIED_CANONICAL_TRACE/);
  const wrongKind = trace(); wrongKind.trace_kind = "LETTER_LEDGER";
  assert.throws(() => compile(wrongKind), /VERIFIED_CANONICAL_TRACE/);
  const badPair = trace(); badPair.steps[0].pairs[0].difference = 1;
  assert.throws(() => compile(badPair), /PAIR_MISMATCH/);
  assert.throws(() => compileMistaterSceneV1({ expression: "x", methodTrace: trace() }), /INPUT_MISMATCH/);
  assert.throws(() => compileMistaterSceneV1({ expression: "התגלות", methodTrace: null }), /VERIFIED_CANONICAL_TRACE/);
});

test("scene.v1: reduced-motion fallback is truthful (identical topology, static final state)", () => {
  const s = compile();
  assert.equal(s.fallback.reducedMotion.topology, "identical");
  assert.equal(s.fallback.reducedMotion.truthState, "identical");
  assert.equal(s.fallback.static.order.length, 6);
  assert.ok(s.connectors.every((c) => c.motion.reducedMotion === "static_final_state"));
  const css = readFileSync(new URL("../src/components/gematria2029/spatialMethodStage2029.css", import.meta.url), "utf8");
  const animIdx = css.indexOf("animation:sod29-sms-edge-draw");
  assert.ok(animIdx > css.lastIndexOf("@media (prefers-reduced-motion:no-preference)", animIdx) && css.lastIndexOf("@media (prefers-reduced-motion:no-preference)", animIdx) > 0);
  assert.equal(css.slice(0, css.indexOf("@media (prefers-reduced-motion:no-preference)")).includes("sod29-sms-edge-draw"), false);
});

test("scene.v1: M0 has no 3D/Blender dependency and no DB/schema touch", () => {
  const src = readFileSync(new URL("../src/lib/spatial/semanticSceneCompiler.js", import.meta.url), "utf8");
  assert.equal(/from\s+["'](three|@react-three)/.test(src), false);
  const stage = readFileSync(new URL("../src/components/gematria2029/SpatialMethodStage2029.jsx", import.meta.url), "utf8");
  // M1: the stage may reference the S4 renderer ONLY through a lazy dynamic import — never a static three/R3F import.
  assert.equal(/^\s*import[^;]*from\s+["'](three|@react-three)/m.test(stage), false);
  assert.equal(/^\s*import[^;]*MistaterScene3D2029/m.test(stage), false);
  assert.equal(/blender/i.test(stage), false);
});

test("Stage consumes scene.v1 (no parallel Mistater semantics) and draws connectors from scene sockets", async () => {
  const src = readFileSync(new URL("../src/components/gematria2029/SpatialMethodStage2029.jsx", import.meta.url), "utf8");
  assert.match(src, /compileMistaterSceneV1/);
  assert.equal(/buildMistaterWords|pair\??\.(left_value|right_value|difference)|word_subtotal/.test(src), false);

  const cache = new URL("../node_modules/.cache/", import.meta.url).pathname;
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, "scene-v1-"));
  await build({
    configFile: false, logLevel: "silent", root: dir,
    build: {
      ssr: new URL("../src/components/gematria2029/SpatialMethodStage2029.jsx", import.meta.url).pathname,
      outDir: dir, emptyOutDir: false, minify: false,
      rollupOptions: { external: ["react", "react-dom"], output: { format: "esm", entryFileNames: "stage.mjs" } },
    },
  });
  const out = join(dir, "stage.mjs");
  const { default: Stage } = await import(pathToFileURL(out).href);
  const html = renderToStaticMarkup(React.createElement(Stage, { expression: "התגלות", methodKey: "מסתתר", trace: trace(), expectedValue: 1237 }));
  assert.match(html, /data-scene-schema="sod1820.scene.v1"/);
  assert.equal((html.match(/data-connector-id=/g) || []).length, 5);
  assert.equal((html.match(/sod29-spatial-method-stage__tension-letter/g) || []).length, 6);
  const s = compile();
  s.connectors.forEach((c) => {
    assert.ok(html.includes(`data-from-socket="${c.from.socket}"`) && html.includes(`data-to-socket="${c.to.socket}"`));
  });
  // path endpoints == card edge (socket) positions in the same screen space
  const pad = 24, { extent } = s;
  const first = s.connectors[0];
  const a = resolveSceneSocketWorld(s, first.from);
  const ax = a.x - extent.minX + pad, ay = extent.maxY - a.y + pad;
  assert.ok(html.includes(`d="M ${ax} ${ay} Q`));
  [395, 397, 27, 24, 394, 1237].forEach((n) => assert.ok(html.includes(`>${n}<`)));

  // fail closed: unverified trace never reaches the scene
  const bad = trace(); bad.verification.parity = false;
  const closed = renderToStaticMarkup(React.createElement(Stage, { expression: "התגלות", methodKey: "מסתתר", trace: bad }));
  assert.match(closed, /data-state="unverified"/);
  assert.equal(closed.includes("data-connector-id"), false);
  // scene validation failure after gate (inconsistent pair) also fails closed to empty
  const inconsistent = trace(); inconsistent.steps[0].pairs[0].difference = 1;
  const errHtml = renderToStaticMarkup(React.createElement(Stage, { expression: "התגלות", methodKey: "מסתתר", trace: inconsistent }));
  assert.match(errHtml, /data-state="scene-error"/);
  assert.match(errHtml, /data-experience-capability="spatial-method-stage"/);
  assert.match(errHtml, /aria-live="polite"/);
  assert.equal(errHtml.includes("data-connector-id"), false);
  assert.equal(errHtml.includes("data-scene-schema"), false);
  assert.match(html, /data-scene-id="sod1820\.scene\.v1:/);
  assert.match(html, /data-projection-signature="projsig\.v1:/);
});

test("scene.v1: same trace => same scene_id and projection signature", () => {
  const a = compile(), b = compile();
  assert.ok(a.scene_id.startsWith("sod1820.scene.v1:"));
  assert.equal(a.scene_id, b.scene_id);
  assert.match(a.projection_signature, /^projsig\.v1:cyrb53:[0-9a-f]{14}$/);
  assert.equal(a.projection_signature, b.projection_signature);
  assert.equal(serializeSceneProjectionV1(a), serializeSceneProjectionV1(b));
  assert.equal(computeSceneProjectionSignatureV1(a), a.projection_signature);
});

test("scene.v1: projection change => signature changes", () => {
  const s = compile();
  const moved = structuredClone(s);
  moved.nodes.find((n) => n.kind === "letter_anchor").transform.position.x += 1;
  assert.notEqual(computeSceneProjectionSignatureV1(moved), s.projection_signature);
  const rewired = structuredClone(s);
  rewired.connectors[0].to = { ...rewired.connectors[1].to };
  assert.notEqual(computeSceneProjectionSignatureV1(rewired), s.projection_signature);
  const styled = structuredClone(s);
  styled.connectors[0].curve.lift += 1;
  assert.notEqual(computeSceneProjectionSignatureV1(styled), s.projection_signature);
  const fb = structuredClone(s);
  fb.fallback.narrow.strategy = "other";
  assert.notEqual(computeSceneProjectionSignatureV1(fb), s.projection_signature);
  const expr = compileMistaterSceneV1({ expression: "התגלות", methodTrace: trace() });
  expr.subjectId = "other";
  assert.notEqual(computeSceneProjectionSignatureV1(expr), s.projection_signature);
});

test("scene.v1: signature excludes canonical arithmetic (not duplicated into projection identity)", () => {
  const s = compile();
  const ser = serializeSceneProjectionV1(s);
  assert.equal(ser.includes('"trace"'), false);
  assert.equal(ser.includes("1237"), false);
  // same topology, different canonical arithmetic payload (values only) => identical projection identity
  const mutated = structuredClone(s);
  mutated.canonical.trace.result = 9999;
  mutated.canonical.trace.steps[0].pairs[0].difference = 1;
  mutated.canonical.trace.steps[0].letter_values[0] = 7;
  const resultNode = mutated.nodes.find((n) => n.kind === "engine_result");
  resultNode.label = "9999";
  assert.equal(computeSceneProjectionSignatureV1(mutated), s.projection_signature);
  assert.equal(serializeSceneProjectionV1(mutated), ser);
});

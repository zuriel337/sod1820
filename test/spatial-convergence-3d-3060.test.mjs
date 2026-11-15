import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { CONVERGENCE_3D, fitCameraDistance, layoutConvergence3D, layoutPhraseLetters } from "../src/lib/spatial/convergenceLayout3D.js";

const server = await createServer({ logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
const { default: Stage } = await server.ssrLoadModule("/src/components/gematria2029/SpatialConvergenceStage2029.jsx");
const { buildZviSpatialWorldProjection } = await server.ssrLoadModule("/src/lib/research/zviSpatialWorldProjection.js");
after(async () => server.close());

const here = (p) => new URL(p, import.meta.url).pathname;
const read = (p) => readFileSync(here(p), "utf8");
const { traces } = JSON.parse(read("./fixtures/spatial/convergence-3060-traces.json"));
const ready = Object.fromEntries(Object.entries(traces).map(([phrase, trace]) => [phrase, { state: "ready", trace }]));
const card = buildZviSpatialWorldProjection().cards.find((item) => item.slug === "yesharim-cube-3060");
const paths = card.operations.map((_, i) => ({ id: `path:${i}` }));

test("3D layout is pure, deterministic, ordered like the RTL stage and has no overlapping slabs", () => {
  const a = layoutConvergence3D(paths), b = layoutConvergence3D(paths);
  assert.deepEqual(a, b);
  assert.equal(a.nodes.length, 5);
  assert.equal(a.connectors.length, 5);
  assert.ok(a.nodes[0].position.x > 0 && a.nodes[4].position.x < 0, "index 0 is on the right (reading order)");
  for (let i = 1; i < a.nodes.length; i += 1) {
    assert.ok(a.nodes[i - 1].position.x - a.nodes[i].position.x >= CONVERGENCE_3D.slab.width, `slabs ${i - 1}/${i} do not overlap`);
  }
  assert.ok(a.connectors.every((c) => c.points.length === 4 && c.points[3].y === a.connectors[0].points[3].y), "all connectors end at the ONE apex");
  assert.deepEqual(layoutConvergence3D([]).nodes, []);
});

test("camera distance fits the whole fan at any canvas aspect (phone portrait to wide desktop)", () => {
  const { extent } = layoutConvergence3D(paths);
  const tanV = Math.tan((40 * Math.PI) / 360);
  let last = 0;
  for (const aspect of [2.4, 1.2, 0.8, 0.55]) {
    const d = fitCameraDistance(extent, 40, aspect);
    assert.ok((extent.maxX - extent.minX) / 2 <= d * tanV * aspect, `width fits at aspect ${aspect}`);
    assert.ok((extent.maxY - extent.minY) / 2 <= d * tanV, `height fits at aspect ${aspect}`);
    assert.ok(d >= last, "narrower canvas → camera at least as far");
    last = d;
  }
  assert.ok(Number.isFinite(fitCameraDistance(extent, 40, 0)) && Number.isFinite(fitCameraDistance(extent, 40, NaN)), "degenerate aspect falls back safely");
});

test("phrase letters keep one scale and read right-to-left; whitespace is skipped", () => {
  const { letters, size } = layoutPhraseLetters("השגחה פרטית");
  assert.equal(letters.length, 10);
  assert.ok(letters[0].x > letters.at(-1).x, "first letter on the right");
  assert.ok(letters.length * size.width <= CONVERGENCE_3D.glyph.maxAdvance + 1e-9);
  assert.deepEqual(layoutPhraseLetters("").letters, []);
  assert.equal(layoutPhraseLetters("ישר").letters.map((l) => l.char).join(""), "ישר");
});

test("default render is S2: no canvas, no WebGL, the explicit 3D action is offered", () => {
  const html = renderToStaticMarkup(React.createElement(Stage, { card, traces: ready }));
  assert.match(html, /data-depth="S2"/);
  assert.match(html, /data-s4-action="deepen"[^>]*>תלת־ממד</);
  assert.doesNotMatch(html, /<canvas|data-renderer="r3f"/);
  assert.match(html, /4 מתוך 5 מסלולים אומתו במנוע/);
});

test("S4 wiring: lazy boundary, capability gate, truthful fallback, same paths, no semantics or arithmetic in the renderer", () => {
  const stage = read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx");
  assert.match(stage, /lazy\(\(\) => import\("\.\/ConvergenceScene3D2029\.jsx"\)\)/);
  assert.match(stage, /evaluateS4Capability\(\)/);
  assert.match(stage, /S4ErrorBoundary/); assert.match(stage, /data-s4-action="return"/);
  assert.doesNotMatch(stage, /from\s+["'](three|@react-three)/);
  const r3f = read("../src/components/gematria2029/ConvergenceScene3D2029.jsx");
  const code = r3f.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.match(code, /webglcontextlost/); assert.match(code, /dpr=\{\[1, 2\]\}/); assert.match(code, /frameloop="demand"/);
  assert.match(code, /Controls/); assert.match(code, /layoutConvergence3D/); assert.match(code, /fitCameraDistance/);
  assert.doesNotMatch(code, /fetch\(|supabase|rpc\(|gematria_method_trace|isVerifiedMethodTrace|evaluateConvergencePaths|deriveConvergencePaths/, "no data access or verification in the renderer");
  assert.doesNotMatch(code, /(operand|quantity|result)\s*[*+\-/]\s*(operand|quantity|result|\d)|(\d|operand|quantity|result)\s*[*/]\s*(operand|quantity|result)\b/, "the renderer computes nothing");
  assert.doesNotMatch(code, /setInterval|requestAnimationFrame|autoRotate\s*=\s*true/, "no animation loop; demand rendering only");
});

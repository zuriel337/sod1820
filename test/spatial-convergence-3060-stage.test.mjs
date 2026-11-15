import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Loads the REAL stage and the REAL spatial model (no copy of either under test).
const server = await createServer({ logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
const { default: Stage } = await server.ssrLoadModule("/src/components/gematria2029/SpatialConvergenceStage2029.jsx");
const { buildZviSpatialWorldProjection } = await server.ssrLoadModule("/src/lib/research/zviSpatialWorldProjection.js");
const { deriveConvergencePaths, evaluateConvergencePaths } = await server.ssrLoadModule("/src/lib/spatialRenderModel.js");
const { isVerifiedMethodTrace } = await server.ssrLoadModule("/src/lib/research/gematriaTracePresentation.js");
after(async () => server.close());

const here = (p) => new URL(p, import.meta.url).pathname;
const read = (p) => readFileSync(here(p), "utf8");
const { traces: witness } = JSON.parse(read("./fixtures/spatial/convergence-3060-traces.json"));
const ready = (map) => Object.fromEntries(Object.entries(map).map(([phrase, trace]) => [phrase, { state: "ready", trace }]));
const card = buildZviSpatialWorldProjection().cards.find((item) => item.slug === "yesharim-cube-3060");
const render = (props = {}) => renderToStaticMarkup(React.createElement(Stage, { card, traces: ready(witness), ...props }));

test("3060: the model's five declared paths are derived, four are engine-verified, the fifth is shown but NOT counted", () => {
  const html = render();
  assert.match(html, /is-convergence/);
  assert.match(html, /data-verified-paths="4"/);
  assert.match(html, /data-total-paths="5"/);
  assert.match(html, /4 מתוך 5 מסלולים אומתו במנוע/);
  assert.equal((html.match(/data-path-index=/g) || []).length, 5);
  assert.match(html, /data-status="no_phrase"/, "765 has no declared phrase → not counted");
  assert.equal((html.match(/data-status="verified"/g) || []).length, 8, "4 rows + 4 lines carry the verified status");
  assert.match(html, /אין ביטוי מאומת למספר הזה/);
  assert.doesNotMatch(html, /המסלול מוצג אך אינו נספר/, "the warning belongs to the focused unverified path only (covered in the browser check)");
  assert.match(html, /data-playing="false"/, "static by default");
});

test("derivation reads only what the model declares and keeps quantity provenance (not engine facts)", () => {
  const paths = deriveConvergencePaths({ value: card.value, operations: card.operations, gematria: card.gematria, quantities: card.quantities });
  assert.deepEqual(paths.map((p) => [p.operand, p.quantity, p.phrase]), [[510, 6, "ישר"], [612, 5, "ברית"], [17, 180, "טוב"], [765, 4, null], [1020, 3, "השגחה פרטית"]]);
  assert.deepEqual(paths.map((p) => p.quantityKey), ["cube_faces", "pentagon_outer_parts", "inner_good_units", "inner_triangles", "patriarch_count"]);
  assert.ok(paths.every((p) => p.resultMatches && p.quantityProvenance));
});

test("fail-closed: unverified, mismatching or missing traces are never counted", () => {
  const derived = deriveConvergencePaths({ value: 3060, operations: card.operations, gematria: card.gematria, quantities: card.quantities });
  const count = (traces) => evaluateConvergencePaths(derived, traces, isVerifiedMethodTrace).verifiedCount;
  assert.equal(count(ready(witness)), 4);
  const noParity = ready(witness); noParity["ישר"] = { state: "ready", trace: { ...witness["ישר"], verification: { ...witness["ישר"].verification, parity: false } } };
  assert.equal(count(noParity), 3);
  const wrongValue = ready(witness); wrongValue["טוב"] = { state: "ready", trace: { ...witness["ברית"], input: "טוב" } };
  assert.equal(count(wrongValue), 3, "a trace of another expression/value is rejected");
  assert.equal(count({}), 0, "no traces → nothing counted");
  assert.equal(count({ ...ready(witness), "ברית": { state: "error" } }), 3);
  const lying = deriveConvergencePaths({ value: 3060, operations: [{ expression: "510 × 6", result: 3061 }, { expression: "612 × 5", result: 3060 }], gematria: card.gematria, quantities: [] });
  assert.equal(evaluateConvergencePaths(lying, ready(witness), isVerifiedMethodTrace).paths[0].status, "inconsistent", "declared result must agree");
  assert.equal(count({ "ישר": { state: "loading" } }), 0);
});

test("loading state never shows a count; a single path is not a convergence", () => {
  const loading = renderToStaticMarkup(React.createElement(Stage, { card, traces: Object.fromEntries(Object.keys(witness).map((k) => [k, { state: "loading" }])) }));
  assert.match(loading, /data-state="loading"/);
  assert.match(loading, /בודק כל ביטוי מול המנוע הקנוני/);
  assert.doesNotMatch(loading, /מתוך 5 מסלולים אומתו/);
  assert.equal(renderToStaticMarkup(React.createElement(Stage, { card: { ...card, operations: card.operations.slice(0, 1) }, traces: ready(witness) })), "");
});

test("no second model/calculator/fetcher: stage reuses the shared layers, the World card opens it by explicit action, timers are shared", () => {
  const src = read("../src/components/gematria2029/SpatialConvergenceStage2029.jsx");
  assert.match(src, /fetchGematriaMethodTraceRaw/);
  assert.match(src, /isVerifiedMethodTrace/);
  assert.match(src, /SpatialMethodStage2029/, "letter ledger of each phrase reuses the existing stage");
  assert.match(src, /useStepPlayer/);
  assert.equal((src.match(/setInterval\(/g) || []).length, 0);
  assert.doesNotMatch(src, /3060|ישר|ברית|supabase\.rpc|Math\.(random|sqrt)/, "no hardcoded specimen, no direct RPC");
  const world = read("../src/components/research/WorldKnowledgeTypes2029.jsx");
  assert.match(world, /loadConvergenceStage = \(\) => import\("\.\.\/gematria2029\/SpatialConvergenceStage2029\.jsx"\)/);
  assert.match(world, /lazy\(loadConvergenceStage\)/, "the stage is a lazy chunk, never in the shelf bundle");
  assert.match(world, /\{open \? <ConvergenceBoundary>/, "mounted (and fetching traces) only after the explicit click");
  assert.match(world, /<ConvergenceOpen card=\{card\} \/>/);
  const model = read("../src/lib/spatialModels.js");
  assert.match(model, /slug: "yesharim-cube-3060"/, "the specimen stays in the existing model layer");
});

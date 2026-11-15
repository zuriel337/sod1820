import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Loads the REAL shared stage through Vite (no copy of the UI under test).
const server = await createServer({ logLevel: "silent", appType: "custom", server: { middlewareMode: true } });
const { default: Stage, spatialMethodStageInternals: internals } = await server.ssrLoadModule("/src/components/gematria2029/SpatialMethodStage2029.jsx");
after(async () => server.close());

const here = (p) => new URL(p, import.meta.url).pathname;
const read = (p) => readFileSync(here(p), "utf8");
// Witness = verbatim gematria_method_trace('ריבוע','תפרצי בתשפז') output (see _provenance). Never an input of the UI itself.
const { trace } = JSON.parse(read("./fixtures/spatial/ribua-5787-trace.json"));
const EXPR = "תפרצי בתשפז";
const render = (props) => renderToStaticMarkup(React.createElement(Stage, { expression: EXPR, methodKey: "ריבוע", trace, expectedValue: 5787, ...props }));
const clone = () => JSON.parse(JSON.stringify(trace));

test("ריבוע 5787: engine words, prefixes, word subtotals and the closing equation are all rendered from the trace", () => {
  const html = render();
  assert.match(html, /is-ribua/);
  assert.match(html, /data-method-visual="per-word-prefix-accumulation"/);
  for (const n of [400, 480, 680, 770, 780, 2, 402, 702, 782, 789, 3110, 2677, 5787]) assert.ok(html.includes(`>${n}<`), `value ${n}`);
  assert.match(html, /3110 \+ 2677 = <strong>5787<\/strong>/);
  assert.equal((html.match(/data-ribua-flat=/g) || []).length, 10, "ten letter steps, all visible in the static state");
  assert.match(html, /data-playing="false"/, "no motion by default");
});

test("projection lays out only engine numbers and fails closed on any inconsistency", () => {
  const model = internals.buildRibuaWords(trace);
  assert.deepEqual(model.words.map((w) => w.subtotal), [3110, 2677]);
  assert.equal(model.result, 5787);
  const bad = clone(); bad.steps[0].steps[1].prefix_subtotal = 481;
  assert.equal(internals.buildRibuaWords(bad), null, "prefix not equal previous + base");
  const badWord = clone(); badWord.steps[1].word_subtotal = 2678;
  assert.equal(internals.buildRibuaWords(badWord), null, "word subtotal not the sum of its prefixes");
  const badTotal = clone(); badTotal.result = 5788;
  assert.equal(internals.buildRibuaWords(badTotal), null, "result not the sum of word subtotals");
  const continuous = clone(); continuous.semantics.per_word_reset = false;
  assert.equal(internals.buildRibuaWords(continuous), null, "continuation variants are not this stage");
  assert.equal(internals.buildRibuaWords({ ...trace, trace_kind: "LETTER_LEDGER" }), null);
});

test("unverified, mismatched or inconsistent traces never reach the new view", () => {
  const noParity = clone(); noParity.verification.parity = false;
  assert.match(render({ trace: noParity }), /data-state="unverified"/);
  assert.doesNotMatch(render({ trace: noParity }), /is-ribua/);
  assert.match(render({ expression: "תפרצי" }), /data-state="unverified"/, "expression must match the trace input");
  assert.match(render({ expectedValue: 5788 }), /data-state="unverified"/, "expected value must equal the engine result");
  const inconsistent = clone(); inconsistent.steps[0].steps[0].base_value = 399; // keeps parity flags but breaks arithmetic identity
  const html = render({ trace: inconsistent });
  assert.doesNotMatch(html, /is-ribua/);
  assert.match(html, /is-trace-family/, "degrades to the existing generic trace stage, never to invented numbers");
});

test("the illustration is the shared component: every consumer imports it, so a change there updates the illustration", () => {
  const consumers = ["../src/components/number2029/NumberCore2029.jsx", "../src/components/beitMidrash2029/BeitMidrashMethods.jsx",
    "../src/components/research/WorldSourceConnections.jsx", "../src/components/research/WorldSourceStory.jsx"];
  for (const file of consumers) assert.match(read(file), /gematria2029\/SpatialMethodStage2029\.jsx/, file);
  const source = read("../src/components/gematria2029/SpatialMethodStage2029.jsx");
  assert.match(source, /if \(methodKey === "ריבוע"\)[\s\S]{0,200}buildRibuaWords\(normalized\)/, "dispatched from the existing stage entry point");
  assert.doesNotMatch(source, /export (default )?function RibuaStage/, "no second public component");
  const ribua = source.slice(source.indexOf("function RibuaStage"), source.indexOf("export default function SpatialMethodStage2029"));
  assert.doesNotMatch(ribua, /5787|תפרצי|fetch|rpc\(|supabase|Math\.(random|sqrt)/, "no hardcoded witness, no fetch, no calculator");
});

test("motion safety (shared hook): static default, user-initiated play, reduced-motion and off-screen pause, single timer", () => {
  const hook = read("../src/components/gematria2029/useStepPlayer.js");
  assert.match(hook, /useState\(false\);\s*\n\s*const \[visible/, "playing starts false");
  assert.match(hook, /prefers-reduced-motion: reduce/);
  assert.match(hook, /data-frame-reduced-motion/);
  assert.match(hook, /IntersectionObserver/);
  assert.match(hook, /visibilitychange/);
  assert.equal((hook.match(/setInterval\(/g) || []).length, 1);
  assert.equal((hook.match(/clearInterval\(/g) || []).length, 1);
  const stage = read("../src/components/gematria2029/SpatialMethodStage2029.jsx");
  assert.match(stage, /useStepPlayer\(rootRef, model\.cells\.length/);
  assert.equal((stage.match(/setInterval\(/g) || []).length, 0, "the stage owns no timer of its own");
  assert.doesNotMatch(read("../src/components/gematria2029/spatialMethodStage2029.css").split("per-word prefix accumulation")[1] || "", /@keyframes/, "no CSS animation loop");
});

// One display of a gematria method's mathematical structure for every consumer (ZURIEL 27.11.2026): drawn from the canonical engine trace ONLY.
// The fixture is a read-only copy of live gematria_method_trace answers; nothing here calculates a method.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { projectGematriaTrace } from "../src/lib/research/gematriaTracePresentation.js";

const ROOT = path.resolve(".");
const { traces } = JSON.parse(fs.readFileSync(new URL("./fixtures/gematria-structure-traces-20261127.json", import.meta.url), "utf8"));
const PHRASE = "תפרצי בתשפז";
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

async function load() {
  const out = await build({
    entryPoints: [path.join(ROOT, "src/components/gematria2029/MethodStructure2029.jsx")], bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic",
    external: ["react", "react/jsx-runtime", "react-dom"], loader: { ".css": "empty" },
    // the Hebrew glyph component draws a letter with a Vite-only glob; the test stubs only that drawing and keeps the text
    plugins: [{ name: "glyph-stub", setup(b) { b.onLoad({ filter: /HebrewGlyph2029\.jsx$/ }, () => ({ contents: "export default function G({ text }) { return <span>{text}</span>; }", loader: "jsx" })); } }],
  });
  const file = path.join(ROOT, "node_modules/.cache-method-structure-2029.mjs");
  fs.writeFileSync(file, out.outputFiles[0].text);
  try { return await import(`${file}?t=${Date.now()}`); } finally { fs.rmSync(file, { force: true }); }
}
const model = key => projectGematriaTrace(traces[key], { expression: PHRASE, methodKey: key });
const text = html => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("ribua 5787: a separate cumulative triangle for each word, every prefix with its engine value, the word sums and the final result", async () => {
  const { default: Structure } = await load();
  const m = model("ריבוע");
  assert.equal(m.state, "ready"); assert.equal(m.result, 5787);
  const html = renderToStaticMarkup(React.createElement(Structure, { model: m }));
  assert.equal((html.match(/data-ms="prefix-triangle"/g) || []).length, 1);
  assert.equal((html.match(/class="sod29-ms-triangle"/g) || []).length, 2, "one triangle per word");
  const t = text(html);
  for (const v of ["400", "480", "680", "770", "780", "3,110", "402", "702", "782", "789", "2,677", "5,787"]) assert.ok(t.includes(v), `value ${v} is shown`);
  assert.ok(t.includes("3,110 + 2,677 = 5,787"), "the words are added to the result");
  assert.ok(t.includes("400 + 480 + 680 + 770 + 780 = 3,110"), "the prefixes of the first word are added to its sum");
  assert.equal((html.match(/<li /g) || []).length, 10, "ten prefixes, none invented, none skipped");
});

test("every number the structure prints is a number of the engine trace (nothing is calculated here)", async () => {
  const { default: Structure } = await load();
  for (const key of ["ריבוע", "ריבוע גדול", "משולש מילה", "משולש הפוך", "משולש מדרגות", "מסתתר", "אטבח", "הכפלה", "רגיל"]) {
    const m = model(key);
    const engine = new Set(JSON.stringify(traces[key]).match(/-?\d+/g).map(Number));
    const html = renderToStaticMarkup(React.createElement(Structure, { model: m }));
    const shown = (text(html).replace(/[A-Za-zא-ת]/g, " ").match(/\d[\d,]*/g) || []).map(s => Number(s.replace(/,/g, "")));
    for (const n of shown) assert.ok(engine.has(n), `${key}: ${n} is not an engine number`);
  }
});

test("each trace kind has its own shape: the continuing triangle, the reverse triangle, weights, and the squared and substituted ledgers", async () => {
  const { default: Structure, drawsStructure } = await load();
  const markup = key => renderToStaticMarkup(React.createElement(Structure, { model: model(key) }));
  const forward = markup("משולש מילה");
  assert.match(markup("משולש מילה"), /data-ms-scope="phrase"/);
  assert.match(markup("משולש הפוך"), /data-ms="prefix-triangle"/);
  const emphasised = html => (html.match(/<em[^>]*><span>(.)<\/span><\/em>/) || [])[1];
  assert.equal(emphasised(forward), "ת", "the forward triangle adds its first letter first");
  assert.equal(emphasised(markup("משולש הפוך")), "ז", "the reverse triangle starts from the last letter of the expression");
  assert.match(markup("משולש מדרגות"), /data-ms="position-weighted"/);
  assert.ok(text(markup("משולש מדרגות")).includes("400 × 1"));
  assert.match(markup("אטבח"), /data-ms="substitution-ledger"/);
  assert.match(markup("הכפלה"), /data-ms="letter-ledger"/);
  assert.ok(text(markup("הכפלה")).includes("400² = 160,000"), "a squared letter shows its square as the engine gave it");
  assert.equal(drawsStructure(model("ריבוע")), true);
  assert.equal(drawsStructure(model("מילוי בלבד")), false, "a composite is drawn by its components");
  assert.equal(renderToStaticMarkup(React.createElement(Structure, { model: { state: "unverified" } })), "", "an unverified trace draws nothing");
});

test("one shared display: the Home, Posts, Number page, World and Beit Midrash all reach the same stage", () => {
  const unit = read("src/components/experience2029/UnitGematria2029.jsx");
  assert.ok(!/TraceFamilyStage2029/.test(unit.replace(/\/\/.*$/gm, "")), "the unit display no longer forks to its own generic cards");
  assert.match(unit, /display === "full"\s*\n?\s*\? <SpatialMethodStage2029/);
  const stage = read("src/components/gematria2029/SpatialMethodStage2029.jsx");
  assert.ok(!stage.includes('methodKey === "משולש מילה") return <TriangleWordStage'), "no second display for the continuing triangle");
  const family = read("src/components/gematria2029/MethodTraceExplanation2029.jsx");
  assert.match(family, /<MethodStructure2029 model=\{model\} \/>/);
});

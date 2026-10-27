import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cutFunction, loadProductReader } from "../experiments/els-language-calibration/lib/product-reader.mjs";
import { PRIMARY_METRIC, axisOf, compare, metricsOf, shiftedAxes } from "../experiments/els-language-calibration/lib/calibrate.mjs";

const HERE = fileURLToPath(new URL("../experiments/els-language-calibration/", import.meta.url));
const PAGE = fileURLToPath(new URL("../public/tzofen.html", import.meta.url));
const LEXICON = fileURLToPath(new URL("../public/els-dynamic-lexicon-v1.gz64.txt", import.meta.url));

test("EXP-09 harness: the loader cuts the product's own functions by brace matching and refuses a page that does not contain them", () => {
  const html = 'x function alpha(a){ if(a){ return "}{"; } return {b:1}; } async function beta(){ return 2; } function gamma(){ return alpha(0); }';
  assert.equal(cutFunction(html, "beta"), "async function beta(){ return 2; }");
  assert.match(cutFunction(html, "gamma"), /^function gamma\(\)\{ return alpha\(0\); \}$/);
  assert.throws(() => cutFunction(html, "missing"), /not found/);
  assert.throws(() => cutFunction("function broken(a){ return ( ; }", "broken"), SyntaxError);
});

test("EXP-09 calibration library: axis from an engine occurrence, metrics read off the returned output, deterministic windows of the same shape, upper-tail comparison", () => {
  const axis = axisOf({ start: 1000, skip: 50, dir: -1, length: 4 });
  assert.deepEqual(axis.positions, [1000, 950, 900, 850]);
  assert.throws(() => axisOf({ start: 1, skip: 1, dir: 1, length: 4 }), RangeError);
  assert.throws(() => axisOf({ start: 1, skip: 50, dir: 0, length: 4 }), RangeError);
  const metrics = metricsOf({
    coverage: { lexiconLookups: 10, candidatesExamined: 5 },
    readings: [{ exactLetters: "אבגדה" }, { exactLetters: "אב" }], segmentations: [{ exactLetters: "אבגדהוז" }, { exactLetters: "אבג" }],
    relations: [{ candidateScore: 250, exactMatches: 2 }, { candidateScore: 200, exactMatches: 1 }], boundaries: [{ profileScore: 600 }, { profileScore: 300 }],
  });
  assert.deepEqual([metrics.readings, metrics.readingMaxLen, metrics.reading5plus, metrics.segmentationsLong, metrics.relationBestScore, metrics.boundaryBestScore], [2, 5, 1, 1, 250, 600]);
  assert.equal(PRIMARY_METRIC, "relationBestScore");
  // windows: a box of fixed shape that does not depend on the position except through its columns, so the shape filter is exercised
  const boxOf = (moved) => { const S = 100; const col = ((moved.positions[0] % S) + S) % S; const c0 = Math.max(0, col - 5); const c1 = Math.min(S - 1, col + 5); const row = Math.floor(moved.positions[0] / S); return { S, c0, c1, r0: Math.max(0, row - 3), r1: row + 3 }; };
  const real = { skip: 100, dir: 1, start: 5050, positions: [5050, 5150, 5250] };
  const box = boxOf(real);
  const first = shiftedAxes({ axis: real, box, boxOf, streamLetters: 100000, count: 10 });
  const second = shiftedAxes({ axis: real, box, boxOf, streamLetters: 100000, count: 10 });
  assert.deepEqual(first.map((entry) => entry.m), second.map((entry) => entry.m), "deterministic");
  for (const entry of first) {
    assert.equal(entry.box.c1 - entry.box.c0, box.c1 - box.c0, "same number of columns");
    assert.equal(entry.box.r1 - entry.box.r0, box.r1 - box.r0, "same number of rows");
    assert.ok(!(entry.box.r0 <= box.r1 && entry.box.r1 >= box.r0 && entry.box.c0 <= box.c1 && entry.box.c1 >= box.c0), "no shared cell with the real window");
    assert.ok(entry.axis.positions.every((position) => position >= 0 && position < 100000));
  }
  const result = compare({ real: { a: 5, b: 3, c: 1 }, shifted: [{ a: 1, b: 3, c: 1 }, { a: 2, b: 3, c: 1 }, { a: 5, b: 3, c: 1 }, { a: 0, b: 3, c: 1 }] });
  assert.deepEqual([result.a.p, result.a.saturated, result.b.saturated, result.c.saturated], [0.4, false, true, true]);
  assert.equal(result.a.nullMax, 5);
});

test("EXP-09 harness: no Golden string in the library code (cases and look-ups are data)", () => {
  const libs = readdirSync(`${HERE}lib`).map((name) => readFileSync(`${HERE}lib/${name}`, "utf8").replace(/\/\/.*$/gm, ""));
  libs.push(readFileSync(`${HERE}run.mjs`, "utf8").replace(/\/\/.*$/gm, ""));
  for (const source of libs) for (const word of ["ספינת", "יכלאש", "אשאכלה", "באשאטמינ", "שבררומי", "דטראמפ", "קולומביה", "אורניום"]) assert.equal(source.includes(word), false, word);
});

test("EXP-09 harness runs the product's reader unmodified (contract, lexicon size, caps) and the recorded results decide by the pre-registered rule", async () => {
  const reader = loadProductReader({ htmlPath: PAGE, lexiconPath: LEXICON });
  assert.equal(reader.torahLetters, 304805);
  assert.ok(reader.streamLetters > 1_000_000);
  assert.match(reader.provenance.page.sha256, /^[0-9a-f]{64}$/);
  assert.equal(Object.keys(reader.provenance.functions).length, 11);
  reader.setScope("torah");
  const lexicon = await reader.loadLexicon();
  assert.ok(lexicon && lexicon.profile.entryCount > 40000, "the product's own size and hash checks of the lexicon asset pass");
  const axis = axisOf({ start: 248765, skip: 4545, dir: 1, length: 8 });
  const inspection = reader.inspect(axis, reader.box(axis), reader.newMap(), lexicon);
  assert.equal(inspection.contract, "els_matrix_language_inspection_v1");
  assert.equal(inspection.modelCallsTriggered, 0);
  assert.equal(inspection.truthPromotion, false);
  assert.deepEqual([inspection.coverage.rayCap, inspection.readings.length, inspection.segmentations.length], [24, 24, 24], "the product's caps are reached on this window");
  let unusual = 0;
  for (const id of ["gd01", "gd02", "gd03"]) {
    const run = JSON.parse(readFileSync(`${HERE}results/${id}.json`, "utf8"));
    assert.equal(run.windowsMoved, 100);
    assert.equal(run.primaryMetric, "relationBestScore");
    assert.equal(run.unusual, run.primary.p <= 0.05 && !run.primary.saturated);
    for (const key of ["readings", "segmentations", "relations"]) assert.equal(run.comparison[key].saturated, true, `${id}.${key}: the product's cap hides any difference`);
    assert.match(run.provenance.page.sha256, /^[0-9a-f]{64}$/);
    unusual += run.unusual ? 1 : 0;
  }
  assert.equal(unusual, 0, "decision rule 2: no calibrated signal in the primary metric on these pages");
});

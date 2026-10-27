import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cutFunction, loadProductReader } from "../experiments/els-language-calibration/lib/product-reader.mjs";
import { PRIMARY_METRIC, axisOf, compare, metricsOf, shiftedAxes } from "../experiments/els-language-calibration/lib/calibrate.mjs";
import { annotate, axisGeometry, bucketOf, enumerateCandidates, noiseAbove, parseCoverage, positionOf, rankFindings, rarityOf, tailTable, unionRank, windowLetters } from "../experiments/els-language-calibration/lib/ranking.mjs";

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
  libs.push(readFileSync(`${HERE}run-ranking.mjs`, "utf8").replace(/\/\/.*$/gm, ""));
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

// ---------------------------------------------------------------- EXP-11: candidate pool and rankers
const gridOf = (rows) => (row, col) => rows[row]?.[col];

test("EXP-11 pool: every straight run of 4..10 letters on the four line types, both reading directions, counted exactly", () => {
  const rows = ["abcdef", "ghijkl", "mnopqr", "stuvwx", "yzabcd"];
  const box = { S: 6, r0: 0, r1: 4, c0: 0, c1: 5 };
  const pool = enumerateCandidates({ letterAt: gridOf(rows), box, minLen: 4, maxLen: 5 });
  const expected = (R, C, L) => (C * (R - L + 1)) + (R * (C - L + 1)) + 2 * ((R - L + 1) * (C - L + 1));
  assert.equal(pool.length, 2 * (expected(5, 6, 4) + expected(5, 6, 5)));
  const diag = pool.find((c) => c.line === "down_right" && c.len === 4 && c.cells[0][0] === 0 && c.cells[0][1] === 0 && !c.reverse);
  assert.equal(diag.surface, "ahov");
  const left = pool.find((c) => c.line === "down_left" && c.len === 4 && c.cells[0][0] === 0 && c.cells[0][1] === 5 && !c.reverse);
  assert.equal(left.surface, "fkpu");
  const back = pool.find((c) => c.line === "across" && c.surface === "fedc");
  assert.deepEqual(back.cells, [[0, 5], [0, 4], [0, 3], [0, 2]]);
  assert.equal(windowLetters({ letters: "abcdef", box: { S: 3, r0: 0, r1: 1, c0: 0, c1: 2 }, streamLetters: 5 })(1, 2), undefined, "beyond the end of the stream");
});

test("EXP-11 features and parse: word-free geometry against the axis, tiling by up to three recognized tokens", () => {
  const box = { S: 10, r0: 0, r1: 9, c0: 0, c1: 9 };
  const geometry = axisGeometry([14, 24, 34, 44], box); // column 4, rows 1..4
  assert.equal(geometry.lineName, "down");
  const make = (cells, line) => ({ surface: "x", cells, line, len: cells.length });
  const candidates = [make([[2, 1], [2, 2], [2, 3], [2, 4], [2, 5]], "across"), make([[1, 5], [2, 5], [3, 5], [4, 5]], "down"), make([[7, 7], [8, 7], [9, 7], [9, 8]], "down"), make([[1, 6], [2, 6], [3, 6], [4, 6]], "down")];
  annotate(candidates, { geometry, read: () => ({ readScore: 1, lexConf: 80, bases: [] }) });
  assert.deepEqual(candidates.map((c) => [c.cross, c.adjacent, c.parallel]), [[true, false, false], [false, true, true], [false, false, true], [false, false, true]]);
  const known = new Set(["abc", "defg", "hij"]);
  const recognized = (s) => known.has(s);
  assert.equal(parseCoverage("abcdefghij", recognized), 1);
  assert.equal(parseCoverage("abcxdefg", recognized), 7 / 8);
  assert.equal(parseCoverage("abcdefghijabc", recognized, 3), 10 / 13, "at most three tokens");
  assert.equal(parseCoverage("xyzxyz", recognized), 0);
});

test("EXP-11 rankers: calibrated rarity, findings are not duplicated, union is round-robin, noise is counted without the target's own region", () => {
  const cand = (surface, line, row, cols, extra = {}) => ({ surface, line, len: cols.length, cells: cols.map((c) => [row, c]), cross: false, adjacent: false, parallel: false, readScore: 1, lexConf: 80, bases: [], ...extra });
  const tail = tailTable([[cand("aaaa", "down", 0, [0, 1, 2, 3], { readScore: 0 }), cand("bbbb", "down", 1, [0, 1, 2, 3]), cand("cccccc", "down", 2, [0, 1, 2, 3, 4, 5], { readScore: 0.8 })]]);
  assert.equal(bucketOf(0.82), 0.8);
  assert.equal(bucketOf(0.5), 0);
  assert.ok(rarityOf({ len: 4, readScore: 1 }, tail) > 0);
  assert.equal(rarityOf({ len: 4, readScore: 0.5 }, tail), 0);
  const ctx = { tail, context: new Set(["כלב"]) };
  const x = cand("xxxx", "down", 5, [0, 1, 2, 3], { cross: true });
  const y = cand("yyyy", "down", 5, [2, 3, 4, 5], { cross: true }); // overlaps x on the same line
  const z = cand("zzzz", "across", 5, [0, 1, 2, 3], { adjacent: true, readScore: 0.9, bases: ["כלב"] });
  const pool = [x, y, z];
  const A = rankFindings(pool, "A", ctx);
  assert.equal(A.length, 2, "x and y are the same finding on the same line");
  const B = rankFindings(pool, "B", ctx);
  assert.equal(B[0].candidate, x, "crossing outranks adjacent");
  const C = rankFindings(pool, "C", ctx);
  assert.deepEqual(C.map((f) => f.candidate.surface), ["zzzz"]);
  const union = unionRank({ A, B, C });
  assert.ok(union.length >= 2 && union.length <= 3);
  assert.equal(positionOf(B, [y]), 1, "a target that overlaps a kept finding takes its position");
  const cmp = (a, b) => { for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  assert.equal(noiseAbove(B, [x], [0, 0], cmp), 1, "only z outranks a weak tuple; x's own region is not noise");
});

test("EXP-11 recorded results: pre-registered rules are applied as written and the flagship targets are located where the pool says", () => {
  const read = (name) => JSON.parse(readFileSync(`${HERE}results/${name}.json`, "utf8"));
  const blind = read("exp11-blind");
  assert.equal(blind.windows.length, 30);
  assert.ok(blind.windows.every((w) => w.cells >= 1100));
  assert.ok(blind.tail[8].total > 100000 && blind.tail[8].atLeast["1"] / blind.tail[8].total > 0.1, "readability is common at every length: full tiling of a random 8-letter run is not rare");
  let present = 0;
  let surfaced = 0;
  for (const id of ["gd01", "gd02", "gd03", "cluster"]) {
    const run = read(`exp11-${id}`);
    assert.equal(run.provenance.page.sha256.length, 64);
    for (const target of run.targets) {
      if (!target.present) continue;
      present += 1;
      assert.ok(target.placements.length >= 1);
      if (target.union.surfaced) surfaced += 1;
    }
  }
  const gd01 = read("exp11-gd01").targets.find((t) => t.placements[0]?.len === 8);
  assert.deepEqual([gd01.placements[0].line, gd01.placements[0].cross, gd01.product.inBoundaries], ["down_left", true, 3], "the 8-letter string crosses the axis and sits third in the product's boundary list");
  const gd02 = read("exp11-gd02").targets.find((t) => t.placements[0]?.len === 5 && t.placements[0].line === "down_left");
  assert.equal(gd02.product.inReadings, 7, "the product itself lists the ship string seventh of 24 readings");
  assert.equal(surfaced / present, 0, "rule 1: no target is within the top 10 of the union");
  assert.ok(blind.medianA7 >= 10, "rule 2: the median blind window has >= 10 A-findings of 7+ letters, so the ranking is declared not useful");
});

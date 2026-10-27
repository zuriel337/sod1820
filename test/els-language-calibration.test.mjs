import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cutFunction, loadProductReader } from "../experiments/els-language-calibration/lib/product-reader.mjs";
import { PRIMARY_METRIC, axisOf, compare, metricsOf, shiftedAxes } from "../experiments/els-language-calibration/lib/calibrate.mjs";
import { CROSS_MAX, CROSS_MIN, bestByLength, crossingScore, crossingTable, enumerateCrossing } from "../experiments/els-language-calibration/lib/crossing.mjs";
import { READ_MODES, makeReadInfo } from "../experiments/els-language-calibration/lib/reading.mjs";
import { SIGNAL_RANKERS, addCalibrated, addContext, addGeometry, addMirror, buildLists, fnv1a, locate, nullComparison, strengthOf, tableFromBuckets, trainTrigram, unionWithContext } from "../experiments/els-language-calibration/lib/signals.mjs";
import { PLANT_CLASSES, overridesOf, planWindow, plantingWords, withOverrides } from "../experiments/els-language-calibration/lib/planting.mjs";
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
  libs.push(readFileSync(`${HERE}run-crossing.mjs`, "utf8").replace(/\/\/.*$/gm, ""));
  libs.push(readFileSync(`${HERE}run-signals.mjs`, "utf8").replace(/\/\/.*$/gm, ""));
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

// ---------------------------------------------------------------- EXP-13: the crossing measure
test("EXP-13 crossing runs: only runs that share a cell with the axis, never on the axis' own line, both directions, each counted once", () => {
  const rows = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => String.fromCharCode(97 + ((r * 7 + c) % 26))).join(""));
  const axisCells = [[2, 3], [3, 3], [4, 3]];
  const runs = enumerateCrossing({ letterAt: gridOf(rows), axisCells, axisLine: "down", minLen: 3, maxLen: 3 });
  assert.equal(runs.length, 2 * 3 * 3 * 3, "3 axis cells x 3 other lines x 3 offsets x 2 directions");
  const axisKeys = new Set(axisCells.map(([r, c]) => `${r}:${c}`));
  for (const run of runs) {
    assert.notEqual(run.line, "down");
    assert.ok(run.cells.some(([r, c]) => axisKeys.has(`${r}:${c}`)), "shares a cell with the axis");
    assert.equal(run.surface, run.cells.map(([r, c]) => rows[r][c]).join(""));
    assert.equal(run.len, 3);
  }
  assert.equal(new Set(runs.map((run) => `${run.line}:${run.cells.map((cell) => cell.join(",")).join(";")}`)).size, runs.length, "no run twice");
  const forward = runs.find((run) => run.line === "across" && !run.reverse && run.cells[0][0] === 3 && run.cells[0][1] === 1);
  const back = runs.find((run) => run.line === "across" && run.reverse && run.cells[0][0] === 3 && run.cells[0][1] === 3 && run.cells[2][1] === 1);
  assert.equal(back.surface, [...forward.surface].reverse().join(""));
  assert.equal(enumerateCrossing({ letterAt: gridOf(["ab", "cd"]), axisCells: [[0, 0]], axisLine: "down", minLen: 4, maxLen: 4 }).length, 0, "runs that leave the window are dropped");
  assert.deepEqual([CROSS_MIN, CROSS_MAX], [4, 10]);
});

test("EXP-13 measure: table of how often a window holds a crossing run at least this long reading at least this well; X is minus log10 of it; the table is floored", () => {
  const best = bestByLength([{ len: 4, readScore: 1 }, { len: 4, readScore: 0.8 }, { len: 5, readScore: 0.5 }, { len: 6, readScore: 0.9 }]);
  assert.deepEqual(best, { 4: 1, 6: 0.9 });
  const table = crossingTable([{ 4: 1, 5: 1 }, { 4: 1 }, { 4: 0.9 }, {}]);
  assert.equal(table[4][1], 2 / 4);
  assert.equal(table[5][1], 1 / 4);
  assert.equal(table[6][1], 1 / 5, "never observed: floored at 1/(n+1)");
  assert.equal(table[4][0.75], 3 / 4);
  assert.ok(Math.abs(crossingScore({ len: 5, readScore: 1 }, table) - Math.log10(4)) < 1e-12);
  assert.equal(crossingScore({ len: 5, readScore: 0.5 }, table), 0, "a run that does not read does not score");
  assert.equal(crossingScore({ len: 11, readScore: 1 }, table), 0, "outside the table");
  const saturated = crossingTable([{ 10: 1 }, { 10: 1 }]);
  for (let length = CROSS_MIN; length <= CROSS_MAX; length += 1) assert.equal(crossingScore({ len: length, readScore: 1 }, saturated), 0, "if every window holds such a run, the measure cannot tell windows apart");
});

test("EXP-13 amendment 1 readability modes: whole reading only, tiling by two tokens, tiling by three tokens; the page's reader is only asked once per surface", () => {
  const known = new Set(["abc", "def", "ghi"]);
  let calls = 0;
  const reader = { readSurface: (surface) => { calls += 1; return known.has(surface) ? [{ lexicalConfidence: 80, baseTerm: surface }] : []; } };
  const rawCache = new Map();
  const make = (mode) => makeReadInfo({ reader, lexicon: null, hints: null, mode, rawCache });
  const [tile3, tile2, whole] = [make("tile3"), make("tile2"), make("whole")];
  assert.deepEqual(Object.keys(READ_MODES), ["tile3", "tile2", "whole"]);
  assert.deepEqual([tile3("abc").readScore, tile2("abc").readScore, whole("abc").readScore], [1, 1, 1]);
  assert.deepEqual([tile3("abcdefghi").readScore, tile2("abcdefghi").readScore, whole("abcdefghi").readScore], [1, 6 / 9, 0]);
  assert.deepEqual([tile3("abcdef").readScore, tile2("abcdef").readScore, whole("abcdef").readScore], [1, 1, 0]);
  assert.deepEqual([tile3("abcxe").readScore, tile2("abcxe").readScore, whole("abcxe").readScore], [0, 0, 0], "surfaces shorter than six letters are not tiled");
  const before = calls;
  tile2("abcdefghi"); whole("abcdefghi"); tile3("abcdefghi");
  assert.equal(calls, before, "cached");
  assert.throws(() => make("loose"), /unknown read mode/);
});

test("EXP-13 recorded results: the pre-registered measure and the two-token reading are saturated, the whole-reading definition is not at 8+ letters, no target is lifted and credible, and rule 3 leaves the result descriptive", () => {
  const read = (name) => JSON.parse(readFileSync(`${HERE}results/${name}.json`, "utf8"));
  const runs = { tile3: read("exp13-cases"), tile2: read("exp13-cases-tile2"), whole: read("exp13-cases-whole") };
  for (const [mode, run] of Object.entries(runs)) {
    assert.equal(run.mode, mode);
    assert.equal(run.provenance.page.sha256.length, 64);
    assert.deepEqual(Object.keys(run.tables).sort(), ["tanakh-6", "torah-5", "torah-6", "torah-7", "torah-8"]);
    assert.equal(run.summary.siblingsUnusual, 0, "no sibling window is unusual");
    assert.deepEqual(run.summary.devUnusual, [], "no development window is unusual");
    assert.equal(run.summary.siblingWindows, 8);
    let credible = 0;
    let crossingTargets = 0;
    for (const entry of run.cases) {
      assert.ok(entry.box.cells >= 1000);
      for (const target of entry.targets) {
        if (target.crossingEligible) crossingTargets += 1;
        if (target.D?.credible) credible += 1;
        if (target.D) assert.ok(target.D.chanceTopShare >= 0.4, "top 10 of a list of 15-24 findings is a 40-67% base rate");
      }
    }
    assert.equal(credible, 0, `${mode}: no target is lifted and credible`);
    assert.ok(crossingTargets < 5, `${mode}: fewer than five crossing targets: rule 3 leaves the result descriptive`);
  }
  for (const mode of ["tile3", "tile2"]) for (const [key, shares] of Object.entries(runs[mode].saturation)) for (const [length, share] of Object.entries(shares)) assert.equal(share, 1, `${mode} ${key} ${length}: every control window holds a readable crossing run, so X is 0`);
  for (const [key, shares] of Object.entries(runs.whole.saturation)) {
    assert.ok(shares[8] < 0.5 && shares[9] < 0.15 && shares[10] < 0.05, `whole ${key}: 8+ letter crossing runs with a whole reading are not everywhere`);
    assert.equal(shares[4], 1, "4-letter whole readings are in every window");
  }
  const target = (run, text) => run.cases.flatMap((entry) => entry.targets).find((item) => item.placements?.some((p) => p.len === text));
  assert.equal(target(runs.whole, 8).crossingEligible, false, "an 8-letter string made of two words has no whole reading, so the strict measure cannot see it");
  assert.equal(target(runs.tile2, 8).crossingEligible, true);
  assert.equal(target(runs.tile3, 8).D.exactNoiseBefore, 17, "its rank among 18 findings is the tie-break order: X is 0 for all of them");
});

// ---------------------------------------------------------------- EXP-14: separate signals
const signalCandidate = (surface, line, cells, extra = {}) => ({ surface, line, cells, len: cells.length, reverse: false, ...extra });

test("EXP-14 geometry and tie-break: distance to the axis cells, a fixed pseudo-random hash in [0, 1)", () => {
  const axisCells = [[2, 5], [3, 5], [4, 5]];
  const crossing = signalCandidate("abcd", "across", [[3, 3], [3, 4], [3, 5], [3, 6]]);
  const adjacent = signalCandidate("abcd", "down", [[1, 6], [2, 6], [3, 6], [4, 6]]);
  const far = signalCandidate("abcd", "down", [[10, 12], [11, 12], [12, 12], [13, 12]]);
  addGeometry([crossing, adjacent, far], axisCells);
  assert.deepEqual([crossing.dist, adjacent.dist, far.dist], [0, 1, 7], "Chebyshev: 6 rows and 7 columns from the nearest axis cell");
  assert.equal(fnv1a("down|1|6|4|0"), fnv1a("down|1|6|4|0"));
  for (const c of [crossing, adjacent, far]) assert.ok(c.hash >= 0 && c.hash < 1);
  assert.notEqual(crossing.hash, adjacent.hash);
});

test("EXP-14 Hebrew-likeness: a trigram model learned from the text itself, calibrated per length against the null; unknown letters score nothing", () => {
  const text = "abcabcabcabdabcabc".repeat(40);
  const model = trainTrigram(text);
  assert.ok(model.score("abcabc") > model.score("cbacba"), "a string the text contains outscores its scramble");
  assert.equal(model.score("abz"), -Infinity);
  const table = tableFromBuckets(new Map([[4, [-5, -4, -3, -2, -1]]]));
  const cands = [{ len: 4, hRaw: -1 }, { len: 4, hRaw: -3 }, { len: 4, hRaw: -9 }, { len: 7, hRaw: -1 }];
  addCalibrated(cands, table);
  assert.ok(cands[0].H > cands[1].H && cands[1].H > cands[2].H, "calibration is monotone");
  assert.ok(Math.abs(cands[0].H - Math.log10(6 / 2)) < 1e-12, "-log10((n_ge + 1) / (n + 1)) with n_ge = 1 and n = 5");
  assert.ok(Math.abs(cands[2].H - 0) < 1e-12, "everything is at least as Hebrew-like: no signal");
  assert.equal(cands[3].H, 0, "a length without a null table gets no score");
});

test("EXP-14 mirror pairs and context components: the partner is the reflection about the axis column; terms match as substrings", () => {
  const left = signalCandidate("xyzw", "down_right", [[1, 1], [2, 2], [3, 3], [4, 4]], { H: 2 });
  const right = signalCandidate("wzyx", "down_left", [[1, 9], [2, 8], [3, 7], [4, 6]], { H: 3 });
  const lonely = signalCandidate("pqrs", "down", [[1, 2], [2, 2], [3, 2], [4, 2]], { H: 1 });
  const onAxis = signalCandidate("abcd", "down", [[1, 5], [2, 5], [3, 5], [4, 5]], { H: 1 });
  addMirror([left, right, lonely, onAxis], 5);
  assert.equal(left.M, 5);
  assert.equal(right.M, 5);
  assert.equal(lonely.M, undefined, "its reflection is not in the pool");
  assert.equal(onAxis.M, undefined, "a run on the axis column is its own mirror");
  const c1 = signalCandidate("אשכלה", "down", [[1, 1]], {});
  const c2 = signalCandidate("בדגה", "down", [[1, 2]], {});
  addContext([c1, c2], new Set(["אש", "כלה", "ז"]));
  assert.equal(c1.ctx, 3, "the longest contained term; one-letter terms are ignored");
  assert.equal(c2.ctx, 0);
});

test("EXP-14 lists and union: every candidate with a score is ranked, nothing is cut by a threshold; the context block comes first, is capped and survives whatever the other signals say", () => {
  const make = (surface, line, row, cols, extra) => signalCandidate(surface, line, cols.map((c) => [row, c]), { dist: 3, H: 0, whole: false, lexConf: 0, ctx: 0, hash: 0.5, ...extra });
  const pool = [
    make("aaaa", "down", 0, [0, 1, 2, 3], { dist: 0, H: 1, whole: true, lexConf: 50 }),
    make("bbbb", "down", 5, [0, 1, 2, 3], { dist: 1, H: 4, M: 9 }),
    make("cccc", "down", 9, [0, 1, 2, 3], { dist: 6, H: 2, ctx: 2 }),
    make("dddd", "down", 12, [0, 1, 2, 3], { dist: 2, H: 3, ctx: 3 }),
  ];
  const lists = buildLists(pool, { withContext: true });
  assert.equal(lists.G.length, 4, "G ranks all candidates");
  assert.equal(lists.G[0].candidate.surface, "aaaa", "nearest first");
  assert.equal(lists.H[0].candidate.surface, "bbbb");
  assert.deepEqual(lists.W.map((f) => f.candidate.surface), ["aaaa"], "only whole readings are scored by W");
  assert.deepEqual(lists.M.map((f) => f.candidate.surface), ["bbbb"]);
  assert.deepEqual(lists.K.map((f) => f.candidate.surface), ["dddd", "cccc"], "longest contained term first");
  const union = unionWithContext(lists, { per: 2, cap: 1 });
  assert.equal(union[0].tier, "K");
  assert.equal(union[0].candidate.surface, "dddd", "the context block comes first");
  assert.equal(union.filter((f) => f.tier === "K").length, 1, "the block is capped");
  assert.equal(new Set(union.map((f) => f.candidate.surface)).size, union.length, "no finding twice");
  const withoutContext = unionWithContext({ G: lists.G, H: lists.H, W: lists.W, M: lists.M }, { per: 1, cap: 50 });
  assert.equal(withoutContext.some((f) => f.tier === "K"), false);
  assert.deepEqual(Object.keys(SIGNAL_RANKERS), ["G", "H", "W", "M", "K"]);
});

test("EXP-14 positions and null comparison: overlap, containment and exactness are different; blind share and null noise come from the null windows", () => {
  const run = (cols, row = 0) => signalCandidate("x".repeat(cols.length), "down", cols.map((c) => [row, c]));
  const findings = [{ candidate: run([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), tuple: [3, 0.5] }, { candidate: run([2, 3, 4, 5], 5), tuple: [2, 0.5] }];
  const inner = run([3, 4, 5, 6]);
  assert.deepEqual(locate(findings, [inner]), { overlap: 1, contained: 1, exact: null }, "a longer run swallows the target: contained, not exact");
  const sameRun = run([2, 3, 4, 5], 5);
  assert.deepEqual(locate(findings, [sameRun]), { overlap: 2, contained: 2, exact: 2 });
  assert.deepEqual(locate(findings, [run([20, 21, 22, 23])]), { overlap: null, contained: null, exact: null });
  const nullStrengths = [[[5], [4], [1]], [[2], [1]], [[3]]];
  const share = nullComparison(nullStrengths, [3]);
  assert.deepEqual([share.blindShare, share.nullNoiseMedian, share.windows], [0.667, 0, 3], "two of three windows hold a finding at least as strong; the median window holds none that is stronger");
  assert.deepEqual(strengthOf({ tuple: [4, 2, 0.9] }), [4, 2]);
});

test("EXP-14 planted hidden words: one word per class, no shared cell, the crossing word agrees with the axis letter, distances are as pre-registered; a window that does not fit is refused", () => {
  const axisCells = [[30, 25], [31, 25], [32, 25], [33, 25], [34, 25], [35, 25]];
  const axisLetters = ["ד", "ט", "ר", "א", "מ", "פ"];
  const words = plantingWords(new Set(["אבגדהו", "טוסיפאה", "ממלכתי", "ראשית", "בראשית", "שלוםכ", "פרעהה", "קדושים", "ךםןףץ6"]), { min: 6, max: 8, exclude: ["קדושים"] });
  assert.deepEqual(words, ["אבגדהו", "בראשית", "טוסיפאה", "ממלכתי"], "folded Hebrew only, within the length range, minus excluded words");
  const inside = (r, c) => r >= 10 && r <= 60 && c >= 5 && c <= 45;
  const placements = planWindow({ axisCells, axisLetters, words, index: (k) => k, inside });
  assert.deepEqual(placements.map((p) => p.class), PLANT_CLASSES.slice());
  const all = placements.flatMap((p) => p.cells.map(([r, c]) => `${r},${c}`));
  assert.equal(new Set(all).size, all.length, "no shared cell");
  const cross = placements[0];
  const touched = cross.cells.map((cell, j) => ({ cell, j })).filter(({ cell: [r, c] }) => c === 25 && r >= 30 && r <= 35);
  assert.equal(touched.length, 1, "exactly one axis cell");
  assert.equal(cross.word[touched[0].j], axisLetters[touched[0].cell[0] - 30], "the word has the axis letter there");
  const cands = placements.map((p) => signalCandidate(p.word, p.line, p.cells));
  addGeometry(cands, axisCells);
  assert.deepEqual(cands.map((c) => c.dist), [0, 1, 5, 14]);
  assert.equal(planWindow({ axisCells, axisLetters, words, index: (k) => k, inside: (r, c) => inside(r, c) && c >= 15 }), null, "the distant word (14 columns left of the axis) does not fit");
  const letterAt = withOverrides((r, c) => `${r}:${c}`, overridesOf(placements));
  assert.equal(letterAt(cross.cells[0][0], cross.cells[0][1]), cross.word[0]);
  assert.equal(letterAt(0, 0), "0:0");
});

test("EXP-14 recorded results: nothing is credible on the development targets, the product-like reading finds planted words only near the axis, language and mirror signals find none, context finds what it is given, rules are applied as written", () => {
  const read = (name) => JSON.parse(readFileSync(`${HERE}results/${name}.json`, "utf8"));
  const nullRun = read("exp14-null");
  assert.equal(nullRun.windows.torah.summary.windows, 40);
  assert.equal(nullRun.windows.tanakh.summary.windows, 30);
  assert.ok(nullRun.windows.torah.summary.medianContextFindings["gd02-context"] >= 40, "a two-letter context term keeps dozens of findings in a random window");
  assert.ok(nullRun.windows.torah.summary.maxContextFindings["gd03-context"] <= 5, "two four-letter terms keep almost nothing by chance");
  assert.match(nullRun.provenance.page.sha256, /^[0-9a-f]{64}$/);
  const cases = read("exp14-cases").runs;
  assert.equal(cases.length, 6);
  const present = cases.flatMap((run) => run.targets.filter((t) => t.present).map((t) => ({ run, t })));
  const plain = present.filter(({ run }) => !run.scenario);
  assert.equal(plain.length, 6, "six targets lie in the product's windows");
  const foundBy = (name) => plain.filter(({ t }) => (name === "U" ? t.signals.U.found : t.signals[name].found));
  assert.deepEqual(["G", "H", "W", "M", "U"].map((name) => foundBy(name).length), [2, 0, 0, 0, 1]);
  for (const { t } of present) for (const [name, row] of Object.entries(t.signals)) if (name !== "U" && row.credible !== undefined) assert.equal(row.credible, false, `${name}: not credible against the null windows`);
  for (const { t } of plain) for (const [name, row] of Object.entries(t.signals)) if (name !== "U" && row.null) assert.equal(row.null.blindShare, 1, `${name}: every random window holds something at least as strong`);
  for (const { t } of plain) for (const name of ["G", "H", "W", "M"]) assert.equal(t.signals[name].rank.exact === null || t.signals[name].rank.exact > 50, true, "no signal returns a target's own cells in its top 50 on the development cases");
  const context = cases.find((run) => run.scenario === "gd02-context");
  assert.equal(context.union.keptOnlyByContext, context.lists.K.findings, "the whole context block is kept only by context");
  assert.ok(context.union.size > cases.find((run) => run.case === "gd02" && !run.scenario).union.size, "the protected block is added to the list");
  const second = context.targets.find((t) => t.signals?.K?.rank.overlap === 1);
  assert.equal(second.signals.K.found, false, "the context block keeps the region of a target as a short fragment, which is not the target");
  const planted = read("exp14-planted");
  assert.equal(planted.windows, 60);
  const hidden = (cls) => planted.aggregate[`${cls}:hidden`];
  for (const cls of ["cross", "adjacent"]) { assert.ok(hidden(cls).W.recall50 >= 0.5 && hidden(cls).U.recall50 >= 0.5, `${cls}: discovered by the product-like reading and by the union`); assert.ok(hidden(cls).G.recall50 < 0.5 && hidden(cls).H.recall50 < 0.5 && hidden(cls).M.recall50 < 0.5); }
  for (const cls of ["parallel", "distant"]) for (const name of ["G", "H", "W", "M", "K", "U"]) assert.ok(hidden(cls)[name].recall50 < 0.5, `${cls}/${name}: not discovered`);
  for (const name of ["G", "W", "M", "K"]) assert.equal(planted.aggregate["distant:hidden"][name].recall150, 0, `${name}: no word placed far from the axis is brought up, even within 150 findings`);
  assert.ok(planted.aggregate["distant:hidden"].H.recall150 <= 0.1, "language alone is at chance level for a far word");
  for (const cls of ["cross", "adjacent", "parallel", "distant"]) assert.equal(planted.aggregate[`${cls}:given`].K.recall50, 1, "the context signal finds what it is given");
  assert.equal(planted.aggregate["cross:hidden"].G.recallExact50, 0, "the geometry list returns lines, never the word itself");
  assert.ok(planted.aggregate["cross:hidden"].U.medianCoverage < 0.35, "the union covers a minority of the window");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { DIRECTIONS, cellOf, directionOf, fullTiles, inRegion, isMatrixContiguous, occurrenceCells, regionAroundAnchor, regionAroundPositions, renderRegion, skipGroups, skipValue, tileGrid, tileOf } from "../lib/geometry.mjs";
import { deriveElsLineGeometry } from "../../../src/lib/research/els2029VectorGeometry.js";
import { CROSSING_DIRECTION_COUNT, anchorSql, dictionaryCountSql, dictionaryMembershipSql, expectedCrossingSql, occurrencesSql, regionLettersSql, scanBatchSql, sharedLetterClass, windowedOccurrencesSql } from "../lib/queries.mjs";
import { classifyCrossings, joinAdjacentFindings, lineAngle, markupFor, normalizeFindings } from "../lib/findings.mjs";
import { CHANCE_LOCAL_MODEL_ID, CHANCE_MODEL_ID, compareToChance, describeChanceModel, expectedCrossings, poissonUpperTail, regionLetterCounts } from "../lib/chance.mjs";
import { compareStatistic, compareToTiles, describeMethod, mergeTileVectors, targetIndexOf } from "../lib/controls.mjs";
import { buildCrossingPacket, buildGroupingPacket, validateGrouping } from "../lib/grouping.mjs";
import { baseLetters, buildMarkup, letterGridFromRows, renderMarkupHtml, verifyFindingsAgainstLetters } from "../lib/markup.mjs";
import { buildCrossingReport, buildRunReport, evaluateWords, lengthRangeOfOffsets, verifyBatch } from "../lib/report.mjs";
import { createHash } from "node:crypto";
import { summarizeWindowedSearch } from "../lib/exhaustive.mjs";
import { CRAWL_BARS, checkedLines, continuationsOf, crawlSql, describeCrawlMethod, groupSeedsByLine, parseCrawlLines, parseVerifyLines, poissonBinomialUpperTail, summarizeCrawl, verifyExtensionsSql } from "../lib/crawl.mjs";

const LIB = fileURLToPath(new URL("../lib/", import.meta.url));
const W = 100;
const TOTAL = 3000; // 30 full rows
const region = regionAroundAnchor({ anchorStart: 1550, anchorSkip: 100, anchorDir: 1, anchorLength: 5, width: W, totalLetters: TOTAL, rows: 10, cols: 20 });

test("geometry: the eight matrix directions are exactly the engine skips 1, W-1, W, W+1 in both directions", () => {
  assert.equal(DIRECTIONS.length, 8);
  assert.deepEqual(skipGroups(W), { cd: [99, 100, 101], diag: [99, 101], row: [1] });
  const seen = new Set(DIRECTIONS.map((d) => d.id));
  assert.equal(seen.size, 8);
  assert.equal(directionOf(100, 1, W).id, "col_down");
  assert.equal(directionOf(100, -1, W).id, "col_up");
  assert.equal(directionOf(101, 1, W).id, "diag_down_fwd");
  assert.equal(directionOf(99, -1, W).id, "diag_up_fwd");
  assert.equal(directionOf(1, -1, W).id, "row_back");
  assert.equal(directionOf(7, 1, W), null, "an arbitrary skip is not a matrix-contiguous direction");
  assert.deepEqual(cellOf(250, W), { row: 2, col: 50 });
  assert.deepEqual(occurrenceCells(250, 100, 1, 3, W).map((c) => [c.row, c.col]), [[2, 50], [3, 50], [4, 50]]);
  assert.deepEqual(occurrenceCells(250, 101, -1, 3, W).map((c) => [c.row, c.col]), [[2, 50], [1, 49], [0, 48]]);
});

test("geometry: wrap-around across a row boundary is never matrix-contiguous", () => {
  assert.equal(isMatrixContiguous({ start: 297, skip: 1, dir: 1, length: 4 }, W), false, "columns 97..100 wraps to the next row");
  assert.equal(isMatrixContiguous({ start: 296, skip: 1, dir: 1, length: 4 }, W), true, "columns 96..99 fit exactly");
  assert.equal(isMatrixContiguous({ start: 298, skip: 101, dir: 1, length: 3 }, W), false, "diagonal leaves the right edge");
  assert.equal(isMatrixContiguous({ start: 205, skip: 99, dir: 1, length: 3 }, W), true);
  assert.equal(isMatrixContiguous({ start: 201, skip: 99, dir: 1, length: 3 }, W), false, "diagonal leaves the left edge");
});

test("geometry: agrees with the existing vector-geometry owner (els2029VectorGeometry) on the eight steps, the cells and the wrap rule", () => {
  for (const width of [100, 4545]) {
    for (const direction of DIRECTIONS) {
      const skip = skipValue(direction.skip, width);
      const length = 6;
      // the test builds the letter positions itself (test-side arithmetic) and lets the existing owner decompose them
      const positionsAt = (start) => Array.from({ length }, (_, k) => start + direction.dir * skip * k);
      const interior = 20 * width + Math.floor(width / 2);
      const line = deriveElsLineGeometry({ positions: positionsAt(interior), dir: direction.dir }, width);
      assert.deepEqual(line.rawStep, [direction.dRow, direction.dCol], `${direction.id}@${width}: same step as the owner module`);
      assert.deepEqual(line.coordinates.map((p) => [p.row, p.col]), occurrenceCells(interior, skip, direction.dir, length, width).map((c) => [c.row, c.col]), `${direction.id}@${width}: same cells`);
      // wrap rule: my guard is true exactly when the owner's unwrapped column stays inside [0, width-1]
      for (const col of [0, 1, 2, 5, 6, width - 7, width - 6, width - 5, width - 2, width - 1]) {
        const start = 20 * width + col;
        const owner = deriveElsLineGeometry({ positions: positionsAt(start), dir: direction.dir }, width);
        const staysInside = owner.coordinates.every((p) => p.unwrappedCol >= 0 && p.unwrappedCol <= width - 1);
        assert.equal(isMatrixContiguous({ start, skip, dir: direction.dir, length }, width), staysInside, `${direction.id}@${width} col ${col}`);
      }
    }
  }
});

test("geometry: region is centred on the anchor and clamped; tiles tile the matrix and the target is tile (0,0)", () => {
  assert.deepEqual([region.rows, region.cols], [10, 20]);
  assert.ok(region.r0 >= 0 && region.r1 <= 29 && region.c0 >= 0 && region.c0 + region.cw <= W);
  assert.deepEqual(tileOf({ row: region.r0, col: region.c0 }, region), { rb: 0, cb: 0 });
  assert.deepEqual(tileOf({ row: region.r0 - 1, col: region.c0 + region.cols }, region), { rb: -1, cb: 1 });
  const tiles = fullTiles(region, TOTAL);
  const grid = tileGrid(region, TOTAL);
  assert.equal(tiles.length, grid.count);
  assert.equal(grid.count, (grid.rbMax - grid.rbMin + 1) * (grid.cbMax - grid.cbMin + 1));
  assert.ok(tiles.some((t) => t.rb === 0 && t.cb === 0));
  assert.equal(inRegion({ row: region.r0, col: region.c0 }, region), true);
  assert.equal(inRegion({ row: region.r1 + 1, col: region.c0 }, region), false);
  const lines = renderRegion((i) => String.fromCharCode(1488 + (i % 22)), region);
  assert.equal(lines.length, 10);
  assert.equal(lines[0].length, 20);
});

test("queries: read-only, canonical engine only, validated inputs, one engine call per word per direction group", () => {
  const sql = scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { minLen: 4, maxLen: 8, offset: 20, limit: 50 }, directions: "both" });
  assert.match(sql, /^set local statement_timeout = '55000ms';\nwith dict as/);
  assert.equal((sql.match(/els_search_geometry_core_v1/g) || []).length, 1, "a single call site; all occurrences come from the engine");
  assert.match(sql, /\('cd', array\[99,100,101\]\), \('row', array\[1\]\)/);
  assert.match(sql, /order by length\(w\) desc, w offset 20 limit 50/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  // the comparison to other regions is a separate option: off by default (no tile bookkeeping), on adds tile counts but never another engine call
  assert.equal(/tile_vectors|tiles as|agg as/.test(sql), false, "controls are off by default");
  const withControls = scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { minLen: 4, maxLen: 8, offset: 20, limit: 50 }, directions: "both", controls: true });
  assert.match(withControls, /tile_vectors/);
  assert.equal((withControls.match(/els_search_geometry_core_v1/g) || []).length, 1);
  assert.doesNotMatch(withControls, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { minLen: 4, maxLen: 8, offset: 0, limit: 5 }, controls: "yes" }), TypeError);
  assert.equal(scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { minLen: 4, maxLen: 8, offset: 0, limit: 5 }, directions: "cd" }).includes("array[1]"), false);
  assert.throws(() => anchorSql({ term: "x'; drop table t; --", skip: 100 }), /Hebrew/);
  assert.throws(() => anchorSql({ term: "שלום", skip: 2 }), RangeError);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { minLen: 4, maxLen: 8, offset: 0, limit: 5 }, directions: "diagonal" }), RangeError);
  assert.match(dictionaryCountSql({ minLen: 5, maxLen: 9 }), /\[א-ת\]\{5,9\}/);
  assert.match(regionLettersSql(region), /\(idx - 1\) \/ 100/, "stream idx is 1-based, engine positions 0-based");
});

test("no example-specific code and no ELS arithmetic: the library names no anchor/target word and never walks the stream", () => {
  for (const name of readdirSync(LIB)) {
    const source = readFileSync(join(LIB, name), "utf8").replace(/\/\/.*$/gm, "");
    for (const word of ["קולומביה", "ספינת", "יכלאש", "נפל", "משיח", "טבת", "עשירי", "שאול", "דטראמפ", "טראמפ"]) assert.equal(source.includes(word), false, `${name} mentions ${word}`);
    assert.doesNotMatch(source, /for \(let skip|skip \+=|search_page_v1\b.*loop|torah_stream.*(a\.ch|b\.ch)/, `${name}: no occurrence generation`);
  }
  const queries = readFileSync(join(LIB, "queries.mjs"), "utf8");
  const streamRefs = queries.split("\n").filter((line) => /torah_stream/.test(line) && !/^\s*\/\//.test(line));
  assert.equal(streamRefs.length, 4, "the stream relation is read only for its length, for display letters and (chance baseline) for letter frequencies");
  assert.equal(streamRefs.filter((line) => /select count\(\*\)::int as total_letters|string_agg\(ch|count\(\*\)::float8/.test(line)).length, 4);
});

const row = (w, skip, dir, s, grp = "cd") => ({ w, len: [...w].length, grp, skip, dir, s, e: s + dir * skip * ([...w].length - 1) });

test("findings: labelled from engine rows, palindromes de-duplicated, non-matrix directions dropped, plain-text rows separated", () => {
  const rows = [
    row("שלום", 100, 1, region.r0 * W + region.c0 + 3),
    row("אבא", 100, 1, (region.r0 + 1) * W + region.c0 + 5),
    row("אבא", 100, -1, (region.r0 + 3) * W + region.c0 + 5),
    row("דבר", 7, 1, region.r0 * W + region.c0),
    row("ויאמר", 1, 1, (region.r0 + 4) * W + region.c0 + 2, "row"),
  ];
  const findings = normalizeFindings({ rows, width: W, region, matrixHits: { "שלום|cd": 2, "אבא|cd": 3 } });
  assert.deepEqual(findings.map((f) => f.word), ["ויאמר", "שלום", "אבא"].sort((a, b) => b.length - a.length || a.localeCompare(b, "he")));
  assert.equal(findings.filter((f) => f.word === "אבא").length, 1);
  assert.equal(findings.find((f) => f.word === "ויאמר").kind, "plain_text_row");
  assert.equal(findings.find((f) => f.word === "שלום").kind, "els_in_matrix");
  assert.equal(findings.find((f) => f.word === "שלום").matrixHits, 2);
  assert.equal(findings.some((f) => f.word === "דבר"), false);
  const shalom = findings.find((f) => f.word === "שלום");
  assert.deepEqual(shalom.local, { fromRow: 0, fromCol: 3, toRow: 3, toCol: 3 });
  assert.equal(shalom.cells.length, 4);
  assert.deepEqual(markupFor([shalom])[0].cells, shalom.cells);
  assert.match(shalom.id, /^F\d{3}$/);
});

test("findings: adjacent words on the same line join into phrases; different directions or gaps never join", () => {
  const base = region.r0 * W + region.c0;
  const rows = [
    row("יכל", 100, 1, base + 10), // rows 0..2 col 10
    row("אש", 100, 1, base + 10 + 300), // rows 3..4 col 10 : directly after
    row("אורי", 100, 1, base + 12 + 600), // not adjacent (other column)
    row("הר", 101, 1, base + 20 + 300), // other direction
  ];
  const findings = normalizeFindings({ rows, width: W, region });
  const phrases = joinAdjacentFindings(findings, { width: W });
  assert.equal(phrases.length, 1);
  assert.equal(phrases[0].text, "יכל אש");
  assert.deepEqual(phrases[0].components.length, 2);
  assert.equal(phrases[0].direction, "col_down");
});

test("controls: empirical p, rank and BH exactly as declared; labels withheld without a valid family", () => {
  const grid = { rbMin: -1, rbMax: 0, cbMin: -1, cbMax: 1, count: 6 };
  assert.equal(targetIndexOf(grid), 4); // (0-(-1))*3 + (0-(-1)) = 4
  const merged = { cd: [0, 1, 2, 0, 5, 1], cd5: [0, 0, 0, 0, 1, 0], row: [0, 0, 0, 0, 0, 0], row5: [0, 0, 0, 0, 0, 0] };
  const one = compareStatistic({ merged, grid, name: "cd" });
  assert.deepEqual([one.observed, one.controls, one.extreme, one.rank], [5, 5, 0, 1]);
  assert.equal(one.pValue, 1 / 6);
  const tie = compareStatistic({ merged: { ...merged, cd: [5, 1, 2, 0, 5, 1] }, grid, name: "cd" });
  assert.equal(tie.extreme, 1, "ties count as at least as extreme");
  assert.equal(tie.pValue, 2 / 6);
  const result = compareToTiles({ merged, grid, statistics: ["cd", "cd5"] });
  assert.equal(result.nullModelId, "els_tile_translation_v1");
  assert.equal(result.results.length, 2);
  assert.ok(result.results.every((r) => r.qValue != null && r.qValue >= r.pValue - 1e-12));
  assert.ok(result.results.every((r) => r.label === "NOT_SIGNIFICANT_UNDER_DECLARED_NULL" || r.label === "FDR_SURVIVES_DECLARED_NULL"));
  assert.throws(() => compareStatistic({ merged: { cd: [1, 2] }, grid, name: "cd" }), RangeError);
  assert.throws(() => mergeTileVectors([{ cd: [1], cd5: [1], row: [1], row5: [1] }, { cd: [1, 2], cd5: [1, 2], row: [1, 2], row5: [1, 2] }], 2), RangeError);
  assert.deepEqual(mergeTileVectors([{ cd: [1, 2], cd5: [0, 0], row: [0, 1], row5: [0, 0] }, { cd: [3, 4], cd5: [1, 1], row: [0, 0], row5: [0, 0] }], 2).cd, [4, 6]);
  // sparse, string and missing encodings decode to the same dense vector
  assert.deepEqual(mergeTileVectors([{ cd: { 1: 2, 3: 1 }, cd5: "0,0,0,1", row: null }, { cd: [1, 0, 0, 0], cd5: { 3: 2 }, row5: { 0: 5 } }], 4).cd, [1, 2, 0, 1]);
  assert.deepEqual(mergeTileVectors([{ cd5: { 3: 2 }, row5: { 0: 5 } }], 4).row5, [5, 0, 0, 0]);
  assert.throws(() => mergeTileVectors([{ cd: { 9: 1 } }], 4), RangeError);
  assert.throws(() => mergeTileVectors([{ cd: { 1: -1 } }], 4), RangeError);
  const method = describeMethod();
  for (const part of ["Empirical p = (extreme + 1) / (n + 1)", "not independent", "post-hoc", "Benjamini-Hochberg", "never 'is it meaningful'"]) assert.ok(method.includes(part), part);
});

const findingsForGrouping = () => normalizeFindings({
  rows: [row("שלום", 100, 1, region.r0 * W + region.c0 + 3), row("אש", 101, 1, (region.r0 + 1) * W + region.c0 + 8), row("ספר", 99, 1, (region.r0 + 2) * W + region.c0 + 9)],
  width: W, region, matrixHits: {},
});

test("grouping packet: ids, engine words and positions only; evaluation words stay out; validator rejects anything invented", () => {
  const findings = findingsForGrouping();
  const packet = buildGroupingPacket({ topic: "נושא", region, findings });
  for (const finding of findings) assert.ok(packet.text.includes(`${finding.id} | ${finding.word} |`));
  assert.match(packet.text, /אסור להוסיף|לא רשאי להוסיף/);
  assert.equal(packet.text.includes("evaluation"), false);
  const [a, b, c] = findings.map((f) => f.id);
  const good = { groups: [{ label: "קבוצה", finding_ids: [a, b], why: "קשורים לנושא" }], ungrouped_ids: [c] };
  assert.deepEqual(validateGrouping(good, { findings }).ok, true);
  assert.deepEqual(validateGrouping(JSON.stringify(good), { findings }).ok, true);
  assert.equal(validateGrouping("```json\n" + JSON.stringify(good) + "\n```", { findings }).ok, true);
  const bad = (answer) => validateGrouping(answer, { findings });
  assert.match(bad({ groups: [{ label: "x", finding_ids: ["F999"], why: "y" }] }).errors.join(), /unknown finding id/);
  assert.match(bad({ groups: [{ label: "x", finding_ids: [a], why: "y" }, { label: "z", finding_ids: [a], why: "y" }] }).errors.join(), /used twice/);
  assert.match(bad({ groups: [{ label: "x", finding_ids: [a], why: "כתוב 17 אותיות" }] }).errors.join(), /digits/);
  assert.match(bad({ groups: [{ label: "x", finding_ids: [a], why: "המילה «מלאך» מופיעה" }] }).errors.join(), /not an engine finding/);
  assert.match(bad({ groups: [{ label: "x", finding_ids: [a], why: "y", cells: [[1, 2]] }] }).errors.join(), /unexpected key cells/);
  assert.match(bad({ groups: [{ label: "x", finding_ids: [a], why: "y" }], extra: 1 }).errors.join(), /unexpected top-level/);
  assert.match(bad({ groups: [{ label: "x", finding_ids: [a], why: "y" }], ungrouped_ids: [a] }).errors.join(), /also grouped/);
  assert.equal(bad("not json").ok, false);
  assert.equal(bad([]).ok, false);
});

const vec = (n, fill) => new Array(n).fill(fill);
const batch = ({ offset, limit, directions = "both", words, target = [], dbMs = 1000, grid, targetValue = 0, otherValue = 0 }) => {
  const n = grid.count; const targetIndex = targetIndexOf(grid);
  const vectors = Object.fromEntries(["cd", "cd5", "row", "row5"].map((name) => { const v = vec(n, otherValue); v[targetIndex] = targetValue; return [name, v]; }));
  const sums = Object.fromEntries(Object.entries(vectors).map(([name, v]) => [name, v.reduce((a, b) => a + b, 0)]));
  return { descriptor: { offset, limit, directions }, result: { words_in_batch: words, calls: directions === "both" ? words * 2 : words, engine_statuses: { OK: 1, EXECUTED_EMPTY: words * 2 - 1 }, truncated_calls: [], target_total: target.length, target, word_matrix_hits: {}, tile_vectors: vectors, tile_sums: sums, tile_grid: {}, db_ms: dbMs } };
};

test("report: time, counts, omitted words and lengths, integrity checks, evaluation without hints", () => {
  const grid = tileGrid(region, TOTAL);
  const state = { width: W, region, tileGrid: grid, dictionaryTotals: [{ len: 5, words: 120 }, { len: 6, words: 60 }, { len: 7, words: 20 }] };
  assert.deepEqual(lengthRangeOfOffsets(state.dictionaryTotals, 70, 60), [{ len: 6, words: 10, of: 60 }, { len: 5, words: 50, of: 120 }].sort((a, b) => b.len - a.len).reverse().sort((a, b) => b.len - a.len));
  const batches = [
    batch({ offset: 0, limit: 80, words: 80, grid, targetValue: 4, otherValue: 1, target: [row("שלום", 100, 1, region.r0 * W + region.c0 + 3)], dbMs: 4000 }),
    batch({ offset: 80, limit: 60, words: 60, directions: "cd", grid, targetValue: 1, otherValue: 0, dbMs: 2500 }),
  ];
  const plain = buildRunReport({ example: "t", state, batches, evaluationWords: ["שלום", "אורנג"] });
  assert.deepEqual([plain.control.requested, plain.integrity.length], [false, 0], "no comparison unless asked");
  assert.equal(plain.findings.total, 1);
  const report = buildRunReport({ example: "t", state, batches, evaluationWords: ["שלום", "אורנג"], controls: true });
  assert.equal(report.control.requested, true);
  assert.equal(report.time.dbMsTotal, 6500);
  assert.equal(report.time.batches, 2);
  assert.equal(report.scan.dictionaryWords, 200);
  assert.deepEqual(report.scan.wordsScanned, { columnsAndDiagonals: 140, rows: 80 });
  assert.deepEqual(report.scan.omitted, { columnsAndDiagonals: 60, rows: 120, reason: report.scan.omitted.reason });
  assert.match(report.scan.omitted.reason, /budget/);
  assert.equal(report.findings.total, 1);
  assert.equal(report.integrity.length, 0);
  assert.equal(report.control.results[0].observed, 5);
  assert.deepEqual(report.evaluation.map((e) => [e.word, e.status]), [["שלום", "FOUND_BY_DICTIONARY_SCAN"], ["אורנג", "NOT_FULLY_SCANNED_LENGTH"]]);
  // a copy error in a tile vector is detected
  const broken = structuredClone(batches[0]); broken.result.tile_vectors.cd[0] += 1;
  assert.match(verifyBatch(broken, grid.count)[0], /copy error/);
  // output truncation of the target list is reported, not hidden
  const truncated = structuredClone(batches[0]); truncated.result.target_total = 999;
  assert.equal(buildRunReport({ example: "t", state, batches: [truncated] }).scan.targetOutputTruncated.reported, 999);
  // controls requested on batches that were run without them is refused, never silently skipped
  const bare = structuredClone(batches[0]); delete bare.result.tile_vectors; delete bare.result.tile_sums;
  assert.throws(() => buildRunReport({ example: "t", state, batches: [bare], controls: true }), /without controls/);
  assert.equal(buildRunReport({ example: "t", state, batches: [bare] }).findings.total, 1);
  // evaluation with grouping shows which group a word landed in
  const findings = report.findingsList; const grouping = { groups: [{ label: "G", finding_ids: [findings[0].id] }] };
  assert.equal(evaluateWords({ words: ["שלום"], findings, phrases: [], grouping })[0].foundAsFinding[0].group, "G");
});

test("evaluation separates 'not fully scanned', 'not in the dictionary' and 'not found'; membership SQL is read-only and validated", () => {
  const out = evaluateWords({ words: ["שלוש", "נפל", "ארבעה", "חמישה"], findings: [], phrases: [], scannedLengths: [4, 5], membership: ["נפל", "ארבעה", "חמישה"] });
  assert.deepEqual(out.map((e) => e.status), ["NOT_IN_DICTIONARY", "NOT_FULLY_SCANNED_LENGTH", "NOT_FOUND_IN_SCANNED_DICTIONARY", "NOT_FOUND_IN_SCANNED_DICTIONARY"]);
  assert.match(dictionaryMembershipSql(["אש", "נפל"]), /^select phrase from public\.gematria_words where phrase in \('אש', 'נפל'\)/);
  assert.throws(() => dictionaryMembershipSql(["x'); drop table t; --"]), TypeError);
  assert.throws(() => dictionaryMembershipSql([]), RangeError);
});

test("markup: engine cells spell the word on a hand-placed letter grid; any disagreement and any missing row is reported", () => {
  const grid = Array.from({ length: region.rows }, () => Array(region.cols).fill("ת"));
  // Placed by hand (independent of occurrenceCells): [localRow, localCol] per letter, in reading order of the occurrence.
  const place = (word, cells) => cells.forEach(([r, c], i) => { grid[r][c] = [...baseLetters(word)][i]; });
  const at = (r, c) => (region.r0 + r) * W + region.c0 + c; // engine start index of local cell (r, c)
  place("שלום", [[0, 3], [1, 3], [2, 3], [3, 3]]); // column down: skip W, dir +1
  place("אור", [[5, 5], [6, 6], [7, 7]]); // down & with the reading direction: skip W+1, dir +1
  place("ספר", [[9, 9], [8, 10], [7, 11]]); // up & with the reading direction: skip W-1, dir -1
  place("הרי", [[9, 15], [8, 14], [7, 13]]); // up & against the reading direction: skip W+1, dir -1
  place("מלאך", [[2, 17], [3, 16], [4, 15], [5, 14]]); // down & against the reading direction: skip W-1, dir +1; final letter in the dictionary form
  place("ויאמר", [[9, 2], [9, 3], [9, 4], [9, 5], [9, 6]]); // plain text row
  const rows = [
    row("שלום", 100, 1, at(0, 3)),
    row("אור", 101, 1, at(5, 5)),
    row("ספר", 99, -1, at(9, 9)),
    row("הרי", 101, -1, at(9, 15)),
    row("מלאך", 99, 1, at(2, 17)),
    row("ויאמר", 1, 1, at(9, 2), "row"),
  ];
  const findings = normalizeFindings({ rows, width: W, region });
  assert.equal(findings.length, 6);
  assert.deepEqual(new Set(findings.map((f) => f.direction)), new Set(["col_down", "diag_down_fwd", "diag_up_fwd", "diag_up_back", "diag_down_back", "row_fwd"]));
  assert.deepEqual(verifyFindingsAgainstLetters({ findings, grid }), { checked: 6, matched: 6, mismatches: [] });
  assert.equal(baseLetters("מלאך"), "מלאכ");

  const tampered = grid.map((line) => [...line]);
  const target = findings.find((f) => f.word === "ספר");
  tampered[target.cells[1].row][target.cells[1].col] = "ק";
  const verdict = verifyFindingsAgainstLetters({ findings, grid: tampered });
  assert.equal(verdict.matched, 5);
  assert.deepEqual(verdict.mismatches.map((m) => [m.id, m.word, m.read]), [[target.id, "ספר", "סקר"]]);

  const lettersRows = grid.map((line, i) => ({ r: region.r0 + i, letters: line.join("") }));
  assert.deepEqual(letterGridFromRows(lettersRows, region), grid);
  assert.throws(() => letterGridFromRows(lettersRows.slice(1), region), /missing/);
  assert.throws(() => letterGridFromRows([{ ...lettersRows[0], letters: "אב" }, ...lettersRows.slice(1)], region), /expected/);
});

test("markup: marks carry local cells with letters; the page is static, right-to-left, escapes everything and names plain-text rows as not ELS", () => {
  const grid = Array.from({ length: region.rows }, () => Array(region.cols).fill("ת"));
  const base = region.r0 * W + region.c0;
  const findings = normalizeFindings({ rows: [row("שלום", 100, 1, base + 3), row("ויאמר", 1, 1, base + 4 * W + 2, "row")], width: W, region });
  findings.forEach((finding) => finding.cells.forEach((cell, i) => { grid[cell.row][cell.col] = [...finding.word][i]; }));
  const markup = buildMarkup({ findings, grid, region, topic: "נושא" });
  assert.deepEqual(markup.region, { rows: region.rows, cols: region.cols, width: W, firstMatrixRow: region.r0, firstMatrixCol: region.c0 });
  assert.equal(markup.rows.length, region.rows);
  assert.deepEqual(markup.marks.find((m) => m.word === "שלום").cells.map((c) => c.letter).join(""), "שלום");
  const html = renderMarkupHtml(markup);
  assert.match(html, /<html lang="he" dir="rtl">/);
  assert.equal(/<script|https?:|<link|<img|<iframe/i.test(html), false, "static page: no scripts and no external resources");
  assert.match(html, /טקסט רגיל, לא ELS/);
  for (const mark of markup.marks) assert.ok(html.includes(mark.id));
  const hostile = { ...markup, topic: "<b>x</b>", marks: [{ ...markup.marks[0], id: "F<1>", word: "<script>alert(1)</script>" }], phrases: [] };
  const escaped = renderMarkupHtml(hostile);
  assert.equal(/<script/i.test(escaped), false);
  assert.ok(escaped.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(escaped.includes("&lt;b&gt;x&lt;/b&gt;"));
});

test("probe: explicit words go through the same single engine call; validated, capped, never combined with the comparison option", () => {
  const dictionary = { words: ["שלום", "אש", "יכלאש"] };
  const sql = scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary, directions: "both" });
  assert.match(sql, /unnest\(array\['שלום', 'אש', 'יכלאש'\]::text\[\]\)/);
  assert.equal((sql.match(/els_search_geometry_core_v1/g) || []).length, 1);
  assert.equal(sql.includes("gematria_words"), false, "a probe asks for the given words, it does not read the dictionary");
  assert.match(sql, /from ok group by w, grp/, "matrix-wide counts are reported for every probe word, in or out of the region");
  assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { words: ["x'); drop table t; --"] } }), TypeError);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { words: [] } }), RangeError);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { words: Array.from({ length: 51 }, (_, i) => "אב" + "גדהוזחטיכלמנסעפצקרשת"[i % 20]) } }), RangeError);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary, controls: true }), /not to probes/);
});

test("evaluation with a probe: present-but-missed, plain-text-only, absent and truncated are told apart; matrix-wide counts split ELS from text rows", () => {
  const at = (r, c) => (region.r0 + r) * W + region.c0 + c;
  const probeRows = [
    row("אורן", 100, 1, at(1, 4)), // ELS in the region, not reported by the scan
    row("שלום", 100, 1, at(0, 3)), // ELS in the region AND reported by the scan
    row("ויאמר", 1, 1, at(5, 2), "row"), // plain text only
  ];
  const groundTruth = {
    findings: normalizeFindings({ rows: probeRows, width: W, region, matrixHits: {}, idPrefix: "Q" }),
    matrixHits: { "אורן|cd": 9, "שלום|cd": 4, "שלום|row": 2 },
    truncatedWords: ["חתול"],
  };
  const scanFindings = normalizeFindings({ rows: [row("שלום", 100, 1, at(0, 3))], width: W, region });
  const out = evaluateWords({ words: ["שלום", "אורן", "ויאמר", "ירח", "חתול"], findings: scanFindings, phrases: [], scannedLengths: [4, 5], membership: ["שלום", "ירח"], groundTruth });
  const verdicts = Object.fromEntries(out.map((entry) => [entry.word, entry.verdict]));
  assert.deepEqual(verdicts, {
    "שלום": "FOUND_BY_DICTIONARY_SCAN",
    "אורן": "PRESENT_IN_REGION_BUT_MISSED:NOT_IN_DICTIONARY",
    "ויאמר": "ONLY_AS_PLAIN_TEXT_IN_REGION",
    "ירח": "ABSENT_FROM_REGION",
    "חתול": "NOT_SEEN_BUT_ENGINE_OUTPUT_TRUNCATED",
  });
  assert.deepEqual(out.find((entry) => entry.word === "שלום").groundTruth.matrixWide, { els: 4, plainTextRows: 2 });
  assert.equal(out.find((entry) => entry.word === "אורן").groundTruth.positions.length, 1);
  assert.equal(groundTruth.findings.every((finding) => /^Q\d{3}$/.test(finding.id)), true);
  assert.equal(evaluateWords({ words: ["שלום"], findings: scanFindings, phrases: [] })[0].verdict, undefined, "no probe, no verdict: the scan status stays as it was");
  // a word can be missed for two reasons at once: both are kept, the first stays the status
  const both = evaluateWords({ words: ["יכל"], findings: [], phrases: [], scannedLengths: [5], membership: [], groundTruth: { findings: normalizeFindings({ rows: [row("יכל", 100, 1, at(2, 2))], width: W, region, idPrefix: "Q" }), matrixHits: {}, truncatedWords: [] } })[0];
  assert.deepEqual([both.status, both.missedBecause, both.verdict], ["NOT_FULLY_SCANNED_LENGTH", ["NOT_FULLY_SCANNED_LENGTH", "NOT_IN_DICTIONARY"], "PRESENT_IN_REGION_BUT_MISSED:NOT_FULLY_SCANNED_LENGTH+NOT_IN_DICTIONARY"]);
});

test("markup with a probe layer: probe findings keep their own ids and style and are verified against the letters like the scan findings", () => {
  const grid = Array.from({ length: region.rows }, () => Array(region.cols).fill("ת"));
  const base = region.r0 * W + region.c0;
  const scan = normalizeFindings({ rows: [row("שלום", 100, 1, base + 3)], width: W, region });
  const probe = normalizeFindings({ rows: [row("אור", 101, 1, base + 6 * W + 8)], width: W, region, idPrefix: "Q" });
  [...scan, ...probe].forEach((finding) => finding.cells.forEach((cell, i) => { grid[cell.row][cell.col] = [...baseLetters(finding.word)][i]; })); // the stream stores base letters
  assert.equal(verifyFindingsAgainstLetters({ findings: [...scan, ...probe], grid }).matched, 2);
  const markup = buildMarkup({ findings: scan, grid, region, topic: "נושא", probeFindings: probe });
  assert.deepEqual(markup.marks.map((mark) => [mark.id, mark.source]), [["F001", "scan"], ["Q001", "probe"]]);
  const html = renderMarkupHtml(markup);
  assert.match(html, /בדיקת אמת/);
  assert.match(html, /inset 0 0 0 2px/, "probe cells are outlined, scan cells are filled");
  assert.equal(/<script|https?:/i.test(html), false);
});

// ---------------------------------------------------------------- crossing mode
// Anchor "שלום" as a column of a width-100 matrix: col 50, rows 10..13 (stream positions 1050, 1150, 1250, 1350).
const ANCHOR = { term: "שלום", positions: [1050, 1150, 1250, 1350], skip: 100, dir: 1 };
const crossingRegion = regionAroundPositions({ positions: ANCHOR.positions, width: W, totalLetters: TOTAL, margin: 4 });

test("crossing geometry: the neighbourhood is the anchor's box grown by the margin and clamped; positions outside the matrix are refused", () => {
  assert.deepEqual(crossingRegion, { width: 100, r0: 6, r1: 17, c0: 46, cw: 9, rows: 12, cols: 9 });
  const corner = regionAroundPositions({ positions: [3, 103, 203], width: W, totalLetters: TOTAL, margin: 8 });
  assert.deepEqual([corner.r0, corner.c0], [0, 0], "clamped at the top-left corner");
  assert.throws(() => regionAroundPositions({ positions: [10, 3000 + 5], width: W, totalLetters: TOTAL, margin: 2 }), /outside/);
  assert.throws(() => regionAroundPositions({ positions: [10], width: W, totalLetters: TOTAL, margin: 2 }), RangeError);
});

test("crossing queries: the target set is 'shares a stream position with the anchor', the engine is asked about the neighbourhood only, still one call site", () => {
  const sql = scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region: crossingRegion, dictionary: { minLen: 2, maxLen: 9, offset: 0, limit: 50, sharesLettersWith: "שלום" }, directions: "diag", crossing: { positions: ANCHOR.positions } });
  assert.match(sql, /any\(array\[1050,1150,1250,1350\]\)/);
  assert.match(sql, /\('diag', array\[99,101\]\)/);
  assert.match(sql, new RegExp(`els_search_geometry_core_v1\\(d\\.w, 'torah', 100, ${crossingRegion.r0}, ${crossingRegion.r1}, ${crossingRegion.c0}, ${crossingRegion.cw}, g\\.skips`));
  assert.equal((sql.match(/els_search_geometry_core_v1/g) || []).length, 1);
  assert.match(sql, /'region_total'/);
  assert.match(sql, /'word_region_hits'/);
  assert.doesNotMatch(sql, /word_matrix_hits|tile_vectors|tiles as/);
  assert.match(sql, /phrase ~ '\[שלומםמ\]'|phrase ~ '\[[א-ת]+\]'/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  const dictionary = { minLen: 2, maxLen: 9, offset: 0, limit: 5 };
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region: crossingRegion, dictionary, directions: "diag", crossing: { positions: ANCHOR.positions }, controls: true }), /crossing scans/);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region: crossingRegion, dictionary, directions: "diag", crossing: { positions: [1, "x"] } }), RangeError);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region: crossingRegion, dictionary, directions: "diag", crossing: { positions: Array.from({ length: 41 }, (_, i) => i) } }), RangeError);
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region: crossingRegion, dictionary: { words: ["שלום"] }, crossing: { positions: ANCHOR.positions } }), /probe/);
  // lossless pruning: the class holds base AND final spellings of the anchor's letters
  assert.equal(sharedLetterClass("מלאך"), "םמלאךכ");
  assert.match(dictionaryCountSql({ minLen: 2, maxLen: 9, sharesLettersWith: "דטראמפ" }), /and phrase ~ '\[דטראםמףפ\]'/);
  assert.match(occurrencesSql({ term: "דטראמפ" }), /els_search_page_core_v1\('דטראמפ','torah',2,NULL,100\)/);
  assert.throws(() => occurrencesSql({ term: "x'); drop table t; --" }), TypeError);
});

test("crossing findings: only occurrences that share a stream position are kept; relation, angle and the shared letter come from positions", () => {
  const at = (r, c) => r * W + c;
  const rows = [
    row("אור", 101, 1, at(11, 49)), // diagonal; its 2nd letter (ו) sits on the anchor's 3rd letter
    row("אלה", 1, 1, at(11, 49), "row"), // plain-text row; its 2nd letter (ל) sits on the anchor's 2nd letter
    row("אבג", 101, 1, at(20, 10)), // elsewhere: shares nothing
    row("לום", 100, 1, at(11, 50)), // the anchor's own column: collinear overlap
  ];
  const findings = normalizeFindings({ rows, width: W, region: crossingRegion, idPrefix: "X" });
  assert.equal(findings.length, 4);
  const crossing = classifyCrossings({ findings, anchor: ANCHOR, width: W });
  assert.deepEqual(crossing.map((f) => f.word).sort(), ["אלה", "אור", "לום"].sort());
  const byWord = Object.fromEntries(crossing.map((f) => [f.word, f.crossing]));
  assert.deepEqual([byWord["אור"].relation, byWord["אור"].angle, byWord["אור"].shared.length], ["crosses", 45, 1]);
  assert.deepEqual([byWord["אור"].shared[0].anchorIndex, byWord["אור"].shared[0].wordIndex, byWord["אור"].shared[0].letter], [2, 1, "ו"]);
  assert.deepEqual([byWord["אלה"].relation, byWord["אלה"].angle], ["crosses", 90]);
  assert.deepEqual([byWord["לום"].relation, byWord["לום"].angle, byWord["לום"].shared.length], ["collinear_overlap", 0, 3]);
  assert.deepEqual(byWord["אור"].shared[0].at, { row: 12 - crossingRegion.r0, col: 50 - crossingRegion.c0 });
  assert.equal(lineAngle(DIRECTIONS[2], DIRECTIONS[3]), 0, "a column against itself reversed is parallel");
  assert.equal(lineAngle(DIRECTIONS[2], DIRECTIONS[0]), 90);
  assert.equal(lineAngle(DIRECTIONS[2], DIRECTIONS[4]), 45);
  assert.throws(() => classifyCrossings({ findings, anchor: { ...ANCHOR, skip: 7 }, width: W }), /matrix-contiguous/);
});

const crossingState = {
  mode: "crossing", term: ANCHOR.term, width: W, region: crossingRegion,
  anchor: { start: 1050, skip: 100, dir: 1, positions: ANCHOR.positions, occurrenceIndex: 0, occurrenceCount: 3 },
  dictionaryTotals: [{ len: 3, words: 10 }, { len: 2, words: 5 }],
};
const crossingBatch = ({ offset, words, target = [], directions = "diag", regionTotal = 0, dbMs = 1000 }) => ({ descriptor: { offset, limit: words, directions }, result: { words_in_batch: words, calls: words, engine_statuses: { OK: target.length, EXECUTED_EMPTY: words - target.length }, truncated_calls: [], target_total: target.length, target, word_region_hits: {}, region_total: regionTotal, db_ms: dbMs } });

test("crossing report: findings, counts by length / anchor letter / angle, coverage and omissions, integrity (a letter that disagrees with the anchor is caught)", () => {
  const at = (r, c) => r * W + c;
  const target = [row("אור", 101, 1, at(11, 49), "diag"), row("אב", 101, 1, at(9, 49), "diag")];
  target[1].e = target[1].s + 101; // keep the engine-style end consistent
  const report = buildCrossingReport({ state: crossingState, batches: [crossingBatch({ offset: 0, words: 10, target: [target[0]], regionTotal: 4 }), crossingBatch({ offset: 10, words: 3, target: [], regionTotal: 1 })] });
  assert.equal(report.mode, "crossing");
  assert.equal(report.time.dbMsTotal, 2000);
  assert.deepEqual(report.scan.wordsScanned, { diag: 13 });
  assert.deepEqual(report.scan.omitted.diag, 2, "15 words in the dictionary, 13 scanned");
  assert.equal(report.scan.regionOccurrences, 5);
  assert.deepEqual([report.crossing.total, report.crossing.byLength, report.crossing.byAngle], [1, { 3: 1 }, { 45: 1 }]);
  assert.deepEqual(report.crossing.byAnchorLetter.map((x) => [x.letter, x.count]), [["ש", 0], ["ל", 0], ["ו", 1], ["מ", 0]]);
  assert.deepEqual(report.integrity, []);
  assert.equal(report.chance.requested, false);
  // an engine row that does not share any position with the anchor is a disagreement between the SQL filter and the findings
  const stray = buildCrossingReport({ state: crossingState, batches: [crossingBatch({ offset: 0, words: 15, target: [row("אבג", 101, 1, at(20, 10))] })] });
  assert.match(stray.integrity.join(), /do not share any stream position/);
  // a word whose letter at the shared position differs from the anchor's letter is impossible if the engine is right: flagged
  const wrong = buildCrossingReport({ state: crossingState, batches: [crossingBatch({ offset: 0, words: 15, target: [row("אבר", 101, 1, at(11, 49))] })] });
  assert.match(wrong.integrity.join(), /different letters/);
});

test("chance baseline: Poisson tails, the per-word formula by hand, and the report section with its method", () => {
  assert.ok(Math.abs(poissonUpperTail(1, 1) - (1 - Math.exp(-1))) < 1e-12);
  assert.ok(Math.abs(poissonUpperTail(3, 2) - (1 - 5 * Math.exp(-2))) < 1e-12);
  assert.equal(poissonUpperTail(0, 5), 1);
  assert.equal(poissonUpperTail(2, 0), 0);
  assert.throws(() => poissonUpperTail(-1, 1), RangeError);
  // anchor "אב": the word "אבג" crosses at 'א' (needs ב and ג around it) or at 'ב' (needs א and ג): D x (p(ב)p(ג) + p(א)p(ג))
  const p = { א: 0.5, ב: 0.25, ג: 0.25 };
  assert.ok(Math.abs(expectedCrossings("אבג", "אב", p, 4) - 4 * (0.25 * 0.25 + 0.5 * 0.25)) < 1e-12);
  assert.equal(expectedCrossings("ג", "אב", p, 4), 0, "a word without any anchor letter can never cross");
  const expectation = { expected_total: 2, by_length: { 2: { words: 5, expected: 1.5 }, 3: { words: 10, expected: 0.5 } }, per_word: { אור: 0.01 } };
  const findings = [{ length: 3 }, { length: 3 }, { length: 2 }];
  const chance = compareToChance({ expectation, findings });
  assert.equal(chance.model, CHANCE_MODEL_ID);
  assert.deepEqual([chance.expectedTotal, chance.observedTotal, chance.observedOverExpected], [2, 3, 1.5]);
  assert.ok(Math.abs(chance.upperTail - poissonUpperTail(3, 2)) < 1e-12);
  assert.deepEqual(chance.byLength.map((x) => [x.len, x.expected, x.observed]), [[3, 0.5, 2], [2, 1.5, 1]]);
  for (const part of ["independent letters", "Poisson upper tails", "post-hoc", "No significance label"]) assert.ok(describeChanceModel().includes(part), part);
  assert.equal(CROSSING_DIRECTION_COUNT.diag, 4);
  const sql = expectedCrossingSql({ term: "שלום", dictionary: { minLen: 2, maxLen: 9, sharesLettersWith: "שלום" }, directionCount: 4, words: ["אור"] });
  assert.match(sql, /string_to_array\('שלומ', null\)/);
  assert.match(sql, /4 \* sum\(coalesce\(a\.m, 0\)/);
  assert.doesNotMatch(sql, /els_search|\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  assert.throws(() => expectedCrossingSql({ term: "שלום", dictionary: { minLen: 2, maxLen: 9 }, directionCount: 4, words: ["x'--"] }), TypeError);
  // the report carries the baseline when asked and attaches each word's expectation to its finding
  const at = (r, c) => r * W + c;
  const report = buildCrossingReport({ state: crossingState, batches: [crossingBatch({ offset: 0, words: 15, target: [row("אור", 101, 1, at(11, 49))] })], chance: { ...expectation, expected_total: 0.8, by_length: { 3: { words: 10, expected: 0.8 } } } });
  assert.equal(report.chance.observedTotal, 1);
  assert.equal(report.findingsList[0].chanceExpectation, 0.01);
});

test("chance formula agrees with the read-only SQL on the committed real run (36 words, same letter frequencies)", () => {
  const file = fileURLToPath(new URL("../results/trump/chance.json", import.meta.url));
  const real = JSON.parse(readFileSync(file, "utf8"))[0].expectation;
  assert.equal(Object.keys(real.per_word).length, 36);
  for (const [word, fromSql] of Object.entries(real.per_word)) {
    const fromJs = expectedCrossings(word, "דטראמפ", real.letter_freq, CROSSING_DIRECTION_COUNT.diag);
    assert.ok(Math.abs(fromJs - fromSql) / fromSql < 1e-4, `${word}: js ${fromJs} vs sql ${fromSql}`);
  }
  const lengths = Object.values(real.by_length).reduce((n, entry) => n + Number(entry.expected), 0);
  assert.ok(Math.abs(lengths - real.expected_total) < 1e-4);
});

test("crossing packet: the anchor's letters by index, what each finding crosses, the chance context; a model may name the anchor but nothing else", () => {
  const at = (r, c) => r * W + c;
  const base = normalizeFindings({ rows: [row("אור", 101, 1, at(11, 49)), row("אלה", 1, 1, at(11, 49), "row")], width: W, region: crossingRegion, idPrefix: "X" });
  const findings = classifyCrossings({ findings: base, anchor: ANCHOR, width: W }).map((finding) => ({ ...finding, chanceExpectation: 0.0123 }));
  const packet = buildCrossingPacket({ anchor: ANCHOR, region: crossingRegion, findings, chance: { expectedTotal: 3.5, observedTotal: 2 } });
  assert.match(packet.text, /1=ש 2=ל 3=ו 4=מ/);
  assert.match(packet.text, /צפויים בממוצע 3\.5 ממצאים חוצים; נמצאו 2/);
  for (const finding of findings) assert.ok(packet.text.includes(`${finding.id} | ${finding.word} |`));
  assert.match(packet.text, /אות הצופן 3 \(ו\) = אות 2 במילה/);
  assert.match(packet.text, /ציפיית מקרה 0\.012/);
  assert.match(packet.text, /\(טקסט\)/, "plain-text crossings are labelled as not ELS");
  const ids = findings.map((f) => f.id);
  const good = { groups: [{ label: "קשר לשם הצופן", finding_ids: [ids[0]], why: "המילה חוצה את «שלום» באות אחת" }], ungrouped_ids: [ids[1]] };
  assert.equal(validateGrouping(good, { findings, extraWords: [ANCHOR.term] }).ok, true);
  assert.match(validateGrouping(good, { findings }).errors.join(), /not an engine finding/, "without the anchor name allowed, quoting it is refused");
  const forged = { groups: [{ label: "x", finding_ids: [ids[0]], why: "המילה «ספינה» מופיעה" }] };
  assert.match(validateGrouping(forged, { findings, extraWords: [ANCHOR.term] }).errors.join(), /not an engine finding/);
});

test("chance sensitivity: the same formula with the region's own letter frequencies (add-one smoothed), same formula agrees with its SQL on the committed run", () => {
  const counts = regionLetterCounts(crossingState.region ? [[..."שלומשלומא"], [..."ךם"]] : []);
  assert.equal(Object.keys(counts).length, 22);
  assert.deepEqual([counts["ש"], counts["מ"], counts["א"], counts["ך"]], [2, 2, 1, undefined], "final forms are not base letters and are not counted");
  const sql = expectedCrossingSql({ term: "שלום", dictionary: { minLen: 2, maxLen: 9 }, directionCount: 4, letterCounts: counts });
  assert.match(sql, /select \d+::float8 as total\),\nfreq as \(select ch, \(cnt \+ 1\)::float8/);
  assert.doesNotMatch(sql, /from public\.torah_stream/, "the sensitivity variant does not even read the stream");
  assert.throws(() => expectedCrossingSql({ term: "שלום", dictionary: { minLen: 2, maxLen: 9 }, directionCount: 4, letterCounts: { א: 1 } }), RangeError);
  assert.throws(() => expectedCrossingSql({ term: "שלום", dictionary: { minLen: 2, maxLen: 9 }, directionCount: 4, letterCounts: { ...counts, א: -1 } }), RangeError);
  const expectation = { expected_total: 2, by_length: { 3: { words: 10, expected: 2 } }, per_word: {} };
  const local = { expected_total: 4, by_length: { 3: { words: 10, expected: 4 } } };
  const chance = compareToChance({ expectation, findings: [{ length: 3 }, { length: 3 }, { length: 3 }], local });
  assert.equal(chance.sensitivity.model, CHANCE_LOCAL_MODEL_ID);
  assert.ok(Math.abs(chance.sensitivity.upperTail - poissonUpperTail(3, 4)) < 1e-12);
  assert.equal(compareToChance({ expectation, findings: [] }).sensitivity, null);
  // committed run: the smoothed local frequencies are the region's counts + 1 over (374 + 22), and the formula reproduces the SQL
  const file = fileURLToPath(new URL("../results/trump/chance-local.json", import.meta.url));
  const real = JSON.parse(readFileSync(file, "utf8"))[0].expectation;
  assert.equal(real.stream_letters, 396);
  for (const [word, fromSql] of Object.entries(real.per_word)) {
    const fromJs = expectedCrossings(word, "דטראמפ", real.letter_freq, 4);
    assert.ok(Math.abs(fromJs - fromSql) / fromSql < 1e-4, `${word}: js ${fromJs} vs sql ${fromSql}`);
  }
});

// ---------------------------------------------------------------- continuation crawler
test("crawler logic (JS twin of the SQL): word extensions and two-form phrases qualify, minimum total length, nearest-first letters, longest first", () => {
  const lexicon = new Set(["יכל", "אש", "באש", "ארץ", "אשר", "ויכל"]);
  // seed "אש" read in line order; letters beyond its start (nearest first): ל, כ, י ; beyond its end: ר, ץ
  const found = continuationsOf({ word: "אש", left: ["ל", "כ", "י"], right: ["ר", "ץ"], lexicon });
  assert.deepEqual(found.map((f) => [f.e, f.kind, f.parts.join("+")]), [
    ["יכלאשר", "phrase", "יכל+אשר"],
    ["יכלאש", "phrase", "יכל+אש"],
  ], "longest first (יכל+אשר beats יכל+אש); the 3-letter word extension אשר is below the default minimum total length of 4");
  assert.deepEqual([found[0].kl, found[0].kr, found[0].len], [3, 1, 6]);
  assert.deepEqual([found[1].kl, found[1].kr, found[1].len, found[1].kind], [3, 0, 5, "phrase"]);
  assert.ok(continuationsOf({ word: "אש", left: ["ל"], right: ["ר"], lexicon, minTotal: 3 }).some((f) => f.e === "אשר" && f.kind === "word"), "a one-letter extension that is a Torah form qualifies");
  assert.ok(!found.some((f) => f.e === "אש"), "the seed alone is not a continuation");
  assert.ok(!found.some((f) => f.len < 4), "below the minimum total length nothing qualifies");
  assert.deepEqual(continuationsOf({ word: "אש", left: ["ב"], right: [], lexicon, minTotal: 3 }).map((f) => [f.e, f.kind]), [["באש", "word"]]);
  assert.deepEqual(continuationsOf({ word: "אש", left: ["ל"], right: [], lexicon, minTotal: 3 }), []);
});

test("crawler criterion `collocations`: a two-part extension must be a pair of ADJACENT words the Torah itself contains", () => {
  const lexicon = new Set(["יכל", "אש", "הרה", "ונפל", "ימות"]);
  const bigrams = new Set(["הרה|ונפל", "ימות|ונפל"]);
  const left = ["ו", "ה", "ר", "ה"]; // nearest first: the string before נפל reads הרהו
  const byForms = continuationsOf({ word: "נפל", left, right: [], lexicon });
  assert.deepEqual(byForms.map((f) => [f.e, f.kind, f.parts.join("+")]), [["הרהונפל", "phrase", "הרה+ונפל"], ["ונפל", "word", "ונפל"]]);
  const strict = continuationsOf({ word: "נפל", left, right: [], lexicon, bigrams });
  assert.deepEqual(strict.map((f) => [f.e, f.kind, f.parts.join("+")]), [["הרהונפל", "phrase", "הרה+ונפל"], ["ונפל", "word", "ונפל"]], "הרה followed by ונפל is attested");
  assert.equal(continuationsOf({ word: "אש", left: ["ל", "כ", "י"], right: [], lexicon }).some((f) => f.e === "יכלאש"), true, "under `forms` two forms are enough");
  assert.equal(continuationsOf({ word: "אש", left: ["ל", "כ", "י"], right: [], lexicon, bigrams }).some((f) => f.e === "יכלאש"), false, "יכל and אש are both forms but are not adjacent anywhere in the attested pairs");
  const sql = crawlSql({ seeds: [{ word: "אש", start: 257853, skip: 4546, dir: 1 }], criterion: "collocations" });
  assert.match(sql, /bi as materialized \(\n  select distinct translate\(v\.words\[i\]/);
  assert.match(sql, /from pairs p join bi on bi\.a = p\.a and bi\.b = p\.b/);
  assert.doesNotMatch(sql, /join lex la/);
  assert.match(sql, /'criterion', 'collocations'/);
  assert.match(sql, /'attested_pairs', \(select count\(\*\) from bi\)/);
  assert.equal(/els_search|gematria_words/.test(sql), false);
  const plain = crawlSql({ seeds: [{ word: "אש", start: 257853, skip: 4546, dir: 1 }] });
  assert.match(plain, /'criterion', 'forms'/);
  assert.doesNotMatch(plain, /\bbi\b/);
  assert.throws(() => crawlSql({ seeds: [{ word: "אש", start: 1, skip: 2, dir: 1 }], criterion: "meaning" }), RangeError);
});

test("crawler SQL: read-only, reads only the Torah's own words and stream letters, no engine call, validated seeds, calibrated by shifted lines", () => {
  const seeds = [{ id: "S1", word: "אש", start: 257853, skip: 4546, dir: 1 }, { id: "S2", word: "נפל", start: 235138, skip: 4545, dir: -1 }];
  const sql = crawlSql({ seeds, reach: 4, shifts: 50 });
  assert.match(sql, /^set local statement_timeout = '50000ms';\nset local enable_nestloop = off;\nwith seed_rows\(id, w, s, skip, dir, len\) as \(values\n  \(1, 'אש', 257853, 4546, 1, 2\),\n  \(2, 'נפל', 235138, 4545, -1, 3\)\n\)/);
  assert.match(sql, /avail_l[\s\S]*avail_r/, "letters beyond the beginning or end of the text are unknown, never wrapped around");
  assert.match(sql, /case when j <= sd\.avail_l then/);
  assert.match(sql, /case when j <= sd\.avail_r then/);
  assert.match(sql, /from pairs p join lex la on la\.w = p\.a join lex lb on lb\.w = p\.b/, "phrase membership is an equality join, not a correlated IN");
  assert.match(sql, /from public\.tanach_verses v, lateral unnest\(v\.words\) x\(w\)\n  where v\.book_idx between 0 and 4/);
  assert.equal(/els_search|gematria_words/.test(sql), false, "no engine call and no registry: seeds come from the engine, the language from the text");
  assert.equal((sql.match(/public\.torah_stream/g) || []).length, 3, "stream: its length and the letters beyond the two ends");
  assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  assert.match(sql, /generate_series\(0, 50\) m/);
  assert.match(sql, /'lines', \(select jsonb_agg\(jsonb_build_object\('s', line, 'md5', md5\(line\)\) order by id\) from lines\)/);
  assert.match(sql, /concat_ws\('\|', ps\.id, ps\.w/, "one plain line per seed, no nested JSON to retype");
  assert.match(sql, /\(0, ''\), \(1, coalesce\(l1, '\?'\)\), \(2, coalesce\(l2, '\?'\) \|\| coalesce\(l1, '\?'\)\)/, "left letters are prepended farthest-first");
  assert.match(sql, /\(2, coalesce\(r1, '\?'\) \|\| coalesce\(r2, '\?'\)\)/, "right letters are appended nearest-first");
  assert.ok(sql.includes(`unnest(array[${CRAWL_BARS.join(", ")}])`));
  assert.throws(() => crawlSql({ seeds: [{ word: "x'; drop table t; --", start: 1, skip: 2, dir: 1 }] }), TypeError);
  assert.throws(() => crawlSql({ seeds: [{ word: "אש", start: 1, skip: 2, dir: 2 }] }), RangeError);
  assert.throws(() => crawlSql({ seeds: [{ word: "אש", start: -1, skip: 2, dir: 1 }] }), RangeError);
  assert.throws(() => crawlSql({ seeds: [] }), RangeError);
  assert.throws(() => crawlSql({ seeds, shifts: 5 }), RangeError);
  assert.throws(() => crawlSql({ seeds, reach: 9 }), RangeError);
  assert.equal(crawlSql({ seeds: [{ word: "מלאך", start: 5, skip: 7, dir: -1 }] }).includes("'מלאכ'"), true, "final letters are folded onto base letters like the stream");
});

const md5 = (text) => createHash("md5").update(text, "utf8").digest("hex");
const crawlLine = (id, word, t, p, left, right, nullGe, top) => { const line = [id, word, t, p, left, right, nullGe, top].join("|"); return { s: line, md5: md5(line) }; };

test("results travel as checksummed lines: a copy error is caught, lines parse back into the calibrated structure", () => {
  const ok = crawlLine(1, "אש", 5, "0.020000", "לכיבו", "רץאבג", "40,10,2,0,0,0", "יכלאש/3/0/5/p/יכל+אש;אשר/0/1/3/w/אשר");
  const parsed = parseCrawlLines([ok]);
  assert.deepEqual(parsed[0], { id: 1, word: "אש", t_obs: 5, p: 0.02, left: "לכיבו", right: "רץאבג", null_ge: { 4: 40, 5: 10, 6: 2, 7: 0, 8: 0, 9: 0 }, top: [{ e: "יכלאש", kl: 3, kr: 0, len: 5, kind: "phrase", parts: ["יכל", "אש"] }, { e: "אשר", kl: 0, kr: 1, len: 3, kind: "word", parts: ["אשר"] }] });
  assert.deepEqual(parseCrawlLines([crawlLine(2, "דל", "-", "1.000000", "אבגדה", "ויזחט", "30,8,1,0,0,0", "")])[0].top, []);
  assert.throws(() => checkedLines([{ s: ok.s.replace("לכיבו", "לכיבז"), md5: ok.md5 }]), /does not match its checksum/);
  assert.throws(() => checkedLines([{ s: ok.s, md5: ok.md5.replace(/^./, "0") }]), /does not match its checksum/);
  assert.throws(() => checkedLines("not lines"), TypeError);
  const verify = parseVerifyLines([{ s: "1|יכלאש|4546|1|244215", md5: md5("1|יכלאש|4546|1|244215") }, { s: "2|אש|truncated", md5: md5("2|אש|truncated") }]);
  assert.deepEqual(verify, { hits: [{ id: 1, term: "יכלאש", skip: 4546, dir: 1, start: 244215 }], truncated: [2] });
});

test("crawler verification goes through the one canonical engine call site and reports only the hit at the predicted position", () => {
  const verify = verifyExtensionsSql({ width: 4545, totalRows: 67, extensions: [{ term: "יכלאש", skip: 4546, dir: 1, start: 244215 }, { term: "הרהונפל", skip: 4545, dir: -1, start: 253318 }] });
  assert.equal((verify.match(/els_search_geometry_core_v1/g) || []).length, 1);
  assert.match(verify, /with ext\(id, term, skip, dir, start\) as \(values \(1, 'יכלאש', 4546, 1, 244215\), \(2, 'הרהונפל', 4545, -1, 253318\)\)/);
  assert.match(verify, /array\[e\.skip\]/);
  assert.match(verify, /where \(h->>'skip'\)::bigint = c\.skip and \(h->>'dir'\)::int = c\.dir and \(h->>'start'\)::bigint = c\.start/, "only the predicted occurrence is confirmed; others are not reported");
  assert.match(verify, /md5\(line\)/);
  assert.throws(() => verifyExtensionsSql({ width: 4545, totalRows: 67, extensions: [{ term: "x", skip: 1, dir: 1, start: 0 }] }), TypeError);
  assert.throws(() => verifyExtensionsSql({ width: 4545, totalRows: 67, extensions: [{ term: "יכלאש", skip: 4546, dir: 0, start: 1 }] }), RangeError);
  assert.throws(() => verifyExtensionsSql({ width: 4545, totalRows: 67, extensions: [{ term: "יכלאש", skip: 4546, dir: 1 }] }), RangeError);
  assert.throws(() => verifyExtensionsSql({ width: 4545, totalRows: 67, extensions: [] }), RangeError);
});

test("seeds that read the same letters are one line; the exact tail over lines is the Poisson-binomial distribution", () => {
  const word = (w, start, skip, dir) => ({ word: w, start, skip, dir });
  // C03 (יכלאש), C04 (יכל, same first letter) and C07 (אש at its end) are one progression and overlap; C05 is another residue; C06 another skip
  const seeds = [word("יכלאש", 244215, 4546, 1), word("יכל", 244215, 4546, 1), word("יכל", 253313, 4546, 1), word("אש", 257853, 4546, 1), word("נפל", 235138, 4545, -1)];
  const groups = groupSeedsByLine({ seeds, reach: 5 });
  assert.equal(groups[0], groups[1]);
  assert.equal(groups[0], groups[3], "the tail אש is on the same progression 3 steps later; its window (±5) overlaps");
  assert.notEqual(groups[0], groups[2], "a different residue modulo the skip is a different line");
  assert.notEqual(groups[0], groups[4]);
  assert.equal(new Set(groups).size, 3);
  // same progression, windows far apart in the stream (more than reach + length apart): two independent lines
  const far = groupSeedsByLine({ seeds: [word("אש", 100, 10, 1), word("אש", 100 + 10 * 30, 10, 1), word("אש", 100 + 10 * 3, 10, -1)], reach: 5 });
  assert.notEqual(far[0], far[1]);
  assert.equal(far[0], far[2], "the same letters read in the opposite direction are the same line");
  // seeds without geometry are never merged
  assert.equal(new Set(groupSeedsByLine({ seeds: [{ word: "אש" }, { word: "אש" }], reach: 5 })).size, 2);
  // Poisson-binomial: two fair coins
  assert.ok(Math.abs(poissonBinomialUpperTail([0.5, 0.5], 1) - 0.75) < 1e-12);
  assert.ok(Math.abs(poissonBinomialUpperTail([0.5, 0.5], 2) - 0.25) < 1e-12);
  assert.equal(poissonBinomialUpperTail([0.5, 0.5], 0), 1);
  assert.equal(poissonBinomialUpperTail([0.5, 0.5], 3), 0);
  assert.ok(Math.abs(poissonBinomialUpperTail([0.1, 0.2, 0.3], 2) - (0.1 * 0.2 * 0.7 + 0.1 * 0.8 * 0.3 + 0.9 * 0.2 * 0.3 + 0.1 * 0.2 * 0.3)) < 1e-12);
  assert.throws(() => poissonBinomialUpperTail([1.5], 1), RangeError);
});

test("the calibrated summary counts a line once, however many seeds sit on it", () => {
  const seeds = [
    { id: "A", word: "יכלאש", start: 244215, skip: 4546, dir: 1 },
    { id: "B", word: "יכל", start: 244215, skip: 4546, dir: 1 },
    { id: "C", word: "נפל", start: 235138, skip: 4545, dir: -1 },
  ];
  const crawl = {
    meta: { shifts: 100, reach: 5, min_total: 4, lexicon_forms: 17171 },
    lines: [
      crawlLine(1, "יכלאש", 7, "0.250000", "שפשלר", "מרויר", "70,70,70,25,9,1", "יכלאשמר/0/2/7/p/יכל+אשמר"),
      crawlLine(2, "יכל", 7, "0.310000", "שפשלר", "אשמרו", "90,85,64,31,8,0", "יכלאשמר/0/4/7/p/יכל+אשמר"),
      crawlLine(3, "נפל", 4, "0.850000", "אבגדה", "ויזחט", "85,80,57,26,7,0", "ונפל/1/0/4/w/ונפל"),
    ],
  };
  const summary = summarizeCrawl({ crawl, seeds });
  assert.equal(summary.seeds, 3);
  assert.equal(summary.distinctLines, 2);
  assert.deepEqual(summary.rows.map((row) => row.line === summary.rows[0].line), [true, true, false]);
  const seven = summary.byBar.find((entry) => entry.bar === 7);
  assert.deepEqual([seven.observedSeeds, seven.expectedSeeds], [2, 0.82], "per seed, A and B both reached 7 although they read the same letters");
  assert.deepEqual([seven.observedLines, seven.expectedLines], [1, 0.51], "A (the longer seed word) represents its line; C is the other line; only A reached 7");
  assert.ok(Math.abs(seven.tailLines - (1 - (1 - 26 / 101) * (1 - 27 / 101))) < 1e-4, "P(at least 1 of the 2 lines) with add-one smoothed shares (25+1)/101 and (26+1)/101");
  assert.equal(summary.unusualLines, 0);
  assert.equal(summary.unusualExpectedByChance, 0.1);
});

test("crawler verification summary is calibrated by the shifted lines", () => {
  const seeds = [{ id: "A", word: "אש" }, { id: "B", word: "נפל" }, { id: "C", word: "דל" }];
  const crawl = {
    meta: { shifts: 100, reach: 5, min_total: 4, lexicon_forms: 17171 },
    lines: [
      crawlLine(1, "אש", 5, "0.029703", "לכיבו", "רץאבג", "40,10,2,0,0,0", "יכלאש/3/0/5/p/יכל+אש"),
      crawlLine(2, "נפל", 4, "0.514851", "אבגדה", "ויזחט", "60,20,5,1,0,0", "ונפל/1/0/4/w/ונפל"),
      crawlLine(3, "דל", "-", "1.000000", "אבגדה", "ויזחט", "30,8,1,0,0,0", ""),
    ],
  };
  const summary = summarizeCrawl({ crawl, seeds });
  assert.deepEqual(summary.byBar.map((b) => [b.bar, b.observedSeeds, b.expectedSeeds]), [[4, 2, 1.3], [5, 1, 0.38], [6, 0, 0.08], [7, 0, 0.01], [8, 0, 0], [9, 0, 0]]);
  assert.deepEqual(summary.unusual.map((row) => row.id), ["A"], "only the seed whose continuation beats 97 of 100 shifted lines is flagged at alpha 0.05");
  assert.equal(summary.rows[2].t, null);
  assert.equal(summary.lexiconForms, 17171);
  assert.throws(() => summarizeCrawl({ crawl, seeds: [{ id: "A", word: "אש" }, { id: "B", word: "אחר" }, { id: "C", word: "דל" }] }), /different seed list/);
  for (const part of ["learned from the Torah itself", "moved by fixed pseudo-random offsets", "re-confirmed by the canonical engine", "vocabulary coverage is not meaning"]) assert.ok(describeCrawlMethod().includes(part) || describeCrawlMethod().toLowerCase().includes(part.toLowerCase()), part);
});

// ---------------------------------------------------------------- exhaustive windows + committed results
test("windowed exhaustive search: one canonical page call per window, validated integers, bounded statement, coverage is checked not assumed", () => {
  const sql = windowedOccurrencesSql({ term: "באשאטמין", skipMin: 2, skipMax: 3001 });
  assert.equal((sql.match(/els_search_page_core_v1/g) || []).length, 1, "one call site; one call per window");
  assert.match(sql, /generate_series\(2, 3001, 300\) g/);
  assert.match(sql, /least\(g \+ 299, 3001\) as hi/);
  assert.match(sql, /'באשאטמין', 'torah', w\.lo, w\.hi, 100\)/);
  assert.doesNotMatch(sql, /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i);
  assert.equal(sql.includes("torah_stream"), false);
  assert.throws(() => windowedOccurrencesSql({ term: "באשאטמין", skipMin: 2, skipMax: 43543 }), /split the skip range/);
  assert.throws(() => windowedOccurrencesSql({ term: "x'; drop table t; --", skipMin: 2, skipMax: 100 }), TypeError);
  assert.throws(() => windowedOccurrencesSql({ term: "שלום", skipMin: 1, skipMax: 100 }), RangeError);
  const part = (range, windows, statuses, hits = [], incomplete = []) => ({ range, windows, statuses, hits, incomplete, db_ms: 1000 });
  const ok = summarizeWindowedSearch({ term: "t", skipMin: 2, skipMax: 20, parts: [part("11-20", 1, { EXECUTED_EMPTY: 1 }), part("2-10", 2, { OK: 1, EXECUTED_EMPTY: 1 }, [{ skip: "5", dir: "-1", start: "50", end: "10" }])] });
  assert.deepEqual([ok.complete, ok.windows, ok.parts, ok.gaps.length, ok.hits], [true, 3, 2, 0, [{ skip: 5, dir: -1, start: 50, end: 10 }]]);
  assert.equal(summarizeWindowedSearch({ term: "t", skipMin: 2, skipMax: 20, parts: [part("2-10", 1, { EXECUTED_EMPTY: 1 })] }).complete, false, "range 11-20 was never searched");
  assert.deepEqual(summarizeWindowedSearch({ term: "t", skipMin: 2, skipMax: 20, parts: [part("2-8", 1, { EXECUTED_EMPTY: 1 }), part("11-20", 1, { EXECUTED_EMPTY: 1 })] }).gaps, [[9, 10]]);
  assert.equal(summarizeWindowedSearch({ term: "t", skipMin: 2, skipMax: 10, parts: [part("2-10", 1, { EXECUTED_EMPTY: 1 }, [], [{ lo: 2, hi: 10 }])] }).complete, false, "an incomplete window makes the whole search incomplete");
  assert.equal(summarizeWindowedSearch({ term: "t", skipMin: 2, skipMax: 10, parts: [part("2-10", 2, { EXECUTED_EMPTY: 1 })] }).complete, false, "a window without a status is not complete");
});

test("committed crawl results: every line passes its checksum, every extended string was re-confirmed by the engine, the exhaustive search is complete", () => {
  const read = (path) => JSON.parse(readFileSync(fileURLToPath(new URL(`../results/${path}`, import.meta.url)), "utf8"));
  const unwrapped = (value) => { const first = Array.isArray(value) ? value[0] : value; return first.crawl ?? first.verify ?? first.out ?? first; };
  for (const [dir, expectedSeeds, expectedLines] of [["trump", 37, 11], ["columbia", 10, 8]]) {
    for (const file of ["crawl.json", "crawl-collocations.json"]) {
      const crawl = unwrapped(read(`${dir}/${file}`));
      assert.equal(parseCrawlLines(crawl.lines).length, expectedSeeds, `${dir}/${file}`);
      assert.equal(Number(crawl.meta.shifts), 300);
    }
    const verify = read(`${dir}/verify-report.json`);
    assert.equal(verify.confirmed, verify.planned, `${dir}: every extended string is a real occurrence at the predicted skip, direction and start`);
    assert.ok(verify.planned > 0 && verify.details.every((d) => d.confirmedByEngine && !d.engineTruncated));
    assert.equal(read(`${dir}/crawl-report.json`).distinctLines, expectedLines);
    assert.equal(read(`${dir}/crawl-collocations-report.json`).criterion, "collocations");
  }
  const bash = read("bash-atmin/exhaustive-windows.json");
  assert.deepEqual([bash.complete, bash.gaps.length, bash.incomplete.length, bash.hits.length], [true, 0, 0, 1]);
  assert.deepEqual(bash.hits[0], { skip: 23423, dir: -1, start: 177767, end: 13806 });
  assert.equal(bash.hits[0].start + bash.hits[0].dir * bash.hits[0].skip * 7, bash.hits[0].end, "start + dir * skip * (length - 1) = end");
  const seeds = read("bash-atmin/crawl-seeds.json");
  assert.deepEqual([seeds[0].start, seeds[0].skip, seeds[0].dir], [bash.hits[0].start, bash.hits[0].skip, bash.hits[0].dir], "the crawl seed is the engine occurrence");
});

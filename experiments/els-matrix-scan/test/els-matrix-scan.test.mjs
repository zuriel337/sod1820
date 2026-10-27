import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { DIRECTIONS, cellOf, directionOf, fullTiles, inRegion, isMatrixContiguous, occurrenceCells, regionAroundAnchor, renderRegion, skipGroups, tileGrid, tileOf } from "../lib/geometry.mjs";
import { anchorSql, dictionaryCountSql, dictionaryMembershipSql, regionLettersSql, scanBatchSql } from "../lib/queries.mjs";
import { joinAdjacentFindings, markupFor, normalizeFindings } from "../lib/findings.mjs";
import { compareStatistic, compareToTiles, describeMethod, mergeTileVectors, targetIndexOf } from "../lib/controls.mjs";
import { buildGroupingPacket, validateGrouping } from "../lib/grouping.mjs";
import { baseLetters, buildMarkup, letterGridFromRows, renderMarkupHtml, verifyFindingsAgainstLetters } from "../lib/markup.mjs";
import { buildRunReport, evaluateWords, lengthRangeOfOffsets, verifyBatch } from "../lib/report.mjs";

const LIB = fileURLToPath(new URL("../lib/", import.meta.url));
const W = 100;
const TOTAL = 3000; // 30 full rows
const region = regionAroundAnchor({ anchorStart: 1550, anchorSkip: 100, anchorDir: 1, anchorLength: 5, width: W, totalLetters: TOTAL, rows: 10, cols: 20 });

test("geometry: the eight matrix directions are exactly the engine skips 1, W-1, W, W+1 in both directions", () => {
  assert.equal(DIRECTIONS.length, 8);
  assert.deepEqual(skipGroups(W), { cd: [99, 100, 101], row: [1] });
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
  assert.throws(() => scanBatchSql({ width: W, totalRows: 30, totalLetters: TOTAL, region, dictionary: { minLen: 4, maxLen: 8, offset: 0, limit: 5 }, directions: "diag" }), RangeError);
  assert.match(dictionaryCountSql({ minLen: 5, maxLen: 9 }), /\[א-ת\]\{5,9\}/);
  assert.match(regionLettersSql(region), /\(idx - 1\) \/ 100/, "stream idx is 1-based, engine positions 0-based");
});

test("no example-specific code and no ELS arithmetic: the library names no anchor/target word and never walks the stream", () => {
  for (const name of readdirSync(LIB)) {
    const source = readFileSync(join(LIB, name), "utf8").replace(/\/\/.*$/gm, "");
    for (const word of ["קולומביה", "ספינת", "יכלאש", "נפל", "משיח", "טבת", "עשירי", "שאול"]) assert.equal(source.includes(word), false, `${name} mentions ${word}`);
    assert.doesNotMatch(source, /for \(let skip|skip \+=|search_page_v1\b.*loop|torah_stream.*(a\.ch|b\.ch)/, `${name}: no occurrence generation`);
  }
  const queries = readFileSync(join(LIB, "queries.mjs"), "utf8");
  const streamRefs = queries.split("\n").filter((line) => /torah_stream/.test(line) && !/^\s*\/\//.test(line));
  assert.equal(streamRefs.length, 2, "the stream relation is read only for its length and for display letters");
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

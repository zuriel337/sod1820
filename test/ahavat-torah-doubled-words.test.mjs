import test from "node:test";
import assert from "node:assert/strict";
import { scanAhavatTorahDoubledWords } from "../scripts/research/ahavat-torah-doubled-words.mjs";

const scan = scanAhavatTorahDoubledWords();

test("canonical Torah corpus reproduces the author's endpoints but yields 90 raw doubled-word occurrences", () => {
  assert.equal(scan.source.torahVerseCount, 5846);
  assert.equal(scan.raw.count, 90);
  assert.deepEqual(
    [scan.raw.first.book, scan.raw.first.chapter, scan.raw.first.verse, scan.raw.first.word],
    ["בראשית", 1, 26, "הרמש"],
  );
  assert.deepEqual(
    [scan.raw.last.book, scan.raw.last.chapter, scan.raw.last.verse, scan.raw.last.word],
    ["דברים", 32, 39, "אני"],
  );
  assert.equal(scan.raw.derashOrdinal, 46);
});

test("excluding only lekh-lekha reproduces 89 and places derash-derash at the exact midpoint", () => {
  assert.equal(scan.excludingLekhLekha.count, 89);
  assert.equal(scan.excludingLekhLekha.derashOrdinal, 45);
  assert.deepEqual(
    [scan.exclusions.lekhLekha.book, scan.exclusions.lekhLekha.chapter, scan.exclusions.lekhLekha.verse],
    ["בראשית", 12, 1],
  );
});

test("applying both stated different-lexeme exclusions exposes the preserved 88/44 discrepancy", () => {
  assert.equal(scan.excludingBothStatedLexemeCases.count, 88);
  assert.equal(scan.excludingBothStatedLexemeCases.derashOrdinal, 44);
  assert.deepEqual(
    [scan.exclusions.shamSam.book, scan.exclusions.shamSam.chapter, scan.exclusions.shamSam.verse],
    ["שמות", 15, 25],
  );
});


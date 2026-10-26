import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_ALEPH_BOOKS, AHAVAT_BET_BOOKS, AHAVAT_LETTER_READINGS, ahavatLetterForm, ahavatAlephRows, ahavatLetterRows } from "../src/data/ahavatTorahLetters2029.js";

test("the printed letter sequence preserves finals, shin/sin and exact page boundaries", () => {
  assert.equal(AHAVAT_LETTER_FORMS.length, 28);
  assert.equal(new Set(AHAVAT_LETTER_FORMS.map(item => item.form)).size, 28);
  for (const [base, final] of [["כ", "ך"], ["מ", "ם"], ["נ", "ן"], ["פ", "ף"], ["צ", "ץ"], ["שׁ", "שׂ"]]) {
    assert.notEqual(ahavatLetterForm(base), ahavatLetterForm(final));
  }
  assert.deepEqual(ahavatLetterForm("ד").pages, [35, 36]);
  assert.deepEqual(ahavatLetterForm("ך").pages, [37]);
  assert.deepEqual(ahavatLetterForm("ם").pages, [38]);
  assert.deepEqual(ahavatLetterForm("שׂ").pages, [41]);
  for (const item of AHAVAT_LETTER_FORMS) assert.ok(item.pages.every(page => page >= 35 && page <= 41));
});

test("all 54 Aleph rows reproduce five cumulative printed checkpoints, not five independent totals", () => {
  assert.deepEqual(AHAVAT_ALEPH_BOOKS.map(book => book.cumulative), [7634, 12894, 16949, 22173, 27059]);
  assert.deepEqual(AHAVAT_ALEPH_BOOKS.map(book => book.count), [7634, 5260, 4055, 5224, 4886]);
  assert.equal(ahavatAlephRows().length, 54);
  let cumulative = 0;
  for (const book of AHAVAT_ALEPH_BOOKS) {
    const sum = book.rows.reduce((total, row) => total + row.count, 0);
    assert.equal(sum, book.count, book.title);
    cumulative += sum;
    assert.equal(cumulative, book.cumulative, book.title);
    assert.ok(book.rows.every(row => row.printed && row.page === 35 && Number.isSafeInteger(row.count)));
  }
});

test("letter search filters by book and parasha while retaining the printed numeral and PDF page", () => {
  assert.equal(ahavatAlephRows("shemot").length, 11);
  assert.deepEqual(ahavatAlephRows("all", "וַיַּקְהֵל").map(row => [row.parasha, row.count, row.printed, row.page]), [["ויקהל", 485, "תפ״ה", 35]]);
  assert.equal(ahavatAlephRows("bereshit", "ויקהל").length, 0);
});

test("Bet closes all five source checkpoints and switching letters cannot reuse Aleph rows", () => {
  assert.deepEqual(AHAVAT_BET_BOOKS.map(book => book.cumulative), [4332, 7437, 9845, 13393, 16345]);
  assert.deepEqual(AHAVAT_BET_BOOKS.map(book => book.count), [4332, 3105, 2408, 3548, 2952]);
  assert.equal(Object.values(AHAVAT_LETTER_READINGS).flatMap(books => books.flatMap(book => book.rows)).length, 108);
  for (const books of Object.values(AHAVAT_LETTER_READINGS)) {
    let total = 0;
    assert.equal(new Set(books.flatMap(book => book.rows.map(row => row.parasha))).size, 54);
    for (const book of books) {
      const sum = book.rows.reduce((value, row) => value + row.count, 0);
      assert.equal(sum, book.count);
      total += sum;
      assert.equal(total, book.cumulative);
    }
  }
  assert.equal(ahavatLetterRows("ב", "shemot", "שט״ו")[0].count, 315);
  assert.equal(ahavatLetterRows("א", "shemot", "שט״ו").length, 0);
  assert.deepEqual(ahavatLetterRows("ך"), []);
});

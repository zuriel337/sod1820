import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_ALEPH_BOOKS, ahavatLetterForm, ahavatAlephRows } from "../src/data/ahavatTorahLetters2029.js";

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

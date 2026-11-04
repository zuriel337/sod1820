import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatLetterUnitId, ahavatReaderUnit } from "../src/data/ahavatTorahReaderUnits2029.js";
import { ahavatFilterParashaLetters, ahavatParashaLetterRows, ahavatParashaLettersCsv } from "../src/components/books2029/ahavatLetterJourney2029.js";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const parashot = AHAVAT_LETTER_READINGS["א"].flatMap(book => book.rows.map(row => row.parasha));
test("54 atlases transpose all 1512 source rows by strict reference, retaining 28 printed forms and 24 null cells", () => {
  let count = 0, missing = 0;
  for (const parasha of parashot) {
    const rows = ahavatParashaLetterRows(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, parasha);
    assert.deepEqual(rows.map(entry => entry.source.form), AHAVAT_LETTER_FORMS.map(source => source.form));
    assert.equal(rows.length, 28);
    for (const entry of rows) {
      const book = AHAVAT_LETTER_READINGS[entry.source.form].find(book => book.id === entry.bookId);
      assert.equal(entry.source, AHAVAT_LETTER_FORMS.find(source => source.form === entry.source.form));
      assert.equal(entry.row, book.rows.find(row => row.parasha === parasha));
      assert.equal(entry.book, book.title);
      assert.equal(ahavatReaderUnit(ahavatLetterUnitId(entry.source.form, entry.bookId, parasha)).page, entry.row.page);
      if (entry.row.count === null) missing++;
      count++;
    }
  }
  assert.equal(count, 1512); assert.equal(missing, 24);
  assert.deepEqual(ahavatParashaLetterRows(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, "unknown"), []);
});
test("filtering is a presentation-only subset with no rank, arithmetic or final-form merging", () => {
  const rows = ahavatParashaLetterRows(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, "צו");
  assert.equal(ahavatFilterParashaLetters(rows, " "), rows);
  assert.deepEqual(ahavatFilterParashaLetters(rows, "כף").map(entry => entry.source.form), ["כ", "ך"]);
  assert.equal(ahavatFilterParashaLetters(rows, "סופית").length, 5);
  assert.deepEqual(ahavatFilterParashaLetters(rows, "שׁ").map(entry => entry.source.form), ["שׁ"]);
  assert.deepEqual(ahavatFilterParashaLetters(rows, "שׂ").map(entry => entry.source.form), ["שׂ"]);
  assert.deepEqual(ahavatFilterParashaLetters(rows, "not a form"), []);
});
test("all CSV records retain exact printed/decimal values and source unit/page, never summing or balancing", () => {
  for (const parasha of parashot) {
    const rows = ahavatParashaLetterRows(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, parasha);
    const csv = ahavatParashaLettersCsv(rows, "https://example.invalid/source.pdf");
    assert.ok(csv.startsWith("\uFEFF"));
    const lines = csv.slice(1).trimEnd().split("\r\n");
    assert.equal(lines.length, 29);
    rows.forEach(({ source, bookId, row }, index) => {
      const fields = lines[index + 1].slice(1, -1).split('","').map(value => value.replaceAll('""', '"'));
      assert.equal(fields[1], source.form); assert.equal(fields[5], row.printed);
      assert.equal(fields[6], row.count === null ? "" : String(row.count));
      assert.equal(fields[7], String(row.page));
      assert.equal(fields[8], `https://example.invalid/source.pdf#page=${row.page}&view=FitH`);
      assert.equal(fields[9], ahavatLetterUnitId(source.form, bookId, parasha));
    });
  }
});
test("focused repeated selection retains the canonical row and source while classic/count behavior remains guarded", () => {
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(page, /const retained = !countMode && preserveSelectionPosition && nextBook === bookId/);
  assert.match(page, /onLetter=\{\(next, openSource\) => select\(next, bookId, !openSource\)\}/);
  assert.doesNotMatch(page, /preserveSelectionPosition && nextForm !== form/);
});
test("atlas is explicit DOM depth inside the same reader, URL-backed and free of a GPU/store/verification authority", () => {
  const atlas = read("src/components/books2029/AhavatParashaLetterAtlas2029.jsx");
  assert.match(atlas, /open \? <>/); assert.match(atlas, /letterAtlasQuery/); assert.match(atlas, /URL\.revokeObjectURL/);
  assert.match(atlas, /ahavatParashaLettersCsv\(rows,/); // Export is intentionally independent of screen filtering.
  assert.match(atlas, /row\.count === null/);
  assert.doesNotMatch(atlas, /מאומת במנוע|fetch\(|localStorage|createContext|Canvas|webgl|three|data-reader-unit|\.sort\(|\.reduce\(/);
  const parasha = read("src/components/books2029/AhavatLetterParasha2029.jsx");
  assert.match(parasha, /ownsSourceAnchor && selected \? <AhavatParashaLetterAtlas2029/);
});
test("an underspecified atlas fragment keeps source access without observing a nonexistent DOM root", () => {
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(page, /if \(observationRoot\) observer\.observe\(observationRoot,/);
});

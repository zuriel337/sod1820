import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, ahavatSourceCountRows } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatLetterUnitId, ahavatReaderUnit } from "../src/data/ahavatTorahReaderUnits2029.js";
import { ahavatRetainedLetterRow } from "../src/components/books2029/ahavatLetterJourney2029.js";
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("continuous selection reuses all 1512 actual row objects and their canonical PDF units", () => {
  let rows = 0, missing = 0;
  for (const { form } of AHAVAT_LETTER_FORMS) for (const book of AHAVAT_LETTER_READINGS[form]) for (const row of book.rows) {
    const selected = ahavatRetainedLetterRow(AHAVAT_LETTER_READINGS, form, row.parasha);
    assert.equal(selected.bookId, book.id); assert.equal(selected.row, row);
    const unit = ahavatReaderUnit(ahavatLetterUnitId(form, book.id, row.parasha));
    assert.equal(unit.page, row.page);
    if (row.count === null) { assert.equal(selected.row.count, null); missing++; }
    rows++;
  }
  assert.equal(rows, 1512); assert.equal(missing, 24);
  assert.equal(ahavatRetainedLetterRow(AHAVAT_LETTER_READINGS, "unknown", "צו"), null);
  assert.equal(ahavatRetainedLetterRow(AHAVAT_LETTER_READINGS, "א", "unknown"), null);
});
test("overview/detail links keep the canonical row identity and skip disabled focus targets", () => {
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(page, /querySelector\("button:not\(:disabled\)"\)/);
  assert.match(page, /"ahavat29-letter-overview"\]\.includes\(id\)/);
  const study = read("src/components/books2029/AhavatLetterStudy2029.jsx");
  assert.match(study, /ahavatReaderUnitDomId\(returnUnitId\)/);
  assert.match(study, /פרשת \{retainedParasha\} נשמרת בהחלפת אות/);
});
test("the Torah study order crosses all four existing book boundaries without invented rows", () => {
  const rows = ahavatSourceCountRows(AHAVAT_LETTER_READINGS["א"], "all", "");
  assert.equal(rows.length, 54);
  assert.equal(new Set(rows.map(row => row.parasha)).size, 54);
  for (const [before, after] of [["ויחי", "שמות"], ["פקודי", "ויקרא"], ["בחוקותי", "במדבר"], ["מסעי", "דברים"]]) {
    assert.equal(rows[rows.findIndex(row => row.parasha === before) + 1].parasha, after);
  }
  assert.equal(rows.at(-1).parasha, "וזאת הברכה");
});
test("Torah journey is a URL-backed focused-reader projection; classic/count behavior stays book-scoped", () => {
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(page, /!countMode && preserveSelectionPosition && \(journeyChoice !== "book" \|\| bookId === "all"\)/);
  assert.match(page, /journeyScope === "torah" \? "all" : bookId/);
  assert.match(page, /searchParams.set\("letterJourney", next\)/);
  assert.match(page, /ahavatRetainedLetterRow\(readings, nextForm, selectedBar\)/);
  assert.match(page, /targetRow\?\.page \?\?/);
});

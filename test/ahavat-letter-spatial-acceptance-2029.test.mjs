import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, ahavatLetterBars } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatLetterUnitId, ahavatReaderUnit, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

test("every letter, printed book and parasha has a stable source-bound return identity", () => {
  let rows = 0, unknown = 0;
  for (const form of AHAVAT_LETTER_FORMS) {
    assert.equal(ahavatReaderUnit(ahavatLetterUnitId(form.form)).page, form.pages[0]);
    for (const page of form.pages) assert.equal(ahavatReaderUnit(`letter-page:${form.form}:${page}`).page, page);
    for (const book of AHAVAT_LETTER_READINGS[form.form]) {
      assert.equal(ahavatReaderUnit(ahavatLetterUnitId(form.form, book.id)).page, book.page);
      for (const row of book.rows) {
        const id = ahavatLetterUnitId(form.form, book.id, row.parasha);
        const unit = ahavatReaderUnit(id);
        assert.equal(unit.page, row.page);
        assert.equal(unit.sectionId, "ahavat29-letters");
        const href = new URL(ahavatReaderUnitHref(id), "https://books.invalid");
        assert.equal(href.searchParams.get("letter"), form.form);
        assert.equal(href.searchParams.get("letterBook"), book.id);
        assert.equal(href.searchParams.get("letterRow"), row.parasha);
        assert.equal(href.searchParams.get("page"), String(row.page));
        if (row.count === null) { unknown++; assert.equal(ahavatLetterBars(form.form, book.id).some(bar => bar.id === row.parasha), false); }
        rows++;
      }
    }
  }
  assert.equal(rows, 1512); assert.equal(unknown, 24);
});

test("letter return keeps matching search and rejects wrong identities or hidden rows", () => {
  const id = ahavatLetterUnitId("ד", "vayikra", "צו");
  const good = new URL(ahavatReaderUnitHref(id, "/2029/control?letterQuery=צו"), "https://books.invalid");
  assert.equal(good.searchParams.get("letterQuery"), "צו");
  const conflict = new URL(ahavatReaderUnitHref(id, "/2029/control?letterQuery=לאנמצא"), "https://books.invalid");
  assert.equal(conflict.searchParams.get("letterQuery"), null);
  for (const bad of ["letter-form:א:wrong", "letter-book:א:unknown", "letter-row:א:bereshit:unknown", "letter-page:א:36", "letter-page:א:035", "letter-row:א:bereshit:בראשית:extra"]) assert.equal(ahavatReaderUnit(bad), null);
});

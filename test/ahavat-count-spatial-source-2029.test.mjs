import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_PARASHA_COUNT_FORMS, AHAVAT_PARASHA_COUNT_READINGS } from "../src/data/ahavatTorahParashaCounts2029.js";
import { ahavatSourceCountBars } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatCountUnitId, ahavatReaderUnit, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

test("both count types, every book and all 108 parasha rows resolve to their printed source", () => {
  let rows = 0, unknown = 0;
  for (const form of AHAVAT_PARASHA_COUNT_FORMS) {
    assert.equal(ahavatReaderUnit(ahavatCountUnitId(form.form)).page, form.pages[0]);
    for (const page of form.pages) assert.equal(ahavatReaderUnit(`count-page:${form.form}:${page}`).page, page);
    for (const book of AHAVAT_PARASHA_COUNT_READINGS[form.form]) {
      assert.equal(ahavatReaderUnit(ahavatCountUnitId(form.form, book.id)).page, book.page);
      for (const row of book.rows) {
        const id = ahavatCountUnitId(form.form, book.id, row.parasha);
        const unit = ahavatReaderUnit(id);
        assert.equal(unit.page, row.page);
        assert.equal(unit.datasetId, form.datasetId);
        assert.equal(unit.sectionId, "ahavat29-counts");
        const href = new URL(ahavatReaderUnitHref(id), "https://books.invalid");
        assert.equal(href.searchParams.get("countKind"), form.form);
        assert.equal(href.searchParams.get("countBook"), book.id);
        assert.equal(href.searchParams.get("countRow"), row.parasha);
        assert.equal(href.searchParams.get("page"), String(row.page));
        if (row.count === null) { unknown++; assert.equal(ahavatSourceCountBars(AHAVAT_PARASHA_COUNT_READINGS[form.form], book.id).some(bar => bar.id === row.parasha), false); }
        rows++;
      }
    }
  }
  assert.equal(rows, 108); assert.equal(unknown, 5);
  assert.equal(ahavatReaderUnit(ahavatCountUnitId("letters", "bereshit", "חיי שרה")).page, 41);
  assert.equal(ahavatReaderUnit(ahavatCountUnitId("letters", "bereshit", "תולדות")).page, 42);
});

test("count return preserves matching search, clears conflicting search and rejects invented locators", () => {
  const id = ahavatCountUnitId("letters", "bereshit", "תולדות");
  const good = new URL(ahavatReaderUnitHref(id, "/2029/control?countQuery=תולדות"), "https://books.invalid");
  assert.equal(good.searchParams.get("countQuery"), "תולדות");
  const conflict = new URL(ahavatReaderUnitHref(id, "/2029/control?countQuery=לאנמצא"), "https://books.invalid");
  assert.equal(conflict.searchParams.get("countQuery"), null);
  for (const bad of ["count-form:words:wrong", "count-book:words:unknown", "count-row:letters:bereshit:unknown", "count-page:words:42", "count-page:letters:042", "count-row:letters:bereshit:תולדות:extra"]) assert.equal(ahavatReaderUnit(bad), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_DS01_BOOKS, AHAVAT_DS01_TOTAL, ahavatDs01RowSum } from "../src/data/ahavatTorahDs01Source2029.js";

test("the five printed book subtotals close to the author's 1,820", () => {
  assert.deepEqual(AHAVAT_DS01_BOOKS.map(book => book.count), [165, 398, 311, 396, 550]);
  assert.equal(AHAVAT_DS01_BOOKS.reduce((sum, book) => sum + book.count, 0), AHAVAT_DS01_TOTAL);
});

test("only source-read parasha tables with matching subtotals are presented as closed", () => {
  assert.deepEqual(AHAVAT_DS01_BOOKS.filter(book => book.reading === "closed").map(book => book.id), ["bereshit", "vayikra", "devarim"]);
  for (const book of AHAVAT_DS01_BOOKS) {
    if (book.reading === "closed") assert.equal(ahavatDs01RowSum(book), book.count, book.id);
    else assert.equal(book.rows.length, 0, book.id);
  }
});

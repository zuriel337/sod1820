import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_DS01_BOOKS, AHAVAT_DS01_TOTAL, ahavatDs01RowSum } from "../src/data/ahavatTorahDs01Source2029.js";

test("the five printed book subtotals close to the author's 1,820", () => {
  assert.deepEqual(AHAVAT_DS01_BOOKS.map(book => book.count), [165, 398, 311, 396, 550]);
  assert.equal(AHAVAT_DS01_BOOKS.reduce((sum, book) => sum + book.count, 0), AHAVAT_DS01_TOTAL);
});

test("all 54 parasha lines read from PDF page 6 close to their printed book subtotals", () => {
  assert.ok(AHAVAT_DS01_BOOKS.every(book => book.reading === "closed"));
  assert.equal(AHAVAT_DS01_BOOKS.reduce((sum, book) => sum + book.rows.length, 0), 54);
  for (const book of AHAVAT_DS01_BOOKS) {
    assert.equal(ahavatDs01RowSum(book), book.count, book.id);
  }
  assert.deepEqual(AHAVAT_DS01_BOOKS[1].rows.filter(([name]) => ["משפטים", "פקודי"].includes(name)), [["משפטים", 16], ["פקודי", 26]]);
  assert.deepEqual(AHAVAT_DS01_BOOKS[3].rows[0], ["במדבר", 25]);
});

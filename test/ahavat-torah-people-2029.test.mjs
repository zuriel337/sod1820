import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AHAVAT_PEOPLE_BOOKS as books, ahavatPeopleRows, ahavatPeopleCsv, ahavatSourceRowsCsv } from "../src/data/ahavatTorahPeople2029.js";

test("DS-05 reads five separate book summaries, never claims full per-parasha transcription", () => {
  assert.deepEqual(books.map(book => book.id), ["bereshit", "shemot", "vayikra", "bamidbar", "devarim"]);
  const rows = ahavatPeopleRows();
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  for (const book of books) {
    assert.ok(Object.isFrozen(book.rows));
    assert.ok(book.rows.length);
    for (const row of book.rows) {
      assert.ok(book.pages.includes(row.page));
      assert.ok(row.page >= 26 && row.page <= 30);
      assert.equal(row.bookId, book.id);
      for (const metric of [row.times, row.words]) {
        assert.ok(metric.printed);
        assert.ok(metric.value === null || Number.isSafeInteger(metric.value));
      }
      assert.equal("engine_verified" in row, false);
      assert.equal("parasha" in row, false);
    }
  }
});
test("attribution metrics stay distinct and shared groups stay source-native", () => {
  const jacob = ahavatPeopleRows("bereshit", "יַעֲקֹב").find(row => row.entity === "יעקב");
  assert.equal(jacob.times.value, 83);
  assert.equal(jacob.words.value, 1197);
  assert.equal(jacob.page, 27);
  assert.equal(ahavatPeopleRows("bereshit", "רחל ולאה")[0].words.value, 34);
  assert.equal(ahavatPeopleRows("vayikra", "משה")[0].page, 29, "summary continues on next physical page");
  assert.equal(ahavatPeopleRows("bamidbar", "שרי בלק השניים")[0].page, 30);
  assert.equal(ahavatPeopleRows("shemot", "משה").find(row => row.entity === "משה").times.value, 84, "not DS-06's single-metric Moshe occurrences");
  assert.deepEqual(ahavatPeopleRows("not-a-book"), []);
});
test("research CSV keeps printed/decimal values, group identity and exact PDF boundary", () => {
  const csv = ahavatPeopleCsv("vayikra", "משה", "https://example.test/book.pdf");
  assert.equal(csv.trimEnd().split("\r\n").length, 2);
  assert.match(csv, /"סיכום חומש","ויקרא","משה","ו׳","6","שי״ט","319","29"/);
  assert.match(csv, /#page=29&view=FitH/);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.doesNotMatch(csv, /null|undefined|NaN/);
  assert.match(ahavatSourceRowsCsv(["עמודה"], [[null, 'א"ב']]), /"","א""ב"/);
});
test("reader reuses the adopted count geometry and keeps technical scope in source details", async () => {
  const component = await readFile(new URL("../src/components/books2029/AhavatTorahSourceTables2029.jsx", import.meta.url), "utf8");
  assert.match(component, /id="ahavat29-people"/);
  assert.match(component, /onPage\(page, "DS-05"\)/);
  assert.match(component, /mode="source-count"/);
  assert.match(component, /פרטי המקור והכיסוי/);
  assert.match(component, /טבלת כל פרשה וסיכום כלל התורה נשארים לקריאה במקור/);
});

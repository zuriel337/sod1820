import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AHAVAT_PEOPLE_BOOKS as books, ahavatPeopleRows, ahavatPeopleCsv, ahavatSourceRowsCsv } from "../src/data/ahavatTorahPeople2029.js";

test("DS-05 reads five separate book summaries, never claims full per-parasha transcription", () => {
  assert.deepEqual(books.map(book => book.id), ["bereshit", "shemot", "vayikra", "bamidbar", "devarim"]);
  const rows = ahavatPeopleRows();
  assert.equal(rows.length, 122);
  assert.equal(rows.flatMap(row => [row.times, row.words]).filter(cell => cell.value !== null).length, 243);
  assert.deepEqual(rows.filter(row => row.words.value === null).map(row => row.id), ["bereshit:50"]);
  assert.deepEqual(rows.find(row => row.id === "shemot:2").words, { printed: "ו׳ אלף תר״ח", value: 6608 });
  // Transcription consistency only: decode numeral glyphs, never count a corpus
  // or turn a source reading into a canonical engine result.
  const glyphs = Object.fromEntries([...["אבגדהוזחט", "יכלמנסעפצ", "קרשת"]].flatMap((group, index) => [...group].map((letter, ordinal) => [letter, (ordinal + 1) * 10 ** index])));
  const numeral = text => [...text.replace(/[\s׳״]/g, "")].reduce((sum, glyph) => sum + (glyphs[glyph] ?? NaN), 0);
  for (const row of rows) for (const cell of [row.times, row.words]) {
    if (cell.value === null || /אחד|אחת|מאות/.test(cell.printed)) continue;
    const parts = cell.printed.split("אלף");
    const decoded = parts.length === 2 ? (parts[0].trim() ? numeral(parts[0]) : 1) * 1000 + numeral(parts[1]) : numeral(cell.printed);
    assert.equal(decoded, cell.value, `${row.book}/${row.entity}: ${cell.printed}`);
  }
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
  assert.equal(ahavatPeopleRows("shemot", "יתרו")[0].words.value, 270);
  assert.equal(ahavatPeopleRows("bereshit", "תמר")[0].words.value, null);
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
  assert.match(ahavatPeopleCsv("bereshit", "תמר"), /"תמר","ה׳","5","\?","","27"/);
});
test("reader reuses the adopted count geometry and keeps technical scope in source details", async () => {
  const component = await readFile(new URL("../src/components/books2029/AhavatTorahSourceTables2029.jsx", import.meta.url), "utf8");
  assert.match(component, /id="ahavat29-people"/);
  assert.match(component, /onPage\(page, "DS-05", unitId\)/);
  assert.match(component, /mode="source-count"/);
  assert.match(component, /פרטי המקור והכיסוי/);
  assert.match(component, /טבלת כל פרשה וסיכום כלל התורה נשארים לקריאה במקור/);
});

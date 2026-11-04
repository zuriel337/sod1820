import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { AHAVAT_PARASHA_COUNT_FORMS as forms, AHAVAT_PARASHA_COUNT_READINGS as readings } from "../src/data/ahavatTorahParashaCounts2029.js";
import { ahavatSourceCountPage, ahavatSourceCountRows, ahavatSourceCountBars, ahavatSourceCountCsv, ahavatSourceCountBooks, ahavatLetterBalance } from "../src/data/ahavatTorahLetters2029.js";
import { AHAVAT_TORAH_DATASETS } from "../src/data/ahavatTorahSystem2029.js";

test("DS-03/04 extend the existing dataset identities with 108 source-native parasha positions", () => {
  assert.deepEqual(forms.map(form => form.datasetId), ["DS-03", "DS-04"]);
  const all = Object.values(readings).flatMap(books => books.flatMap(book => book.rows));
  assert.equal(all.length, 108);
  assert.equal(all.filter(row => Number.isSafeInteger(row.count)).length, 103);
  assert.equal(all.filter(row => row.count === null).length, 5);
  for (const form of forms) {
    const books = readings[form.form];
    assert.ok(Object.isFrozen(books));
    assert.deepEqual(books.map(book => book.rows.length), [12, 11, 10, 10, 11]);
    assert.equal(new Set(ahavatSourceCountRows(books).map(row => row.parasha)).size, 54);
    for (const book of books) {
      assert.ok(form.pages.includes(book.page));
      assert.ok(Object.isFrozen(book.rows));
      for (const row of book.rows) {
        assert.ok(form.pages.includes(row.page));
        assert.ok(row.printed);
        assert.ok(row.count === null || Number.isSafeInteger(row.count) && row.count >= 0);
        assert.equal("engine_verified" in row, false);
      }
    }
  }
});

test("word checkpoints are cumulative and retain source-reading deltas without forced balancing", () => {
  assert.deepEqual(readings.words.map(book => book.cumulative), [20612, 37324, 49275, 65683, 79976]);
  assert.deepEqual(readings.words.map(book => book.count), [20612, 16712, 11951, 16408, 14293]);
  assert.deepEqual(readings.words.map(book => ahavatLetterBalance(book).delta), [-100, 1, -1, 0, 0]);
  assert.equal(ahavatSourceCountRows(readings.words, "shemot", "כי תשא")[0].count, 2002);
  assert.equal(ahavatSourceCountRows(readings.words, "all", "וַיִּקְרָא")[0].count, 1673);
  assert.ok(ahavatSourceCountRows(readings.words).every(row => row.page === 41));
});

test("letter totals keep all five author checkpoints, distinct from individual-letter tables", () => {
  assert.deepEqual(readings.letters.map(book => book.cumulative), [78068, 141596, 186386, 249918, 304812]);
  assert.deepEqual(readings.letters.map(book => book.count), [78068, 63528, 44790, 63532, 54894]);
  assert.deepEqual(readings.letters.map(book => ahavatLetterBalance(book).delta), [null, null, null, null, 0]);
  assert.equal(ahavatSourceCountRows(readings.letters, "bereshit", "ויצא")[0].count, 7512);
  assert.equal(ahavatSourceCountRows(readings.letters, "bamidbar", "במדבר")[0].count, 7393);
  assert.equal(ahavatSourceCountRows(readings.letters, "devarim").reduce((sum, row) => sum + row.count, 0), 54894);
});

test("Toldot's split label/number anchors its numeral to PDF 42, never the PDF 41 catchword", () => {
  assert.equal(ahavatSourceCountRows(readings.letters).filter(row => row.page === 41).length, 5);
  assert.equal(ahavatSourceCountRows(readings.letters).filter(row => row.page === 42).length, 49);
  assert.deepEqual(readings.letters[0].pages, [41, 42]);
  assert.equal(ahavatSourceCountPage(readings.letters, [41, 42], "bereshit"), 42);
  assert.equal(ahavatSourceCountPage(readings.letters, [41, 42], "bereshit", "חיי שרה"), 41);
  assert.equal(ahavatSourceCountPage(readings.letters, [41, 42], "bereshit", "תולדות"), 42);
  assert.equal(ahavatSourceCountPage(readings.words, [41], "devarim", "וזאת הברכה"), 41);
});

test("five unresolved letter cells are absent from bars and remain empty in research CSV", () => {
  assert.deepEqual(ahavatSourceCountRows(readings.letters).filter(row => row.count === null).map(row => row.parasha), ["מקץ", "בא", "מצורע", "בהר", "פנחס"]);
  assert.equal(ahavatSourceCountBars(readings.letters, "bereshit").length, 11);
  assert.equal(ahavatSourceCountBars(readings.letters, "vayikra").length, 8);
  assert.equal(ahavatSourceCountBars(readings.letters).length, 5, "known author checkpoints remain available independently");
  const csv = ahavatSourceCountCsv(readings.letters, "אותיות התורה", "bereshit", "מקץ", "https://example.test/book.pdf", "מניין");
  assert.match(csv, /"זהות מקור","מניין"/);
  assert.match(csv, /"אותיות התורה","מקץ","בראשית","\?","","42"/);
  assert.match(csv, /"78068","78068","",""/);
  assert.doesNotMatch(csv, /null|NaN|undefined/);
});

test("count CSV retains printed numerals, individual PDF boundaries, checkpoint and nonzero row delta", () => {
  const csv = ahavatSourceCountCsv(readings.words, "תיבות התורה", "bereshit", "", "https://example.test/source.pdf", "מניין");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.equal(csv.trimEnd().split("\r\n").length, 13);
  assert.match(csv, /#page=41&view=FitH/);
  assert.match(csv, /"20612","20612","20512","-100"/);
  const letters = ahavatSourceCountCsv(readings.letters, "אותיות התורה", "bereshit", "", "https://example.test/source.pdf", "מניין");
  assert.match(letters, /"חיי שרה","בראשית","ה׳ אלף שי״ד","5314","41"/);
  assert.match(letters, /"תולדות","בראשית","ה׳ אלף תכ״ו","5426","42"/);
});

test("dataset navigation distinguishes primary count-table pages from contextual total witnesses", () => {
  const words = AHAVAT_TORAH_DATASETS.find(item => item.id === "DS-03");
  assert.deepEqual(words.pages, [41]);
  assert.deepEqual(words.relatedSourcePages, [25, 26, 27, 28, 29, 30, 31]);
  assert.equal(words.state, "partial");
  assert.equal(words.truthState, "source_located");
  assert.deepEqual(AHAVAT_TORAH_DATASETS.find(item => item.id === "DS-04").pages, [41, 42]);
  assert.throws(() => ahavatSourceCountBooks(41, [[1, "א׳", "א׳=1"]]), /Incomplete letter transcription/);
});

test("the count reader reuses the source/PDF/export/3D path and the adopted visual classes", async () => {
  const page = await readFile(new URL("../src/pages/AhavatTorahSystem2029Page.jsx", import.meta.url), "utf8");
  const scene = await readFile(new URL("../src/components/books2029/AhavatTorahSpatialScene2029.jsx", import.meta.url), "utf8");
  assert.match(page, /<LetterSourceReader countMode selectedDatasetId=\{selectedId\}/);
  assert.match(page, /countMode \? "ahavat29-counts" : "ahavat29-letters"/);
  assert.match(page, /countMode \? "countKind" : "letter"/);
  assert.match(page, /ahavatSourceCountCsv\(books/);
  assert.match(scene, /mode === "letter" \|\| mode === "parasha-count"/);
  assert.match(scene, /<LetterCountBars bars=\{bars\}/);
});

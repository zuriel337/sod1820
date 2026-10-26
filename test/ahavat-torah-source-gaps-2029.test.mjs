import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AHAVAT_TORAH_DATASETS, ahavatCurrentOccurrenceReading, ahavatDatasetSourcePage } from "../src/data/ahavatTorahSystem2029.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bundle = JSON.parse(read("public/book-data/ahavat-torah.tables.json"));
const companion = JSON.parse(read("public/book-data/ahavat-torah.commentary.json"));
const moshe = bundle.occurrence_tables.find(table => table.table_id === "DS-06");
const aseh = bundle.occurrence_tables.find(table => table.table_id === "DS-13");

test("Moshe is a name-count at PDF 70, not the previously unidentified root table", () => {
  const dataset = AHAVAT_TORAH_DATASETS.find(item => item.id === "DS-06");
  assert.equal(dataset.title, "מופעי השם משה בתורה");
  assert.deepEqual(dataset.pages, [70]);
  assert.equal(dataset.state, "partial");
  assert.match(dataset.total, /647/);
  const reading = ahavatCurrentOccurrenceReading(moshe);
  assert.equal(reading.rows.length, 10);
  assert.equal(reading.rows.reduce((sum, row) => sum + row.decimal, 0), 290);
  assert.deepEqual(reading.rows.filter(row => ["כי תשא", "ויקהל"].includes(row.parasha)).map(row => [row.parasha, row.printed, row.decimal]), [["כי תשא", "מ״ט", 49], ["ויקהל", "ט׳", 9]]);
  assert.ok(reading.rows.every(row => row.pdf_page === 70 && row.confidence === "SOURCE_VERIFIED"));
  assert.equal(reading.rows.some(row => row.parasha === "תצוה"), false, "an omitted source row is not an invented zero");
});

test("Moshe book checkpoints remain separate from the uncompleted full parasha/form reading", () => {
  const reading = ahavatCurrentOccurrenceReading(moshe);
  assert.deepEqual(reading.book_totals.map(row => row.decimal), [290, 86, 233, 38]);
  assert.equal(reading.book_totals.reduce((sum, row) => sum + row.decimal, 0), 647);
  assert.equal(reading.status, "partial_visual_reading");
  assert.equal("engine_verified" in reading, false);
  assert.equal("composite_form_breakdown" in reading, false, "old arithmetic-selected form readings are not silently copied");
});

test("all 37 historical Moshe rows remain byte-equivalent data but no longer override the new reading", () => {
  assert.equal(moshe.rows.length, 37);
  const hash = createHash("sha256").update(JSON.stringify(moshe.rows)).digest("hex");
  assert.equal(hash, "109be382b325042dacebc4fbad49e89ca7f1a45799a2fa6478e6e31627eda602");
  assert.equal(hash, moshe.current_reading.historical_rows_sha256);
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(page, /const rows = table\?\.current_reading \? currentReading\?\.rows \|\| \[\] : table\?\.rows \|\| \[\]/);
  assert.match(page, /תעתיק קודם · \{table\.rows\.length\} שורות/);
});

test("Aseh exposes five exact-source rows while retaining both pre-exclusion sum and author conclusion", () => {
  assert.deepEqual(aseh.pdf_pages, [70]);
  assert.deepEqual(aseh.rows.map(row => [row.parasha, row.printed, row.decimal]), [["תרומה", "ס״ב", 62], ["תצוה", "מ״ח", 48], ["כי תשא", "כ״ד", 24], ["ויקהל", "פ״ד", 84], ["פקודי", "ל״ו", 36]]);
  assert.equal(aseh.rows.reduce((sum, row) => sum + row.decimal, 0), 254);
  assert.equal(aseh.parasha_row_sum, 254);
  assert.deepEqual(aseh.grand_total, { printed: "רמ״ח", decimal: 248 });
  assert.equal(aseh.status, "PARTIAL");
  assert.match(aseh.source_note_he, /שני שלבי הספירה נשמרים בנפרד/);
  assert.ok(aseh.rows.every(row => row.pdf_page === 70));
});

test("unlocated transmission/Tochecha datasets never reuse disproved page estimates", () => {
  for (const [id, estimate] of [["DS-07", 78], ["DS-08", 90]]) {
    const dataset = AHAVAT_TORAH_DATASETS.find(item => item.id === id);
    assert.deepEqual(dataset.pages, []);
    assert.equal(dataset.state, "unknown");
    assert.equal(dataset.locatorReview.previousEstimate, estimate);
    for (const currentPage of [6, 35, 70, 99]) assert.equal(ahavatDatasetSourcePage(dataset, currentPage), currentPage);
  }
  assert.equal(ahavatDatasetSourcePage(AHAVAT_TORAH_DATASETS[0], 70), 6);
  assert.equal(ahavatDatasetSourcePage({ pages: [NaN, 0, 100] }, 70), 70);
  const page = read("src/pages/AhavatTorahSystem2029Page.jsx");
  assert.match(page, /מראה־המקום בבירור/);
  assert.match(page, /ה־PDF נשאר פתוח בעמוד הנוכחי/);
});

test("new occurrence readings fail closed for a foreign identity, hash, page, anchor or malformed row", () => {
  assert.ok(ahavatCurrentOccurrenceReading(moshe));
  for (const override of [{ source_identity: "foreign" }, { source_pdf_sha256: "wrong" }, { pdf_page: 71 }, { source_anchor: "#page=71&view=FitH" }, { rows: [] }, { rows: [{ pdf_page: 70, printed: "מ״ט", decimal: NaN }] }, { book_totals: null }]) {
    assert.equal(ahavatCurrentOccurrenceReading({ ...moshe, current_reading: { ...moshe.current_reading, ...override } }), null);
  }
});

test("the shared guide no longer claims that unresolved datasets occur on 71, 78 or 90", () => {
  assert.match(companion.pages[69].companion_explanation, /290/);
  assert.match(companion.pages[69].companion_explanation, /647/);
  assert.match(companion.pages[69].companion_explanation, /248/);
  assert.doesNotMatch(companion.pages[70].companion_explanation, /המחובר לעמוד הזה/);
  assert.doesNotMatch(companion.pages[77].companion_explanation, /„שרשרת מסירת טהרת פרה אדומה”, המחובר/);
  assert.doesNotMatch(companion.pages[89].companion_explanation, /„השוואת תיבות התוכחה”, המחובר/);
  for (const page of [70, 71, 78, 90]) assert.equal(companion.pages[page - 1].source_anchor, `#page=${page}&view=FitH`);
});

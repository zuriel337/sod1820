import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AHAVAT_TORAH_DATASETS, AHAVAT_TORAH_FINDINGS, AHAVAT_LOCATED_DATASETS, AHAVAT_UNLOCATED_DATASETS, AHAVAT_CALC03_SOURCE_READING, ahavatCalculationReading } from "../src/data/ahavatTorahSystem2029.js";
import { AHAVAT_MEGILLAH_LETTER_ROWS, AHAVAT_MEGILLOT_REVIEWED_READINGS } from "../src/data/ahavatTorahMegillot2029.js";
import { AHAVAT_PEOPLE_BOOKS, AHAVAT_PEOPLE_REVIEWED_READINGS } from "../src/data/ahavatTorahPeople2029.js";
const read = name => readFileSync(new URL(`../${name}`, import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
const tables = JSON.parse(read("public/book-data/ahavat-torah.tables.json"));

test("reader-facing projection retains all source identities without inventing chapters or locators", () => {
  assert.equal(AHAVAT_TORAH_DATASETS.length, 13);
  assert.equal(AHAVAT_LOCATED_DATASETS.length, 11);
  assert.deepEqual(AHAVAT_UNLOCATED_DATASETS.map(item => item.id), ["DS-07", "DS-08"]);
  assert.deepEqual([...AHAVAT_LOCATED_DATASETS, ...AHAVAT_UNLOCATED_DATASETS].map(item => item.id).sort(), AHAVAT_TORAH_DATASETS.map(item => item.id).sort());
  assert.ok(AHAVAT_LOCATED_DATASETS.every(item => item.pages.length && item.pages.every(page => Number.isInteger(page) && page > 0 && page <= 99)));
  assert.ok(AHAVAT_UNLOCATED_DATASETS.every(item => !item.pages.length && item.state === "unknown" && item.truthState === "open"));
});
test("seven Hebrew reading guides preserve exact source pages and distinguish current CALC-03 from historical misreading", () => {
  assert.equal(tables.calculations.length, 7);
  for (const record of tables.calculations) {
    const guide = ahavatCalculationReading(record);
    assert.ok(guide.title.length > 5 && guide.explanation.length > 75);
    assert.equal(guide.page, record.pdf_pages[0]);
    assert.doesNotMatch(`${guide.title} ${guide.explanation} ${guide.output}`, /ARITHMETIC|NOTE|as printed|schema|מאומת במנוע/);
  }
  assert.equal(ahavatCalculationReading({ calculation_id: "invented" }), null);
  const source = AHAVAT_CALC03_SOURCE_READING;
  assert.deepEqual(source.printed_parts, ["ר״ב", "ל״ז"]);
  assert.equal(source.printed_total, "רל״ט");
  assert.equal(source.pdf_page, 18);
  assert.equal(source.source_anchor, "#page=18&view=FitH");
  assert.equal(source.engine_verification, "not_tested");
  assert.match(tables.calculations.find(item => item.calculation_id === "CALC-03").output, /212/);
});
test("new readings are additive: reversing only the five witnessed cells exactly restores the entire previous matrix", () => {
  const previous = AHAVAT_MEGILLAH_LETTER_ROWS.map(row => {
    const reading = AHAVAT_MEGILLOT_REVIEWED_READINGS.find(item => item.id === row.id);
    return reading ? { ...row, printed: reading.previousPrinted, count: reading.previousCount } : row;
  });
  assert.equal(hash(JSON.stringify(previous)), "0d71a048fe43caef9c421bc66e36ff736b01b9165472e5b7e5c4101f5955273e");
  assert.equal(previous.filter(row => row.count === null).length, 8);
  assert.equal(AHAVAT_MEGILLAH_LETTER_ROWS.filter(row => row.count === null).length, 3);
});
test("original research, all OCR pages and all 267 companion units remain byte-for-byte unchanged", () => {
  for (const [suffix, expected] of [["tables", "70b487b51ec7a61a0864563da03d063107441853c8716e4f4eb1247a546c0e53"], ["page-text", "5dfa0a866c71fd983e8f2f6fe45c8713e65155bacfbb6344ac7dbbcd6ae236d0"], ["commentary", "8de1457e77938ba77d3a600ed40e5fc5fc4d43b0001eb9f0d0e05f4a6167c84c"]]) {
    assert.equal(hash(read(`public/book-data/ahavat-torah.${suffix}.json`)), expected);
  }
});
test("all dataset and finding semantics are unchanged; only public prose is edited", () => {
  const semantics = { datasets: AHAVAT_TORAH_DATASETS.map(({ summary, nextStep, ...row }) => row), findings: AHAVAT_TORAH_FINDINGS.map(({ sourceNote, ...row }) => row) };
  assert.equal(hash(JSON.stringify(semantics)), "4551ba23f766e7e3b66d3a05a9ad7e55dc18869813724abcd5511721b6923345");
});
test("the one additional attribution reading restores exactly to its previous source record", () => {
  assert.equal(AHAVAT_PEOPLE_REVIEWED_READINGS.length, 1);
  const reading = AHAVAT_PEOPLE_REVIEWED_READINGS[0];
  assert.equal(reading.page, 28);
  assert.equal(reading.sourceAnchor, "#page=28&view=FitH");
  assert.equal(reading.engineVerification, "not_tested");
  const previous = AHAVAT_PEOPLE_BOOKS.map(book => ({ ...book, rows: book.rows.map(row => row.id === reading.id ? { ...row, words: { printed: reading.previousPrinted, value: reading.previousValue } } : row) }));
  assert.equal(hash(JSON.stringify(previous)), "8efeaadcc725a1f91407b99d36867ffcc0363c9915d6716793d1843a56e17c42");
});

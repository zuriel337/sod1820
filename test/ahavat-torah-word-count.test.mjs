import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { auditAhavatTorahWordCount } from "../scripts/research/ahavat-torah-word-count.mjs";

const audit = auditAhavatTorahWordCount();

test("DS-03 preserves the five source witnesses for the author's 79,976 total", () => {
  assert.equal(audit.author.value, 79_976);
  assert.equal(audit.author.raw, "ע״ט אלף תתקע״ו");
  assert.deepEqual(audit.author.visuallyVerifiedPages, [12, 25, 30, 41, 51]);
});

test("the local display projection reproduces the bounded 80,179 diagnostic, not a canonical verification", () => {
  assert.equal(audit.source.torahVerseCount, 5_846);
  assert.equal(audit.displayProjection.displayTokens, 80_849);
  assert.equal(audit.displayProjection.sectionMarkers, 670);
  assert.equal(audit.displayProjection.displayWords, 80_179);
  assert.equal(audit.displayProjection.deltaFromAuthor, 203);
  assert.match(audit.source.suitability, /DIAGNOSTIC_ONLY/);
});

test("letter mismatch proves tk-vtext carries material outside the canonical Torah letter stream", () => {
  assert.equal(audit.displayProjection.displayHebrewLetters, 305_599);
  assert.equal(audit.displayProjection.canonicalHebrewLetters, 304_805);
  assert.equal(audit.displayProjection.letterDelta, 794);
  assert.deepEqual(
    audit.books.map(({ book, displayWords }) => [book, displayWords]),
    [
      ["בראשית", 20_659],
      ["שמות", 16_760],
      ["ויקרא", 11_974],
      ["במדבר", 16_443],
      ["דברים", 14_343],
    ],
  );
});

test("the public Preview bundle withdraws 110,976 and exposes the corrected DS-03 state", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const dataset = bundle.datasets.find((row) => row.dataset_id === "DS-03");
  const relation = bundle.relations.find((row) => row.relation_id === "CR-09");
  const heroDataset = bundle.hero.datasets.find((row) => row[0] === "DS-03");
  const family = bundle.hero.families.find((row) => row.title.startsWith("79,976"));
  const occurrence = bundle.occurrence_tables
    .flatMap((table) => table.rows)
    .find((row) => row.parasha?.startsWith("TORAH TOTAL") && row.table?.includes("תיבות התורה"));

  assert.equal(dataset.total, "79,976");
  assert.match(dataset.status, /source total closed/i);
  assert.match(heroDataset[4], /withdrawn/);
  assert.doesNotMatch(family.title, /↔/);
  assert.deepEqual(relation.pdf_pages, [12, 25, 30, 41, 51]);
  assert.equal(occurrence.pdf_page, "41");
  assert.equal(occurrence.normalized_integer, "79976");
  assert.equal(occurrence.verification_state, "VISUALLY_VERIFIED_CORRECTED");
  assert.equal(occurrence.source_anchor, "book:hebrewbooks:5635#p41:words_of_torah_table_body_RAW");
});

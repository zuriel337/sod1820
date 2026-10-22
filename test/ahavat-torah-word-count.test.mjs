import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { auditAhavatTorahWordCount } from "../scripts/research/ahavat-torah-word-count.mjs";
import { auditAhavatTorahParashaWordCounts } from "../scripts/research/ahavat-torah-parasha-word-count.mjs";

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
  const table = bundle.occurrence_tables.find((row) => row.table_id === "DS-03-WORDS-BY-PARASHA");
  const occurrence = table.cumulative_checkpoints.at(-1);

  assert.equal(dataset.total, "79,976");
  assert.equal(dataset.status, "CLOSED");
  assert.match(heroDataset[4], /withdrawn/);
  assert.doesNotMatch(family.title, /↔/);
  assert.deepEqual(relation.pdf_pages, [12, 25, 30, 41, 51]);
  assert.deepEqual(table.pdf_pages, [41]);
  assert.equal(occurrence.cumulative_total, 79_976);
  assert.equal(occurrence.source_value, "ע״ט אלף תתקע״ו");
  assert.equal(table.verification_state, "CLOSED");
  assert.equal(table.source_anchor, "book:hebrewbooks:5635#p41:words_of_torah_table");
  assert.match(dataset.checksum, /9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4/);
  assert.match(dataset.exceptions, /ה \| ליהוה/);
});

test("all 54 DS-03 parasha rows reproduce the source and its cumulative checkpoints", () => {
  const corpusDir = process.env.AHAVAT_TORAH_MAM_CORPUS;
  if (!corpusDir) return;
  const result = auditAhavatTorahParashaWordCounts({ mamCorpusDir: corpusDir });
  assert.equal(result.rows.length, 54);
  assert.equal(result.total, 79_976);
  assert.deepEqual(
    result.checkpoints.map(({ bookTotal, cumulativeTotal }) => [bookTotal, cumulativeTotal]),
    [
      [20_612, 20_612],
      [16_713, 37_325],
      [11_950, 49_275],
      [16_408, 65_683],
      [14_293, 79_976],
    ],
  );
  assert.equal(result.rows.find((row) => row.parasha === "האזינו")?.maqafSplitCount, 615);
  assert.equal(result.rows.find((row) => row.parasha === "האזינו")?.wordCount, 614);
});

test("the public bundle exposes the closed DS-03 table without pass-1 OCR rows", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const dataset = bundle.datasets.find((row) => row.dataset_id === "DS-03");
  const table = bundle.occurrence_tables.find((row) => row.table_id === "DS-03-WORDS-BY-PARASHA");
  assert.equal(dataset.status, "CLOSED");
  assert.equal(table.rows.length, 54);
  assert.equal(table.rows.reduce((sum, row) => sum + row.normalized_integer, 0), 79_976);
  assert.deepEqual(table.cumulative_checkpoints.map((row) => row.cumulative_total), [
    20_612, 37_325, 49_275, 65_683, 79_976,
  ]);
  assert.equal(table.rows.find((row) => row.parasha === "בראשית")?.normalized_integer, 1_931);
  assert.equal(table.rows.find((row) => row.parasha === "האזינו")?.normalized_integer, 614);
  assert.equal(
    bundle.occurrence_tables.flatMap((row) => row.rows).some((row) => row.normalized_integer === "1131"),
    false,
  );
});

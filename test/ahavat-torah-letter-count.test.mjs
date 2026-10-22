import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { auditAhavatTorahParashaLetterCounts } from "../scripts/research/ahavat-torah-parasha-letter-count.mjs";

test("DS-04 reproduces the 304,805 corpus and localizes the source total 304,812", (t) => {
  const corpusDir = process.env.AHAVAT_TORAH_MAM_CORPUS;
  if (!corpusDir) return t.skip("AHAVAT_TORAH_MAM_CORPUS is not configured");
  const result = auditAhavatTorahParashaLetterCounts({ mamCorpusDir: corpusDir });
  assert.equal(result.rows.length, 54);
  assert.equal(result.sourceTotal, 304_812);
  assert.equal(result.canonicalTotal, 304_805);
  assert.equal(result.delta, 7);
  assert.equal(result.differingRows.length, 11);
  assert.equal(result.differingRows.reduce((sum, row) => sum + row.delta, 0), 7);
  assert.deepEqual(result.checkpoints.map((row) => row.sourceCumulative), [
    78_068, 141_596, 186_386, 249_917, 304_812,
  ]);
  assert.deepEqual(result.checkpoints.map((row) => row.canonicalCumulative), [
    78_064, 141_593, 186_383, 249_913, 304_805,
  ]);
});

test("the public bundle exposes DS-04 source and corpus values without collapsing the mismatch", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const dataset = bundle.datasets.find((row) => row.dataset_id === "DS-04");
  const table = bundle.occurrence_tables.find((row) => row.table_id === "DS-04-LETTERS-BY-PARASHA");
  assert.match(dataset.status, /CLOSED/);
  assert.equal(dataset.total, "source 304,812; canonical corpus 304,805; delta +7");
  assert.equal(table.rows.length, 54);
  assert.equal(table.rows.reduce((sum, row) => sum + row.source_integer, 0), 304_812);
  assert.equal(table.rows.reduce((sum, row) => sum + row.canonical_integer, 0), 304_805);
  assert.equal(table.rows.filter((row) => row.delta !== 0).length, 11);
  assert.equal(table.cumulative_checkpoints.at(-1).source_value, "ש״ד אלף תתי״ב");
  assert.equal(table.cumulative_checkpoints.at(-1).delta, 7);
  assert.equal(
    bundle.occurrence_tables.flatMap((row) => row.rows).some((row) => String(row.source_value).includes("304,830")),
    false,
  );
});

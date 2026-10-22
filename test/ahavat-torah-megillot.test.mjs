import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  auditAhavatTorahMegillot,
  auditLamentationsBoundaryWitness,
} from "../scripts/research/ahavat-torah-megillot-corpus.mjs";

test("DS-09 row semantics and DS-10 totals are reproduced from the five Megillot", (t) => {
  const corpusDir = process.env.AHAVAT_TORAH_MEGILLOT_CORPUS;
  if (!corpusDir) return t.skip("AHAVAT_TORAH_MEGILLOT_CORPUS is not configured");
  const result = auditAhavatTorahMegillot({ corpusDir });
  assert.equal(result.letterMatrix.length, 27);
  assert.deepEqual(result.books.map((book) => book.corpusLetters), [12_110, 5_141, 4_949, 5_974, 10_968]);
  assert.deepEqual(result.books.map((book) => book.sourceLetters), [12_108, 5_142, 4_945, 5_974, 10_968]);
  assert.deepEqual(result.books.map((book) => book.sourceWords), [3_045, 1_250, 1_294, 1_541, 2_987]);
  assert.deepEqual(result.books.map((book) => book.corpusWords), [3_045, 1_250, 1_294, 1_542, 2_987]);
  assert.equal(result.books.find((book) => book.book === "איכה")?.wordDelta, -1);
  assert.deepEqual(result.letterMatrix[0].sourceValues, {
    אסתר: 811,
    "שיר השירים": 281,
    רות: 430,
    איכה: 362,
    קהלת: 816,
  });
  assert.deepEqual(result.letterMatrix.find((row) => row.letter === "ו")?.deltas, {
    אסתר: 0,
    "שיר השירים": 1,
    רות: -2,
    איכה: 1,
    קהלת: 0,
  });
  assert.equal(result.letterMatrix.filter((row) => Object.values(row.deltas).some(Boolean)).length, 8);
});

test("DS-10 localizes the one Eicha boundary in the independent MorphHB witness", (t) => {
  const morphhbPath = process.env.AHAVAT_TORAH_MORPHHB_LAMENTATIONS;
  if (!morphhbPath) return t.skip("AHAVAT_TORAH_MORPHHB_LAMENTATIONS is not configured");
  const result = auditLamentationsBoundaryWitness({ morphhbPath });
  assert.equal(result.ketivWords, 1_542);
  assert.equal(result.sourceWords, 1_541);
  assert.equal(result.uniqueTwoKetivToOneQereVariant, true);
  assert.match(result.localizedBoundary, /1:6.*מן־בת.*מִבַּת/u);
});

test("the public bundle exposes the reconstructed Megillot material without the 50,045 OCR error", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const letters = bundle.occurrence_tables.find((row) => row.table_id === "DS-09-MEGILLOT-LETTER-MATRIX");
  const words = bundle.occurrence_tables.find((row) => row.table_id === "DS-10-MEGILLOT-WORDS");
  assert.equal(letters.rows.length, 27);
  assert.equal(letters.rows[0].source_values.אסתר, 811);
  assert.equal(letters.rows.find((row) => row.letter === "ך").deltas.איכה, -1);
  assert.deepEqual(words.rows.map((row) => row.source_integer), [3_045, 1_250, 1_294, 1_541, 2_987]);
  assert.deepEqual(words.rows.map((row) => row.corpus_integer), [3_045, 1_250, 1_294, 1_542, 2_987]);
  assert.match(words.rows.find((row) => row.megillah === "איכה").boundary_witness, /מן־בת/u);
  assert.doesNotMatch(JSON.stringify(words), /50045|50,045/);
});

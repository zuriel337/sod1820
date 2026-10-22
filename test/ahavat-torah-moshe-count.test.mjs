import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { auditAhavatTorahMoshe } from "../scripts/research/ahavat-torah-moshe-count.mjs";

test("DS-06 reproduces every Moshe layer after excluding two homographs", (t) => {
  const corpusDir = process.env.AHAVAT_TORAH_MAM_CORPUS;
  if (!corpusDir) return t.skip("AHAVAT_TORAH_MAM_CORPUS is not configured");
  const result = auditAhavatTorahMoshe({ corpusDir });

  assert.deepEqual(result.books.map((row) => row.corpus), [290, 86, 233, 38]);
  assert.ok(result.books.every((row) => row.delta === 0));
  assert.deepEqual(result.forms, {
    משה: 614,
    למשה: 13,
    ומשה: 13,
    במשה: 4,
    ובמשה: 2,
    כמשה: 1,
  });
  assert.equal(result.homographs.length, 2);
  assert.match(result.homographs[0].locus, /Exodus:12:4/);
  assert.match(result.homographs[1].locus, /Deuteronomy:15:2/);
  assert.equal(result.total, 647);
});

test("the public bundle marks DS-06 closed at row, book, form and Torah levels", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const dataset = bundle.datasets.find((row) => row.dataset_id === "DS-06");
  assert.equal(dataset.status, "CLOSED");
  assert.match(dataset.checksum, /290\+86\+233\+38=647/);
  assert.match(dataset.exceptions, /Exodus 12:4.*Deuteronomy 15:2/);
});

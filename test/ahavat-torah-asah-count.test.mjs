import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { auditAhavatTorahAsah } from "../scripts/research/ahavat-torah-asah-count.mjs";

test("DS-13 reproduces the five source rows and the 248 exclusion contract", (t) => {
  const corpusPath = process.env.AHAVAT_TORAH_EXODUS_CORPUS;
  if (!corpusPath) return t.skip("AHAVAT_TORAH_EXODUS_CORPUS is not configured");
  const result = auditAhavatTorahAsah({ corpusPath });

  assert.equal(result.rawRootCandidates, 268);
  assert.equal(result.goldenCalfExcluded, 14);
  assert.deepEqual(result.parashot.map((row) => row.source), [62, 48, 24, 84, 36]);
  assert.deepEqual(result.parashot.map((row) => row.corpus), [62, 48, 24, 84, 36]);
  assert.equal(result.parashaSubtotal, 254);
  assert.equal(result.divineExcluded.length, 6);
  assert.equal(result.total, 248);
  assert.equal(Object.values(result.forms).reduce((sum, count) => sum + count, 0), 248);
  assert.equal(result.forms.ועשית, 51);
  assert.equal(result.forms.ויעש, 42);
});

test("the public bundle exposes DS-13 as a closed source/corpus reconciliation", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const dataset = bundle.datasets.find((row) => row.dataset_id === "DS-13");
  assert.equal(dataset.status, "CLOSED");
  assert.match(dataset.checksum, /268.*14.*254.*6.*248/);
});

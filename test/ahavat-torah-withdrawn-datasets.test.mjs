import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("DS-07 and DS-08 preserve their corrected source facts without active dataset claims", () => {
  const bundle = JSON.parse(fs.readFileSync("public/book-data/ahavat-torah.tables.json", "utf8"));
  const ds07 = bundle.datasets.find((row) => row.dataset_id === "DS-07");
  const ds08 = bundle.datasets.find((row) => row.dataset_id === "DS-08");

  assert.equal(ds07.status, "WITHDRAWN_LOW_RESOLUTION_MISREAD");
  assert.match(ds07.rows_description, /Sanhedrin daf 37.*three rows/i);
  assert.doesNotMatch(ds07.total, /37 generations/i);

  assert.equal(ds08.status, "WITHDRAWN_LOW_RESOLUTION_MISREAD");
  assert.match(ds08.rows_description, /No rows/);
  assert.equal(ds08.total, "none");
});

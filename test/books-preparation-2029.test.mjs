import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookPreparation } from "../src/data/bookPreparation2029.js";
import { buildBookPreparation } from "../scripts/build-book-preparation-2029.mjs";
import { getAllBookReaderManifests } from "../src/data/bookReader2029.js";
const bundle = JSON.parse(readFileSync(new URL("../public/book-data/books.preparation.json", import.meta.url)));

test("preparation projection is reproducible from the current assets, including their exact hashes", () => {
  assert.deepEqual(bundle, buildBookPreparation());
  assert.deepEqual(Object.keys(bundle.books).sort(), getAllBookReaderManifests().map(b => b.slug).sort());
});
test("all eight books stay closed: page coverage alone is not full editorial/reader acceptance", () => {
  for (const entry of Object.values(bundle.books)) {
    const status = bookPreparation(entry);
    assert.ok(Number.isInteger(status.percent) && status.percent < 100);
    assert.equal(status.ready, false);
    assert.equal(entry.steps.find(s => s.id === "editorial").completed, null);
    assert.equal(entry.steps.find(s => s.id === "reader").completed, null);
    assert.ok(entry.inputs.length >= 1);
  }
});
test("unknown, incomplete and corrupt preparation evidence fails closed without inventing a zero", () => {
  for (const entry of [null, {}, { steps: [] }, { steps: [null, null, null, null, null] }]) assert.deepEqual(bookPreparation(entry), { percent: null, ready: false, steps: [] });
  const entry = structuredClone(bundle.books["ahavat-torah"]);
  entry.steps[1].completed = 100;
  assert.equal(bookPreparation(entry).percent, null);
});
test("100 percent requires all five identified preparation steps, never an active DB flag or engine label", () => {
  const entry = structuredClone(bundle.books["ahavat-torah"]);
  entry.is_active = true; entry.engine = "verified";
  assert.equal(bookPreparation(entry).ready, false);
  entry.steps.forEach(s => { s.completed = s.total; });
  assert.deepEqual({ percent: bookPreparation(entry).percent, ready: bookPreparation(entry).ready }, { percent: 100, ready: true });
  entry.steps[4].id = "source";
  assert.equal(bookPreparation(entry).ready, false);
});

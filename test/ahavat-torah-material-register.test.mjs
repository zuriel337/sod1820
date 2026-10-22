import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/book-data/ahavat-torah.tables.json", import.meta.url);

test("Ahavat Torah public material register covers all 99 PDF pages without gaps", async () => {
  const bundle = JSON.parse(await readFile(bundleUrl, "utf8"));
  const pageNumbers = bundle.page_register.map((page) => page.pdf_page);

  assert.deepEqual(pageNumbers, Array.from({ length: 99 }, (_, index) => index + 1));
  assert.equal(bundle.content_blocks.length, 303);
  assert.equal(bundle.page_register.reduce((sum, page) => sum + page.n_content_blocks, 0), 303);
  assert.equal(bundle.page_register.reduce((sum, page) => sum + page.n_tables, 0), 11);
  assert.equal(new Set(bundle.content_blocks.map((block) => block.source_ref)).size, 303);
});

test("Ahavat Torah material-first projection names every major source section", async () => {
  const bundle = JSON.parse(await readFile(bundleUrl, "utf8"));
  assert.equal(bundle.hero.sections.length, 8);
  assert.deepEqual(bundle.hero.sections.map((section) => section.pages), [
    "pp1–5", "pp6–24", "pp25–31", "pp31–35",
    "pp35–43", "pp46–92", "pp93–94", "pp94–99",
  ]);
  assert.equal(bundle.hero.open.length, 5);
  const glyphDataset = bundle.datasets.find((dataset) => dataset.dataset_id === "DS-02");
  assert.equal(glyphDataset.status, "CORPUS_CLOSED_SOURCE_CELLS_PARTIAL");
  assert.equal(Object.keys(glyphDataset.corpus_glyph_totals).length, 27);
  assert.equal(Object.values(glyphDataset.corpus_glyph_totals).reduce((sum, value) => sum + value, 0), 304_805);
});

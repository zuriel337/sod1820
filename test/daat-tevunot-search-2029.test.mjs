import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("Daat Tevunot search covers all 99 source pages", async () => {
  const bundle = await readJson("public/book-data/daat-tevunot.page-text.json");
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "daat-tevunot");
  assert.equal(bundle.source_identity, "book:daat-tevunot");
  assert.equal(bundle.source_pdf_sha256, "3c0520d819875f62ace6bf5b55b5074cabbe62a5a9331ca64a1e58d2ac73935c");
  assert.equal(bundle.fidelity_status, "machine_candidate_for_search_and_navigation");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 99 }, (_, index) => index + 1));
  assert.equal(bundle.pages.every(item => item.extraction_status === "machine_candidate"), true);
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 240_000);
  assert.match(bundle.pages[0].text, /דעת תבונות/);
  assert.match(bundle.pages[88].text, /יום הדין הגדול/);
  assert.match(bundle.pages[98].text, /הערת מהדורה/);
});

test("the canonical reader lazily connects Daat Tevunot search", () => {
  const manifest = getBookReaderManifest("daat-tevunot");
  assert.equal(manifest.pageTextUrl, "/book-data/daat-tevunot.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/daat-tevunot.commentary.json");
});

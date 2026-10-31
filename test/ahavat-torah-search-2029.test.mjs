import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("Ahavat Torah search covers every textual PDF page and preserves the blank leaf", async () => {
  const bundle = await readJson("public/book-data/ahavat-torah.page-text.json");
  assert.equal(bundle.schema_version, "ahavat-torah-page-text.v1");
  assert.equal(bundle.source_identity, "book:hebrewbooks:5635");
  assert.equal(bundle.extraction_method, "embedded PDF text via pdftotext -layout");
  assert.equal(bundle.fidelity_status, "machine_candidate_requires_visual_verification");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 99 }, (_, index) => index + 1));
  assert.equal(bundle.pages.filter(item => item.extraction_status === "machine_candidate").length, 98);
  assert.deepEqual(
    bundle.pages.filter(item => item.extraction_status === "blank_or_image_only").map(item => item.pdf_page),
    [45],
  );
  assert.equal(bundle.pages[44].text, "");
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 280_000);
  assert.equal(bundle.pages[43].extraction_status, "machine_candidate");
  assert.ok(bundle.pages[43].character_count > 0);
  assert.match(bundle.pages[45].text, /בראשית/);
  assert.match(bundle.pages[98].text, /הערות שהעיר/);
});

test("the canonical reader lazily connects Ahavat Torah search", () => {
  const manifest = getBookReaderManifest("ahavat-torah");
  assert.equal(manifest.pageTextUrl, "/book-data/ahavat-torah.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/ahavat-torah.commentary.json");
});

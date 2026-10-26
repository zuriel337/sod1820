import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("Bentov source search covers all textual PDF pages", async () => {
  const bundle = await readJson("public/book-data/bentov-brief-tour-higher-consciousness.page-text.json");
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "bentov-brief-tour-higher-consciousness");
  assert.equal(bundle.source_pdf_sha256, "263f3518eff156c19a0fd1e4a6852283e45cb4f8429980e5bb0fcf0777ceda8f");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 127 }, (_, index) => index + 1));
  assert.equal(bundle.pages.filter(item => item.extraction_status === "machine_candidate").length, 125);
  assert.deepEqual(bundle.pages.filter(item => item.extraction_status === "image_only").map(item => item.pdf_page), [1, 2]);
  assert.match(bundle.pages[98].text, /pure awareness/i);
});

test("Bentov keeps machine Hebrew translation separate from companion explanation", async () => {
  const bundle = await readJson("public/book-data/bentov-brief-tour-higher-consciousness.commentary.json");
  assert.equal(bundle.schema_version, "book-commentary.v1");
  assert.equal(bundle.source_layers.book_text, "דברי הספר · אנגלית");
  assert.match(bundle.source_layers.translation, /תרגום עברי/);
  assert.equal(bundle.source_layers.companion, "הסבר נלווה");
  assert.equal(bundle.translation_fidelity, "machine_candidate_requires_human_review");
  assert.deepEqual(bundle.coverage, { pdf_pages: 127, translated_pages: 125, source_only_pages: [1, 2] });
  assert.equal(bundle.pages.length, 127);
  assert.equal(bundle.pages.filter(item => item.translation_status === "machine_candidate").length, 125);
  assert.ok(bundle.pages.reduce((total, item) => total + item.hebrew_translation.length, 0) > 100_000);
  assert.equal(bundle.pages.slice(2).every(item => /[\u0590-\u05ff]/.test(item.hebrew_translation)), true);
  assert.match(bundle.pages[98].hebrew_translation, /תודעה טהורה/);
  assert.equal(bundle.pages[98].source_anchor, "#page=99&view=FitH");
  assert.match(bundle.pages[98].companion_explanation, /שכבות הזהות/);
});

test("the canonical reader lazily connects Bentov search and Hebrew translation", () => {
  const manifest = getBookReaderManifest("bentov-brief-tour-higher-consciousness");
  assert.equal(manifest.pageTextUrl, "/book-data/bentov-brief-tour-higher-consciousness.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/bentov-brief-tour-higher-consciousness.commentary.json");
});

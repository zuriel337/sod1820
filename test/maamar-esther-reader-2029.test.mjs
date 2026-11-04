import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("Maamar Esther exposes all 84 source pages for search", async () => {
  const bundle = await readJson("public/book-data/maamar-esther.page-text.json");
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "maamar-esther");
  assert.equal(bundle.source_identity, "book:hebrewbooks:33050");
  assert.equal(bundle.source_pdf_sha256, "13d7f49433628f75b91742fb44a38e0d848fed468ccc46f0ff7e71111e658e72");
  assert.equal(bundle.fidelity_status, "machine_candidate_for_search_and_navigation");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 84 }, (_, index) => index + 1));
  assert.equal(bundle.pages.every(item => item.extraction_status === "machine_candidate"), true);
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 220_000);
  assert.match(bundle.pages[0].text, /אסתר/);
  assert.match(bundle.pages[8].text, /אחשורוש/);
  assert.match(bundle.pages[82].text, /אחשורוש/);
});

test("Maamar Esther has a source-anchored companion for every page", async () => {
  const commentary = await readJson("public/book-data/maamar-esther.commentary.json");
  assert.equal(commentary.schema_version, "maamar-esther-commentary.v1");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.source_layers, { book_text: "דברי הספר", companion: "הסבר נלווה" });
  assert.deepEqual(commentary.coverage, {
    pdf_pages: 84,
    companion_pages: 84,
    source_text_pages: 84,
    status: "complete_first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 84 }, (_, index) => index + 1));
  for (const page of commentary.pages) {
    assert.ok(page.title.length > 5, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 140, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }
  assert.match(commentary.pages[0].title, /שער/);
  assert.match(commentary.pages[8].title, /פרק א׳/);
  assert.match(commentary.pages[82].title, /פרק י׳/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("Maamar Esther joins the Preview reader without a database write", () => {
  const manifest = getBookReaderManifest("maamar-esther");
  assert.equal(manifest.pdfPages, 84);
  assert.equal(manifest.pageTextUrl, "/book-data/maamar-esther.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/maamar-esther.commentary.json");
  assert.match(manifest.pdfUrl, /Hebrewbooks_org_33050\.pdf$/);
});

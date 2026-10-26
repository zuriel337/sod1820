import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("the source-anchored Ahavat Torah companion covers every PDF page", async () => {
  const commentary = await readJson("public/book-data/ahavat-torah.commentary.json");

  assert.equal(commentary.schema_version, "ahavat-torah-commentary.v1");
  assert.equal(commentary.book_slug, "ahavat-torah");
  assert.equal(commentary.source_identity, "book:hebrewbooks:5635");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.source_layers, {
    book_text: "דברי הספר",
    companion: "הסבר נלווה",
  });
  assert.deepEqual(commentary.coverage, {
    pdf_pages: 99,
    companion_pages: 99,
    source_text_pages: 98,
    visual_or_blank_pages: [45],
    deep_research_pages: 15,
    status: "complete_first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 99 }, (_, index) => index + 1));

  for (const page of commentary.pages) {
    assert.ok(page.title.length > 5, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 120, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }

  assert.equal(commentary.pages[0].source_basis, "research_dossier_and_visual_source");
  assert.match(commentary.pages[5].title, /1,820/);
  assert.match(commentary.pages[24].title, /אוריין תליתאי/);
  assert.equal(commentary.pages[44].source_basis, "visual_blank_page");
  assert.match(commentary.pages[44].technical_note, /אין טקסט/);
  assert.match(commentary.pages[98].title, /תיקונים/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the Ahavat Torah manifest exposes the companion beside the source", () => {
  const manifest = getBookReaderManifest("ahavat-torah");
  assert.equal(manifest.pageTextUrl, "/book-data/ahavat-torah.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/ahavat-torah.commentary.json");
  assert.equal(manifest.pdfPages, 99);
});

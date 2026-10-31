import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";
import { AHAVAT_TORAH_SOURCE, ahavatCompanionPage } from "../src/data/ahavatTorahSystem2029.js";

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
  assert.equal(commentary.pages[41].source_basis, "visual_source_p42_total_and_table_boundaries");
  assert.match(commentary.pages[41].companion_explanation, /ש״ד אלף תתי״ב — 304,812/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the Ahavat Torah manifest exposes the companion beside the source", () => {
  const manifest = getBookReaderManifest("ahavat-torah");
  assert.equal(manifest.pageTextUrl, "/book-data/ahavat-torah.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/ahavat-torah.commentary.json");
  assert.equal(manifest.pdfPages, 99);
});

test("the dedicated book surface reuses the same 99 page-specific guides and exact source anchors", async () => {
  const commentary = await readJson("public/book-data/ahavat-torah.commentary.json");
  assert.equal(AHAVAT_TORAH_SOURCE.commentaryBundleUrl, getBookReaderManifest("ahavat-torah").commentaryUrl);
  for (let page = 1; page <= 99; page++) assert.equal(ahavatCompanionPage(commentary, page), commentary.pages[page - 1]);
  for (const page of [0, 100, "35", NaN]) assert.equal(ahavatCompanionPage(commentary, page), null);
  assert.equal(ahavatCompanionPage({ ...commentary, source_identity: "foreign" }, 35), null);
  assert.equal(ahavatCompanionPage({ ...commentary, display_label: "דברי הספר" }, 35), null);
  const wrongAnchor = structuredClone(commentary);
  wrongAnchor.pages[34].source_anchor = "#page=34&view=FitH";
  assert.equal(ahavatCompanionPage(wrongAnchor, 35), null);
  const jsx = await readFile(new URL("src/pages/AhavatTorahSystem2029Page.jsx", ROOT), "utf8");
  assert.match(jsx, /ahavatCompanionPage\(companion, page\)/);
  assert.match(jsx, /pageGuide\?\.companion_explanation/);
  assert.match(jsx, /פתח מקור ההסבר · PDF/);
});

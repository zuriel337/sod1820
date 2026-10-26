import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("the Daat Tevunot companion covers all 99 PDF pages and all 195 sections", async () => {
  const commentary = await readJson("public/book-data/daat-tevunot.commentary.json");

  assert.equal(commentary.schema_version, "daat-tevunot-commentary.v1");
  assert.equal(commentary.book_slug, "daat-tevunot");
  assert.equal(commentary.source_identity, "book:daat-tevunot");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.source_layers, {
    book_text: "דברי הספר",
    companion: "הסבר נלווה",
  });
  assert.deepEqual(commentary.coverage, {
    pdf_pages: 99,
    companion_pages: 99,
    source_text_pages: 99,
    mapped_sections: 195,
    status: "complete_first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 99 }, (_, index) => index + 1));
  assert.equal(commentary.pages.reduce((total, item) => total + item.section_ids.length, 0), 195);

  for (const page of commentary.pages) {
    assert.ok(page.title.length > 5, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 140, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }

  assert.match(commentary.pages[0].title, /שער/);
  assert.match(commentary.pages[1].title, /מקור ורישיון/);
  assert.deepEqual(commentary.pages[2].section_ids, [1, 2, 3, 4, 5, 6, 7]);
  assert.match(commentary.pages[88].title, /הנהגת המשפט/);
  assert.deepEqual(commentary.pages[97].section_ids, [195]);
  assert.match(commentary.pages[98].title, /הערת המהדורה/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the Daat Tevunot reader opens its full companion beside the PDF", () => {
  const manifest = getBookReaderManifest("daat-tevunot");
  assert.equal(manifest.commentaryUrl, "/book-data/daat-tevunot.commentary.json");
  assert.equal(manifest.pdfPages, 99);
});

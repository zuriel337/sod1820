import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, ROOT), "utf8"));

test("the Sefer Yetzirah companion covers the full 220-page volume", async () => {
  const commentary = await readJson("public/book-data/sefer-yetzirah.commentary.json");

  assert.equal(commentary.schema_version, "sefer-yetzirah-commentary.v1");
  assert.equal(commentary.book_slug, "sefer-yetzirah");
  assert.equal(commentary.source_identity, "book:sefer-yetzirah-9perushim");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.source_layers, {
    book_text: "דברי הספר",
    printed_commentary: "פירושים מודפסים בכרך",
    companion: "הסבר נלווה",
  });
  assert.deepEqual(commentary.coverage, {
    pdf_pages: 220,
    companion_pages: 220,
    source_text_pages: 207,
    visual_pages: [1, 2, 3, 27, 33, 110, 114, 115, 202, 217, 218, 219, 220],
    mapped_commentators: 9,
    status: "complete_first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 220 }, (_, index) => index + 1));

  for (const page of commentary.pages) {
    assert.ok(page.title.length > 5, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 140, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }

  for (const pageNumber of commentary.coverage.visual_pages) {
    const page = commentary.pages[pageNumber - 1];
    assert.equal(page.source_basis, "visual_source_only");
    assert.match(page.technical_note, /אין שכבת טקסט/);
  }
  assert.match(commentary.pages[28].title, /פתיחת הגוף המשולב/);
  assert.match(commentary.pages[75].title, /כ״ב אותיות/);
  assert.match(commentary.pages[154].title, /ל״ב נתיבות/);
  assert.match(commentary.pages[202].title, /רל״א השערים/);
  assert.match(commentary.pages[215].title, /סליק ספר יצירה/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the Sefer Yetzirah reader exposes commentary and printed voices beside the PDF", () => {
  const manifest = getBookReaderManifest("sefer-yetzirah");
  assert.equal(manifest.commentaryUrl, "/book-data/sefer-yetzirah.commentary.json");
  assert.equal(manifest.pdfPages, 220);
});

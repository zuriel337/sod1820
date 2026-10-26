import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const readJson = async path => JSON.parse(await readText(path));

test("Sefer HaPeli'ah search covers every textual PDF page without filling the visual leaf", async () => {
  const bundle = await readJson("public/book-data/sefer-hapliah.page-text.json");
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "sefer-hapliah");
  assert.equal(bundle.source_identity, "book:hebrewbooks:6355");
  assert.equal(bundle.source_pdf_sha256, "92cb911c36cb1b9c2b3e80607c36455178ae89e3831611bf31da042f5d54bf08");
  assert.equal(bundle.fidelity_status, "machine_candidate_for_search_and_navigation");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 327 }, (_, index) => index + 1));
  assert.equal(bundle.pages.filter(item => item.extraction_status === "machine_candidate").length, 326);
  assert.deepEqual(bundle.pages.filter(item => item.extraction_status === "blank_or_image_only").map(item => item.pdf_page), [3]);
  assert.equal(bundle.pages[2].text, "");
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 1_700_000);
});

test("the source-anchored HaPeli'ah companion covers all 327 PDF pages", async () => {
  const commentary = await readJson("public/book-data/sefer-hapliah.commentary.json");
  assert.equal(commentary.schema_version, "sefer-hapliah-commentary.v1");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.source_layers, {
    book_text: "דברי הספר",
    companion: "הסבר נלווה",
  });
  assert.deepEqual(commentary.coverage, {
    from_pdf_page: 1,
    to_pdf_page: 327,
    status: "complete_first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 327 }, (_, index) => index + 1));
  for (const page of commentary.pages) {
    assert.ok(page.title.length > 5, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 120, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
  }
  assert.equal(commentary.pages[2].source_basis, "visual_blank_page");
  assert.match(commentary.pages[2].technical_note, /אינו כולל טקסט/);
  assert.match(commentary.pages[2].companion_explanation, /דף מעבר ריק/);
  assert.match(commentary.pages.find(item => item.pdf_page === 10).title, /ברא אלהים/);
  assert.match(commentary.pages.find(item => item.pdf_page === 180).title, /אלה תולדות השמים והארץ/);
  assert.match(commentary.pages.find(item => item.pdf_page === 283).title, /הנחש היה ערום/);
  assert.match(commentary.pages.find(item => item.pdf_page === 327).title, /חתימת פרשת בראשית/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the HaPeli'ah map uses source transitions instead of equal page buckets", () => {
  const manifest = getBookReaderManifest("sefer-hapliah");
  assert.equal(manifest.pageTextUrl, "/book-data/sefer-hapliah.page-text.json");
  assert.equal(manifest.commentaryUrl, "/book-data/sefer-hapliah.commentary.json");
  assert.deepEqual(
    manifest.chapters.map(chapter => [chapter.id, chapter.from, chapter.to]),
    [
      ["witness", 1, 9],
      ["bereshit", 10, 83],
      ["light", 84, 92],
      ["palaces", 93, 101],
      ["creation-days", 102, 107],
      ["human-image", 108, 179],
      ["generations-heaven-earth", 180, 219],
      ["torah-law", 220, 276],
      ["serpent", 277, 292],
      ["cain-abel", 293, 309],
      ["adam-noah", 310, 327],
    ],
  );
});

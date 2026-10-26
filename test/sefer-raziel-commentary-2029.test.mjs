import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const readJson = async path => JSON.parse(await readText(path));

test("Raziel page-text inventory covers the complete PDF without treating the diagram as OCR", async () => {
  const bundle = await readJson("public/book-data/sefer-raziel-hamalach.page-text.json");
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "sefer-raziel-hamalach");
  assert.equal(bundle.source_identity, "book:hebrewbooks:23968");
  assert.equal(bundle.fidelity_status, "machine_candidate_for_search_and_navigation");
  assert.equal(bundle.pages.length, 90);
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 90 }, (_, index) => index + 1));
  assert.equal(bundle.pages.filter(item => item.extraction_status === "machine_candidate").length, 89);
  assert.deepEqual(bundle.pages.filter(item => item.extraction_status === "image_only").map(item => item.pdf_page), [35]);
  assert.equal(bundle.pages[34].text, "");
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 350_000);
});

test("the first Raziel companion slice maps every explanation to exact PDF pages 1 through 23", async () => {
  const commentary = await readJson("public/book-data/sefer-raziel-hamalach.commentary.json");
  assert.equal(commentary.schema_version, "sefer-raziel-commentary.v1");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.coverage, {
    from_pdf_page: 1,
    to_pdf_page: 23,
    status: "first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 23 }, (_, index) => index + 1));
  for (const page of commentary.pages) {
    assert.ok(page.title.length > 8, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 90, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
    assert.equal(page.source_basis, "visual_and_embedded_text");
  }
  const voices = commentary.pages.find(item => item.pdf_page === 20);
  assert.match(voices.title, /קע״ד הקולות/);
  assert.match(voices.companion_explanation, /174/);
  assert.doesNotMatch(voices.companion_explanation, /מנוע|אימות/);
  assert.match(voices.technical_note, /אימות מנוע/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the unified reader lazily connects Raziel search and commentary while the PDF remains primary", async () => {
  const [manifest, reader, builder] = await Promise.all([
    readText("src/data/bookReader2029.js"),
    readText("src/components/books2029/BookSourceReader2029.jsx"),
    readText("scripts/build-book-page-text.mjs"),
  ]);
  assert.match(manifest, /pageTextUrl: "\/book-data\/sefer-raziel-hamalach\.page-text\.json"/);
  assert.match(manifest, /commentaryUrl: "\/book-data\/sefer-raziel-hamalach\.commentary\.json"/);
  assert.match(reader, /Promise\.allSettled/);
  assert.match(reader, /חיפוש בדברי הספר/);
  assert.match(reader, /שכבת איתור בלבד/);
  assert.match(reader, /הסבר נלווה · PDF/);
  assert.match(reader, /דברי הספר · PDF/);
  assert.match(reader, /<iframe/);
  assert.match(builder, /pdftotext/);
  assert.doesNotMatch(builder, /tesseract|vision|openai|anthropic/i);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const readText = path => readFile(new URL(path, ROOT), "utf8");
const readJson = async path => JSON.parse(await readText(path));

test("Bahir page-text search covers every textual PDF page without inventing blank leaves", async () => {
  const [bundle, corpus] = await Promise.all([
    readJson("public/book-data/sefer-habahir.page-text.json"),
    readJson("research/sefer-habahir-1883/FULL_CORPUS_MANIFEST.json"),
  ]);
  assert.equal(bundle.schema_version, "book-page-text.v1");
  assert.equal(bundle.book_slug, "sefer-habahir");
  assert.equal(bundle.source_identity, "book:sefer-habahir-1883");
  assert.equal(bundle.source_pdf_sha256, corpus.source.sha256);
  assert.equal(bundle.fidelity_status, "machine_candidate_for_search_and_navigation");
  assert.deepEqual(bundle.pages.map(item => item.pdf_page), Array.from({ length: 48 }, (_, index) => index + 1));
  assert.equal(bundle.pages.filter(item => item.extraction_status === "machine_candidate").length, 45);
  assert.deepEqual(
    bundle.pages.filter(item => item.extraction_status === "blank_or_image_only").map(item => item.pdf_page),
    [45, 46, 48],
  );
  assert.ok(bundle.pages.reduce((total, item) => total + item.character_count, 0) > 200_000);
});

test("the complete Bahir companion separates book, printed commentary and companion explanation", async () => {
  const commentary = await readJson("public/book-data/sefer-habahir.commentary.json");
  assert.equal(commentary.schema_version, "sefer-habahir-commentary.v1");
  assert.equal(commentary.display_label, "הסבר נלווה");
  assert.deepEqual(commentary.source_layers, {
    book_text: "דברי הספר",
    printed_commentary: "פירוש אור הגנוז והגהות מודפסות",
    companion: "הסבר נלווה",
  });
  assert.deepEqual(commentary.coverage, {
    from_pdf_page: 1,
    to_pdf_page: 48,
    status: "complete_first_pass_source_anchored",
  });
  assert.deepEqual(commentary.pages.map(item => item.pdf_page), Array.from({ length: 48 }, (_, index) => index + 1));
  const allowedSourceBasis = new Set([
    "visual_witness_only",
    "visual_blank_leaf",
    "visual_title_page",
    "visual_imprint_page",
    "visual_and_embedded_text",
    "visual_blank_page",
    "visual_cover_only",
  ]);
  for (const page of commentary.pages) {
    assert.ok(page.title.length > 8, `page ${page.pdf_page}`);
    assert.ok(page.companion_explanation.length > 90, `page ${page.pdf_page}`);
    assert.ok(page.reading_points.length >= 2, `page ${page.pdf_page}`);
    assert.equal(page.source_anchor, `#page=${page.pdf_page}&view=FitH`);
    assert.ok(allowedSourceBasis.has(page.source_basis), `page ${page.pdf_page}`);
  }
  assert.match(commentary.pages.find(item => item.pdf_page === 5).technical_note, /דברי הספר/);
  assert.match(commentary.pages.find(item => item.pdf_page === 43).title, /חתימת ספר הבהיר/);
  assert.match(commentary.pages.find(item => item.pdf_page === 44).title, /דבר אל הקורא/);
  assert.deepEqual(
    commentary.pages.filter(item => item.source_basis === "visual_blank_page").map(item => item.pdf_page),
    [45, 46],
  );
  assert.match(commentary.pages.find(item => item.pdf_page === 48).title, /כריכה האחורית/);
  assert.doesNotMatch(JSON.stringify(commentary), /מאומת במנוע/);
});

test("the canonical reader lazily connects Bahir search and commentary", async () => {
  const [manifest, reader] = await Promise.all([
    readText("src/data/bookReader2029.js"),
    readText("src/components/books2029/BookSourceReader2029.jsx"),
  ]);
  assert.match(manifest, /pageTextUrl: "\/book-data\/sefer-habahir\.page-text\.json"/);
  assert.match(manifest, /commentaryUrl: "\/book-data\/sefer-habahir\.commentary\.json"/);
  assert.match(reader, /פירוש מודפס במהדורה/);
  assert.match(reader, /source_layers\.printed_commentary/);
  assert.match(reader, /book-reader29-source-note/);
  assert.match(reader, /דברי הספר · PDF/);
  assert.match(reader, /<iframe/);
});

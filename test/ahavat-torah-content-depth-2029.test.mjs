import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AHAVAT_CONTENT_SOURCE as source, AHAVAT_ATTRIBUTION_WINDOWS as windows, AHAVAT_ATTRIBUTION_METHOD as method, AHAVAT_ERRATA_LINKS as notes } from "../src/data/ahavatTorahContentDepth2029.js";
import { AHAVAT_ROOT_GLYPH_READINGS as readings, ahavatPartiallyReviewedRoots } from "../src/data/ahavatTorahRootsCorrections2029.js";

test("44 printed attribution windows preserve 43 parashot and the single Devarim aggregate", () => {
  assert.equal(windows.length, 44);
  assert.equal(windows.filter(unit => unit.kind === "parasha").length, 43);
  assert.equal(windows.filter(unit => unit.kind === "book_aggregate").length, 1);
  assert.equal(windows.at(-1).id, "ds05:devarim-book");
  assert.deepEqual(["בראשית", "שמות", "ויקרא", "במדבר", "דברים"].map(book => windows.filter(unit => unit.book === book).length), [12, 11, 10, 10, 1]);
  assert.equal(new Set(windows.map(unit => unit.id)).size, 44);
  for (const unit of windows) {
    assert.ok(unit.pdfPages.every(page => Number.isInteger(page) && page >= 25 && page <= 30));
    assert.ok(unit.sourceUrl.endsWith(`#page=${unit.pdfPages[0]}&view=FitH`));
    assert.equal(unit.displayLabel, "הסבר נלווה");
    assert.ok(!("count" in unit) && !("engine_verified" in unit));
  }
  for (const id of ["vayetze", "mishpatim", "balak"]) assert.equal(windows.find(unit => unit.id === `ds05:${id}`).pdfPages.length, 2);
  assert.deepEqual(method.wholeTorahSummaryPages, [30, 31]);
});
test("nine printed editorial notes keep source and target distinct and the unresolved locator null", () => {
  assert.equal(notes.length, 9);
  assert.equal(new Set(notes.map(note => note.id)).size, 9);
  assert.equal(notes.filter(note => note.targetStatus === "source_passage_located").length, 8);
  assert.equal(notes[0].targetPdfPage, null);
  assert.equal(notes[0].targetUrl, null);
  assert.equal(notes.find(note => note.id === "ds12:toldot-final-mem").targetPdfPage, 51);
  assert.equal(notes.find(note => note.id === "ds12:vayeshev-mazalot").targetPdfPage, 55);
  assert.equal(notes.find(note => note.id === "ds12:shoftim-mizbeach").kind, "open_question");
  assert.deepEqual(notes.find(note => note.id === "ds12:ki-tetze-lo-yehyeh").relatedPdfPages, [88, 89]);
  for (const note of notes) {
    assert.equal(note.sourcePdfPage, 99);
    assert.equal(note.sourceLayer, "הגהות מודפסות");
    assert.ok(note.targetPdfPage === null || note.targetPdfPage > 45);
    if (note.targetPdfPage) assert.ok(note.targetUrl.endsWith(`#page=${note.targetPdfPage}&view=FitH`));
  }
});
test("all source-reviewed glyph readings apply exactly once while preserving all ten original OCR columns", async () => {
  const bundle = JSON.parse(await readFile(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url), "utf8"));
  const before = JSON.stringify(bundle);
  const reviewed = ahavatPartiallyReviewedRoots(bundle);
  assert.equal(readings.length, 280);
  assert.equal(reviewed.length, 10);
  assert.equal(new Set(readings.map(item => item.fragmentId)).size, 10);
  assert.equal(reviewed.reduce((sum, item) => sum + item.appliedReadings.length, 0), 280);
  assert.equal(JSON.stringify(bundle), before);
  for (const fragment of reviewed) {
    assert.equal(fragment.status, "partial_proofreading_not_verified_quotation");
    assert.equal(fragment.originalOcr, bundle.fragments.find(item => item.id === fragment.id).text);
    assert.notEqual(fragment.partiallyReviewedText, fragment.originalOcr);
  }
  assert.throws(() => ahavatPartiallyReviewedRoots({ ...bundle, pdf_sha256: "other" }), /Foreign roots source/);
  assert.throws(() => ahavatPartiallyReviewedRoots({ ...bundle, fragments: [] }), /Incomplete roots source/);
  const changed = structuredClone(bundle); changed.fragments[0].text = "changed";
  assert.throws(() => ahavatPartiallyReviewedRoots(changed), /no longer applies/);
});
test("source packet preserves source identity, page bounds and transcription status", () => {
  assert.equal(source.pdfPages, 99);
  assert.equal(source.pdfSha256, "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  assert.ok(notes.every(note => note.targetPdfPage === null || note.targetPdfPage <= source.pdfPages));
  assert.ok(windows.every(unit => unit.transcriptionStatus.includes("not_transcribed")));
});

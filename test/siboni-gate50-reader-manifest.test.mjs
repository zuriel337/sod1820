import test from "node:test";
import assert from "node:assert/strict";
import { getBookReaderManifest, chapterForBookPage } from "../src/data/bookReader2029.js";

const slug = "hamasa-leshaar-hahamishim-zion-siboni";
const expectedSha = "35261bcc661d6364353482c9f911de9c39f203e503a68aa97b680e4a85c77e2c";

test("Siboni Gate 50 refers to the exact second-email book, not the historic edition", () => {
  const m = getBookReaderManifest(slug);
  assert.ok(m);
  assert.equal(m.author, "ציון דוד סיבוני");
  assert.equal(m.pdfPages, 110);
  assert.equal(m.pdfBytes, 1322143);
  assert.equal(m.pdfSha256, expectedSha);
  assert.equal(m.pdfUrl, "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/zion50.pdf");
});

test("Siboni source reader accounts for every PDF page once, including the special appendix", () => {
  const m = getBookReaderManifest(slug);
  assert.equal(m.chapters.length, 12);
  const pages = m.chapters.flatMap(ch => Array.from({ length: ch.to - ch.from + 1 }, (_, i) => ch.from + i));
  assert.deepEqual(pages, Array.from({ length: 110 }, (_, i) => i + 1));
  assert.equal(chapterForBookPage(m, 8).id, "first-gate");
  assert.equal(chapterForBookPage(m, 36).id, "fifth-gate");
  assert.equal(chapterForBookPage(m, 98).id, "special-annex-97");
  assert.equal(chapterForBookPage(m, 110).id, "special-annex-97");
});

test("book identity and numeric provenance stay authored and unpromoted", () => {
  const m = getBookReaderManifest(slug);
  assert.deepEqual(m.readingKeys, [], "public source-mode does not pre-load guide prose");
  assert.equal(m.experience ?? null, null);
});

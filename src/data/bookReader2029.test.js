import assert from "node:assert/strict";
import test from "node:test";
import {
  chapterForBookPage,
  clampBookPage,
  getAllBookReaderManifests,
  getBookReaderManifest,
} from "./bookReader2029.js";

test("unified reader exposes the complete seven-book active collection", () => {
  const manifests = getAllBookReaderManifests();
  assert.equal(manifests.length, 7);
  assert.deepEqual(new Set(manifests.map(item => item.slug)), new Set([
    "ahavat-torah",
    "daat-tevunot",
    "sefer-yetzirah",
    "sefer-raziel-hamalach",
    "sefer-hapliah",
    "sefer-habahir",
    "bentov-brief-tour-higher-consciousness",
  ]));
});

test("every book has a readable PDF, Hebrew orientation and full page coverage", () => {
  for (const manifest of getAllBookReaderManifests()) {
    assert.match(manifest.pdfUrl, /^https:\/\//);
    assert.ok(manifest.pdfPages > 0, manifest.slug);
    assert.ok(manifest.introduction.length > 80, manifest.slug);
    assert.equal(manifest.readingKeys.length, 3, manifest.slug);
    assert.equal(manifest.chapters[0].from, 1, manifest.slug);
    assert.equal(manifest.chapters.at(-1).to, manifest.pdfPages, manifest.slug);

    let expectedPage = 1;
    for (const chapter of manifest.chapters) {
      assert.equal(chapter.from, expectedPage, `${manifest.slug}:${chapter.id}`);
      assert.ok(chapter.to >= chapter.from, `${manifest.slug}:${chapter.id}`);
      assert.ok(chapter.guide.length > 35, `${manifest.slug}:${chapter.id}`);
      expectedPage = chapter.to + 1;
    }
    assert.equal(expectedPage, manifest.pdfPages + 1, manifest.slug);
  }
});

test("page helpers preserve exact reader position within each source", () => {
  const raziel = getBookReaderManifest("sefer-raziel-hamalach");
  assert.equal(clampBookPage(raziel, -8), 1);
  assert.equal(clampBookPage(raziel, 200), 90);
  assert.equal(chapterForBookPage(raziel, 48).id, "names");
  assert.equal(chapterForBookPage(raziel, 68).id, "cosmos");
});

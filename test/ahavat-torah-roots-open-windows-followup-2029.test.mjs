import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { AHAVAT_ROOT_GLYPH_READINGS as readings, AHAVAT_ROOT_OPEN_READINGS as originalWindows, AHAVAT_ROOT_WINDOW_REVIEWS as reviews, ahavatReviewedRootFragments } from "../src/data/ahavatTorahRootsCorrections2029.js";

const bundle = JSON.parse(await readFile(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url), "utf8"));
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("follow-up preserves all 274 adopted reading objects and all eleven original open records", () => {
  assert.equal(digest(readings.slice(0, 274)), "20c42a52377a7b780d159d2f4ce04f37ee54819406e1511316fd94b6bb20817d");
  assert.equal(digest(originalWindows.slice(0, 11)), "1c071ec38c2dd1a6aa1de9f869372c49e4882eab10e4d95ae53bea31f218df06");
  assert.equal(readings.length, 280);
  assert.equal(readings.slice(274).filter(reading => !reading.restoresReadingId).length, 5);
  assert.equal(readings.slice(274).filter(reading => reading.restoresReadingId).length, 1);
});

test("all twelve follow-up outcomes preserve identity, source page, reason and uncertainty", () => {
  assert.equal(reviews.length, 12);
  assert.equal(new Set(reviews.map(review => review.id)).size, 12);
  const counts = Object.fromEntries(["unresolved", "partial_reading", "source_reading", "printed_reading_retained"].map(status => [status, reviews.filter(review => review.status === status).length]));
  assert.deepEqual(counts, { unresolved: 6, partial_reading: 4, source_reading: 1, printed_reading_retained: 1 });
  const fragments = ahavatReviewedRootFragments(bundle);
  assert.equal(fragments.flatMap(fragment => fragment.openReadings).length, 10);
  for (const review of reviews) {
    const original = originalWindows.find(window => window.id === review.openReadingId);
    assert.ok(original);
    assert.equal(original.status, "unresolved", "historical uncertainty is not rewritten");
    assert.equal(original.proposedReading, null);
    assert.equal(review.fragmentId, original.fragmentId);
    assert.equal(review.pdfPage, original.pdfPage);
    assert.ok(review.sourceUrl.endsWith(`#page=${review.pdfPage}&view=FitH`));
    const fragment = fragments.find(item => item.id === review.fragmentId);
    assert.ok(fragment.windowReviews.some(item => item.id === review.id));
    assert.equal(fragment.openReadings.some(item => item.id === review.id), ["unresolved", "partial_reading"].includes(review.status));
    if (review.status === "unresolved") assert.equal(review.reading, null);
    if (review.reading) assert.ok(fragment.text.includes(review.reading));
    assert.equal("engine_verified" in review, false);
    assert.ok(Object.isFrozen(review));
  }
});

test("unsupported dalet/resh correction is withdrawn additively, never silently erased or left active", () => {
  const fragment = ahavatReviewedRootFragments(bundle).find(item => item.id === "roots:35:right");
  const earlier = fragment.readingDetails.find(item => item.id === "roots:35:right:glyph-review:269");
  const restoration = fragment.readingDetails.find(item => item.id === earlier.supersededBy);
  assert.equal(restoration.id, "roots:35:right:glyph-review:280");
  assert.equal(restoration.restoresReadingId, earlier.id);
  assert.equal(restoration.originalOcrAnchor, "לשרים");
  assert.equal(restoration.originalOcrLine, earlier.originalOcrLine);
  assert.equal(restoration.status, "restoration_pending_source_review");
  assert.ok(fragment.text.includes("לשרים"));
  assert.equal(fragment.text.includes("לשדים"), false);
  for (const spelling of ["לשרים", "לשדים"]) assert.ok(ahavatReviewedRootFragments(bundle, spelling).some(item => item.id === fragment.id), "historical searches retain their source identity");
  assert.ok(fragment.openReadings.some(item => item.originalOpenReadingId === "roots:35:right:open-reading:12" && item.reading === null));
});

test("partial glyph readings remain partial and the clear source word is not a guessed shortening", () => {
  const fragments = ahavatReviewedRootFragments(bundle);
  for (const [id, expected] of [["roots:31:left", "כדרתיו"], ["roots:32:right", "אחורניה"], ["roots:32:left", "ומדה במרמה"], ["roots:34:right", "טוו מרי"]]) {
    const fragment = fragments.find(item => item.id === id);
    assert.ok(fragment.text.includes(expected));
    assert.ok(fragment.openReadings.some(item => item.status === "partial_reading" && item.reading === expected));
  }
  const source = fragments.find(item => item.id === "roots:33:left");
  assert.ok(source.text.includes("ובאזרח"));
  assert.ok(source.text.includes("הרחים"));
  assert.equal(source.text.includes("ובארח"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { AHAVAT_ROOT_GLYPH_READINGS as readings, AHAVAT_ROOT_OPEN_READINGS as openReadings, ahavatPartiallyReviewedRoots, ahavatReviewedRootFragments } from "../src/data/ahavatTorahRootsCorrections2029.js";
import { AHAVAT_ROOT_COLUMNS } from "../src/data/ahavatTorahRoots2029.js";

const raw = await readFile(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url));
const bundle = JSON.parse(raw);
const digest = value => createHash("sha256").update(value).digest("hex");

test("source proofreading is additive over the adopted fifteen readings and immutable OCR", () => {
  assert.equal(digest(raw), "c4dc52ea138c99ed33bee9de274e78b0c041fc69fa60b25e95f0224be28108f8");
  assert.equal(digest(JSON.stringify(readings.slice(0, 15))), "0357d557ef97ceda336650102b38d87ea59e821add321b37073c6131fc1f00e0");
  assert.equal(readings.length - 15, 259);
  assert.equal(new Set(readings.map(reading => reading.id)).size, 274);
  assert.ok(Object.isFrozen(readings));
  const reviewed = ahavatPartiallyReviewedRoots(bundle);
  assert.deepEqual(reviewed.map(fragment => fragment.id), AHAVAT_ROOT_COLUMNS.map(column => column.id));
  assert.deepEqual(reviewed.map(fragment => fragment.appliedReadings.length), [28,23,33,48,37,27,31,36,4,7]);
  assert.ok(reviewed.every(fragment => Object.isFrozen(fragment) && Object.isFrozen(fragment.readingDetails)));
});

test("all 274 before/after records retain exact unique OCR positions and their source page", () => {
  for (const fragment of ahavatPartiallyReviewedRoots(bundle)) {
    assert.equal(fragment.readingDetails.length, fragment.appliedReadings.length);
    for (const reading of fragment.readingDetails) {
      assert.equal(fragment.originalOcr.split(reading.before).length, 2, reading.id);
      assert.notEqual(reading.before, reading.after);
      assert.equal(fragment.originalOcr.split("\n")[reading.originalOcrLine - 1].includes(reading.before), true, reading.id);
      assert.equal(fragment.partiallyReviewedText.includes(reading.after), true, reading.id);
      assert.equal(reading.pdfPage, fragment.pdfPage);
      assert.equal(reading.fragmentId, fragment.id);
      assert.match(reading.sourceUrl, new RegExp(`#page=${fragment.pdfPage}&view=FitH$`));
      assert.equal(reading.basis, "direct_visual_source_comparison");
      assert.equal(reading.status, "local_glyph_reading");
      assert.equal("engine_verified" in reading, false);
    }
  }
});

test("eleven bounded unresolved windows remain unchanged and never acquire guessed readings", () => {
  assert.equal(openReadings.length, 11);
  assert.equal(new Set(openReadings.map(reading => reading.fragmentId)).size, 10);
  for (const fragment of ahavatPartiallyReviewedRoots(bundle)) {
    assert.ok(fragment.openReadings.length > 0);
    for (const reading of fragment.openReadings) {
      assert.equal(reading.status, "unresolved");
      assert.equal(reading.proposedReading, null);
      assert.equal(reading.pdfPage, fragment.pdfPage);
      assert.ok(fragment.originalOcr.includes(reading.originalOcr));
      assert.ok(fragment.partiallyReviewedText.includes(reading.originalOcr));
    }
  }
  const source = ahavatReviewedRootFragments(bundle).find(fragment => fragment.id === "roots:33:left");
  assert.ok(source.text.includes("הרחים"), "source-correct OCR must not become a false correction to הרדים");
  assert.ok(source.text.includes("ובאורח"), "unresolved source spelling must not be silently shortened");
});

test("search locates both reading layers for every correction without minting lexical identities", () => {
  for (const reading of readings) for (const query of [reading.before, reading.after]) {
    const match = ahavatReviewedRootFragments(bundle, query).find(fragment => fragment.id === reading.fragmentId);
    assert.ok(match, `${reading.id} ${query}`);
    assert.equal(match.pdf_page, reading.pdfPage);
    assert.ok(match.readingDetails.some(detail => detail.id === reading.id));
  }
  assert.equal(ahavatReviewedRootFragments(bundle).length, 10, "corrections are not a fabricated count of roots");
});

test("ambiguous or missing replacement windows fail closed rather than silently applying twice", () => {
  for (const reading of [readings[15], readings.at(-1)]) {
    const duplicate = structuredClone(bundle);
    duplicate.fragments.find(fragment => fragment.id === reading.fragmentId).text += `\n${reading.before}`;
    assert.throws(() => ahavatPartiallyReviewedRoots(duplicate), /no longer applies/);
    const missing = structuredClone(bundle);
    const fragment = missing.fragments.find(item => item.id === reading.fragmentId);
    fragment.text = fragment.text.replace(reading.before, "[changed]");
    assert.throws(() => ahavatPartiallyReviewedRoots(missing), /no longer applies/);
  }
  const changed = structuredClone(bundle);
  changed.fragments[0].text = changed.fragments[0].text.replace(openReadings[0].originalOcr, "[changed]");
  assert.throws(() => ahavatPartiallyReviewedRoots(changed), /Open source window/);
});

test("the existing reader mounts comparison records only on explicit expansion", async () => {
  const reader = await readFile(new URL("../src/components/books2029/AhavatTorahSourceTables2029.jsx", import.meta.url), "utf8");
  assert.match(reader, /const \[showReadings, setShowReadings\] = useState\(false\)/);
  assert.match(reader, /showReadings \? <ol/);
  assert.match(reader, /data-root-reading=\{reading.id\}/);
  assert.match(reader, /originalOcrLine/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { AHAVAT_ROOT_GLYPH_READINGS, ahavatReviewedRootFragments } from "../src/data/ahavatTorahRootsCorrections2029.js";

const bundle = JSON.parse(await readFile(new URL("../public/book-data/ahavat-torah.roots.json", import.meta.url), "utf8"));
test("reviewed reading preserves all ten source identities and the untouched OCR", () => {
  const original = JSON.stringify(bundle);
  const fragments = ahavatReviewedRootFragments(bundle);
  assert.deepEqual(fragments.map(item => item.id), bundle.fragments.map(item => item.id));
  assert.equal(fragments.reduce((total, item) => total + item.appliedReadings.length, 0), 15);
  for (const fragment of fragments) {
    assert.equal(fragment.originalOcr, bundle.fragments.find(item => item.id === fragment.id).text);
    assert.equal(fragment.reviewStatus, "partial_proofreading_not_verified_quotation");
  }
  assert.equal(JSON.stringify(bundle), original);
});
test("both corrected and original glyph searches resolve to their original source column", () => {
  for (const reading of AHAVAT_ROOT_GLYPH_READINGS) {
    assert.ok(ahavatReviewedRootFragments(bundle, reading.after).some(fragment => fragment.id === reading.fragmentId));
    assert.ok(ahavatReviewedRootFragments(bundle, reading.before).some(fragment => fragment.id === reading.fragmentId));
  }
  assert.deepEqual(ahavatReviewedRootFragments(null), []);
  assert.deepEqual(ahavatReviewedRootFragments(bundle, "לאנמצאבספראיזהטקסט"), []);
});
test("mismatched source bytes or column identity cannot be presented as reviewed text", () => {
  assert.throws(() => ahavatReviewedRootFragments({ ...bundle, pdf_sha256: "other" }), /Foreign roots source/);
  const changed = structuredClone(bundle); changed.fragments[0].column = "left";
  assert.throws(() => ahavatReviewedRootFragments(changed), /Foreign roots column/);
});

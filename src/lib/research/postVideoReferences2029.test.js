import test from "node:test";
import assert from "node:assert/strict";
import { occurrencesForNumber, videoRefBySrc, videoReferencesForPost } from "./postVideoReferences2029.js";

test("1437 has TWO separate occurrences in the Sharshar crown video context and they are not merged", () => {
  const found = occurrencesForNumber(5107, 1437, { postHref: "/post/sharshar-elections-redemption-hints-draft" });
  assert.deepEqual(found.map((o) => o.id), ["crown-1437-likes", "crown-1437-caption"]);
  const [likes, caption] = found;
  assert.deepEqual([likes.nature, likes.gematria, likes.text], ["on_screen_count", false, "1,437 לייקים"]);
  assert.deepEqual([caption.nature, caption.gematria, caption.text], ["unit_caption", true, "1437 = משיח הויה"]);
  assert.equal(caption.unitHref, "/post/sharshar-elections-redemption-hints-draft#knesset-sworn-1234-1011");
  assert.equal(likes.unitHref, null);
});

test("an unknown time never becomes a made-up second", () => {
  for (const occ of occurrencesForNumber(5107, 1437)) {
    assert.equal(occ.timeKnown, false);
    assert.equal(occ.videoOpenHref.includes("#t="), false);
  }
});

test("the new crown video is honestly reported as not catalogued; the old one and the plane videos are catalogued", () => {
  assert.equal(videoRefBySrc(5107, "/media/posts/2026-11-sharshar-crown/sharshar-crown.mp4").catalog.status, "not_catalogued");
  assert.equal(videoRefBySrc(5107, "https://sod1820.co.il/media/posts/2026-11-sharshar-crown/sharshar-crown.mp4?x=1").id, "sharshar-crown");
  assert.equal(videoReferencesForPost(5107).filter((v) => v.catalog.status === "catalogued").length, 1);
  assert.deepEqual(videoReferencesForPost(5112).map((v) => v.catalog.status), ["catalogued", "catalogued"]);
  assert.deepEqual(occurrencesForNumber(5112, 1073), []);
});

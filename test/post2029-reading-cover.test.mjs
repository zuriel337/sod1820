import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");

test("Post2029Page renders the cover through the shared media kit with sharp image_url as primary", () => {
  assert.match(src, /import CanonicalMediaFigure2029 from/);
  assert.match(src, /<CanonicalMediaFigure2029 item=\{coverItem\} primary/);
  assert.match(src, /imageUrl,\s*\n?\s*thumbUrl/);
  assert.doesNotMatch(src, /object-fit:\s*cover/);
});

test("cover item uses image_url for reading and keeps thumb_url as preview only", async () => {
  const m = src.match(/export function postReadingCoverItem[\s\S]*?\n}\n/)[0];
  const fn = new Function("humanContentTitle", m.replace("export function", "return function"))((t) => t);
  assert.equal(fn({ title: "x" }), null);
  const item = fn({ title: "x", image_url: " a/reading-v2.jpg ", thumb_url: "a/thumb.jpg" });
  assert.equal(item.imageUrl, "a/reading-v2.jpg");
  assert.equal(item.thumbUrl, "a/thumb.jpg");
  assert.equal(item.intrinsic.representation.imageUrl, "a/reading-v2.jpg");
  assert.equal(item.mediaId, "");
});

import test from "node:test";
import assert from "node:assert/strict";
import { mobileReadingRenditionUrl as r } from "./mobileReadingImage2029.js";

const S = "https://linswmnnkjxvweumprav.supabase.co";
const ORIG = `${S}/storage/v1/object/public/media/sod1820/2029/image/2026/10/post-5116-cover-20261012/reading-v2.jpg`;
const o = { supabaseUrl: S, primary: true };

test("eligible original maps to native render URL", () => {
  assert.equal(r(ORIG, o), ORIG.replace("/object/public/", "/render/image/public/") + "?width=768&resize=contain&quality=90&format=origin");
});
test("gates: non-primary, thumbnail, missing config, non-string", () => {
  assert.equal(r(ORIG, { supabaseUrl: S }), null);
  assert.equal(r(ORIG, { ...o, thumbnail: true }), null);
  assert.equal(r(ORIG, { primary: true }), null);
  assert.equal(r(null, o), null);
});
test("gates: external origin, http, lookalike host", () => {
  assert.equal(r(ORIG.replace(S, "https://example.com"), o), null);
  assert.equal(r(ORIG.replace("https:", "http:"), o), null);
  assert.equal(r(ORIG.replace(S, S + ".evil.com"), o), null);
  assert.equal(r(ORIG.replace("https://", "https://u:p@"), o), null);
});
test("gates: query, signature, hash, private/sign paths", () => {
  assert.equal(r(ORIG + "?token=x", o), null);
  assert.equal(r(ORIG + "#a", o), null);
  assert.equal(r(ORIG.replace("/object/public/", "/object/sign/"), o), null);
  assert.equal(r(ORIG.replace("/public/media/", "/public/private/"), o), null);
});
test("gates: path/version shape", () => {
  assert.equal(r(ORIG.replace("reading-v2.jpg", "reading.jpg"), o), null);
  assert.equal(r(ORIG.replace("reading-v2.jpg", "reading-v2.png"), o), null);
  assert.equal(r(ORIG.replace("/2029/image/", "/2029/video/"), o), null);
  assert.equal(r(ORIG.replace("/2026/10/", "/../"), o), null);
  assert.equal(r(ORIG.replace("/2026/10/", "/2026//10/"), o), null);
  assert.equal(r("not a url", o), null);
});

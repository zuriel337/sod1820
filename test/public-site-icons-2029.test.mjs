import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { BRAND_LOCKUP_2029, BRAND_SITE_ICONS_2029 as ICONS } from "../src/lib/brandAssets2029.js";

const bytes = (path) => readFileSync(new URL("../" + path, import.meta.url));
const config = JSON.parse(bytes("public-reading-deploy/vercel.json"));
const fingerprint = BRAND_LOCKUP_2029.sha256.slice(0, 12);

test("site icons are resize-only derivatives of the one approved lockup, fingerprinted to its source", () => {
  assert.equal(ICONS.sourceSha256, BRAND_LOCKUP_2029.sha256);
  for (const icon of [ICONS.png48, ICONS.appleTouch180, ICONS.ico]) assert.ok(icon.src.includes(fingerprint), icon.src);
  for (const [icon, size] of [[ICONS.png48, 48], [ICONS.appleTouch180, 180]]) {
    const png = bytes("public" + icon.src);
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
    assert.equal(icon.width, size); assert.equal(icon.height, size);
  }
  const ico = bytes("public" + ICONS.ico.src);
  assert.equal(ico.readUInt16LE(0), 0); assert.equal(ico.readUInt16LE(2), 1);
  const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b);
  assert.deepEqual(sizes, [16, 32, 48]);
});

test("production answers /favicon.ico and /apple-touch-icon*.png with the new logo, not the document", () => {
  const sources = config.rewrites.map(row => row.source);
  const catchAll = sources.findIndex(source => source.startsWith("/((?!api"));
  const destinations = { "/favicon.ico": ICONS.ico.src, "/apple-touch-icon.png": ICONS.appleTouch180.src, "/apple-touch-icon-precomposed.png": ICONS.appleTouch180.src };
  for (const [source, destination] of Object.entries(destinations)) {
    const index = sources.indexOf(source);
    assert.ok(index >= 0 && index < catchAll, source + " must precede the document catch-all");
    assert.equal(config.rewrites[index].destination, destination);
    assert.ok(existsSync(new URL("../public" + destination, import.meta.url)), destination);
  }
  const cache = config.headers.find(row => row.source.includes("favicon.ico"));
  assert.deepEqual(cache.headers, [{ key: "Cache-Control", value: "public, max-age=86400" }]);
});

test("the built document declares the new icons without dropping the approved ones", () => {
  assert.ok(existsSync(new URL("../public-reading-deploy/.generated/2029.html", import.meta.url)), "run node scripts/build-public-reading-production.mjs before this test");
  const html = bytes("public-reading-deploy/.generated/2029.html").toString();
  assert.ok(html.includes(`<link rel="icon" href="${ICONS.png48.src}" type="image/png" sizes="48x48" />`));
  assert.ok(html.includes('<link rel="shortcut icon" href="/favicon.ico" />'));
  assert.ok(html.includes('<link rel="icon" href="/brand/2029/canonical-lockup-128.webp"'));
  assert.ok(html.includes('<link rel="apple-touch-icon" href="/brand/2029/app-icon-3f8a2a2fdc0a.png" />'));
});

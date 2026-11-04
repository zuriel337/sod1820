import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BRAND_APP_ICON_2029, BRAND_LOCKUP_2029, BRAND_LOCKUP_NAV_2029 } from "../src/lib/brandAssets2029.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url));

test("installed application serves the entire approved logo, byte for byte", () => {
  const bytes = read("public" + BRAND_APP_ICON_2029.src);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), BRAND_LOCKUP_2029.sha256);
  assert.equal(bytes.subarray(1, 4).toString(), "PNG");
  assert.equal(bytes.readUInt32BE(16), BRAND_LOCKUP_2029.width);
  assert.equal(bytes.readUInt32BE(20), BRAND_LOCKUP_2029.height);
});

test("built application keeps its installed identity and serves the approved icon in manifest and Apple metadata", () => {
  const legacy = JSON.parse(read("public/site.webmanifest"));
  const built = JSON.parse(read("public-reading-deploy/dist/site.webmanifest"));
  const { icons: _legacyIcons, id: _legacyId, ...identity } = legacy;
  const { icons, id, ...builtIdentity } = built;
  assert.deepEqual(builtIdentity, identity);
  assert.equal(id, legacy.id || legacy.start_url);
  assert.deepEqual(icons, [{ src: BRAND_APP_ICON_2029.src,
    sizes: `${BRAND_APP_ICON_2029.width}x${BRAND_APP_ICON_2029.height}`, type: "image/png", purpose: "any" }]);
  assert.equal(createHash("sha256").update(read("public-reading-deploy/dist" + icons[0].src)).digest("hex"), BRAND_LOCKUP_2029.sha256);
  const html = read("public-reading-deploy/.generated/2029.html").toString();
  assert.ok(html.includes(`<link rel="apple-touch-icon" href="${BRAND_APP_ICON_2029.src}" />`));
  assert.ok(html.includes(`<link rel="icon" href="${BRAND_LOCKUP_NAV_2029.src}"`));
});

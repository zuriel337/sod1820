import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BRAND_CARD_2029, BRAND_LOCKUP_2029 } from "../src/lib/brandAssets2029.js";

test("the card renderer packages the approved complete lockup", () => {
  assert.equal(BRAND_CARD_2029.sourceSha256, BRAND_LOCKUP_2029.sha256);
  const png = readFileSync(new URL("../" + BRAND_CARD_2029.path, import.meta.url));
  assert.equal(createHash("sha256").update(png).digest("hex"), BRAND_CARD_2029.sha256);
  const api = readFileSync(new URL("../api/card.js", import.meta.url), "utf8");
  assert.ok(api.includes("new URL('./_assets/logo.png', import.meta.url)"));
});

test("Now's site mark follows the navigation lockup", () => {
  const now = readFileSync(new URL("../src/lib/nowPublications2029.js", import.meta.url), "utf8");
  assert.match(now, /site: Object\.freeze\(\{ src: BRAND_LOCKUP_NAV_2029\.src/);
  assert.doesNotMatch(now, /source-logos\/site\.webp/);
});

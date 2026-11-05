import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { centerInRail } from "../src/components/beitMidrash2029/centerInRail.js";

// Live finding after the 5.11 publish: opening /beit-midrash scrolled the page down about 2300 px by itself and then
// shifted the sections in view (CLS 0.66 on a phone). The strips called Element.scrollIntoView on mount, which also scrolls
// the page; the strips must only move their own scroll position.
const rail = (over = {}) => ({ scrollWidth: 1000, clientWidth: 300, scrollLeft: 0, getBoundingClientRect: () => ({ left: 0, width: 300 }), ...over });
const item = (left, width = 100) => ({ getBoundingClientRect: () => ({ left, width }), scrollIntoView() { throw new Error("scrollIntoView moves the page"); } });

test("centers the item by changing the rail's own scroll position only", () => {
  const r = rail();
  centerInRail(r, item(600));
  assert.equal(r.scrollLeft, 500, "item centre 650 against rail centre 150");
});

test("works in both directions (the document is right-to-left, so scroll offsets can be negative)", () => {
  const r = rail({ scrollLeft: -200 });
  centerInRail(r, item(-300));
  assert.equal(r.scrollLeft, -600, "item centre -250 against rail centre 150");
});

test("leaves everything alone when there is nothing to scroll, nothing to center, or no input", () => {
  const fits = rail({ scrollWidth: 300 });
  centerInRail(fits, item(600));
  assert.equal(fits.scrollLeft, 0);
  const centered = rail();
  centerInRail(centered, item(100));
  assert.equal(centered.scrollLeft, 0);
  assert.doesNotThrow(() => { centerInRail(null, item(0)); centerInRail(rail(), null); centerInRail(); });
});

test("the Beit Midrash strips use the rail helper and never scrollIntoView", () => {
  for (const file of ["BeitMidrashIllustrations.jsx", "BeitMidrashMethods.jsx"]) {
    const source = readFileSync(new URL(`../src/components/beitMidrash2029/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /scrollIntoView/, `${file} must not scroll the page`);
    assert.match(source, /centerInRail\(/, `${file} must center within its own rail`);
  }
});

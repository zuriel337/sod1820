// Awakening (arrival cue, replaces the entrance intro): once per page load, only after a real wait, decorative, never for reduced motion.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AWAKENING_MIN_WAIT_MS, AWAKENING_MS, shouldPlayAwakening } from "../src/components/experience2029/awakening2029.js";
import { BRAND_LOCKUP_2029, BRAND_LOCKUP_HERO_2029 } from "../src/lib/brandAssets2029.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("plays only when the visitor really waited", () => {
  assert.equal(shouldPlayAwakening({ waitedMs: AWAKENING_MIN_WAIT_MS }), true);
  assert.equal(shouldPlayAwakening({ waitedMs: AWAKENING_MIN_WAIT_MS - 1 }), false, "a fast warm load shows no opening, so no cue");
  assert.equal(shouldPlayAwakening({}), false);
  assert.ok(AWAKENING_MIN_WAIT_MS >= 500 && AWAKENING_MIN_WAIT_MS <= 1000);
  assert.ok(AWAKENING_MS >= 800 && AWAKENING_MS <= 1500);
});

test("reduced motion and a scrolled page never play, even on request; automated browsers skip; ?entrance=1 replays on demand", () => {
  assert.equal(shouldPlayAwakening({ reducedMotion: true, waitedMs: 5000 }), false);
  assert.equal(shouldPlayAwakening({ reducedMotion: true, waitedMs: 5000, search: "?entrance=1" }), false);
  assert.equal(shouldPlayAwakening({ scrolled: true, waitedMs: 5000 }), false);
  assert.equal(shouldPlayAwakening({ scrolled: true, search: "?entrance=1" }), false);
  assert.equal(shouldPlayAwakening({ webdriver: true, waitedMs: 5000 }), false);
  assert.equal(shouldPlayAwakening({ webdriver: true, search: "?a=1&entrance=1" }), true);
  assert.equal(shouldPlayAwakening({ search: "?entrance=1" }), true);
  assert.equal(shouldPlayAwakening({ search: "?entrance=2", waitedMs: 0 }), false);
});

test("the layer is decorative, in document.body, click-through, and animates only transform/opacity/mask/stroke", () => {
  const css = read("src/components/experience2029/awakening2029.css");
  assert.match(css, /\.wk29\{[^}]*position:fixed/);
  assert.match(css, /\.wk29\{[^}]*pointer-events:none/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.wk29\{display:none\}/);
  const keyframes = (css.match(/@keyframes[\s\S]*?\}\}/g) || []).join("");
  assert.ok(keyframes.length > 0);
  for (const bad of ["width:", "height:", "top:", "left:", "margin"]) assert.ok(!keyframes.includes(bad), `keyframes must not animate layout (${bad})`);
  const component = read("src/components/experience2029/Awakening2029.jsx");
  assert.match(component, /aria-hidden", "true"/);
  assert.match(component, /document\.body\.appendChild\(layer\)/);
  assert.match(component, /MutationObserver/, "reacts in the task that inserts the frame, before its first paint");
  assert.match(component, /let finished = false/, "once per page load");
  assert.match(component, /\.sod29-opening/, "only after the opening was replaced");
  assert.doesNotMatch(component, /setInterval/);
});

test("mounted once for the whole app; the entrance intro with its second crown is gone", () => {
  assert.match(read("src/App2029.jsx"), /<Awakening2029 \/>/);
  assert.doesNotMatch(read("src/components/experience2029/HomeComposition2029.jsx"), /EntranceIntro2029/);
  assert.throws(() => readFileSync(new URL("../src/components/experience2029/EntranceIntro2029.jsx", import.meta.url)));
});

test("the hero lockup derivative is still the complete approved lockup (fingerprinted source, no crop)", () => {
  const source = readFileSync(new URL("../public/brand/2029/app-icon-3f8a2a2fdc0a.png", import.meta.url));
  assert.equal(createHash("sha256").update(source).digest("hex"), BRAND_LOCKUP_2029.sha256);
  assert.equal(BRAND_LOCKUP_HERO_2029.sourceSha256, BRAND_LOCKUP_2029.sha256);
  assert.equal(BRAND_LOCKUP_HERO_2029.width, BRAND_LOCKUP_HERO_2029.height);
});

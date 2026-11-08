// Entrance intro: once per session, decorative, never blocks, never for reduced motion; the logo is the complete approved one.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ENTRANCE_INTRO_MS, shouldPlayEntranceIntro } from "../src/components/experience2029/entranceIntro2029.js";
import { BRAND_LOCKUP_2029, BRAND_LOCKUP_HERO_2029 } from "../src/lib/brandAssets2029.js";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("plays once per session for a normal visitor and never again after it was seen", () => {
  assert.equal(shouldPlayEntranceIntro({}), true);
  assert.equal(shouldPlayEntranceIntro({ seen: true }), false);
});

test("reduced motion never plays, even on request; automated browsers skip; ?entrance=1 replays on demand", () => {
  assert.equal(shouldPlayEntranceIntro({ reducedMotion: true }), false);
  assert.equal(shouldPlayEntranceIntro({ reducedMotion: true, search: "?entrance=1" }), false);
  assert.equal(shouldPlayEntranceIntro({ webdriver: true }), false);
  assert.equal(shouldPlayEntranceIntro({ seen: true, search: "?entrance=1" }), true);
  assert.equal(shouldPlayEntranceIntro({ webdriver: true, search: "?a=1&entrance=1" }), true);
  assert.equal(shouldPlayEntranceIntro({ search: "?entrance=2" }), true, "no flag, but a normal first visit still plays");
  assert.equal(shouldPlayEntranceIntro({ seen: true, search: "?entrance=2" }), false);
});

test("the overlay is decorative, fixed, click-through, transform/opacity only and removed after the animation", () => {
  const css = read("src/components/experience2029/entranceIntro2029.css");
  assert.match(css, /\.e29\{[^}]*position:fixed/);
  assert.match(css, /\.e29\{[^}]*pointer-events:none/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{\.e29\{display:none\}/);
  for (const bad of ["width:", "height:", "top:", "left:", "margin"]) {
    const keyframes = css.match(/@keyframes[\s\S]*?\}\}/g).join("");
    assert.ok(!keyframes.includes(bad), `keyframes must not animate layout (${bad})`);
  }
  const component = read("src/components/experience2029/EntranceIntro2029.jsx");
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /useState\(decide\)/, "decided before the first paint");
  assert.match(component, /ENTRANCE_INTRO_MS \+ 150/);
  assert.ok(ENTRANCE_INTRO_MS >= 1200 && ENTRANCE_INTRO_MS <= 2000);
  assert.match(read("src/components/experience2029/HomeComposition2029.jsx"), /<EntranceIntro2029 \/>/);
});

test("the intro logo is the complete approved lockup (fingerprinted source, delivery derivative, no crop)", () => {
  const source = readFileSync(new URL("../public/brand/2029/app-icon-3f8a2a2fdc0a.png", import.meta.url));
  assert.equal(createHash("sha256").update(source).digest("hex"), BRAND_LOCKUP_2029.sha256);
  assert.equal(BRAND_LOCKUP_HERO_2029.sourceSha256, BRAND_LOCKUP_2029.sha256);
  assert.equal(BRAND_LOCKUP_HERO_2029.alt, BRAND_LOCKUP_2029.alt);
  const derivative = readFileSync(new URL("../public" + BRAND_LOCKUP_HERO_2029.src, import.meta.url));
  assert.equal(derivative.subarray(0, 4).toString(), "RIFF");
  assert.equal(derivative.subarray(8, 12).toString(), "WEBP");
  assert.ok(derivative.length > 20_000 && derivative.length < 120_000, `derivative size ${derivative.length}`);
  // square source and square derivative: a crop would change the aspect ratio
  assert.equal(BRAND_LOCKUP_HERO_2029.width, BRAND_LOCKUP_HERO_2029.height);
  assert.equal(BRAND_LOCKUP_2029.width, BRAND_LOCKUP_2029.height);
});

test("one crown: the overlay clones the header crown, hides the real one while it travels, and never waits for a slow image", () => {
  const component = read("src/components/experience2029/EntranceIntro2029.jsx");
  const css = read("src/components/experience2029/entranceIntro2029.css");
  assert.match(component, /\.sod29-header-crown img/, "starts exactly on the header crown");
  assert.match(component, /data-entrance-crown/, "the real crown is hidden only while the clone travels");
  assert.match(css, /html\[data-entrance-crown="playing"\] \.sod29-header-crown img\{visibility:hidden\}/);
  assert.match(component, /pointerdown/, "a tap ends the intro");
  assert.match(component, /DECODE_WAIT_MS/, "skipped, not waited for, when the larger image is slow");
  assert.match(component, /transform:/);
  assert.doesNotMatch(component.replace(/Object\.assign\(img\.style[^\n]*\n/, ""), /(left|top|width|height):\s*["'`$]/, "no layout property is animated");
});

// ELS home entrance card - static contract (Design V2, performance and scope guards).
// The real-browser acceptance lives in test/els-home-card-2029.browser.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const jsx = fs.readFileSync("src/components/experience2029/ElsRotatingMatrixCard2029.jsx", "utf8");
const css = fs.readFileSync("src/components/experience2029/elsRotatingMatrixCard2029.css", "utf8");
const composition = fs.readFileSync("src/components/experience2029/HomeComposition2029.jsx", "utf8");
const home = fs.readFileSync("src/pages/Home2029Page.jsx", "utf8");
const app = fs.readFileSync("src/App2029.jsx", "utf8");
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const code = stripComments(jsx);
const rules = stripComments(css);

test("colours come from the palette owner and host tokens, never literals", () => {
  assert.doesNotMatch(rules, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(rules, /\b(?:rgb|rgba|hsl|hsla)\(/);
  assert.match(code, /DESIGN_V2_PALETTES\.dark/);
  assert.doesNotMatch(code, /#[0-9a-fA-F]{3,8}\b/);
});

test("cheap presentation only: no filter/backdrop blur, WebGL, canvas, media, remote URL or new asset", () => {
  // Measured: drop-shadow/blur filters on the large matrix layers dominated frame time (see the receipt).
  assert.doesNotMatch(rules, /(?:^|[\s;{])(?:-webkit-)?(?:backdrop-)?filter\s*:/i);
  assert.doesNotMatch(rules, /url\(|@import|image-set|<video|<canvas|\bcanvas\b/i);
  assert.doesNotMatch(code, /WebGL|getContext|<canvas|<video|<img|three|gsap|framer-motion|lottie|new Worker|fetch\(/i);
});

test("one ambient motion: a single keyframe set that animates transform only", () => {
  const frames = [...rules.matchAll(/@keyframes\s+([\w-]+)\s*{([\s\S]*?)}\s*(?=@keyframes|\.|\/\*|$)/g)];
  assert.equal(frames.length, 1);
  assert.equal((rules.match(/animation:\s*els-/g) || []).length, 1);
  for (const [, name, body] of frames) {
    const properties = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    assert.ok(properties.length && properties.every((p) => p === "transform"), `${name}: ${properties}`);
  }
});

test("motion respects OS and frame preferences, pauses off-screen / hidden tab / by the user", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  assert.match(css, /\.sod29-root\[data-frame-reduced-motion="true"\][^{]*\.els-hm[^{]*{[^}]*animation: none/);
  assert.match(css, /data-els-motion="paused"[^{]*{[^}]*animation-play-state: paused/);
  assert.match(css, /\.els-hm__layer\.is-back \{\s*transform: scale\(1\.12\)/); // the far layer is flat: one perspective layer per frame
  assert.match(code, /IntersectionObserver/);
  assert.match(code, /visibilitychange/);
  assert.match(code, /prefers-reduced-motion: reduce/);
  assert.match(code, /<button[\s\S]*aria-pressed=\{userPaused\}[\s\S]*aria-label="השהיית תנועת המטריצה"/);
});

test("the matrix is decoration; title, sentence and action are live UI", () => {
  assert.match(code, /className="els-hm__stage" aria-hidden="true"/);
  assert.match(code, /<h2 id="els-hm-title"[^>]*>\{ELS_CARD_TITLE\}<\/h2>/);
  assert.match(code, /<p className="els-hm__sentence">\{ELS_CARD_SENTENCE\}<\/p>/);
  assert.match(code, /<Link className="h29-btn is-primary els-hm__cta" to=\{ELS_CARD_HREF\}>/);
  assert.match(code, /export const ELS_CARD_TITLE = "חיפוש בצופן התנ״כי"/);
  assert.match(code, /export const ELS_CARD_ACTION = "פתח את הצופן"/);
  assert.match(code, /export const ELS_CARD_NOTE = "מטריצה להמחשה"/);
  assert.match(code, /export const ELS_CARD_HREF = "\/code"/);
  assert.doesNotMatch(code, /Math\.random/, "decoration must be deterministic");
});

test("subtitle is exactly the wording ZURIEL specified (explicit Human Gate decision, 31.10.2026)", () => {
  assert.match(code, /export const ELS_CARD_SENTENCE = "AI · מנוע חיפוש עוצמתי";/);
  // Recorded caveat, kept visible so a later owner can revisit it: the ELS page itself says "no AI guessing".
  const guided = fs.readFileSync("src/components/experience2029/ElsGuidedDiscovery2029.jsx", "utf8");
  assert.match(guided, /בלי ניחוש של AI/);
});

test("availability is the existing feature state - nothing is enabled locally", () => {
  assert.match(code, /useFeatureState\("lock_els"\)/);
  assert.match(code, /from "\.\.\/MaintenanceLock\.jsx"/);
  assert.match(code, /state\.loading/);
  assert.match(code, /state\.blocked/);
  assert.doesNotMatch(code, /enabled\s*[:=]\s*(true|false)/);
  // the closed/loading states are non-link elements; the link exists only in the open branch
  assert.equal((code.match(/<Link /g) || []).length, 1);
});

test("no ELS engine, scan, AI, Supabase or result reader is imported by the card", () => {
  const imports = [...code.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["../../lib/palette.js", "../MaintenanceLock.jsx", "react", "react-router-dom"].sort());
  assert.match(code, /import "\.\/elsRotatingMatrixCard2029\.css";/);
});

test("/code is the existing 2029 route of the cipher", () => {
  assert.match(app, /<Route path="\/code" element={<Els2029Page \/>} \/>/);
});

test("integration is one optional slot and one callsite; hero, posts and stream are untouched", () => {
  assert.equal((composition.match(/elsEntry/g) || []).length, 3); // prop name, truthiness check, rendered child
  assert.match(composition, /\{elsEntry \? <Reveal id="els-entry">\{elsEntry\}<\/Reveal> : null\}/);
  assert.ok(composition.indexOf("elsEntry ? <Reveal") > composition.indexOf("story ? <Reveal"));
  assert.ok(composition.indexOf("elsEntry ? <Reveal") < composition.indexOf('<Section label="צפנים וסרטים">'));
  assert.match(home, /elsEntry=\{<ElsRotatingMatrixCard2029 \/>\}/);
  assert.equal((home.match(/ElsRotatingMatrixCard2029/g) || []).length, 3); // import (name + path) and one callsite
});

test("layout is stable and centered: fixed ratio on mobile, min height on wide, no pinned dead field", () => {
  assert.match(css, /aspect-ratio: 5 \/ 4/);
  assert.match(css, /min-block-size: 410px/);
  assert.match(css, /@container els-hm \(min-width: 720px\)/);
  assert.match(css, /\.sod29-root\[dir="ltr"\] \.els-hm/);
  assert.match(css, /min-height: 48px/);
});

// SOD1820_DESIGN_CONTRACT_V2 §14.10 (Human Gate ZURIEL 20.11.2026): every Post, present and future, gets the reading colour, its series
// colour and video-first without a per-Post list. These checks keep the rules derived from facts the Post carries.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { postReadingCoverYieldsToVideo2029 } from "../src/lib/research/postArticleCore2029.js";
import { POST_BACKGROUND_ASSETS_2029 } from "../src/lib/research/postBackground2029.js";

const css = readFileSync(new URL("../src/pages/post2029-legacy-grade.css", import.meta.url), "utf8");
const contract = readFileSync(new URL("../SOD1820_DESIGN_CONTRACT_V2.md", import.meta.url), "utf8");

test("video first: a Post whose body carries its own video has no separate cover figure", () => {
  assert.equal(postReadingCoverYieldsToVideo2029({ content: '<div><video controls src="x.mp4"></video></div>' }), true);
  assert.equal(postReadingCoverYieldsToVideo2029({ content: "<VIDEO>" }), true);
  assert.equal(postReadingCoverYieldsToVideo2029({ content: '<p>no video here</p><img src="a.jpg">' }), false);
  assert.equal(postReadingCoverYieldsToVideo2029({ content: "<p>a videographer</p>" }), false, "a word is not a video element");
  assert.equal(postReadingCoverYieldsToVideo2029(null), false);
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  const documentSource = readFileSync(new URL("../src/lib/research/postArticleDocument2029.js", import.meta.url), "utf8");
  assert.match(page, /postReadingCoverYieldsToVideo2029\(post\) \? null : postReadingCoverItem\(post\)/);
  assert.match(documentSource, /!postReadingCoverYieldsToVideo2029\(post\)/, "the first-document article follows the same rule");
});

test("reading colour applies to every Post in every theme and spares authored colour, panels and Matrix", () => {
  for (const value of ["#ede4d3", "#f6e27a", "#e8c840", "#7a4a00", "#8a5a0a", "#3a2a18"]) assert.ok(css.includes(value), value);
  assert.match(css, /\.sod29-reading-post\[data-post-character\]:not\(\[data-post-character="matrix"\]\)\{/);
  assert.match(css, /:not\(\[data-legacy-color\]\):not\(\[data-legacy-panel\] \*\)\{color:var\(--post-text\)\}/);
  assert.match(css, /html\[data-theme-2029="dark"\][^{]*\{\s*--post-text:#ede4d3/);
  assert.match(css, /html\[data-theme-2029="parchment"\][^{]*\{--post-text:#3a2a18/);
});

test("every mapped series has its own colour, keyed by the shared series marker only", () => {
  const series = Object.keys(POST_BACKGROUND_ASSETS_2029).filter(key => key !== "general");
  assert.ok(series.length >= 3);
  for (const key of series) {
    assert.match(css, new RegExp(`\\[data-post-background="${key}"\\]\\{--post-series:#[0-9a-f]{6}`), `${key}: light colour`);
    assert.match(css, new RegExp(`html\\[data-theme-2029="dark"\\][^{]*\\[data-post-background="${key}"\\]\\{--post-series:#[0-9a-f]{6}`), `${key}: night colour`);
    assert.match(css, new RegExp(`\\[data-post-background="${key}"\\][^}]*--post-series-chip:linear-gradient`), `${key}: chip`);
  }
  assert.doesNotMatch(css, /data-post-slug[^\]]*\][^{]*\{[^}]*--post-series/, "a slug never assigns a series colour");
});

test("Dimension Five centring is its own block; every other Post keeps logical-start alignment", () => {
  const centred = css.match(/[^}]*text-align:center!important[^}]*\}/g) || [];
  for (const rule of centred.filter(rule => rule.includes("reading-source :is(h2,h3,h4)") || rule.includes(">p:first-of-type")))
    assert.match(rule, /data-post-background="dimension-five"/, "only Dimension Five centres headings and the lead line");
});

test("the design contract records the decision", () => {
  assert.match(contract, /### 14\.10 Post colour, series colour, video first and the end of a Post · Human Gate ZURIEL · 20\.11\.2026/);
  assert.match(contract, /exception to §8\.2 "Posts alignment" \(31\.10\.2026\) for this series only/);
});

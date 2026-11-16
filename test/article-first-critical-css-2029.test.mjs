// The first-paint stylesheet keeps every rule that may match the first document, in the source order, and leaves out only what cannot match
// (scripts/lib/article-first-critical-css.mjs). Measured on real Posts by scripts/check-article-first-critical-css.mjs (computed style and box
// of every element, first-paint stylesheet alone vs the full stylesheets); here the selector logic itself.
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { emptyVocabulary, addToVocabulary, selectorMayMatch, articleFirstCriticalCss } from "../scripts/lib/article-first-critical-css.mjs";

const { window } = new JSDOM(`<!doctype html><html data-theme-2029="dark"><body><div id="root"><div class="sod29-opening"></div></div>
  <div id="sod29-ssr-article" class="sod29-root native-frame" data-frame-theme-preset="dark"><article class="sod29-reading-post" data-post-character="plain">
  <h1>x</h1><section class="sod29-reading-source"><p style="font-size: 20px" data-sod-role="prose">t <span data-legacy-tone="yellow">y</span> <a href="/x">l</a></p></section></article></div></body></html>`);
const vocabulary = addToVocabulary(emptyVocabulary(), window.document.documentElement);
vocabulary.attributes.set("data-theme-2029", new Set(["dark", "light", "parchment"]));

test("a selector may match when every compound may match the vocabulary", () => {
  for (const selector of [".sod29-reading-source p", "html[data-theme-2029=light] .sod29-reading-post", ".sod29-reading-source :is(p,li,div,span)[style*=font-size]",
    ":root", "*", "a:hover", "p::first-line", ".sod29-reading-post:not(.is-x) h1", ".sod29-reading-source [data-legacy-tone=yellow]", "body > #root", ":where(.nope, p)", "p:has(.nope)"])
    assert.equal(selectorMayMatch(selector, vocabulary), true, selector);
  for (const selector of [".sod29-sidebar", "nav.sod29-command-island", "[data-post-character=matrix] p", ".sod29-reading-post[data-golden=true]", "#nope", "table td",
    ":is(.a, .b) p", "html[data-crown-scrolled=true] h1", "[data-theme-2029=sepia] p"])
    assert.equal(selectorMayMatch(selector, vocabulary), false, selector);
});

test("rules keep their order, groups keep their rules, animations stay with the rules that use them", () => {
  const css = ".sod29-sidebar{a:1}p{b:2}@media (max-width:760px){.sod29-sidebar{c:3}h1{d:4}}@font-face{font-family:x}@keyframes spin{to{e:5}}@keyframes unused{to{f:6}}h1{animation:spin 1s}@supports (display:grid){.nope{g:7}}";
  const out = articleFirstCriticalCss([css], vocabulary);
  assert.equal(out.css, "html.sod-af-first p{b:2}@media (max-width:760px){html.sod-af-first h1{d:4}}@font-face{font-family:x}html.sod-af-first h1{animation:spin 1s}@keyframes spin{to{e:5}}");
  assert.equal(out.kept, 3); assert.equal(out.dropped, 3);
});

test("every first-paint rule applies under the temporary class, raised by exactly (0,1,1), so their own order holds", async () => {
  const { articleFirstBoostSelector } = await import("../scripts/lib/article-first-critical-css.mjs");
  assert.equal(articleFirstBoostSelector(".a p"), "html.sod-af-first .a p");
  assert.equal(articleFirstBoostSelector("html[data-theme-2029=light] .x"), "html.sod-af-first:is(html)[data-theme-2029=light] .x");
  assert.equal(articleFirstBoostSelector(":root"), ":root.sod-af-first:is(html)");
  assert.equal(articleFirstBoostSelector("htmlx"), "html.sod-af-first htmlx");
});

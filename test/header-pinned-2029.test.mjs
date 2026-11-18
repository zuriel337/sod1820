import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The top bar stays pinned on every page (ZURIEL 18.11.2026 "תנעץ את הסרגל העליון").
// Live on 18.11 it scrolled away on all pages, phone and desktop: the header sits in .sod29-living-header-stack, and the two rules that
// let it stick (the stack takes no box of its own; the root clips sideways without becoming a scroll container) lived only in
// globalLivingRibbon2029.css, which loads with the ribbon on demand (shell weight 3/8) and never loads while the ribbon is hidden.
// Without them the stack is a box exactly as tall as the header, and overflow-x:hidden on the root makes it a scroll container that
// never scrolls, so position:sticky has nowhere to stick. Both rules now live in the stylesheet every page loads.
const eager = readFileSync(new URL("../src/components/experience2029/sod2029.css", import.meta.url), "utf8");
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

test("the header is sticky inside a wrapper that takes no box of its own", () => {
  assert.match(frame, /<div className="sod29-living-header-stack">\s*<header className="sod29-header/);
  assert.match(eager, /\.sod29-living-header-stack\{display:contents\}/);
  assert.match(eager, /\.sod29-header\{position:sticky;top:0;/);
});

test("the root clips sideways without becoming a scroll container", () => {
  const root = eager.match(/\.sod29-root\{[^}]*\}/)?.[0] || "";
  assert.match(root, /overflow-x:clip/);
  assert.doesNotMatch(root, /overflow(-x|-y)?:(hidden|auto|scroll)/);
});

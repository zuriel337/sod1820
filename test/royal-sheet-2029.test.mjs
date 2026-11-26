import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("RoyalSheet2029 (Design V2 §14.13): one dialog behaviour, not only one look", () => {
  const sheet = read("../src/components/experience2029/RoyalSheet2029.jsx");
  assert.match(sheet, /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby=\{titleId\}/, "labelled modal dialog");
  assert.match(sheet, /event\.key === "Escape"/, "closes on Escape");
  assert.match(sheet, /event\.target === event\.currentTarget\) onClose\(\)/, "closes on a backdrop press");
  assert.match(sheet, /event\.key !== "Tab"[\s\S]*lastItem\.focus\(\)[\s\S]*firstItem\.focus\(\)/, "focus stays inside (Tab wraps)");
  assert.match(sheet, /opener\?\.focus\?\.\(\)/, "focus returns to the opener");
  assert.match(sheet, /html\.style\.overflow = "hidden"[\s\S]*html\.style\.overflow = previousOverflow/, "the page does not scroll behind it, and is restored");
  assert.match(sheet, /className="r29 r29-sheet-backdrop"[\s\S]*className="r29-sheet"/, "the look is royal2029.css only");
});

test("the Post follow panel is a RoyalSheet2029 and the sheet look exists once, in royal2029.css", () => {
  const dialog = read("../src/components/experience2029/PostFollowDialog2029.jsx");
  assert.match(dialog, /<RoyalSheet2029 titleId="post-follow-title" onClose=\{closePostFollow\}/);
  assert.doesNotMatch(dialog, /createPortal|aria-modal|keydown/, "no second dialog implementation");
  const css = read("../src/components/experience2029/royal2029.css");
  assert.match(css, /\.r29-sheet-backdrop\{[^}]*position:fixed/);
  assert.match(css, /\.r29-sheet\{[^}]*padding:16px/);
});

test("touch targets: the Post's compact chips and tags keep a 44px press area", () => {
  const css = read("../src/pages/post2029-reading.css");
  assert.match(css, /\.k29-cat::after\{content:"";position:absolute;inset-block:-8px/);
  assert.match(css, /\.sod29-post-tags a\{display:inline-flex;align-items:center;min-block-size:44px/);
  assert.match(css, /\.sod29-post-tags a\{min-inline-size:44px/);
  assert.match(css, /\.sod29-post-comments>details>summary\{display:flex;align-items:center;min-block-size:44px/);
});

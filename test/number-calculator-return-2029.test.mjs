// ZURIEL 5.11.2026: the Number page always offers the way back to the gematria calculator.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { publicReadingPath } from "../src/lib/publicReadingRelease2029.js";

test("Number page renders a permanent link back to /gematria, outside any conditional", () => {
  const src = fs.readFileSync("src/pages/Number2029Page.jsx", "utf8");
  assert.match(src, /<Link to="\/gematria" className="sod29-action" data-number-action="back-to-calculator">← חזרה למחשבון גימטריה<\/Link>/);
  const at = src.indexOf('data-number-action="back-to-calculator"');
  const before = src.slice(Math.max(0, at - 260), at);
  assert.doesNotMatch(before, /\?\s*<|&&\s*</, "the return link must not sit behind a condition");
  assert.match(before, /sod29-action-row/);
});

test("the target the link points to is an open public route", () => {
  assert.equal(publicReadingPath("/gematria"), "public");
});

// ZURIEL 5.11.2026: the Number page always offers the calculator. ZURIEL 6.11.2026: exactly one calculator action,
// never twice: "back to the calculator" (exact return) when the reader came from it, "to the gematria calculator" when they arrived on their own.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { publicReadingPath } from "../src/lib/publicReadingRelease2029.js";
import { isCalculatorReturnTarget } from "../src/lib/research/numberExpressionFocus.js";

const src = fs.readFileSync("src/pages/Number2029Page.jsx", "utf8");

test("the hero always renders exactly one calculator action: exact return from the calculator, a plain link otherwise", () => {
  const start = src.indexOf('<nav className="sod29-action-row sod29-number-calculator-return"');
  const nav = src.slice(start, src.indexOf("</nav>", start));
  assert.ok(start > 0);
  assert.equal((nav.match(/data-number-action=/g) || []).length, 2, "two mutually exclusive variants inside one nav");
  assert.match(nav, /arrivedFromCalculator\s*\?\s*<button[^>]*data-number-action="back-to-calculator".*shell\.returnExact\(\)/);
  assert.match(nav, /<Link to="\/gematria"[^>]*data-number-action="open-calculator"/);
  assert.equal((nav.match(/name="calculator"/g) || []).length, 2, "both variants carry the calculator icon");
  assert.doesNotMatch(src.slice(Math.max(0, start - 200), start), /\?\s*<|&&\s*</, "the nav itself is never conditional");
});

test("the focus ribbon does not repeat the calculator return the hero already offers", () => {
  assert.match(src, /research\.context\?\.returnTo\?\.href && !arrivedFromCalculator/);
});

test("calculator origin detection", () => {
  assert.equal(isCalculatorReturnTarget({ href: "/gematria?q=abc" }), true);
  assert.equal(isCalculatorReturnTarget({ href: "/2029/gematria/viral#x" }), true);
  assert.equal(isCalculatorReturnTarget({ href: "/2029/gematria" }), true);
  assert.equal(isCalculatorReturnTarget({ href: "/topic/x" }), false);
  assert.equal(isCalculatorReturnTarget({ href: "/gematria-extra" }), false);
  assert.equal(isCalculatorReturnTarget({ href: "//evil.com/gematria" }), false);
  assert.equal(isCalculatorReturnTarget(null), false);
});

test("the target the link points to is an open public route", () => {
  assert.equal(publicReadingPath("/gematria"), "public");
});

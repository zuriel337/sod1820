import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Typography V2 (SOD1820_DESIGN_CONTRACT_V2 §5) on the number / expression page: meaningful text never falls below the 14px micro
// floor, the expression follows the length tiers, and the focal number is not shrunk to fit a reference value.
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const FILES = [
  "src/pages/number2029.css",
  "src/components/number2029/numberCore2029.css",
  "src/components/number2029/numberLivingWorld2029.css",
  "src/components/number2029/numberDeepView2029.css",
  "src/components/number2029/numberDrawer2029.css",
  "src/components/experience2029/timeline2029.css",
  "src/components/experience2029/canonical-verse-cards-2029.css",
  "src/components/gematria2029/methodLens2029.css",
];

test("no number-surface font-size literal is below the 14px micro floor", () => {
  for (const file of FILES) {
    const css = read(file);
    const small = [...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(match => Number(match[1]) < 14).map(match => match[0]);
    assert.deepEqual(small, [], `${file} must use the type tokens instead of literals below 14px`);
    const clampMin = [...css.matchAll(/font-size:\s*clamp\(\s*(\d+(?:\.\d+)?)px/g)].filter(match => Number(match[1]) < 14).map(match => match[0]);
    assert.deepEqual(clampMin, [], `${file} must not clamp text below 14px`);
  }
});

test("number type roles are aliases of the canonical tokens and rise at 1024px", () => {
  const core = read("src/components/number2029/numberCore2029.css");
  assert.match(core, /--sod29-number-support:var\(--s29-type-micro,14px\)/);
  assert.match(core, /--sod29-number-text:var\(--s29-type-small,16px\)/);
  assert.match(core, /--sod29-number-ui-lg:var\(--s29-type-ui,16px\)/);
  assert.match(core, /@media\(min-width:1024px\)\{\s*\.sod29-number-page\{[^}]*--sod29-number-support:max\(15px,/);
  assert.match(core, /--sod29-number-title-short:var\(--s29-type-display,46px\)/);
});

test("the expression size follows its length and the focal number keeps its fit-to-container floor above the old 16px", () => {
  const jsx = read("src/components/number2029/NumberCore2029.jsx");
  assert.match(jsx, /data-expression-size=\{expressionSizeTier\(/);
  for (const tier of ["short", "medium", "long", "xl"]) assert.match(read("src/pages/number2029.css"), new RegExp(`data-expression-size="${tier}"`));
  const page = read("src/pages/number2029.css");
  assert.doesNotMatch(page, /\.sod29-number-value\{[^}]*clamp\(16px/);
  assert.match(page, /\.sod29-number-value\{\s*font-size:clamp\(28px,calc\(\(100cqi - 140px\)/);
  // The default focal size is unchanged (it is not reduced to the 46px reference).
  assert.match(page, /\.sod29-number-value\{[^}]*font-size:clamp\(74px,17vw,126px\)/);
});

test("the page has one semantic H1 (the expression or number); the compact drawer keeps a strong", () => {
  const jsx = read("src/components/number2029/NumberCore2029.jsx");
  assert.match(jsx, /compact \? <strong>\{projection\.expression \|\| root\}<\/strong> : <h1 className="sod29-number-v10-h1">/);
  assert.equal((jsx.match(/<h1\b/g) || []).length, 1, "exactly one H1 in the number core");
  for (const file of ["src/pages/number2029.css", "src/components/number2029/numberCore2029.css"]) {
    assert.match(read(file), /\.sod29-number-v10-expression-line\[data-expression-size="short"\]>:is\(strong,h1\)/, file);
  }
});

// BENNETT_GOLDEN_FULL_RELEASE_RECONCILE_V1_BRANCH — the gematria expression/equality is the clickable unit:
// it opens Number/Quick Inspect FOCUS (rail/sheet), never Raziel; Raziel stays a separate optional action;
// exact return restores the locator.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
const projection = fs.readFileSync("src/lib/research/post2029ReadingProjection.js", "utf8");

const between = (src, start, end) => {
  const a = src.indexOf(start);
  assert.ok(a >= 0, `missing ${start}`);
  const b = src.indexOf(end, a + start.length);
  return src.slice(a, b > a ? b : undefined);
};

test("expression click opens Number focus via Quick Inspect, not Raziel", () => {
  const focus = between(page, "const openContextualNumberFocus", "const handleSourceContextualFocus");
  assert.match(focus, /shell\.openInspect\?\.\(/);
  assert.match(focus, /type: "gematria_expression"/);
  assert.match(focus, /expression: cleanExpression/);
  assert.doesNotMatch(focus, /openRaziel|askRaziel/);

  const handler = between(page, "const handleSourceContextualFocus", "legacyNumber");
  assert.match(handler, /data-contextual-number-focus='true'/);
  assert.match(handler, /openContextualNumberFocus\(/);
  assert.doesNotMatch(handler, /openRaziel|askRaziel/);
});

test("Raziel remains a separate optional action", () => {
  const raziel = between(page, "const askRaziel", "const ");
  assert.match(raziel, /shell\.openRaziel\?\./);
  assert.match(page, /askRaziel/);
});

test("exact back: focus records returnTo with the source-region locator", () => {
  const focus = between(page, "const openContextualNumberFocus", "const handleSourceContextualFocus");
  assert.match(focus, /const locator = `#source-region-\$\{targetRegion\.id\}`/);
  assert.match(focus, /returnTo: exactReturnForRegion\(targetRegion\)/);
  assert.match(page, /const exactReturnForRegion/);
});

test("equality expression (phrase), not a bare number, carries the focus trigger payload", () => {
  const sec = projection;
  assert.match(sec, /data-expression="\$\{expression\}"[^`]*data-result="631"/);
  assert.match(sec, /data-expression="\$\{eq\.phrase\}"[^`]*data-result="\$\{eq\.value\}"/);
});

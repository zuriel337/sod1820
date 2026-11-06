// DEF-008 regression: the Reality River reserves its final height while its pictures load, and the follow control (which sits at the bottom of the river)
// is not rendered in the loading state where it would sit mid-box and jump. Measured on the public-reading build (docs/reviews/audit-remediation-20261106):
// /gallery CLS 0.263 (phone) / 0.238 (desktop) before, 0.061 / 0.057 after. The contract threshold is CLS <= 0.1 (CLAUDE.md, fixed thresholds).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const jsx = fs.readFileSync(new URL("../src/components/research/RealityRiver2029.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/components/research/realityRiver2029.css", import.meta.url), "utf8");

test("the river carries an is-loading class only while loading", () => {
  assert.match(jsx, /className=\{loading \? "r29-river is-loading" : "r29-river"\}/);
});

test("the follow slot is not rendered while loading", () => {
  assert.match(jsx, /\{loading \? null : follow\}/);
});

test("the loading state reserves the measured final height (window height + 490px, + 580px on phones)", () => {
  assert.match(css, /\.r29-river\.is-loading\{min-height:calc\(var\(--r29-window-height\) \+ 490px\)\}/);
  assert.match(css, /@media\(max-width:760px\)\{\.r29-river\.is-loading\{min-height:calc\(var\(--r29-window-height\) \+ 580px\)\}\}/);
});

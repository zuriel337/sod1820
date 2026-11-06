import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/experience2029/els2029-research.css", import.meta.url), "utf8");

test("the floating Raziel research bar is retired: it covered the matrix tools and the shared dock", () => {
  assert.equal(existsSync(new URL("../src/components/experience2029/ElsResearchBar2029.jsx", import.meta.url)), false);
  assert.doesNotMatch(page, /ElsResearchBar/);
  assert.doesNotMatch(css, /els29-rbar/);
  assert.doesNotMatch(css, /data-els-research-bar/);
});

test("Classic stays mounted in place for every profile", () => {
  assert.match(page, /<ElsNativeWithRaziel[^>]*initialSeed=\{savedRecord\.row \|\| legacyMatrix \|\| sharedMatrix\.present \|\| location\.state\?\.elsReadingReturnTurnId \|\| location\.state\?\.elsResearchReturnTaskId \? "" : classicSeed\}/);
  assert.match(page, /return <ElsNativeClassic2029 \{\.\.\.props\}/);
  assert.match(page, /data-els-research-composition/);
});

test("research styling is scoped and Classic receives no rules", () => {
  assert.doesNotMatch(css, /els29-native-/);
});

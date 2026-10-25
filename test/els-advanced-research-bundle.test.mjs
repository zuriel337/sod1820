import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ADVANCED = new URL("../src/components/experience2029/ElsAdvancedSearch2029.jsx", import.meta.url);
const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const PAGE = new URL("../src/pages/Els2029Page.jsx", import.meta.url);

test("an automatic-plan occurrence requests the existing native research bundle after verification", async () => {
  const [advanced, native] = await Promise.all([readFile(ADVANCED, "utf8"), readFile(NATIVE, "utf8")]);
  assert.match(advanced, /verifyEls2029Selection\(selection/);
  assert.match(advanced, /researchBundle: true/);
  assert.match(native, /researchLoad\.researchBundle === true/);
  assert.match(native, /requestLens\("matrix-candidates", \{ hitId: next\.axis\.hitId, researchBundle: true \}\)/);
  assert.doesNotMatch(advanced, /new .*Engine|createStore|ResearchProvider/);
});

test("advanced bundle return scrolls to the still-mounted plan instead of rebuilding it", async () => {
  const [native, page] = await Promise.all([readFile(NATIVE, "utf8"), readFile(PAGE, "utf8")]);
  assert.match(native, /bundle\.fromAdvanced \? "חזור לתוכנית המטרות"/);
  assert.match(native, /onReturnToResearchPlan\?\.\(\)/);
  assert.match(page, /researchPlanRef\.current\?\.scrollIntoView/);
  assert.match(page, /hidden=\{!researchProfile \|\| directSavedOpen\}/);
});

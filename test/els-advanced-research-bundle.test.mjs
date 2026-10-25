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
  assert.match(native, /requestLens\("matrix-candidates", \{ hitId: next\.axis\.hitId, researchBundle: true,[\s\S]*?pendingBundle\.contextTerms/);
  assert.doesNotMatch(advanced, /new .*Engine|createStore|ResearchProvider/);
});

test("basic research sends one axis and bounded context to the already mounted canonical engine", async () => {
  const [advanced, native, page] = await Promise.all([readFile(ADVANCED, "utf8"), readFile(NATIVE, "utf8"), readFile(PAGE, "utf8")]);
  assert.match(advanced, /contract: "els_anchor_context_request_v1"/);
  assert.match(advanced, /researchCommand: true/);
  assert.match(advanced, /contextTerms/);
  assert.doesNotMatch(advanced, /story: briefText|brief: briefText|context: briefText/);
  assert.match(native, /const safeResearchAxis =/);
  assert.match(native, /length >= 3 && length <= 12/);
  assert.match(native, /requestSearch\("regular", \{ term, scope:[\s\S]*?contextTerms \}\)/);
  assert.match(native, /researchCommand === true \? null : researchLoad/);
  assert.match(native, /contextTerms: pendingBundle\.contextTerms/);
  assert.match(page, /setResearchLoad\(item\)/);
});

test("advanced bundle return scrolls to the still-mounted plan instead of rebuilding it", async () => {
  const [native, page] = await Promise.all([readFile(NATIVE, "utf8"), readFile(PAGE, "utf8")]);
  assert.match(native, /bundle\.fromAdvanced \? "חזור לתוכנית המטרות"/);
  assert.match(native, /onReturnToResearchPlan\?\.\(\)/);
  assert.match(page, /researchPlanRef\.current\?\.scrollIntoView/);
  assert.match(page, /hidden=\{!researchProfile \|\| directSavedOpen\}/);
});

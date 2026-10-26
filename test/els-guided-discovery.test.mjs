import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const COMPONENT = new URL("../src/components/experience2029/ElsGuidedDiscovery2029.jsx", import.meta.url);
const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const PAGE = new URL("../src/pages/Els2029Page.jsx", import.meta.url);

test("Guided Discovery is one explicit story window with no AI, persistence or transport", async () => {
  const source = await readFile(COMPONENT, "utf8");
  assert.match(source, /data-els-cipher-discovery="v1"/);
  assert.equal((source.match(/<textarea/g) || []).length, 1);
  assert.match(source, /onSubmit=\{submit\}/);
  assert.match(source, /els_anchor_context_request_v1/);
  assert.match(source, /contextTerms/);
  assert.match(source, /\.slice\(0, 6\)/);
  assert.match(source, /החיפוש מתחיל רק בלחיצה/);
  assert.match(source, /רזיאל יצטרף רק אחרי שהמנוע ימצא ויאמת מופע/);
  assert.doesNotMatch(source, /fetch\s*\(|supabase|ai-analyze|askRaziel|localStorage|sessionStorage/);
  assert.doesNotMatch(source, /save|insert|upsert/i);
});

test("Guided delegates axis and bounded findings to the one canonical mounted engine", async () => {
  const source = await readFile(NATIVE, "utf8");
  assert.equal((source.match(/<TzofenEmbed/g) || []).length, 1);
  assert.match(source, /researchLoad\?\.researchCommand !== true/);
  assert.match(source, /researchLoad\.contract !== "els_anchor_context_request_v1"/);
  assert.match(source, /requestSearch\("regular", \{ term, scope:/);
  assert.match(source, /next\?\.verification\?\.state === "MATCH"/);
  assert.match(source, /safeGuidedContextTerms/);
  assert.match(source, /if \(terms\.length >= 6\) break/);
  assert.match(source, /requestFindingsChange\(findings\.slice\(0, 12\)\)/);
  assert.match(source, /journeyLoad=\{researchLoad\?\.researchCommand === true \? null : researchLoad\}/);
  assert.doesNotMatch(source, /askRaziel|ai-analyze|functions\.invoke/);
});

test("Classic stays clean while Research alone owns manual cross-search controls", async () => {
  const source = await readFile(NATIVE, "utf8");
  assert.match(source, /const crossSearchOpen = researchProfile && crossOpen/);
  assert.match(source, /\{researchProfile \? <>/);
  assert.match(source, />חיפוש רגיל<\/button>/);
  assert.match(source, />הצלבה בין צירים<\/button>/);
  assert.match(source, /hidden=\{guidedProfile\}/);
  assert.doesNotMatch(source, /guidedProfile \?[^\n]*הצלבה בין צירים/);
});

test("page keeps Guided, Research and Classic as projections over one native workspace", async () => {
  const source = await readFile(PAGE, "utf8");
  assert.equal((source.match(/<ElsNativeClassic2029/g) || []).length, 1);
  assert.equal((source.match(/<ElsGuidedDiscovery2029/g) || []).length, 1);
  assert.match(source, /active=\{!library && \(!guidedProfile \|\| researchLoad\?\.guidedDiscovery === true \|\| directSavedOpen\)\}/);
  assert.match(source, /hidden=\{!advancedResearchProfile \|\| directSavedOpen\}/);
  assert.match(source, /hidden=\{!guidedProfile \|\| directSavedOpen\}/);
  assert.doesNotMatch(source, /RazielSessionProvider2029|<ResearchProvider|functions\.invoke\("ai-analyze"/);
});

console.log("ELS Guided Discovery central slice: PASS");

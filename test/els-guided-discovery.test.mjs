import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const COMPONENT = new URL("../src/components/experience2029/ElsGuidedDiscovery2029.jsx", import.meta.url);
const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const PAGE = new URL("../src/pages/Els2029Page.jsx", import.meta.url);
const ENGINE = new URL("../tools/els/els-code.template.html", import.meta.url);

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

test("Guided delegates one axis and bounded occurrence inspection to the canonical mounted engine", async () => {
  const source = await readFile(NATIVE, "utf8");
  assert.equal((source.match(/<TzofenEmbed/g) || []).length, 1);
  assert.match(source, /researchLoad\?\.researchCommand !== true/);
  assert.match(source, /researchLoad\.contract !== "els_anchor_context_request_v1"/);
  assert.match(source, /requestSearch\("regular", \{ term, scope:/);
  assert.match(source, /engineState\?\.verification\?\.state === "MATCH"/);
  assert.match(source, /safeGuidedContextTerms/);
  assert.match(source, /if \(terms\.length >= 6\) break/);
  assert.match(source, /projectElsGuidedOccurrenceCoverage/);
  assert.match(source, /lens: "matrix-discovery"/);
  assert.match(source, /guidedOccurrenceCoverage: true/);
  assert.match(source, /approvedBatches: 2/);
  assert.match(source, /onGuidedAddSupports/);
  assert.doesNotMatch(source, /guided\.terms\.filter[\s\S]{0,500}requestFindingsChange/);
  assert.match(source, /journeyLoad=\{researchLoad\?\.researchCommand === true \? null : researchLoad\}/);
  assert.doesNotMatch(source, /askRaziel|ai-analyze|functions\.invoke/);
});

test("Guided matrix discovery is a bounded lens in the existing engine and keeps raw runs advanced", async () => {
  const source = await readFile(ENGINE, "utf8");
  assert.match(source, /d\.lens==="matrix-discovery"/);
  assert.match(source, /guidedMatrixDiscoveryLens/);
  assert.match(source, /rowPad=20,colRadius=20/);
  assert.match(source, /maxGapScale:3/);
  assert.match(source, /for\(const term of DICT\)addHint/);
  assert.match(source, /readingRelation:"defective-spelling"/);
  assert.match(source, /guidedMatrixLanguageInspection/);
  assert.match(source, /els_matrix_language_inspection_v1/);
  assert.match(source, /S3_OPEN_SEQUENCE_SEGMENTATION/);
  assert.match(source, /maxCandidateWindows=8192/);
  assert.match(source, /rayCap=24,maxLetters=24/);
  assert.match(source, /status:"UNVERIFIED_READING"/);
  assert.match(source, /modelCallsTriggered:0,findingMutation:false,truthPromotion:false/);
  assert.match(source, /guidedMatrixDisplayTerm/);
  assert.match(source, /searchRule:"no-default-broad-lexicon"/);
  assert.match(source, /rawPatterns/);
  assert.match(source, /status:"UNVERIFIED_PATTERN"/);
  assert.match(source, /promoteVerified/);
  assert.match(source, /numericSkipPromoted:false/);
  assert.doesNotMatch(source, /matrix-discovery"[\s\S]{0,1200}dynamicCandidateLexicon/);
  assert.doesNotMatch(source, /guidedMatrixLanguageInspection[\s\S]{0,12000}(?:fetch\s*\(|ai-analyze|Math\.random|dynamicCandidateLexicon)/);
});

test("Torah-language readings stay in Advanced and preserve the exact-letter authority", async () => {
  const source = await readFile(NATIVE, "utf8");
  assert.match(source, /data-els-language-inspection="candidate-only"/);
  assert.match(source, /האותיות נלקחו מהמטריצה הקנונית/);
  assert.match(source, /קריאות מועמדות בלבד/);
  assert.match(source, /AI: אפס קריאות/);
  assert.doesNotMatch(source, /languageInspection[\s\S]{0,1200}requestFindingsChange/);
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

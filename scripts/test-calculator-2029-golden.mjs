import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");
const model = fs.readFileSync("src/lib/research/calculator2029Model.js", "utf8");
const viral = fs.readFileSync("src/lib/research/calculator2029Viral.js", "utf8");
const app = fs.readFileSync("src/App2029.jsx", "utf8");
const compare = fs.readFileSync("src/components/gematria2029/CalculatorCompare2029.jsx", "utf8");
const opening = fs.readFileSync("src/components/gematria2029/CalculatorOpening2029.jsx", "utf8");
const methodLens = fs.readFileSync("src/components/gematria2029/MethodLens2029.jsx", "utf8");
const fastPreviewSource = fs.readFileSync("src/lib/research/calculator2029FastPreview.js", "utf8");
const { buildCalculator2029FastPreview } = await import("../src/lib/research/calculator2029FastPreview.js");

// Local-authority modules that native Calculator2029/gematria2029 surfaces must never
// import or reference; they must consume fetchNumberMethodProfile/fetchGematriaMethodTrace instead.
const forbiddenLocalAuthorityPattern = /gematria\.js|CanonicalGematriaCalculator|GematriaCalculatorLegacy|gematriaCalculationContract|coreEngine|MethodAnalyze/;
for (const [name, source] of [
  ["Calculator2029Page.jsx", page],
  ["calculator2029Model.js", model],
  ["calculator2029Viral.js", viral],
  ["CalculatorCompare2029.jsx", compare],
  ["CalculatorOpening2029.jsx", opening],
  ["MethodLens2029.jsx", methodLens],
]) {
  assert.doesNotMatch(source, forbiddenLocalAuthorityPattern, `${name} must not import/reference local-calculation authority modules`);
}

assert.match(page, /fetchNumberMethodProfile/);
assert.match(page, /buildCalculator2029FastPreview/);
assert.match(page, /data-preview-state/);
assert.match(page, /sod29-calc2029-engine-status/);\nassert.match(page, /מאמת מול המנוע הקנוני/);\nassert.match(page, /"מאומת"/);\nassert.match(page, /"מיידי"/);
assert.match(page, /<small>מיידי<\/small>/);
assert.match(page, /disabled=\{Boolean\(method\.previewOnly\)\}/);
assert.match(fastPreviewSource, /from "..\/gematria\.js"/);
assert.match(fastPreviewSource, /CALCULATOR_2029_FAST_CORE_KEYS/);
assert.doesNotMatch(fastPreviewSource, /DEPTH_METHODS|calculateGematriaEnvelope/);
assert.match(fastPreviewSource, /previewOnly:\s*true/);
assert.match(fastPreviewSource, /canonical:\s*false/);
assert.match(fastPreviewSource, /canonicalSettle:\s*"fn_method_profile"/);
const previewEmpty = buildCalculator2029FastPreview("");
const previewA = buildCalculator2029FastPreview("א");
const previewAb = buildCalculator2029FastPreview("אב");
const previewAba = buildCalculator2029FastPreview("אבא");
assert.equal(previewEmpty?.methodCount, 9);
assert.deepEqual(previewEmpty?.methods.map((row) => row.computedValue), Array(9).fill(0));
assert.equal(previewA?.methodCount, 9);
assert.equal(previewA?.methods.find((row) => row.methodKey === "רגיל")?.computedValue, 1);
assert.equal(previewA?.methods.find((row) => row.methodKey === "מילוי")?.computedValue, 111);
assert.equal(previewA?.methods.find((row) => row.methodKey === "ריבוע")?.computedValue, 1);
assert.equal(previewAb?.methods.find((row) => row.methodKey === "רגיל")?.computedValue, 3);
assert.equal(previewAba?.methods.find((row) => row.methodKey === "רגיל")?.computedValue, 4);
assert.ok(previewAba?.methods.every((row) => row.previewOnly === true && row.canonical === false));
assert.equal(buildCalculator2029FastPreview("abc")?.methodCount, 9);
assert.deepEqual(buildCalculator2029FastPreview("abc")?.methods.map((row) => row.computedValue), Array(9).fill(0));
assert.match(page, /fetchGematriaMethodTrace/);
assert.doesNotMatch(page, />חשב</);
assert.match(page, /CALCULATOR_2029_AUTO_COMPUTE_DEBOUNCE_MS = 240/);
assert.match(page, /window\.setTimeout\(\(\) => \{[\s\S]*?computeRef\.current\?\.\(phrase\)/);
assert.match(page, /\[expression, sharedState\.isShared\]/);
assert.match(page, /התוצאות מתעדכנות אוטומטית/);
assert.match(page, /AI ורזיאל רק בפעולה מפורשת/);
assert.match(page, /✦ רזיאל · תסביר לי/);
assert.match(page, /shell\.openRaziel/);
assert.match(page, /ShareActions/);
assert.match(page, /buildCalculatorShareUrl/);
assert.match(page, /shared_result_opened/);
assert.match(page, /new_compute_from_share/);
assert.match(page, /calculator_view/);
assert.match(page, /first_compute/);
assert.match(page, /result_selected/);
assert.match(page, /method_opened/);
assert.match(page, /raziel_opened/);
assert.match(page, /share_created/);
assert.doesNotMatch(page, /setTimeout\([\s\S]*getAiAnalysis|setTimeout\([\s\S]*ai-analyze|setTimeout\([\s\S]*functions\.invoke/);
assert.doesNotMatch(page, /רזיאל · Premium/);
assert.doesNotMatch(page, /GematriaCalculatorLegacy/);
assert.doesNotMatch(page, /from\s+["'][^"']*gematria\.js["']/);
assert.doesNotMatch(page, /getAiAnalysis|ai-analyze|functions\.invoke|fetchNumberHiddenCrossings|fetchEntityHubProjection/);

assert.match(model, /CALCULATOR_2029_CORE_METHOD_LIMIT = 9/);
assert.match(model, /sortMethodsByCanonicalOrder/);
assert.match(model, /fn_method_profile/);
assert.match(model, /expression/);
assert.match(model, /methodKey/);
assert.match(model, /resultValue/);

assert.match(viral, /parseCalculatorShareState/);
assert.match(viral, /pickVerifiedShareDiscovery/);
assert.match(viral, /resultValue/);
assert.doesNotMatch(viral, /gematria\.js|fn_method_value|RAGIL|METHODS/);

assert.match(app, /Calculator2029Page/);
assert.match(app, /path="\/2029\/gematria"/);

console.log("PASS Calculator 2029 viral Golden static contract");

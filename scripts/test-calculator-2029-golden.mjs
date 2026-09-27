import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");
const model = fs.readFileSync("src/lib/research/calculator2029Model.js", "utf8");
const viral = fs.readFileSync("src/lib/research/calculator2029Viral.js", "utf8");
const app = fs.readFileSync("src/App2029.jsx", "utf8");
const compare = fs.readFileSync("src/components/gematria2029/CalculatorCompare2029.jsx", "utf8");
const opening = fs.readFileSync("src/components/gematria2029/CalculatorOpening2029.jsx", "utf8");
const methodLens = fs.readFileSync("src/components/gematria2029/MethodLens2029.jsx", "utf8");

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

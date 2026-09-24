import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");
const model = fs.readFileSync("src/lib/research/calculator2029Model.js", "utf8");
const viral = fs.readFileSync("src/lib/research/calculator2029Viral.js", "utf8");
const app = fs.readFileSync("src/App2029.jsx", "utf8");

assert.match(page, /fetchNumberMethodProfile/);
assert.match(page, /fetchGematriaMethodTrace/);
assert.match(page, /type="submit"/);
assert.match(page, />חשב</);
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
assert.doesNotMatch(page, /setTimeout\([\s\S]*fetchNumberMethodProfile/);
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

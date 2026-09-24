import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");
const model = fs.readFileSync("src/lib/research/calculator2029Model.js", "utf8");
const app = fs.readFileSync("src/App2029.jsx", "utf8");

assert.match(page, /fetchNumberMethodProfile/);
assert.match(page, /fetchGematriaMethodTrace/);
assert.match(page, /CALCULATION SELECTION/);
assert.match(page, /רזיאל · Premium/);
assert.match(page, /disabled[\s\S]*רזיאל · Premium/);
assert.match(page, /220/);
assert.doesNotMatch(page, /GematriaCalculatorLegacy/);
assert.doesNotMatch(page, /from\s+["'][^"']*gematria\.js["']/);
assert.doesNotMatch(page, /getAiAnalysis|ai-analyze|functions\.invoke|fetchNumberHiddenCrossings|fetchEntityHubProjection/);

assert.match(model, /CALCULATOR_2029_CORE_METHOD_LIMIT = 9/);
assert.match(model, /sortMethodsByCanonicalOrder/);
assert.match(model, /fn_method_profile/);
assert.match(model, /expression/);
assert.match(model, /methodKey/);
assert.match(model, /resultValue/);

assert.match(app, /Calculator2029Page/);
assert.match(app, /path="\/2029\/gematria"/);

console.log("PASS Calculator 2029 Golden static contract");

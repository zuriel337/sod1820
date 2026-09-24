import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const model = readFileSync(new URL("../src/lib/research/methodLens2029.js", import.meta.url), "utf8");
const component = readFileSync(new URL("../src/components/gematria2029/MethodLens2029.jsx", import.meta.url), "utf8");
const calculator = readFileSync(new URL("../src/pages/Calculator2029Page.jsx", import.meta.url), "utf8");
const numberCore = readFileSync(new URL("../src/components/number2029/NumberCore2029.jsx", import.meta.url), "utf8");

assert.match(model, /gematria_words/);
assert.match(model, /is_verified/);
assert.match(model, /fn_relation_candidate/);
assert.doesNotMatch(model, /getAiAnalysis|ai-analyze|anthropic|openai/i);
assert.match(component, /primary\.map/);
assert.match(component, /dependent\.map/);
assert.match(component, /raw/);
assert.match(component, /פתח את השיטה/);
assert.match(calculator, /MethodLens2029/);
assert.match(numberCore, /MethodLens2029/);
assert.doesNotMatch(calculator.split("useEffect(() => {")[1] || "", /fetchMethodLens2029/);
console.log("Method Lens 2029 shared evidence-first contract: PASS");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const model = readFileSync(new URL("../src/lib/research/methodLensProjection.js", import.meta.url), "utf8");
const component = readFileSync(new URL("../src/components/gematria2029/MethodLens2029.jsx", import.meta.url), "utf8");
const calculator = readFileSync(new URL("../src/pages/Calculator2029Page.jsx", import.meta.url), "utf8");
const numberCore = readFileSync(new URL("../src/components/number2029/NumberCore2029.jsx", import.meta.url), "utf8");

assert.match(model, /getNumberLookup/);
assert.match(model, /getRelationCandidate/);
assert.match(model, /lookupSource:\s*"fn_number_lookup"/);
assert.match(model, /normalizationSource:\s*"fn_relation_candidate"/);
assert.doesNotMatch(model, /\.from\(["']gematria_words["']\)/);
assert.doesNotMatch(model, /supabase\.rpc/);
assert.doesNotMatch(model, /getAiAnalysis|ai-analyze|anthropic|openai/i);

assert.match(component, /פתח את השיטה/);
assert.match(component, /primary\.map/);
assert.match(component, /dependent\.map/);
assert.match(component, /raw/);
assert.match(component, /משפחות עצמאיות/);
assert.match(component, /relation\?\.methods/);
assert.doesNotMatch(component, /getAiAnalysis|ai-analyze|anthropic|openai/i);

assert.match(calculator, /MethodLens2029/);
assert.match(numberCore, /MethodLens2029/);
assert.match(numberCore, /onExpressionSelect\?\.\(item\?\.phrase\)/);
assert.doesNotMatch(calculator, /fetchMethodLensProjection/);
assert.doesNotMatch(calculator, /getAiAnalysis|ai-analyze|anthropic|openai/i);

console.log("Method Lens 2029 shared evidence-first contract: PASS");

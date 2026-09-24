import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const compare = readFileSync(new URL("../src/components/gematria2029/CalculatorCompare2029.jsx", import.meta.url), "utf8");
const calculator = readFileSync(new URL("../src/pages/Calculator2029Page.jsx", import.meta.url), "utf8");

assert.match(compare, /fetchNumberMethodProfile/);
assert.match(compare, /buildCalculationSelection/);
assert.match(compare, /getRelationCandidate/);
assert.match(compare, /checkCrossing/);
assert.match(compare, /onClick=\{checkCrossing\}/);
assert.match(compare, /DERIVED_OPERATION · SUM/);
assert.match(compare, /Compare ≠ Crossing ≠ Derived Operation/);
assert.doesNotMatch(compare, /from\s+["'][^"']*gematria\.js["']/);
assert.doesNotMatch(compare, /getAiAnalysis|ai-analyze|anthropic|openai/i);
const crossingHandlerIndex = compare.indexOf("const checkCrossing");
const relationCallIndex = compare.indexOf("getRelationCandidate(", crossingHandlerIndex);
assert.ok(crossingHandlerIndex >= 0 && relationCallIndex > crossingHandlerIndex, "relation normalization must live inside explicit checkCrossing handler");
assert.doesNotMatch(compare.slice(0, crossingHandlerIndex), /getRelationCandidate\(/);
assert.match(calculator, /CalculatorCompare2029/);
assert.match(calculator, /showCompare/);
assert.match(calculator, /השווה/);

console.log("Calculator 2029 Compare/Crossing contract: PASS");

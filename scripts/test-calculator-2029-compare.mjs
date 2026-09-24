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
assert.doesNotMatch(compare, /useEffect\([\s\S]*getRelationCandidate/);
assert.match(calculator, /CalculatorCompare2029/);
assert.match(calculator, /showCompare/);
assert.match(calculator, /השווה/);

console.log("Calculator 2029 Compare/Crossing contract: PASS");

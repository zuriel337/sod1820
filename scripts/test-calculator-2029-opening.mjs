import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");
const component = fs.readFileSync("src/components/gematria2029/CalculatorOpening2029.jsx", "utf8");

assert.match(page, /CalculatorOpening2029/);
assert.match(page, /showOpening/);
assert.match(page, /פתח את השיטה/);
assert.match(component, /useGematriaOpeningOperation/);
assert.match(component, /enabled:\s*Boolean\(open/);
assert.match(component, /DERIVED_OPERATION/);
assert.match(component, /לא שיטת גימטריה חדשה ולא ראיה עצמאית/);
assert.match(component, /methodRow\.total == null \? "—"/);
assert.match(component, /coverageStatus/);

assert.doesNotMatch(page, /from\s+["'][^"']*gematria\.js["']/);
assert.doesNotMatch(component, /from\s+["'][^"']*gematria\.js["']/);
assert.doesNotMatch(component, /getAiAnalysis|ai-analyze|functions\.invoke/);
assert.doesNotMatch(component, /fn_method_value|fn_ragil|METHODS|DEPTH_METHODS/);

console.log("PASS Calculator 2029 inline Opening contract");

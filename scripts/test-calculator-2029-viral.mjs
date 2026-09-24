import assert from "node:assert/strict";
import {
  buildCalculatorShareUrl,
  parseCalculatorShareState,
  pickVerifiedShareDiscovery,
} from "../src/lib/research/calculator2029Viral.js";

const selection = {
  expression: "צוריאל",
  methodKey: "רגיל",
  resultValue: 357,
};
const url = buildCalculatorShareUrl(selection, {
  shareId: "abc123",
  discovery: { phrase: "בדיקה", value: 357 },
});
const parsed = parseCalculatorShareState(new URL(url).search);
assert.equal(parsed.isShared, true);
assert.equal(parsed.expression, "צוריאל");
assert.equal(parsed.methodKey, "רגיל");
assert.equal(parsed.resultValue, 357);
assert.equal(parsed.discoveryPhrase, "בדיקה");
assert.equal(parsed.shareId, "abc123");

const wrong = buildCalculatorShareUrl(selection, {
  shareId: "abc123",
  discovery: { phrase: "לא נכון", value: 358 },
});
assert.equal(new URL(wrong).searchParams.has("d"), false);

const discovery = pickVerifiedShareDiscovery({
  items: [
    { phrase: "צוריאל", value: 357, relation: { status: "current" } },
    { phrase: "תלוי", value: 357, relation: { status: "dependent" } },
    { phrase: "מאומת", value: 357, relation: { status: "independent" } },
  ],
}, selection);
assert.deepEqual(discovery, { phrase: "מאומת", value: 357 });

console.log("calculator 2029 viral model: PASS");

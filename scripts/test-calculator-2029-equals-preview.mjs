import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickEqualsPreview, hebrewLetterKey } from "../src/lib/research/equalsPreview.js";

// Pure selection: excludes the typed expression, its anagrams (incl. final-letter forms), ranks by lead_rank then multi-word.
const rows = [
  { phrase: "משה", current: true, leadRank: 1 },
  { phrase: "שהם", current: false, leadRank: 1 },        // anagram of משה → excluded
  { phrase: "שכחה", current: false, leadRank: 5 },
  { phrase: "עליך זרח", current: false, leadRank: 5 },   // multi-word wins tie
  { phrase: "מקרה", current: false, leadRank: null },
  { phrase: "רקמה", current: false, leadRank: 2 },
  { phrase: "פרסה", current: false, leadRank: null },
];
const out = pickEqualsPreview(rows, { expression: "משה", limit: 3 });
assert.deepEqual(out.items.map((i) => i.phrase), ["רקמה", "עליך זרח", "שכחה"]);
assert.equal(out.total, 5, "total counts every eligible match, not only the shown ones");
assert.equal(hebrewLetterKey("שלום"), hebrewLetterKey("מולש"), "final mem normalizes");
assert.equal(pickEqualsPreview([], { expression: "אמת" }).items.length, 0);
assert.equal(pickEqualsPreview(null, { expression: "אמת" }).total, 0);
assert.equal(pickEqualsPreview(rows, { expression: "", limit: 0 }).items.length, 0);

// Contract: one lookup, shared verified filter, no relation fan-out, no AI.
const comp = readFileSync(new URL("../src/components/gematria2029/CalculatorEqualsPreview2029.jsx", import.meta.url), "utf8");
assert.match(comp, /getNumberLookup/);
assert.match(comp, /collectVerifiedLookupMatches/);
assert.doesNotMatch(comp, /getRelationCandidate|fetchMethodLensProjection|getAiAnalysis|ai-analyze|anthropic|openai/i);
assert.match(comp, /לא פירוש ולא ראיה עצמאית/);

const page = readFileSync(new URL("../src/pages/CalculatorPro2029Page.jsx", import.meta.url), "utf8");
assert.match(page, /CalculatorEqualsPreview2029/);
assert.match(page, /sameValueReadout/);
assert.doesNotMatch(page, /fetchMethodLensProjection/);

console.log("Calculator 2029 equals-preview + same-value readout contract: PASS");

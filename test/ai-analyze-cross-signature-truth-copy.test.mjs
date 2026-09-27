import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");

const kindHintStart = src.indexOf("const KIND_HINT: Record<string, string> = {");
const kindHintEnd = src.indexOf("};", kindHintStart);
assert.ok(kindHintStart >= 0 && kindHintEnd > kindHintStart, "expected KIND_HINT block");
const kindHint = src.slice(kindHintStart, kindHintEnd);
assert.match(kindHint, /cross_signature:/, "KIND_HINT must add cross_signature");
const crossHint = kindHint.slice(kindHint.indexOf("cross_signature:"));
assert.match(crossHint, /אל תחשב[^\n]*(עצמאות|גימטריה)|אל תהפוך ספירת שיטות/, "Cross hint must forbid recomputing independence/raw method inflation");
assert.match(crossHint, /truth score|קנוניות|נבואה/, "Cross hint must forbid truth/canonical/prediction promotion");
assert.match(crossHint, /פרוזה בלבד|להסביר/, "Cross hint must limit model to prose explanation");

const factsPrefixStart = src.indexOf("const factsPrefix =");
assert.ok(factsPrefixStart >= 0, "expected factsPrefix");
const factsPrefixBlock = src.slice(factsPrefixStart, src.indexOf("const user =", factsPrefixStart));
assert.match(factsPrefixBlock, /kind === "cross_signature"/, "facts prefix must branch on cross_signature");
assert.match(factsPrefixBlock, /Atomic structural claims/, "Cross facts prefix must state structural claims are already fixed");
assert.match(factsPrefixBlock, /אל תחשב מחדש|אל תשנה claims/, "Cross facts prefix must forbid recompute/claim mutation");
assert.match(factsPrefixBlock, /: "עובדות מאומתות מהמנוע \(השתמש רק באלה\):"/, "default kinds must keep original facts wording");

console.log("ai-analyze cross_signature truth-copy regression: PASS");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// G3_NAMELAB_NORMALIZED_REFLECTION_RUNTIME_V1 truth fix — same ai_analyze_contract v2. name_lab
// inputs are engine Findings/outputs with explicit per-Finding verification limits, never
// universally-verified facts like every other analysis kind, and the prompt must never invite the
// model to infer traits/fate/claims about a person from a researched name-as-word.
const src = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");

const kindHintStart = src.indexOf("const KIND_HINT: Record<string, string> = {");
const kindHintEnd = src.indexOf("};", kindHintStart);
assert.ok(kindHintStart >= 0 && kindHintEnd > kindHintStart, "expected KIND_HINT block");
const kindHint = src.slice(kindHintStart, kindHintEnd);

assert.match(kindHint, /name_lab:/, "KIND_HINT must add a name_lab entry");
const nameLabHint = kindHint.slice(kindHint.indexOf("name_lab:"));
assert.match(nameLabHint, /מילה|ביטוי/, "name_lab hint must frame the subject as a word/expression");
assert.match(nameLabHint, /לא כאל אדם|אל תסיק/, "name_lab hint must forbid inferring traits/fate/claims about a person");

const factsPrefixStart = src.indexOf("const factsPrefix =");
assert.ok(factsPrefixStart >= 0, "expected the kind-specific facts prefix");
const factsPrefixBlock = src.slice(factsPrefixStart, src.indexOf("const user =", factsPrefixStart));

assert.match(factsPrefixBlock, /kind === "name_lab"/, "facts prefix must branch on kind === name_lab");
assert.match(factsPrefixBlock, /מגבלת-אימות/, "name_lab branch must describe explicit per-Finding verification limits");
assert.doesNotMatch(
  factsPrefixBlock.slice(0, factsPrefixBlock.indexOf(":")),
  /עובדות מאומתות/,
  "the name_lab branch condition line must not itself claim universally-verified facts",
);

// Every other kind must keep the exact original universal-facts wording — this is a name_lab-only
// carve-out, never a rewrite of the shared default path other kinds still rely on.
assert.match(factsPrefixBlock, /: "עובדות מאומתות מהמנוע \(השתמש רק באלה\):"/, "non-name_lab kinds must keep the original verified-facts wording unchanged");

const userTemplateStart = src.indexOf("const user =", factsPrefixStart);
const userTemplateEnd = src.indexOf("mtxFacts +", userTemplateStart);
const userTemplate = src.slice(userTemplateStart, userTemplateEnd);
assert.match(userTemplate, /\$\{factsPrefix\}/, "the user prompt must consume the kind-specific factsPrefix, not a hardcoded string");

console.log("ai-analyze name_lab truth-copy regression: PASS");

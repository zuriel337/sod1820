// scripts/test-heichal-research-run-consumer.mjs
//
// Focused acceptance for G3_HEICHAL_SERVER_GATED_RESEARCH_RUN_CONSUMER_V1: Heichal2029Page.jsx is
// the first real Heichal consumer of the LIVE server-gated research-run runtime for canonical
// Number subjects.
//
// Static source acceptance only — no live network/Edge calls, no DB, no model/provider call.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const heichal = readFileSync("src/pages/Heichal2029Page.jsx", "utf8");
const client = readFileSync("src/lib/research/researchRunClient.js", "utf8");

// 1. Heichal never composes W2 client-side and never touches the canonical executor tree directly —
//    only the research-run Edge transport (via researchRunClient.js) does that, server-side.
for (const forbidden of [
  "composeResearchW2",
  "createCanonicalW2Executors",
  "createCanonicalNumberW2Executors",
  "researchW2ExecutorsBase",
  "researchW2Executors.js",
]) {
  assert.equal(heichal.includes(forbidden), false, `Heichal2029Page must not import/use: ${forbidden}`);
}
assert.doesNotMatch(heichal, /ANTHROPIC|GEMINI|OPENAI|ai-analyze/, "Heichal must not call a model/provider directly");

// 2. Exactly one research-run invocation seam client-side: researchRunClient.js is the only module
//    that calls the Edge function directly; Heichal consumes it through that seam, never a second one.
assert.match(client, /supabase\.functions\.invoke\(\s*["']research-run["']/, "researchRunClient.js must own the one research-run invocation seam");
assert.doesNotMatch(heichal, /functions\.invoke\(\s*["']research-run["']/, "Heichal must not invoke research-run directly — it goes through researchRunClient.js");
assert.match(heichal, /import\s*\{\s*runPublicNumberResearch\s*\}\s*from\s*["']\.\.\/lib\/research\/researchRunClient\.js["']/);

// 3. researchRunClient.js uses the existing canonical Supabase client/session + Browser Visitor
//    identity primitive — it must never mint a second guest identity/store.
assert.match(client, /from\s*["']\.\.\/supabase\.js["']/);
assert.match(client, /getVisitorId/);
assert.doesNotMatch(client, /localStorage\.setItem/, "researchRunClient.js must not mint its own guest identity store");

// 4. The Number-subject Raziel action calls research-run with the bounded body shape, then, on
//    status=ok, looks for exactly one next_actions item passing isRazielNextAction before opening
//    Raziel with that route — never a locally-composed message.
assert.match(heichal, /import\s*\{\s*isRazielNextAction\s*\}\s*from\s*["']\.\.\/lib\/research\/razielActionContract\.js["']/);
assert.match(heichal, /runPublicNumberResearch\(\{[\s\S]{0,200}surface:\s*["']heichal["']/);
assert.match(heichal, /next_actions[\s\S]{0,40}\.find\(isRazielNextAction\)/);
assert.match(heichal, /shell\.openRaziel\(\{\s*razielRouteAction:\s*action\s*\}\)/);

// 5. Fail-closed discipline: every early-return / catch path in the Number Raziel handler falls
//    back to the existing generic shell.openRaziel() with no payload — same Research Context, no
//    local message synthesis.
const askRazielBody = heichal.slice(heichal.indexOf("const askRaziel ="), heichal.indexOf("const addSubject ="));
assert.ok(askRazielBody, "askRaziel handler must exist");
const genericOpens = askRazielBody.match(/shell\.openRaziel\(\);/g) || [];
assert.equal(genericOpens.length >= 3, true, "every non-success path (non-number, invalid number, no action, thrown error) must fail closed to the generic Raziel entry");
assert.doesNotMatch(askRazielBody, /setState\(\{[\s\S]{0,40}error:/, "the Raziel handler must never synthesize its own local error message");

// 6. Non-number Heichal subjects (e.g. phrase) still use the existing generic Raziel path in the
//    no-context entry screen — this pass does not touch that surface.
const noContextEntry = heichal.slice(heichal.indexOf("function NoContextEntry"), heichal.indexOf("function ActiveResearchEnvironment"));
assert.match(noContextEntry, /shell\.openRaziel\(\)/, "NoContextEntry must keep the existing generic Raziel entry untouched");

console.log("PASS: Heichal2029 research-run consumer — no client W2 compose/executor, one research-run seam, fail-closed Raziel routing");

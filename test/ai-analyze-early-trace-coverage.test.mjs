import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");

const guideStart = src.indexOf('if (kind === "guide")');
const razielStart = src.indexOf('if (String(body?.persona || "").toLowerCase() === "raziel")');
const genericStart = src.indexOf('const isCollection = kind === "research"');

assert.ok(guideStart >= 0 && razielStart > guideStart && genericStart > razielStart, "expected guide, Raziel, generic path order");

const guide = src.slice(guideStart, razielStart);
const raziel = src.slice(razielStart, genericStart);

assert.match(guide, /beginOperationalTrace\([\s\S]*capability:\s*"ai-analyze:guide"/);
assert.match(guide, /kind:\s*"model_call"[\s\S]*name:\s*"ai-analyze:guide:model"/);
assert.match(guide, /logTokens\([\s\S]*"guide"[\s\S]*traceId:\s*activeTrace\?\.traceId[\s\S]*spanId:\s*guideModelSpanId/);
assert.match(guide, /linkOperationalAiCost\(activeTrace, guideModelSpanId, guideTokenLogId\)/);
assert.match(guide, /rawPrivatePayloadLogged:\s*false/);
assert.match(guide, /finishOperationalTrace\(activeTrace, "success"\)/);
assert.doesNotMatch(guide, /replay:\s*\{[^}]*ask\b/s, "guide replay must not persist raw ask");

assert.match(raziel, /beginOperationalTrace\([\s\S]*ai-analyze:raziel/);
assert.match(raziel, /kind:\s*"model_call"[\s\S]*name:\s*"ai-analyze:raziel:model"/);
assert.match(raziel, /logTokens\([\s\S]*rzKind[\s\S]*traceId:\s*activeTrace\?\.traceId[\s\S]*spanId:\s*razielModelSpanId/);
assert.match(raziel, /linkOperationalAiCost\(activeTrace, razielModelSpanId, razielTokenLogId\)/);
assert.match(raziel, /rawPrivatePayloadLogged:\s*false/);
assert.ok((raziel.match(/finishOperationalTrace\(activeTrace, "success"\)/g) || []).length >= 2, "Raziel contract and fallback returns must finish trace");
assert.match(raziel, /trace_id:\s*activeTrace\?\.traceId \|\| null/);

console.log("ai-analyze early paid paths trace coverage: PASS");

// expression-extract boundary — regression test (SOD1820 Shared Research Execution Boundary task).
// Pure, offline (no DB, no Deno, no network, no deploy). Mirrors expression-extract/index.ts's handler
// shape (that file has TS type annotations — a Deno .ts module — and can't be imported into Node
// directly; same reason test/wa-raziel-v49-routing-date-fix.test.mjs mirrors wa-raziel's logic instead
// of importing it). If index.ts's handler shape changes, update this mirror in lockstep.
//
// Scope: this file verifies ONLY the Shared Expression Extraction boundary (candidates/compound_claims).
// Hebrew/Gregorian date recognition and the sensitive-question no-authority guardrail are NOT this
// function's concern (see index.ts's header, "WHAT THIS IS NOT") — those remain covered by
// test/wa-raziel-v49-routing-date-fix.test.mjs and by fn_raziel_route (verified live against Supabase
// in the accompanying PR report, not re-verified in an offline file).
import { extractCompoundClaims } from "../src/lib/triage.js";
import { extractCandidates } from "../src/lib/analysisFlow.js";

function handle(text) {
  return {
    status: "ok", input: text,
    candidates: extractCandidates(text) || [],
    compound_claims: extractCompoundClaims(text) || [],
  };
}

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL: ${label}${detail ? " — " + detail : ""}`); }
}

console.log("=== expression-extract boundary — stress cases ===");

{
  const r = handle("שם ע״ב 72×3=216");
  check("symbolic 72×3=216 (wa_bot_log:298): ENGINE_VERIFIED_COMPOSITE, result=216",
    r.compound_claims.some((c) => c.status === "ENGINE_VERIFIED_COMPOSITE" && c.result === 216), JSON.stringify(r.compound_claims));
}
{
  const r = handle("543 × 4 גילויים.. = 2172");
  check("symbolic 543×4=2172 (wa_bot_log:346): ENGINE_VERIFIED_COMPOSITE, result=2172",
    r.compound_claims.some((c) => c.status === "ENGINE_VERIFIED_COMPOSITE" && c.result === 2172), JSON.stringify(r.compound_claims));
}
{
  // Confirms OPEN at the SHARED-BOUNDARY level (not a wa-raziel-local limitation): the prose relation
  // "X הוא כפולה של Y ב-Z" is not part of the frozen R01-R36 grammar. A fix here would be a real grammar
  // extension via Contract Change Law §9 (shared_expression_extraction_contract_v1 §9), not a boundary
  // change and not something this function may quietly patch.
  const r = handle("2172 הוא כפולה של 181 ב-12");
  check("STATUS=OPEN: prose 2172 (wa_bot_log:924) — no compound claim from the shared grammar itself",
    r.compound_claims.length === 0, JSON.stringify(r.compound_claims));
  check("STATUS=OPEN: but the raw numbers ARE still visible as candidates (2172,181,12) for Raziel to reason over",
    [2172, 181, 12].every((v) => r.candidates.some((c) => c.type === "number-anchor" && c.value === v)));
}
{
  const r = handle("מה המסר מהמספר 19:19");
  check("preserve: 19:19 (wa_bot_log:914) produces no compound claim / no false positive", r.compound_claims.length === 0);
}
{
  const r = handle("מה המסר מהמספר 2323");
  check("preserve: 2323 (wa_bot_log:917) produces no compound claim / no false positive", r.compound_claims.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// expression-extract-bundle-parity — offline proof that the PACKAGED artifact (not just the source
// files independently) behaves correctly, by stubbing Deno.serve and exercising the exact handler
// the bundle registers. Run after `npm run package:expression-extract`.
//
// This is stronger evidence than mirroring triage.js/analysisFlow.js logic (as
// test/expression-extract-boundary.test.mjs already does): it imports the REAL bundled output file.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUNDLE = join(ROOT, "supabase/functions/expression-extract/.build/index.ts");

let handler = null;
globalThis.Deno = { serve: (fn) => { handler = fn; } };

// esbuild's ESM output is valid JS (Deno accepts TS at the extension level, but the bundled content
// itself is plain JS syntax) -- import it directly as a data: URL so Node's ESM loader can run it
// without needing a .mjs rename.
const code = readFileSync(BUNDLE, "utf8");
await import(`data:text/javascript,${encodeURIComponent(code)}`);

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL: ${label}${detail ? " — " + detail : ""}`); }
}

if (!handler) {
  console.error("FAIL: bundle never called Deno.serve() -- handler not captured");
  process.exit(1);
}

async function call(text) {
  const req = new Request("https://example.test/expression-extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const res = await handler(req);
  return { status: res.status, body: await res.json() };
}

console.log("=== expression-extract BUNDLE parity — 5 canonical regression cases ===");

{
  const { status, body } = await call("שם ע״ב 72×3=216");
  check("HTTP 200", status === 200);
  check("72×3=216: ENGINE_VERIFIED_COMPOSITE, result=216",
    body.compound_claims.some((c) => c.status === "ENGINE_VERIFIED_COMPOSITE" && c.result === 216),
    JSON.stringify(body.compound_claims));
}
{
  const { status, body } = await call("543 × 4 גילויים.. = 2172");
  check("HTTP 200", status === 200);
  check("543×4=2172: ENGINE_VERIFIED_COMPOSITE, result=2172",
    body.compound_claims.some((c) => c.status === "ENGINE_VERIFIED_COMPOSITE" && c.result === 2172),
    JSON.stringify(body.compound_claims));
}
{
  const { status, body } = await call("2172 הוא כפולה של 181 ב-12");
  check("HTTP 200", status === 200);
  check("prose 2172: no fabricated compound_claims", body.compound_claims.length === 0,
    JSON.stringify(body.compound_claims));
  check("prose 2172: raw numbers still surface as candidates",
    [2172, 181, 12].every((v) => body.candidates.some((c) => c.type === "number-anchor" && c.value === v)));
}
{
  const { status, body } = await call("מה המסר מהמספר 19:19");
  check("HTTP 200", status === 200);
  check("19:19: no false compound arithmetic claim", body.compound_claims.length === 0);
}
{
  const { status, body } = await call("מה המסר מהמספר 2323");
  check("HTTP 200", status === 200);
  check("2323: no false compound arithmetic claim", body.compound_claims.length === 0);
}

// Auth is a deploy-time platform gate (verify_jwt), not code in this file -- confirm the bundle
// itself does no manual secret/JWT comparison (grep-provable, re-asserted here so it's part of the
// automated suite, not just a one-off manual check).
check("no hardcoded secret/service-role string in the bundle",
  !/s0d1820wahook|SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE/.test(code));

// GET / method_not_allowed path (unrelated to auth, but part of the handler contract).
{
  const req = new Request("https://example.test/expression-extract", { method: "GET" });
  const res = await handler(req);
  check("GET -> 405 method_not_allowed", res.status === 405);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

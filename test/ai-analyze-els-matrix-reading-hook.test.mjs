import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// Static contract for the ai-analyze hook of the experimental ELS matrix reading layer. The behaviour itself is covered by
// els-matrix-reading-handler.test.mjs; this file pins WHERE the hook sits and that it can only be reached through the flag-guarded handler.
const src = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
const handler = readFileSync(new URL("../supabase/functions/_shared/elsMatrixReading.js", import.meta.url), "utf8");

const hookStart = src.indexOf("if (body?.els_matrix_reading");
const guideStart = src.indexOf('if (kind === "guide")');
const notConfiguredEngine = src.indexOf('if (engine === "gemini" && !GEMINI_KEY)');
const denoServe = src.indexOf("Deno.serve(");

test("the hook is one additive early branch inside Deno.serve, after the engine checks and before every other kind", () => {
  assert.ok(denoServe >= 0 && notConfiguredEngine > denoServe && hookStart > notConfiguredEngine && guideStart > hookStart);
  assert.equal(src.split("handleElsMatrixReading(").length - 1, 1, "exactly one call site");
  assert.match(src, /import \{ handleElsMatrixReading \} from "\.\.\/_shared\/elsMatrixReading\.js";/);
});

test("the hook is reached only when the request carries an els_matrix_reading object", () => {
  assert.match(src.slice(hookStart, hookStart + 120), /body\?\.els_matrix_reading && typeof body\.els_matrix_reading === "object"/);
});

test("the hook reuses the route's own identity, JSON helper, key and service headers (no second route, no new client)", () => {
  const block = src.slice(hookStart, guideStart);
  assert.match(block, /resolveIdentity: \(\) => resolveIdentity\(req, body\)/);
  assert.match(block, /json,/);
  assert.match(block, /anthropicKey: ANTHROPIC_KEY/);
  assert.match(block, /supabaseServiceHeaders\(SB_SVC, extra\)/);
  assert.match(block, /fetchImpl: fetch/);
  assert.doesNotMatch(block, /new Anthropic|createClient|api\.anthropic\.com/);
});

test("the layer is OFF unless ELS_MATRIX_READING_ENABLED is set, and admin-gated inside the handler", () => {
  const block = src.slice(hookStart, guideStart);
  assert.match(block, /enabled: Deno\.env\.get\("ELS_MATRIX_READING_ENABLED"\) \|\| ""/);
  assert.match(handler, /!env\.enabled \|\| !\["1", "true", "on"\]\.includes\(String\(env\.enabled\)\.toLowerCase\(\)\)\) return respond\(\{ ok: false, error: "not_enabled" \}, 404\)/);
  assert.match(handler, /tier !== "admin"\) return respond\(\{ ok: false, error: "admin_only" \}, 403\)/);
});

test("nothing in the layer charges credits or touches the credit ledger", () => {
  assert.doesNotMatch(handler, /credit_spend|credit_ledger|user_credits|credits_balance/);
  assert.match(handler, /charged_to_user: false/);
  assert.match(handler, /credits: "NOT_CHARGED"/);
  assert.match(handler, /refund: "NOT_PROMISED"/);
});

test("the layer does not call any model other than through the verified Fable batch and never exposes a second search engine", () => {
  assert.doesNotMatch(handler, /api\.openai|generativelanguage|gemini/i);
  assert.match(handler, /els_verify_occurrence_v1/);
  assert.doesNotMatch(handler, /rpc\/els_(search|scan|find)/);
});

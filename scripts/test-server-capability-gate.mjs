import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260922194500_server_capability_execution_gate_v1.sql", "utf8");
const edge = readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");

for (const needle of [
  "create or replace function public.fn_capability_execution_gate_v1",
  "public.fn_user_entitlement(p_user_ref, p_visitor)",
  "from public.site_flags f",
  "create or replace function public.ai_quota_check",
  "where public.ai_usage.n < v_lim",
  "public.ai_quota_check(p_identity, v_budget_tier, p_budget_limit_override)",
  "v_availability_state := 'unknown_flag'",
  "v_availability_allowed := false",
  "v_budget_kind = 'ai_quota'",
  "not v_availability_allowed or not v_entitlement_allowed",
  "'server_authoritative',true",
  "'final_product_allocation_defined_here',false",
  "'pricing_defined_here',false",
  "'supported_entitlement_requirements',jsonb_build_array('public','subscriber','admin')",
  "v_entitlement_state := 'unsupported_requirement'",
  "revoke all on function public.fn_capability_execution_gate_v1",
  "grant execute on function public.fn_capability_execution_gate_v1",
  "to service_role",
]) {
  assert.ok(migration.includes(needle), `server gate migration must include: ${needle}`);
}

assert.equal(
  migration.includes("grant execute on function public.fn_capability_execution_gate_v1(text,text,text,text,text,text,text,text,integer)\n  to authenticated"),
  false,
  "client roles must not execute the server capability gate",
);

assert.equal(
  migration.includes("v_required = 'authenticated'"),
  false,
  "G3 gate must not invent authenticated/premium/credits entitlement requirements before G5",
);

for (const needle of [
  'traceRpc("fn_capability_execution_gate_v1"',
  'name: "fn_capability_execution_gate_v1"',
  'p_required_entitlement: "public"',
  'p_budget_kind: "ai_quota"',
  'const verifiedUserRef = identity.startsWith("u:") ? identity.slice(2) : null',
  'const verifiedVisitor = identity.startsWith("v:") ? identity.slice(2) : null',
  'error: "gate_unavailable"',
  'await finishOperationalTrace(activeTrace, "access_filtered", gateError)',
]) {
  assert.ok(edge.includes(needle), `ai-analyze gate wiring must include: ${needle}`);
}

const gateCall = edge.indexOf('traceRpc("fn_capability_execution_gate_v1"');
const modelCall = edge.indexOf('const modelSpanId = crypto.randomUUID()', gateCall);
assert.ok(gateCall >= 0 && modelCall > gateCall, "server gate must execute before the model call");

const genericStart = edge.indexOf("const isCollection = kind === \"research\"");
const genericEnd = edge.indexOf("const wantLong = !!body?.long", genericStart);
const genericGateBlock = edge.slice(genericStart, genericEnd);
assert.equal(
  genericGateBlock.includes("await checkQuota("),
  false,
  "generic ai-analyze must not bypass the unified server gate with a parallel quota decision",
);

console.log("Server Capability / Entitlement / Budget Gate v1 static acceptance: PASS");

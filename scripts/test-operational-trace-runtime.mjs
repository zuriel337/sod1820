import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260922191500_operational_trace_runtime_v1.sql", "utf8");
const edge = readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");
const browser = readFileSync("src/lib/supabase.js", "utf8");

const requiredMigration = [
  "create table if not exists public.op_trace_roots",
  "create table if not exists public.op_trace_spans",
  "foreign key (parent_span_id, trace_id)",
  "references public.op_trace_spans(span_id, trace_id)",
  "enable row level security",
  "revoke all on table public.op_trace_roots from public, anon, authenticated",
  "revoke all on table public.op_trace_spans from public, anon, authenticated",
  "add column if not exists trace_id uuid",
  "add column if not exists span_id uuid",
  "add constraint ai_token_log_trace_span_uq unique (trace_id, span_id)",
  "create or replace view public.agent_token_costs",
  "l.trace_id",
  "l.span_id",
  "create or replace function public.op_trace_begin_v1",
  "create or replace function public.op_trace_record_span_v1",
  "create or replace function public.op_trace_finish_v1",
  "create or replace function public.op_trace_link_ai_cost_v1",
  "create or replace function public.admin_op_trace_v1",
  "create or replace function public.admin_op_trace_list_v1",
  "raw_private_payload_logged = false",
  "when coalesce(a.linked_ai_calls, 0) > 0 then a.cost_ils",
];

for (const needle of requiredMigration) {
  assert.ok(migration.includes(needle), `migration must include: ${needle}`);
}

assert.equal(migration.includes("create table if not exists public.trace_"), false, "bare trace_* tables are forbidden");
assert.equal(migration.includes("create table if not exists public.span_"), false, "bare span_* tables are forbidden");
assert.equal(
  migration.includes("grant execute on function public.op_trace_begin_v1(uuid,uuid,jsonb,timestamptz) to authenticated"),
  false,
  "client roles must not mutate operational trace",
);

const requiredEdge = [
  'traceRpc("op_trace_begin_v1"',
  'traceRpc("op_trace_record_span_v1"',
  'traceRpc("op_trace_finish_v1"',
  'traceRpc("op_trace_link_ai_cost_v1"',
  'name: "fn_capability_execution_gate_v1"',
  'name: "metatron_context"',
  'kind: "router_plan"',
  'parentSpanId: gateSpanId',
  'name: "ai-analyze:research-plan"',
  'parentSpanId: planSpanId',
  'plan_ref: planRef',
  'kind: "model_call"',
  'parentSpanId: contextSpanId',
  'kind: "synthesis"',
  'name: "ai-analyze:synthesis"',
  'exactReturnRef: responseRef',
  'trace_id: hasTrace ? trace.traceId : null',
  'span_id: hasTrace ? trace.spanId : null',
  'on_conflict=trace_id,span_id',
  'Trace persistence must never break the pre-existing cost log',
  'body: JSON.stringify(withTrace ? row : legacyRow)',
  'trace_id: activeTrace?.traceId || null',
  'rawPrivatePayloadLogged: false',
  'interaction_id: safeTraceUuid(body?.interaction_id)',
];

for (const needle of requiredEdge) {
  assert.ok(edge.includes(needle), `ai-analyze trace wiring must include: ${needle}`);
}

assert.ok(
  edge.includes('const numericSubject = /^\\d{1,18}$/.test(subject) ? `number:${subject}` : null;'),
  "raw subject text must not be copied into operational trace",
);
assert.equal(
  edge.includes("subject_ref: subject"),
  false,
  "raw subject must never be stored as subject_ref",
);
assert.equal(
  edge.includes("safeOperationalRef(body?.subject_ref)"),
  false,
  "public callers must not choose trace subject_ref",
);
assert.equal(
  edge.includes("interaction_id: safeOperationalRef(body?.interaction_id)"),
  false,
  "public interaction correlation must not accept arbitrary safe refs",
);

for (const needle of [
  "function aiInteractionId()",
  "interaction_id: interactionId",
  "surface: traceSurface",
  "const traceSurface = surface || 'web:ai-analysis'",
]) {
  assert.ok(browser.includes(needle), `browser trace propagation must include: ${needle}`);
}
assert.equal(
  browser.includes("trace_id: interactionId"),
  false,
  "browser correlation must never let the client choose the canonical trace_id",
);


const guardStart = edge.indexOf("// AI_NUMERIC_TRUTH_GUARD_START");
const guardEnd = edge.indexOf("// AI_NUMERIC_TRUTH_GUARD_END");
assert.ok(guardStart >= 0 && guardEnd > guardStart, "numeric truth guard source markers must exist");
const guardSource = edge.slice(guardStart, guardEnd);
const guardFactory = new Function(
  `${guardSource}\nreturn { numericLiterals, validateNumericOutput, numericTruthRetryInstruction, numericTruthFallback };`,
);
const {
  numericLiterals,
  validateNumericOutput,
  numericTruthRetryInstruction,
  numericTruthFallback,
} = guardFactory();

assert.deepEqual(numericLiterals("878 · 1,820 · +0138 · -0"), ["878", "1820", "138", "0"]);
assert.equal(
  validateNumericOutput("878 נשאר העוגן.", ["878"]).ok,
  true,
  "trusted numeric literal may be repeated by the interpreter",
);
const observedSmokeViolation = validateNumericOutput(
  "878 מתפרק ל-80+798, וגם 8+7+8=23.",
  ["878"],
);
assert.equal(observedSmokeViolation.ok, false, "invented arithmetic must be rejected");
for (const value of ["80", "798", "8", "7", "23"]) {
  assert.ok(observedSmokeViolation.invented.includes(value), `missing invented numeric literal ${value}`);
}
assert.equal(
  validateNumericOutput("787 הוא העוגן והקשר המאומת מפנה ל-138.", ["787", "prime index 138", "צמח=138"]).ok,
  true,
  "numbers already present in verified inputs remain usable",
);
assert.equal(
  validateNumericOutput("1,820", ["1820"]).ok,
  true,
  "format-only thousands separators must not create a new numeric fact",
);
assert.equal(
  validateNumericOutput(numericTruthRetryInstruction(), []).ok,
  true,
  "retry instruction itself must not inject numeric literals",
);
assert.equal(
  validateNumericOutput(numericTruthFallback(), []).ok,
  true,
  "never-silent fallback itself must not invent numeric literals",
);

for (const needle of [
  'name: "ai-analyze:model-truth-retry"',
  'routing_reason: "numeric_truth_guard_retry"',
  'escalation_reason: "untrusted_numeric_literal"',
  'retry_ordinal: 1',
  'output_use: out.error ? "not_applicable" : firstGuard.ok ? "used" : "rejected"',
  'fallback_reason: fallbackUsed ? "numeric_truth_guard" : null',
  'numeric_truth_guard_fallback',
]) {
  assert.ok(edge.includes(needle), `numeric truth guard runtime must include: ${needle}`);
}
assert.equal(edge.includes("retry_ordinal: 2"), false, "numeric truth guard is bounded to one retry");

console.log("Operational Trace Runtime v1 static acceptance: PASS");

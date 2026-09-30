import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// G3 A1 — the Operational Trace span must carry an effective, provenance-bearing cost.
// Contract guard over the migration that extends op_trace_link_ai_cost_v1. The edge caller
// (ai-analyze) was already wired; this asserts the DB side actually resolves a price.

const sql = readFileSync(
  new URL("../supabase/migrations/20260930005533_g3_a1_trace_cost_exact_v1.sql", import.meta.url),
  "utf8",
);

// EXTEND_EXISTING: the canonical function is replaced in place, never forked.
assert.match(sql, /create or replace function public\.op_trace_link_ai_cost_v1\(/);
assert.doesNotMatch(sql, /create table/i, "A1 must not create a cost store");
assert.doesNotMatch(sql, /op_trace_link_ai_cost_v2|_cost_v2\b/, "A1 must not fork a second cost function");

// The rate card stays the single pricing authority; usage stays ai_token_log.
assert.match(sql, /from public\.api_pricing p/);
assert.match(sql, /from public\.ai_token_log l/);

// Fail-closed linkage check is preserved: the log row must already claim this span.
assert.match(sql, /where l\.id = p_ai_token_log_id[\s\S]*and l\.trace_id = p_trace_id[\s\S]*and l\.span_id = p_span_id/);
assert.match(sql, /if not found then[\s\S]*return false;/);

// Effective pricing window, newest applicable row.
assert.match(sql, /v_log\.created_at::date >= p\.valid_from/);
assert.match(sql, /p\.valid_until is null or v_log\.created_at::date <= p\.valid_until/);
assert.match(sql, /order by p\.valid_from desc/);

// Cost certainty vocabulary and the never-invent rule.
assert.match(sql, /v_certainty := 'not_billable'/);
assert.match(sql, /v_certainty := 'unknown'/);
assert.match(sql, /v_certainty := 'exact'/);
assert.match(sql, /never fabricate a price/i);
assert.doesNotMatch(sql, /coalesce\(\s*v_usd\s*,\s*0\s*\)/, "an unpriced span must stay NULL, never zero");

// Full provenance is recorded, not just an amount.
for (const column of [
  "provider_native_amount",
  "provider_currency",
  "pricing_ref",
  "pricing_effective_at",
  "fx_rate",
  "fx_effective_at",
  "cost_ils",
  "cost_certainty",
]) {
  assert.match(sql, new RegExp(`${column}\\s*=`), `span must record ${column}`);
}

// Idempotency: an already-exact span is never recomputed or restated.
assert.match(sql, /v_apply := coalesce\(v_existing, ''\) <> 'exact'/, "function guards on the span's current certainty");
assert.match(sql, /coalesce\(s\.cost_certainty, ''\) <> 'exact'/, "backfill skips already-exact spans");
for (const column of ["provider_native_amount", "pricing_ref", "fx_rate", "cost_ils"]) {
  assert.match(sql, new RegExp(`${column}\\s*=\\s*case when v_apply and v_certainty = 'exact'`),
    `${column} must only be written when the span is not already exact`);
}

// A valid re-link must still report success: the idempotency guard lives in the SET
// expressions, not in the WHERE clause, so `found` keeps reflecting span existence.
const fn = sql.slice(sql.indexOf("create or replace function"), sql.indexOf("comment on function"));
const updateClause = fn.slice(fn.lastIndexOf("update public.op_trace_spans"));
const whereClause = updateClause.slice(updateClause.indexOf("where s.trace_id"));
assert.doesNotMatch(whereClause, /cost_certainty/, "the function's WHERE must not filter on cost_certainty");
assert.match(fn, /return found;/);

// The existing costLogRef pointer behavior is preserved verbatim.
assert.match(sql, /when s\.replay \? 'costLogRef' then s\.replay/);

// Backfill is additive and bounded to model_call spans that already join a usage row.
assert.match(sql, /update public\.op_trace_spans s[\s\S]*and s\.kind\s*=\s*'model_call'/);
assert.doesNotMatch(sql, /delete from/i, "backfill must not delete");
assert.doesNotMatch(sql, /drop (table|column)/i, "backfill must not drop");

// The edge caller must remain wired and unchanged by this work.
const edge = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
assert.match(edge, /op_trace_link_ai_cost_v1/, "ai-analyze must still call the canonical cost link");

console.log("G3 A1 trace cost exact contract: PASS");

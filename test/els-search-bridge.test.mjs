import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../supabase/functions/els-search-bridge/index.ts', import.meta.url), 'utf8');

test('ELS server bridge delegates occurrence truth to canonical RPCs only', () => {
  assert.match(src, /serviceRpc\("els_search_page_core_v1"/);
  assert.match(src, /serviceRpc\("els_verify_occurrence_v1"/);
  assert.doesNotMatch(src, /from\s+public\.torah_stream/i);
  assert.doesNotMatch(src, /generate_series\s*\(/i);
  assert.doesNotMatch(src, /els_torah_occurrences_internal_v1\s*\(/i);
  assert.doesNotMatch(src, /function\s+findAll|function\s+fwd|findAllAdaptive/i);
});

test('ELS server bridge reuses canonical abuse protection and Operational Trace', () => {
  assert.match(src, /serviceRpc\("edge_rate_limit_check"/);
  assert.match(src, /serviceRpc\("op_trace_begin_v1"/);
  assert.match(src, /serviceRpc\("op_trace_record_span_v1"/);
  assert.match(src, /serviceRpc\("op_trace_finish_v1"/);
  assert.match(src, /rawPrivatePayloadLogged:\s*false/);
  assert.match(src, /sha256:\$\{inputHash\}/);
});

test('B0: capability gate precedes every canonical engine RPC, names lock_els, is traced and fails closed', () => {
  const gate = src.indexOf('serviceRpc("fn_capability_execution_gate_v1"');
  assert.ok(gate > 0);
  assert.ok(gate < src.indexOf('serviceRpc("els_verify_occurrence_v1"'));
  assert.ok(gate < src.indexOf('serviceRpc("els_search_page_core_v1"'));
  assert.match(src, /ELS_LOCK_FLAG = "lock_els"/);
  assert.match(src, /p_flag_key:\s*ELS_LOCK_FLAG/);
  assert.match(src, /"fn_capability_execution_gate_v1", gateStartedAt/);
  assert.match(src, /!gate \|\| !gateAllowed \|\| !gateTraced/);
  assert.match(src, /gate_unavailable/);
  assert.match(src, /access_filtered/);
  assert.match(src, /if \(!trace\) return json\(\{ error: "trace_unavailable" \}, 503\)/);
  // privacy-safe denial: entitlement/identity detail is never echoed
  assert.doesNotMatch(src, /json\(\{[^}]*\bgate\b[^}]*\}/);
});

test('B0: page search is explicitly bounded; verify keeps large exact skips', () => {
  assert.match(src, /PAGE_SKIP_MAX_CEILING = 500/);
  assert.match(src, /skipMax == null \|\| skipMax < skipMin/);
  assert.match(src, /skip_max_required/);
  assert.match(src, /skipMax > PAGE_SKIP_MAX_CEILING/);
  assert.match(src, /budget_exceeded/);
  assert.match(src, /p_skip_max:\s*skipMax/);
  assert.match(src, /pageSize = Math\.max\(1, Math\.min\([^\n]*500\)\)/);
  // verify path has no ceiling applied to skip (1820 / 10065 remain valid)
  const verifyBlock = src.slice(src.indexOf('if (op === "verify")'), src.indexOf('const skipMin'));
  assert.doesNotMatch(verifyBlock, /CEILING|500/);
  assert.match(verifyBlock, /skip < 2/);
});

test('B0: trace root stays server-issued; interaction_id correlation preserved', () => {
  assert.match(src, /const traceId = crypto\.randomUUID\(\)/);
  assert.match(src, /interaction_id: interactionId/);
  assert.doesNotMatch(src, /body\??\.trace_id|body\??\.root_span_id/);
});

test('Tanakh remains delegated to canonical MISSING_ADAPTER behavior', () => {
  assert.match(src, /const scope = body\?\.scope === "tanakh" \? "tanakh" : "torah"/);
  assert.doesNotMatch(src, /tanach_verses|tk-letters|TORAH_N/);
});

console.log('els-search-bridge contract: PASS');

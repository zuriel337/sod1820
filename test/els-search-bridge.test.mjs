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

test('full-domain page bridge does not silently impose the public 500 skip ceiling', () => {
  assert.match(src, /p_skip_max:\s*skipMax/);
  assert.match(src, /pageSize = Math\.max\(1, Math\.min\([^\n]*500\)\)/);
  assert.doesNotMatch(src, /Math\.min\([^\n]*skipMax[^\n]*500/);
});

test('Tanakh remains delegated to canonical MISSING_ADAPTER behavior', () => {
  assert.match(src, /const scope = body\?\.scope === "tanakh" \? "tanakh" : "torah"/);
  assert.doesNotMatch(src, /tanach_verses|tk-letters|TORAH_N/);
});

console.log('els-search-bridge contract: PASS');

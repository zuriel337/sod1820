import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../supabase/migrations/20260924215700_g3_els_full_domain_regular_projection_v1.sql', import.meta.url), 'utf8');

test('regular projection delegates all occurrence truth to the one canonical generator', () => {
  assert.match(src, /els_torah_occurrences_internal_v1\(v_term,2,v_full_max,0,v_hi-1\)/);
  assert.doesNotMatch(src, /from\s+public\.torah_stream[\s\S]{0,200}generate_series/i);
});

test('regular projection executes the full Torah skip domain and returns exact total count', () => {
  assert.match(src, /v_full_max := greatest\(2,floor\(\(v_hi-1\)::numeric\/greatest\(1,v_len-1\)\)::integer\)/);
  assert.match(src, /\(select count\(\*\) from candidates\)/);
  assert.match(src, /'total_hits',v_total/);
});

test('regular projection bounds only the returned view at 4000 and labels it non-representative', () => {
  assert.match(src, /v_cap integer := greatest\(1,least\(coalesce\(p_maxhits,4000\),4000\)\)/);
  assert.match(src, /'policy','ordered_prefix_v1'/);
  assert.match(src, /'representative',false/);
  assert.match(src, /'legacy_browser_equivalent',false/);
  assert.match(src, /'truncated',v_total>v_cap/);
});

test('regular projection is service-only and Tanakh remains fail-closed', () => {
  assert.match(src, /if v_scope='tanakh'[\s\S]*'MISSING_ADAPTER'/);
  assert.match(src, /revoke all on function public\.els_search_regular_core_v1[\s\S]*from public, anon, authenticated;/i);
  assert.match(src, /grant execute[\s\S]*to service_role;/i);
});

console.log('ELS full-domain regular projection: PASS');

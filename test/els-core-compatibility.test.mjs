import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20260916150900_g3_els_core_compatibility_extension_v1.sql', import.meta.url), 'utf8');

test('C2 extends one ELS engine without a new corpus/store/table', () => {
  assert.match(migration, /create or replace function public\.els_torah_occurrences_internal_v1/i);
  assert.match(migration, /create or replace function public\.els_search_core_v1/i);
  assert.match(migration, /create or replace function public\.els_search_page_core_v1/i);
  assert.match(migration, /create or replace function public\.els_verify_occurrence_v1/i);
  assert.match(migration, /create or replace function public\.els_search_geometry_core_v1/i);
  assert.doesNotMatch(migration, /create\s+table/i);
  assert.doesNotMatch(migration, /from\s+public\.tanach_verses/i);
});

test('all occurrence-producing server projections delegate to the same internal generator', () => {
  const refs = migration.match(/els_torah_occurrences_internal_v1\(/g) || [];
  assert.ok(refs.length >= 5, `expected shared generator to be reused, got ${refs.length} references`);
  assert.match(migration, /els_search_core_v1[\s\S]*els_torah_occurrences_internal_v1/i);
  assert.match(migration, /els_search_page_core_v1[\s\S]*els_torah_occurrences_internal_v1/i);
  assert.match(migration, /els_verify_occurrence_v1[\s\S]*els_torah_occurrences_internal_v1/i);
  assert.match(migration, /els_search_geometry_core_v1[\s\S]*els_torah_occurrences_internal_v1/i);
});

test('truncation is explicit and non-representative with an exhaustive continuation contract', () => {
  assert.match(migration, /'policy','ordered_prefix_v1'/i);
  assert.match(migration, /'representative',false/i);
  assert.match(migration, /return_budget_ordered_prefix_non_representative/i);
  assert.match(migration, /els_search_page_core_v1/i);
  assert.match(migration, /els_keyset_v1/i);
});

test('Tanakh remains fail-closed MISSING_ADAPTER', () => {
  const missing = migration.match(/MISSING_ADAPTER/g) || [];
  assert.ok(missing.length >= 4, 'search/page/replay/geometry must all fail closed for Tanakh');
  assert.match(migration, /canonical Tanakh corpus identity exists, but no server-callable canonical Tanakh stream is live/i);
});

test('service-only cores and bounded public wrappers have explicit grants', () => {
  assert.match(migration, /revoke all on function public\.els_search_page_core_v1[\s\S]*from public, anon, authenticated;[\s\S]*grant execute[\s\S]*to service_role;/i);
  assert.match(migration, /revoke all on function public\.els_search_page_v1[\s\S]*from public;[\s\S]*grant execute[\s\S]*to anon, authenticated, service_role;/i);
  assert.match(migration, /revoke all on function public\.els_verify_occurrence_v1[\s\S]*from public;[\s\S]*grant execute[\s\S]*to anon, authenticated, service_role;/i);
  assert.match(migration, /revoke all on function public\.els_search_geometry_core_v1[\s\S]*from public, anon, authenticated;[\s\S]*grant execute[\s\S]*to service_role;/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('supabase/migrations/20261001072530_g3_canonical_data_inventory_projection_v1.sql', 'utf8');
const doc = readFileSync('docs/2029-data-placement-retention-crosswalk.md', 'utf8');
const code = sql.replace(/--.*$/gm, '');

test('migration is additive: one function, no persistent store or write DDL/DML', () => {
  assert.equal((code.match(/create or replace function/gi) || []).length, 1);
  for (const re of [/create\s+(unlogged\s+)?table/i, /create\s+(materialized\s+)?view/i, /\binsert\s+into\b/i,
    /\bupdate\s+public\./i, /\bdelete\s+from\b/i, /\btruncate\b/i, /\bdrop\s+/i, /\balter\s+table\b/i, /cron\.schedule/i]) {
    assert.doesNotMatch(code, re, String(re));
  }
});

test('function is stable (read-only) and security definer with pinned search_path', () => {
  assert.match(code, /returns jsonb\s+language plpgsql\s+stable\s+security definer/i);
  assert.match(code, /set search_path to 'public', 'pg_temp'/i);
});

test('admin / service_role access only; anon and public revoked', () => {
  assert.match(code, /auth\.role\(\) <> 'service_role' and not coalesce\(public\.rd_is_admin\(\), false\)/);
  assert.match(code, /revoke all on function public\.admin_canonical_data_inventory_v1\(\) from public, anon, authenticated/);
  assert.match(code, /grant execute on function public\.admin_canonical_data_inventory_v1\(\) to authenticated, service_role/);
  assert.doesNotMatch(code, /grant execute[^;]*\banon\b/i);
});

test('catalog coverage: all relation kinds, partition children excluded, public schema', () => {
  assert.match(code, /relkind in \('r','p','m','v','f'\)/);
  assert.match(code, /not c\.relispartition/);
  assert.match(code, /relnamespace = 'public'::regnamespace/);
});

test('projection exposes every required field', () => {
  for (const f of ['schema_name', 'object_name', 'owner_pointer', 'placement_role', 'retention_class', 'retention_pointer',
    'cutover_gate', 'disposition', 'reader_writer_evidence', 'indexes', 'security_posture', 'volume', 'last_verification',
    'material_unmapped', 'rls_enabled', 'policy_count', 'est_rows', 'total_bytes', 'growth_bytes_7d']) {
    assert.ok(code.includes(f), f);
  }
});

test('every physical store in the crosswalk doc is mapped; unknowns stay explicit', () => {
  const stores = [...doc.matchAll(/^\| `([a-z_]+)`(?: \/ `([a-z_]+)`)?/gm)].flatMap(m => [m[1], m[2]]).filter(Boolean);
  assert.ok(stores.length >= 20);
  for (const s of stores) assert.ok(code.includes(`('${s}',`), `crosswalk store missing: ${s}`);
  assert.match(code, /coalesce\(x\.owner_pointer,'UNKNOWN'\)/);
  assert.match(code, /coalesce\(x\.crosswalk_state,'UNMAPPED'\)/);
  assert.match(code, /when x\.obj is null then 'UNKNOWN'/);
  assert.match(code, /'material_unmapped', coalesce\(jsonb_agg/);
});

test('NEEDS_ADJUDICATION stores never get an invented owner', () => {
  for (const s of ['gematria_wall', 'raw_gematria', 'contributor_content']) {
    assert.match(code, new RegExp(`\\('${s}','UNKNOWN'`));
  }
});

test('growth reads existing capacity snapshots only (no snapshot writer call)', () => {
  assert.doesNotMatch(code, /fn_capacity_snapshot_v1\s*\(/);
  assert.match(code, /cache_kind = 'capacity_snapshot'/);
});

test('V3 owner-map: former blocking GAPs mapped with one primary owner each', () => {
  const want = {
    xlang_calibration: 'content_translation_law v4',
    shiurim_audio: 'legacy_content_protocol v2',
    post_qa: 'source_truth_vs_context_builder',
    discoveries: 'unified_discovery_architecture v1',
  };
  for (const [s, owner] of Object.entries(want)) {
    assert.ok(code.includes(`('${s}','${owner}`), `${s} must map to ${owner}`);
    assert.ok(doc.includes(`\`${s}\``), `${s} must be in the crosswalk doc`);
  }
  assert.match(doc, /research_intake_foundation_contract_law v13/);
});

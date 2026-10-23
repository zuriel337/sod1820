import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20261022221500_zvi_strong_tree_promotion_v1.sql",
  "utf8",
);

test("Zvi strong tree promotion is an explicit two-step Human-Gate action", () => {
  assert.match(migration, /admin_research_review\([\s\S]*?'canonicalize'/);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/);
  assert.match(migration, /v_row\.status <> 'canonical'/);
  assert.match(migration, /v_row\.privacy_scope <> 'public'/);
  assert.match(migration, /'match', 'match_numeric_only'/);
  assert.match(migration, /fn_graph_space_is_public\(metadata\)/);
  assert.match(migration, /type IN \('number', 'book'\)/);
});

test("tree attachment reuses one active target and never materializes duplicate graph state", () => {
  assert.match(migration, /promoted_node_id = p_target_node_id/);
  assert.match(migration, /existing_tree_target_conflict/);
  assert.match(migration, /'creates_node', false/);
  assert.match(migration, /'creates_edge', false/);
  assert.doesNotMatch(migration, /INSERT INTO public\.(nodes|edges)/i);
  assert.doesNotMatch(migration, /DELETE FROM public\.(nodes|edges|research_objects)/i);
});

test("the reviewed batch is exact, unique and bounded to 106 finding-target pairs", () => {
  const batch = migration.slice(migration.indexOf("FROM (VALUES"), migration.indexOf(") AS selected"));
  const pairs = [...batch.matchAll(/\('([0-9a-f-]{36})'::uuid, '([0-9a-f-]{36})'::uuid\)/g)];
  assert.equal(pairs.length, 106);
  assert.equal(new Set(pairs.map((match) => match[1])).size, 106);
  assert.equal(pairs.every((match) => match[1] !== match[2]), true);
  assert.match(migration, /v_processed <> 106/);
});

test("function execution is admin-only and leaves publication/access axes unchanged", () => {
  assert.match(migration, /WHERE id = auth\.uid\(\)/);
  assert.match(migration, /RAISE EXCEPTION 'admin only'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM anon/);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/i);
  assert.doesNotMatch(migration, /SET\s+engine_detail\s*=/i);
});

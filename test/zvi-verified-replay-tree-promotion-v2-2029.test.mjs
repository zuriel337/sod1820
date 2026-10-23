import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20261023001027_zvi_verified_replay_tree_promotion_v2.sql",
  "utf8",
);

test("replay batch 2 is exact, unique and limited to 19 reviewed findings", () => {
  const batch = migration.slice(migration.indexOf("FROM (VALUES"), migration.indexOf(") AS selected"));
  const pairs = [...batch.matchAll(/\('([0-9a-f-]{36})'::uuid, '([0-9a-f-]{36})'::uuid, '([^']+)'\)/g)];
  assert.equal(pairs.length, 19);
  assert.equal(new Set(pairs.map((match) => match[1])).size, 19);
  assert.equal(pairs.every((match) => match[1] !== match[2]), true);
  assert.match(migration, /v_processed <> 19/);
});

test("the batch replays verification before using the existing attachment gate", () => {
  assert.match(migration, /admin_research_review\(v_row\.finding_id, 'canonicalize', 'match', false\)/);
  assert.match(migration, /verification_replay/);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/);
  assert.match(migration, /source_contributor_id <> 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/);
  assert.match(migration, /source_status = 'off'/);
  assert.match(migration, /privacy_scope <> 'public'/);
});

test("the batch does not create graph identities, delete records or broaden access", () => {
  assert.doesNotMatch(migration, /INSERT INTO public\.(nodes|edges)/i);
  assert.doesNotMatch(migration, /DELETE FROM public\.(nodes|edges|research_objects)/i);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/i);
  assert.doesNotMatch(migration, /CREATE\s+POLICY|ALTER\s+TABLE|ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
});

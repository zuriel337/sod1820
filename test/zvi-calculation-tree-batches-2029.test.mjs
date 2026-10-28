import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = (name) => readFileSync(
  new URL(`../supabase/migrations/${name}`, import.meta.url),
  "utf8",
);

test("bulk Zvi calculation batches are bounded and fail closed", () => {
  const batches = [
    ["20261028212710_zvi_calculation_tree_batch_v1.sql", "100", "9b762de8bc5cd88f05ca1625fe2ea214"],
    ["20261028213004_zvi_calculation_tree_batch_v2.sql", "200", "639fc144a5b650ee08a3cc25ca7506b2"],
    ["20261028213134_zvi_calculation_tree_batch_v3.sql", "487", "9ee199b28275a52efe95961b35828fe0"],
  ];
  for (const [name, limit, digest] of batches) {
    const sql = migration(name);
    assert.match(sql, new RegExp(`LIMIT\\s+${limit}`, "u"));
    assert.match(sql, new RegExp(`v_count\\s*<>\\s*${limit}`, "u"));
    assert.match(sql, new RegExp(digest, "u"));
    assert.match(sql, /ro\.privacy_scope\s*=\s*'public'/u);
    assert.match(sql, /ro\.status\s*=\s*'approved'/u);
    assert.match(sql, /ro\.engine_verified\s+IS\s+TRUE/u);
    assert.match(sql, /target_count\s*=\s*1/u);
    assert.match(sql, /admin_research_review\(/u);
    assert.match(sql, /admin_research_attach_existing_graph_node_v1/u);
    assert.match(sql, /duplicate_occurrences_preserved/u);
    assert.doesNotMatch(sql, /DELETE\s+FROM\s+public\./iu);
    assert.doesNotMatch(sql, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
  }
});

test("later batches exclude source-value groups that already have a canonical representative", () => {
  for (const name of [
    "20261028213004_zvi_calculation_tree_batch_v2.sql",
    "20261028213134_zvi_calculation_tree_batch_v3.sql",
  ]) {
    const sql = migration(name);
    assert.match(sql, /NOT EXISTS[\s\S]*already\.source_ref\s*=\s*ro\.source_ref/u);
    assert.match(sql, /already\.value\s+IS\s+NOT\s+DISTINCT\s+FROM\s+ro\.value/u);
    assert.match(sql, /already\.status\s*=\s*'canonical'/u);
    assert.match(sql, /already\.promoted_node_id\s+IS\s+NOT\s+NULL/u);
  }
});

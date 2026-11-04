import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026121011_zvi_context_number_auto_tree_promotion_v3.sql", import.meta.url),
  "utf8",
);

test("context promotion is a fixed Human-Gate batch with exact live fingerprints", () => {
  assert.match(migration, /ZURIEL explicitly approved automatic promotion/u);
  assert.match(migration, /one-time batch decision/u);
  assert.match(migration, /v_reviewed_count <> 1813/u);
  assert.match(migration, /v_ready_count <> 1804/u);
  assert.match(migration, /v_representative_count <> 700/u);
  assert.match(migration, /v_duplicate_count <> 1104/u);
  assert.match(migration, /be4f4f25ffd3003ad040b152d284d756/u);
  assert.match(migration, /8c46a7931b1fbfb0156ff5a579d3b5d4/u);
});

test("only exact public Zvi source rows with a deterministic primary number enter", () => {
  assert.match(migration, /ro\.status = 'approved'/u);
  assert.match(migration, /ro\.privacy_scope = 'public'/u);
  assert.match(migration, /ro\.engine_verified IS TRUE/u);
  assert.match(migration, /ro\.promoted_node_id IS NULL/u);
  assert.match(migration, /source_row\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/u);
  assert.match(migration, /source_row\.status = 'live'/u);
  assert.match(migration, /source_row\.page_only IS FALSE/u);
  assert.match(migration, /source_row\.channel = 'torat-haremez'/u);
  assert.match(migration, /target_count > 1/u);
  assert.match(migration, /exact_value_number_count = 1/u);
  assert.match(migration, /unique_targets\.target_key::numeric = base\.value::numeric/u);
});

test("only row.value is attached while every additional target remains context", () => {
  assert.match(migration, /node\.label = reviewed\.value::text/u);
  assert.match(migration, /attached_target_role', 'primary_row_value_number'/u);
  assert.match(migration, /additional_targets_role', 'preserved_context_only'/u);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1\([\s\S]*?v_row\.target_node_id/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
});

test("fullest source-value representative wins and duplicates remain unchanged", () => {
  assert.match(migration, /PARTITION BY reviewed\.source_id, reviewed\.value/u);
  assert.match(migration, /length\(coalesce\(reviewed\.statement, ''\)\) DESC/u);
  assert.match(migration, /cardinality\(coalesce\(reviewed\.terms, '\{\}'::text\[\]\)\) DESC/u);
  assert.match(migration, /cardinality\(coalesce\(reviewed\.relates, '\{\}'::text\[\]\)\) DESC/u);
  assert.match(migration, /v_preserved_duplicate_count <> 1104/u);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.research_objects/iu);
});

test("missing number nodes fail closed and stay approved", () => {
  assert.match(migration, /v_blocked_count <> 9/u);
  assert.match(migration, /v_blocked_cluster_count <> 4/u);
  assert.match(migration, /ARRAY\[1563, 2314\]::integer\[\]/u);
  assert.match(migration, /v_preserved_blocked_count <> 9/u);
  assert.match(migration, /target_node_count = 1/u);
  assert.match(migration, /target_node_id IS NOT NULL/u);
});

test("canonical writers own the change without access or publication mutation", () => {
  assert.match(migration, /admin_research_review\([\s\S]*?'canonicalize'[\s\S]*?'match'[\s\S]*?false/u);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/u);
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.match(migration, /truth_score_created', false/u);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_objects/iu);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/iu);
  assert.doesNotMatch(migration, /SET\s+(?:published|publication_status)\s*=/iu);
});

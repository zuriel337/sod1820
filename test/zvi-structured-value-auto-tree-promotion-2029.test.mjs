import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026121450_zvi_structured_value_auto_tree_promotion_v4.sql", import.meta.url),
  "utf8",
);

test("structured-value promotion records the exact Human-Gate batch", () => {
  assert.match(migration, /ZURIEL explicitly approved/u);
  assert.match(migration, /one-time batch decision/u);
  assert.match(migration, /v_reviewed_count <> 170/u);
  assert.match(migration, /v_ready_count <> 170/u);
  assert.match(migration, /v_representative_count <> 83/u);
  assert.match(migration, /v_duplicate_count <> 87/u);
  assert.match(migration, /24ea35e0f6984c020e7a35999fdd90cc/u);
  assert.match(migration, /6d2be53356e4cf79c6973a7332ba1fd9/u);
});

test("selection requires exact public source, verified calculation and no stored target", () => {
  assert.match(migration, /ro\.status = 'approved'/u);
  assert.match(migration, /ro\.privacy_scope = 'public'/u);
  assert.match(migration, /ro\.engine_verified IS TRUE/u);
  assert.match(migration, /ro\.value IS NOT NULL/u);
  assert.match(migration, /source_row\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/u);
  assert.match(migration, /source_row\.status = 'live'/u);
  assert.match(migration, /source_row\.page_only IS FALSE/u);
  assert.match(migration, /source_row\.channel = 'torat-haremez'/u);
  assert.match(migration, /jsonb_array_length\([\s\S]*?tree_matches[\s\S]*?\) = 0/u);
});

test("row.value resolves only to one existing active public number node", () => {
  assert.match(migration, /node\.type = 'number'/u);
  assert.match(migration, /node\.is_active IS TRUE/u);
  assert.match(migration, /node\.label = reviewed\.value::text/u);
  assert.match(migration, /target_node_count = 1/u);
  assert.match(migration, /target_node_id IS NOT NULL/u);
  assert.match(migration, /v_blocked_count <> 0/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
});

test("one fullest representative is attached and duplicate rows remain provenance", () => {
  assert.match(migration, /PARTITION BY reviewed\.source_id, reviewed\.value/u);
  assert.match(migration, /length\(coalesce\(reviewed\.statement, ''\)\) DESC/u);
  assert.match(migration, /v_preserved_duplicate_count <> 87/u);
  assert.match(migration, /duplicate_occurrences_preserved', true/u);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.research_objects/iu);
});

test("existing canonical writers perform the change without access mutation", () => {
  assert.match(migration, /admin_research_review\([\s\S]*?'canonicalize'[\s\S]*?'match'[\s\S]*?false/u);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/u);
  assert.match(migration, /stored_tree_match_present', false/u);
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_objects/iu);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/iu);
});

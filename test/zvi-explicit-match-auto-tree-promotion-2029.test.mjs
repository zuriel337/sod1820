import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026131528_zvi_explicit_match_auto_tree_promotion_v5.sql", import.meta.url),
  "utf8",
);

test("explicit-match promotion is one bounded Human-Gate batch", () => {
  assert.match(migration, /ZURIEL explicitly approved/u);
  assert.match(migration, /not a standing rule/u);
  assert.match(migration, /v_reviewed_count <> 34/u);
  assert.match(migration, /v_ready_count <> 28/u);
  assert.match(migration, /v_representative_count <> 27/u);
  assert.match(migration, /v_duplicate_count <> 1/u);
  assert.match(migration, /v_missing_value_count <> 4/u);
  assert.match(migration, /v_blocked_node_count <> 2/u);
  assert.match(migration, /ARRAY\[1563\]::integer\[\]/u);
  assert.match(migration, /eab6becba4568c31a2a8dc1612d31b47/u);
  assert.match(migration, /97398834700a78094b9af3ef54ab3e99/u);
});

test("selection requires the exact public Zvi source and explicit full match", () => {
  assert.match(migration, /ro\.status = 'approved'/u);
  assert.match(migration, /ro\.privacy_scope = 'public'/u);
  assert.match(migration, /ro\.engine_verified IS TRUE/u);
  assert.match(migration, /ro\.engine_detail ->> 'verification_state' = 'match'/u);
  assert.match(migration, /\^channel_updates:\[0-9a-f-\]\{36\}\(#\.\*\)\?\$/u);
  assert.match(migration, /source_row\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/u);
  assert.match(migration, /source_row\.status = 'live'/u);
  assert.match(migration, /source_row\.page_only IS FALSE/u);
  assert.match(migration, /source_row\.channel = 'torat-haremez'/u);
  assert.match(migration, /jsonb_array_length\([\s\S]*?tree_matches[\s\S]*?\) = 0/u);
});

test("row.value resolves only to one existing active number node", () => {
  assert.match(migration, /reviewed\.value IS NOT NULL/u);
  assert.match(migration, /node\.type = 'number'/u);
  assert.match(migration, /node\.is_active IS TRUE/u);
  assert.match(migration, /node\.label = reviewed\.value::text/u);
  assert.match(migration, /target_node_count = 1/u);
  assert.match(migration, /target_node_id IS NOT NULL/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
});

test("one fullest representative is attached while duplicate and blocked rows remain", () => {
  assert.match(migration, /PARTITION BY reviewed\.source_id, reviewed\.value/u);
  assert.match(migration, /length\(coalesce\(reviewed\.statement, ''\)\) DESC/u);
  assert.match(migration, /v_preserved_duplicate_count <> 1/u);
  assert.match(migration, /v_preserved_blocked_count <> 6/u);
  assert.match(migration, /duplicate_occurrences_preserved', true/u);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.research_objects/iu);
});

test("canonical writers attach only the existing target without access mutation", () => {
  assert.match(migration, /admin_research_review\([\s\S]*?'canonicalize'[\s\S]*?'match'[\s\S]*?false/u);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/u);
  assert.match(migration, /created_node'[\s\S]*?IS TRUE/u);
  assert.match(migration, /created_edge'[\s\S]*?IS TRUE/u);
  assert.match(migration, /explicit_verification_state_preserved', true/u);
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_objects/iu);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/iu);
});

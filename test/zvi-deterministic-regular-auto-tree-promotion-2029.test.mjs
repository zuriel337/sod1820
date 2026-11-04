import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026132133_zvi_deterministic_regular_auto_tree_promotion_v6.sql", import.meta.url),
  "utf8",
);

test("deterministic batch is fixed to eight findings and 41 complete claims", () => {
  assert.match(migration, /ZURIEL explicitly approved/u);
  assert.match(migration, /not a standing rule/u);
  assert.match(migration, /v_selected_count <> 8/u);
  assert.match(migration, /v_ready_count <> 8/u);
  assert.match(migration, /v_source_count <> 8/u);
  assert.match(migration, /v_claim_count <> 41/u);
  assert.match(migration, /v_claim_match_count <> 41/u);
  assert.match(migration, /v_claim_cardinality_count <> 8/u);
  assert.match(migration, /3e223ce6b9f53e7686b89e290ff1126b/u);
  assert.match(migration, /ffd91c01e5289e32881a172d81dbbbb0/u);
});

test("all calculations use the canonical method registry at migration time", () => {
  assert.match(migration, /public\.fn_method_value\('רגיל', claims\.phrase\)/u);
  assert.match(migration, /computed = expected/u);
  assert.match(migration, /verification_method', 'canonical fn_method_value\(רגיל, phrase\)'/u);
  assert.match(migration, /verification_scope', 'numeric equality only; interpretation remains separate'/u);
  assert.match(migration, /deterministic_checks/u);
  assert.doesNotMatch(migration, /gem_calc\s*\(/u);
});

test("selection fails closed on source, access, target and extraction state", () => {
  assert.match(migration, /ro\.status = 'approved'/u);
  assert.match(migration, /ro\.privacy_scope = 'public'/u);
  assert.match(migration, /ro\.promoted_node_id IS NULL/u);
  assert.match(migration, /ro\.value = selected\.expected/u);
  assert.match(migration, /coalesce\(ro\.engine_detail, '\{\}'::jsonb\) = '\{\}'::jsonb/u);
  assert.match(migration, /source_row\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/u);
  assert.match(migration, /source_row\.status = 'live'/u);
  assert.match(migration, /source_row\.page_only IS FALSE/u);
  assert.match(migration, /source_row\.channel = 'torat-haremez'/u);
  assert.match(migration, /media_ocr_pending/u);
  assert.match(migration, /media_transcription_pending/u);
  assert.match(migration, /tree_matches,0,type/u);
  assert.match(migration, /tree_matches,0,key/u);
});

test("only one existing active number target is reusable", () => {
  assert.match(migration, /node\.type = 'number'/u);
  assert.match(migration, /node\.is_active IS TRUE/u);
  assert.match(migration, /node\.label = selected\.expected::text/u);
  assert.match(migration, /target_node_count = 1/u);
  assert.match(migration, /target_node_id IS NOT NULL/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
});

test("canonical writers preserve publication, access and the legacy boolean axis", () => {
  assert.match(migration, /admin_research_review\([\s\S]*?'canonicalize'[\s\S]*?'match'[\s\S]*?false/u);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/u);
  assert.match(migration, /engine_verified_boolean_changed', false/u);
  assert.match(migration, /truth_score_created', false/u);
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.match(migration, /ro\.engine_verified IS DISTINCT FROM TRUE/u);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_objects/iu);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.research_objects/iu);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/iu);
});

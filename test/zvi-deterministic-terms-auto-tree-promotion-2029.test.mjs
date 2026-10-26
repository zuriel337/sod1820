import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026134034_zvi_deterministic_terms_auto_tree_promotion_v7.sql", import.meta.url),
  "utf8",
);

test("term-set batch is fixed to 72 findings and 209 deterministic checks", () => {
  assert.match(migration, /ZURIEL explicitly approved/u);
  assert.match(migration, /v_selected_count <> 72/u);
  assert.match(migration, /v_ready_count <> 72/u);
  assert.match(migration, /v_source_count <> 70/u);
  assert.match(migration, /v_cluster_count <> 72/u);
  assert.match(migration, /v_claim_count <> 209/u);
  assert.match(migration, /v_claim_match_count <> 209/u);
  assert.match(migration, /v_claim_cardinality_count <> 72/u);
  assert.match(migration, /d6ce852a3b0eac70ccef3eeef1d2b624/u);
  assert.match(migration, /95e978f2f834ca225637e811a6e344e4/u);

  const selected = migration.match(/\('[0-9a-f-]{36}',\d+,\d+\)/gu) || [];
  assert.equal(selected.length, 72);
  assert.equal(new Set(selected).size, 72);
});

test("every structured term is replayed by the canonical registry in stable order", () => {
  assert.match(migration, /unnest\(ready\.terms\) WITH ORDINALITY/u);
  assert.match(migration, /public\.fn_method_value\('רגיל', term_row\.term\)/u);
  assert.match(migration, /computed = expected/u);
  assert.match(migration, /verification_method', 'canonical fn_method_value\(רגיל, term\)'/u);
  assert.match(migration, /verification_scope', 'numeric equality only; source interpretation remains separate'/u);
  assert.match(migration, /deterministic_checks/u);
  assert.doesNotMatch(migration, /gem_calc\s*\(/u);
});

test("selection fails closed on exact public provenance and extraction completeness", () => {
  assert.match(migration, /ro\.status = 'approved'/u);
  assert.match(migration, /ro\.privacy_scope = 'public'/u);
  assert.match(migration, /ro\.promoted_node_id IS NULL/u);
  assert.match(migration, /ro\.value = selected\.expected/u);
  assert.match(migration, /cardinality\(coalesce\(ro\.terms, '\{\}'::text\[\]\)\) = selected\.expected_term_count/u);
  assert.match(migration, /source_row\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/u);
  assert.match(migration, /source_row\.status = 'live'/u);
  assert.match(migration, /source_row\.page_only IS FALSE/u);
  assert.match(migration, /source_row\.channel = 'torat-haremez'/u);
  assert.match(migration, /media_ocr_pending/u);
  assert.match(migration, /media_transcription_pending/u);
  assert.match(migration, /jsonb_array_elements/u);
  assert.match(migration, /lower\(match_row ->> 'type'\) = 'number'/u);
  assert.match(migration, /\(match_row ->> 'key'\)::integer = selected\.expected/u);
});

test("only one existing active public number node may be reused", () => {
  assert.match(migration, /node\.type = 'number'/u);
  assert.match(migration, /node\.is_active IS TRUE/u);
  assert.match(migration, /node\.label = selected\.expected::text/u);
  assert.match(migration, /coalesce\(node\.metadata ->> 'space', 'core'\) = 'core'/u);
  assert.match(migration, /target_node_count = 1/u);
  assert.match(migration, /target_node_id IS NOT NULL/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
});

test("canonical writers keep publication, privacy and truth axes separate", () => {
  assert.match(migration, /admin_research_review\(v_row\.id, 'canonicalize', 'match', false\)/u);
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

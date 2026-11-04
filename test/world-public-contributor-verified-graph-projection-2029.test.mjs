import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026134556_public_contributor_verified_graph_projection_v8.sql", import.meta.url),
  "utf8",
);

test("cross-writer projection is a fixed five-source two-author Human-Gate batch", () => {
  assert.match(migration, /ZURIEL approved continuing automatic/u);
  assert.match(migration, /v_selected_count <> 5/u);
  assert.match(migration, /v_ready_count <> 5/u);
  assert.match(migration, /v_author_count <> 2/u);
  assert.match(migration, /v_target_count <> 5/u);
  assert.match(migration, /v_claim_count <> 15/u);
  assert.match(migration, /v_claim_match_count <> 15/u);
  assert.match(migration, /fb5646f079d49bc05680e269ee302ccd/u);
  assert.match(migration, /3cb19de1b213c68bcdc414e91b85ca1a/u);
});

test("stable contributor identity and the public writer-page contract are mandatory", () => {
  assert.match(migration, /contribution\.author_contributor_id = selected\.contributor_id/u);
  assert.match(migration, /contributor\.active IS TRUE/u);
  assert.match(migration, /contributor\.locked IS NOT TRUE/u);
  assert.match(migration, /contributor\.building IS NOT TRUE/u);
  assert.match(migration, /dossier_settings ->> 'visibility'/u);
  assert.match(migration, /contribution\.status = 'approved'/u);
  assert.match(migration, /contribution\.research_state = 'validated'/u);
  assert.match(migration, /contribution\.deleted_at IS NULL/u);
  assert.match(migration, /extra_link\.from_contribution_id = selected\.id/u);
  assert.doesNotMatch(migration, /wa_names|display_name\s*=|author_name\s*=/u);
});

test("all numeric claims replay in the canonical registry before projection", () => {
  assert.match(migration, /public\.fn_method_value\(claims\.method, claims\.phrase\)/u);
  assert.match(migration, /computed = expected/u);
  assert.match(migration, /v_claim_cardinality_count <> 5/u);
  assert.match(migration, /verification_scope', 'numeric equality only; interpretation remains attributed source material'/u);
  assert.doesNotMatch(migration, /gem_calc\s*\(/u);
});

test("canonical graph writer reuses exact existing public number targets", () => {
  assert.match(migration, /public\.project_contribution_to_graph\(v_row\.id\)/u);
  assert.match(migration, /target\.type = 'number'/u);
  assert.match(migration, /target\.label = selected\.expected::text/u);
  assert.match(migration, /unique_target\.type = 'number'/u);
  assert.match(migration, /v_number_nodes_after <> v_number_nodes_before/u);
  assert.match(migration, /relation_type = 'contributes_to'/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges|research_contributions)/iu);
});

test("source status and publication remain unchanged while provenance is explicit", () => {
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.match(migration, /contribution\.status = 'approved'/u);
  assert.match(migration, /world_projection_v8/u);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_contributions/iu);
  assert.doesNotMatch(migration, /DELETE\s+FROM/iu);
  assert.doesNotMatch(migration, /SET\s+(?:status|privacy_scope|visibility)\s*=/iu);
});

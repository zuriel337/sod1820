import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026141352_public_contribution_published_graph_projection_v9.sql", import.meta.url),
  "utf8",
);
const writerReader = readFileSync(
  new URL("../supabase/migrations/20261023221514_writer_public_contributions_reader_20261023.sql", import.meta.url),
  "utf8",
);

test("Ariel remains on the canonical writer page without a status rewrite", () => {
  assert.match(writerReader, /r\.status IN \('approved','published'\)/u);
  assert.match(migration, /Ariel's approved contributions remain approved/u);
  assert.doesNotMatch(migration, /4cce8fd9-d3bb-40e0-b4eb-4b6be05d5795/u);
  assert.doesNotMatch(migration, /f3af17f7-9b13-41d7-8fdc-d80d422fd271/u);
  assert.doesNotMatch(migration, /SET\s+status\s*=/iu);
});

test("canonical projector aligns core space with approved and published public statuses", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.project_contribution_to_graph/u);
  assert.match(migration, /IF NOT public\.rd_is_admin\(\)/u);
  assert.match(migration, /c\.status IN \('approved', 'published'\)/u);
  assert.match(migration, /THEN 'core'/u);
  assert.match(migration, /ELSE 'private'/u);
  assert.match(migration, /writer_public_contributions_page_v1/u);
  assert.match(migration, /SECURITY DEFINER/u);
});

test("published batch is fixed to nine sources, three authors and sixteen checks", () => {
  assert.match(migration, /ZURIEL explicitly approved publication/u);
  assert.match(migration, /v_selected_count <> 9/u);
  assert.match(migration, /v_ready_count <> 9/u);
  assert.match(migration, /v_author_count <> 3/u);
  assert.match(migration, /v_target_count <> 8/u);
  assert.match(migration, /v_claim_count <> 16/u);
  assert.match(migration, /v_claim_match_count <> 16/u);
  assert.match(migration, /c1fd219383ebc68ca0d0ce0d7c4ac9c8/u);
  assert.match(migration, /403767d607c52bfd4eafca98001b0bda/u);

  const selectedBlock = migration.match(/INSERT INTO _published_contributor_selected_v9[\s\S]*?;/u)?.[0] || "";
  assert.equal((selectedBlock.match(/\('[0-9a-f-]{36}','[0-9a-f-]{36}',\d+,\d+\)/gu) || []).length, 9);
});

test("only exact public identities and already-published number sources qualify", () => {
  assert.match(migration, /contribution\.author_contributor_id = selected\.contributor_id/u);
  assert.match(migration, /contribution\.status = 'published'/u);
  assert.match(migration, /contribution\.deleted_at IS NULL/u);
  assert.match(migration, /contribution\.target_type = 'number'/u);
  assert.match(migration, /contribution\.target_id = selected\.expected::text/u);
  assert.match(migration, /contributor\.active IS TRUE/u);
  assert.match(migration, /contributor\.locked IS NOT TRUE/u);
  assert.match(migration, /contributor\.building IS NOT TRUE/u);
  assert.match(migration, /extra_link\.from_contribution_id = selected\.id/u);
  assert.doesNotMatch(migration, /wa_names|author_name\s*=|display_name\s*=/u);
});

test("all claims replay through registered methods and reuse existing number targets", () => {
  assert.match(migration, /public\.fn_method_value\(claims\.method, claims\.phrase\)/u);
  assert.match(migration, /'מסתתר'/u);
  assert.match(migration, /'אתבש'/u);
  assert.match(migration, /'מילוי'/u);
  assert.match(migration, /'רגיל'/u);
  assert.match(migration, /computed = expected/u);
  assert.match(migration, /unique_target\.type = 'number'/u);
  assert.match(migration, /v_number_nodes_after <> v_number_nodes_before/u);
  assert.match(migration, /public\.project_contribution_to_graph\(v_row\.id\)/u);
  assert.match(migration, /relation_type = 'contributes_to'/u);
});

test("publication and source truth remain distinct from numeric verification", () => {
  assert.match(migration, /source_status', 'published'/u);
  assert.match(migration, /verification_scope', 'numeric equality only; interpretation remains attributed source material'/u);
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.match(migration, /contribution\.status = 'published'/u);
  assert.doesNotMatch(migration, /DELETE\s+FROM/iu);
});

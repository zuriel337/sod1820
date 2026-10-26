import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261026142516_public_contributor_curated_numeric_graph_projection_v10.sql",
    import.meta.url,
  ),
  "utf8",
);

test("curated batch is fixed to twenty-three attributed sources and twenty-six target edges", () => {
  assert.match(migration, /v_selected_count <> 23/u);
  assert.match(migration, /v_ready_count <> 23/u);
  assert.match(migration, /v_author_count <> 2/u);
  assert.match(migration, /v_target_count <> 26/u);
  assert.match(migration, /v_distinct_target_count <> 22/u);

  const selectedBlock =
    migration.match(/INSERT INTO _curated_writer_selected_v10[\s\S]*?;/u)?.[0] || "";
  assert.equal(
    (selectedBlock.match(/\('[0-9a-f-]{36}','[0-9a-f-]{36}','approved','validated'/gu) || [])
      .length,
    23,
  );

  const targetBlock =
    migration.match(/INSERT INTO _curated_writer_targets_v10[\s\S]*?;/u)?.[0] || "";
  assert.equal((targetBlock.match(/\('[0-9a-f-]{36}',\d+\)/gu) || []).length, 26);
});

test("every numeric expression replays through the canonical engine or explicit arithmetic", () => {
  assert.match(migration, /v_claim_count <> 99/u);
  assert.match(migration, /v_claim_match_count <> 99/u);
  assert.match(migration, /v_formula_count <> 23/u);
  assert.match(migration, /v_formula_match_count <> 23/u);
  assert.match(migration, /public\.fn_method_value\(claims\.method, claims\.phrase\)/u);
  assert.match(migration, /WHEN '\+' THEN formulas\.lhs \+ formulas\.rhs/u);
  assert.match(migration, /WHEN '\*' THEN formulas\.lhs \* formulas\.rhs/u);
  assert.match(migration, /'אתבש','משה',102/u);
  assert.match(migration, /'קציר שערים',1020/u);
});

test("exact identity and public writer-page gates fail closed", () => {
  assert.match(migration, /contribution\.author_contributor_id = selected\.contributor_id/u);
  assert.match(migration, /contribution\.status = selected\.expected_status/u);
  assert.match(migration, /contribution\.research_state = selected\.expected_research_state/u);
  assert.match(migration, /contribution\.intent = selected\.expected_intent/u);
  assert.match(migration, /contribution\.deleted_at IS NULL/u);
  assert.match(migration, /contributor\.active IS TRUE/u);
  assert.match(migration, /contributor\.locked IS NOT TRUE/u);
  assert.match(migration, /contributor\.building IS NOT TRUE/u);
  assert.match(migration, /extra_link\.from_contribution_id = selected\.id/u);
  assert.doesNotMatch(migration, /wa_names|author_name\s*=|display_name\s*=/u);
});

test("Ariel remains one source on his exact page while connecting four verified targets", () => {
  assert.match(migration, /aa14df60-9cc1-4703-a653-8754c34c301e/u);
  assert.match(migration, /0999ac77-8efe-4282-907e-d2a561fca133/u);
  assert.match(
    migration,
    /'aa14df60-9cc1-4703-a653-8754c34c301e','0999ac77-8efe-4282-907e-d2a561fca133','approved','validated','חידוש',4,8,0/u,
  );
  for (const value of [68, 287, 292, 337]) {
    assert.match(
      migration,
      new RegExp(`'aa14df60-9cc1-4703-a653-8754c34c301e',${value}`),
    );
  }
  assert.doesNotMatch(migration, /SET\s+status\s*=/iu);
  assert.doesNotMatch(migration, /SET\s+author_contributor_id\s*=/iu);
});

test("contradictory, ambiguous and unresolved material stays outside the tree batch", () => {
  const selectedBlock =
    migration.match(/INSERT INTO _curated_writer_selected_v10[\s\S]*?;/u)?.[0] || "";
  const excluded = [
    "09bef41b-002c-4897-9e72-28012f19b027",
    "aecff9d8-2f5b-456d-8b44-356457319a04",
    "f097193f-ee20-4ec8-9909-390bb51ffa8b",
    "9adaa583-72b2-47d8-8046-b5436621b50d",
    "5d3a3485-dfbd-4f48-be81-5f8fe72fc369",
    "a02bd97c-3ab3-4bbc-a687-0155abdaff49",
    "5a287397-d4db-4475-bad1-eb6575271785",
    "480a49ea-84d4-4d35-b4b3-cfa07582fed8",
    "7cb197ce-eea4-4f3a-bc46-bcf21bdb079e",
  ];
  for (const id of excluded) assert.doesNotMatch(selectedBlock, new RegExp(id));
  assert.match(migration, /Shimon rows whose public source still says raw\/verified=false/u);
});

test("projection reuses existing public number nodes and preserves provenance axes", () => {
  assert.match(migration, /unique_target\.type = 'number'/u);
  assert.match(migration, /v_number_nodes_after <> v_number_nodes_before/u);
  assert.match(migration, /public\.project_contribution_to_graph\(v_row\.id\)/u);
  assert.match(migration, /public\.upsert_edge\(/u);
  assert.match(migration, /'independent_source_counted', false/u);
  assert.match(migration, /'provenance_role', 'curated_writer_source'/u);
  assert.match(migration, /'privacy_changed', false/u);
  assert.match(migration, /'publication_changed', false/u);
  assert.match(migration, /'source_text_changed', false/u);
  assert.doesNotMatch(migration, /DELETE\s+FROM/iu);
});

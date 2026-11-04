import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20261026121500_zvi_safe_auto_tree_promotion_v2.sql", import.meta.url),
  "utf8",
);

test("automatic promotion is a fixed Human-Gate batch, not a standing rule", () => {
  assert.match(migration, /ZURIEL explicitly approved automatic promotion/u);
  assert.match(migration, /one-time, fail-closed execution/u);
  assert.match(migration, /v_occurrence_count <> 153/u);
  assert.match(migration, /v_representative_count <> 34/u);
  assert.match(migration, /v_duplicate_count <> 119/u);
  assert.match(migration, /8ec8eb914e399d9fb34f525dcdce0c9a/u);
  assert.match(migration, /b5002147d757bd97a00c5713f6f1f9e3/u);
});

test("cohort selection fails closed on identity, source, access, verification, and exact target", () => {
  assert.match(migration, /ro\.status = 'approved'/u);
  assert.match(migration, /ro\.privacy_scope = 'public'/u);
  assert.match(migration, /ro\.promoted_node_id IS NULL/u);
  assert.match(migration, /ro\.engine_verified IS TRUE/u);
  assert.ok(migration.includes("fidelity_status}', '') <> 'partial'"));
  assert.match(migration, /ro\.kind NOT IN \('hypothesis', 'question'\)/u);
  assert.match(migration, /source_row\.contributor_id = 'c66f0464-0928-490e-be9b-66d8a87e7fc8'/u);
  assert.match(migration, /source_row\.status = 'live'/u);
  assert.match(migration, /source_row\.page_only IS FALSE/u);
  assert.match(migration, /source_row\.channel = 'torat-haremez'/u);
  assert.match(migration, /e\.target_count = 1/u);
  assert.match(migration, /lower\(e\.target ->> 'type'\) = 'number'/u);
  assert.match(migration, /\(e\.target ->> 'key'\)::integer = e\.value/u);
  assert.match(migration, /LOCK TABLE public\.research_objects IN SHARE ROW EXCLUSIVE MODE/u);
  assert.match(migration, /LOCK TABLE public\.channel_updates IN SHARE MODE/u);
  assert.match(migration, /LOCK TABLE public\.nodes IN SHARE MODE/u);
});

test("one fullest representative is selected while duplicate occurrences remain unchanged", () => {
  assert.match(migration, /PARTITION BY e\.source_id, e\.target ->> 'key'/u);
  assert.match(migration, /length\(coalesce\(e\.statement, ''\)\) DESC/u);
  assert.match(migration, /cardinality\(coalesce\(e\.terms, '\{\}'::text\[\]\)\) DESC/u);
  assert.match(migration, /cardinality\(coalesce\(e\.relates, '\{\}'::text\[\]\)\) DESC/u);
  assert.match(migration, /selected\.representative_rank > 1/u);
  assert.match(migration, /v_preserved_duplicate_count <> 119/u);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.research_objects/iu);
});

test("existing canonical writers own governance and attachment", () => {
  assert.match(migration, /admin_research_review\([\s\S]*?'canonicalize'[\s\S]*?'match'[\s\S]*?false/u);
  assert.match(migration, /admin_research_attach_existing_graph_node_v1/u);
  assert.match(migration, /node\.type = 'number'/u);
  assert.match(migration, /node\.is_active IS TRUE/u);
  assert.match(migration, /node\.label = v_row\.target ->> 'key'/u);
  assert.match(migration, /coalesce\(node\.metadata ->> 'space', 'core'\) = 'core'/u);
  assert.doesNotMatch(migration, /INSERT\s+INTO\s+public\.(?:nodes|edges)/iu);
  assert.doesNotMatch(migration, /UPDATE\s+public\.research_objects/iu);
});

test("the batch records accurate provenance without changing publication or privacy", () => {
  assert.match(migration, /triage_snapshot_date', '2026-10-26'/u);
  assert.match(migration, /duplicate_occurrences_preserved', true/u);
  assert.match(migration, /truth_score_created', false/u);
  assert.match(migration, /privacy_changed', false/u);
  assert.match(migration, /publication_changed', false/u);
  assert.match(migration, /coalesce\(\(v_result ->> 'published'\)::boolean, false\) IS TRUE/u);
  assert.doesNotMatch(migration, /SET\s+privacy_scope\s*=/iu);
  assert.doesNotMatch(migration, /SET\s+(?:published|publication_status)\s*=/iu);
});

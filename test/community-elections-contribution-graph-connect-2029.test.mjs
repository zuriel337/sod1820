import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const dir = new URL("../supabase/proposed/", import.meta.url);
const migration = readFileSync(new URL("20261108130000_community_elections_contribution_graph_connect_v1.sql", dir), "utf8");
const rollback = readFileSync(new URL("20261108130001_community_elections_contribution_graph_connect_v1_rollback.sql", dir), "utf8");
// Executable statements only (comments stripped) so prose cannot satisfy or break an assertion.
const code = (sql) => sql.replace(/--[^\n]*/g, "");
const mig = code(migration);

test("the migration is proposed only: it is not in the applied migrations folder", () => {
  assert.match(migration, /PROPOSED — NOT APPLIED/u);
  assert.equal(existsSync(new URL("../supabase/migrations/20261108130000_community_elections_contribution_graph_connect_v1.sql", import.meta.url)), false);
});

test("it extends the existing mechanism: no table, function, trigger, policy, graph or taxonomy is created", () => {
  for (const forbidden of [/CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|TRIGGER|POLICY|TABLE|VIEW|INDEX|TYPE)/iu, /ALTER\s+TABLE/iu, /DROP\s+(TRIGGER|FUNCTION|POLICY)/iu, /GRANT\b/iu, /REVOKE\b/iu, /entity_types/iu]) {
    // The only CREATE allowed is the transaction-local TEMP table that parks the import links.
    const scrubbed = mig.replace(/CREATE TEMP TABLE _community_elections_parked_links_v1/giu, "");
    assert.doesNotMatch(scrubbed, forbidden);
  }
  assert.match(mig, /public\.project_contribution_to_graph\(c_id\)/u);
  assert.match(mig, /public\.upsert_edge\(/u);
});

test("exactly the approved relations, kept separate: mentions → 77 and related → 5107", () => {
  assert.match(mig, /upsert_edge\(v_node, n77_id, 'mentions'/u);
  assert.match(mig, /upsert_edge\(v_node, post5107_id, 'related'/u);
  assert.equal((mig.match(/upsert_edge\(/gu) || []).length, 2);
  assert.match(mig, /research_assignment_approved_by_zuriel; not_stated_in_the_source_message/u);
  assert.match(mig, /'analyst_assignment'/u);
  assert.match(mig, /source_text_states_the_number_77/u);
  assert.doesNotMatch(mig, /b1435eeb-cf3c-47c3-84aa-6e5108020da3/u);
});

test("observation and interpretation are separate; interpretation is never admitted as fact", () => {
  assert.match(mig, /description = v_observation/u);
  assert.match(mig, /'author_interpretation', jsonb_build_object\(\s*'text', v_interpretation/u);
  assert.match(mig, /'admitted_as_fact', false/u);
  assert.match(mig, /'interpretation_admitted_as_fact', false/u);
});

test("fail-closed privacy gates run before any write", () => {
  const firstWrite = mig.search(/set_config\(|INSERT INTO|UPDATE public|DELETE FROM/u);
  for (const gate of [/c\.status IS DISTINCT FROM 'approved'/u, /c\.deleted_at IS NOT NULL/u, /c\.thread_hidden_at IS NOT NULL/u, /md5\(c\.body\) <> expected_md5/u, /Number 77 target drift/u, /Post 5107 target drift/u]) {
    const at = mig.search(gate);
    assert.ok(at > -1 && at < firstWrite, `gate ${gate} must exist and precede the first write`);
  }
  assert.match(mig, /target_type NOT IN \('openweb_message', 'openweb_user'\)/u);
});

test("scope: the thread candidate, tree hints, targets and RLS are never written", () => {
  assert.doesNotMatch(mig, /research_objects/u);
  assert.doesNotMatch(mig, /e882519e/u);
  assert.doesNotMatch(mig, /community_tree_hints/u);
  assert.doesNotMatch(mig, /UPDATE public\.nodes\s+SET[\s\S]{0,200}WHERE id = (n77_id|post5107_id)/u);
});

test("Human Gate provenance is recorded for every relation (intake §4) and the rollback only removes its own rows", () => {
  assert.match(mig, /INSERT INTO public\.decision_ledger/u);
  assert.match(mig, /'relation', e\.id::text/u);
  assert.match(mig, /'decision_ledger_id'/u);
  assert.match(rollback, /PROPOSED — NOT APPLIED/u);
  assert.match(rollback, /metadata -> 'projection_v1' ->> 'migration' = tag/u);
  assert.match(rollback, /rollback refused/u);
  assert.doesNotMatch(code(rollback), /research_objects|DELETE FROM public\.nodes\s+WHERE id IN/u);
});

// Runs the real migration + rollback on a throwaway Postgres (skipped where no local Postgres is installed).
test("SQL acceptance: idempotency, rollback, RLS read, no duplicate nodes (throwaway Postgres)", { skip: !existsSync("/usr/lib/postgresql") }, () => {
  const out = spawnSync("bash", [new URL("../scripts/run-community-elections-graph-connect-sql-test.sh", import.meta.url).pathname], { encoding: "utf8" });
  assert.equal(out.status, 0, `${out.stdout}\n${out.stderr}`);
  assert.match(out.stdout, /PASS community_elections_graph_connect_v1/u);
});

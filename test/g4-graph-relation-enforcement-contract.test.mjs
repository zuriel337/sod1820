import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(resolve(ROOT, "supabase/migrations/20261004080000_g4_graph_relation_enforcement_v1.sql"), "utf8");
const rollback = readFileSync(resolve(ROOT, "tests/g4-graph/g4_graph_relation_enforcement_v1_rollback.sql"), "utf8");

const LIVE_31 = ["bridges_to","cipher_link","contained_in","contains","contributes_to","converges_on","cross","demand_signal","derived_from","discovered_by","documents","equals","equals_by_depth","equals_word","extends_rule","has_language_bridge","interpreted_by","is_kadmi_of","kadmi_equals","kadmi_reverse_of","mentions","opposite_of","related","relates_to","represents","reverse_of","scale","scale_x10","seeded_by","source","zero_scale"];
const EXTRA = ["same_as","alias_of","variant_of"];

function listAfter(re) {
  const m = sql.match(re);
  assert.ok(m, `pattern not found: ${re}`);
  return [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]).sort();
}
const expected = [...LIVE_31, ...EXTRA].sort();
assert.equal(LIVE_31.length, 31);

assert.deepEqual(listAfter(/check \(relation_type in \(([\s\S]*?)\)\) not valid/), expected, "CHECK vocabulary = 31 live + 3 owner-backed");
assert.deepEqual(listAfter(/relation_type <> all \(array\[([\s\S]*?)\]\);/), expected, "precondition vocabulary matches CHECK");
for (const bad of ["parent_of", "family_input", "authored_by_external"]) assert.ok(!sql.includes(`'${bad}'`), `${bad} is not edges vocabulary`);

assert.match(sql, /validate constraint edges_relation_type_vocab_chk/);
// no historical metadata rewrite, no universal nonempty-metadata CHECK
assert.doesNotMatch(sql, /update\s+public\.edges/i, "no UPDATE of existing edges");
assert.doesNotMatch(sql, /edges_metadata_nonempty_chk|UNKNOWN_PRE_ENFORCEMENT/);

// no destructive / parallel-system statements on edges
assert.doesNotMatch(sql, /create\s+table|drop\s+table|truncate|drop\s+column/i);
assert.doesNotMatch(sql, /confidence|research_strength/i, "no confidence/strength changes");
assert.doesNotMatch(sql, /(alter|update|insert)\s+(into\s+)?public\.(relation_evidence|identity_edges)/i);

// writer functions
const fnBody = (name) => {
  const m = sql.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$function\\$;`, "i"));
  assert.ok(m, `${name} patched`);
  return m[0];
};
assert.match(fnBody("upsert_edge"), /UNKNOWN_WRITER/);
assert.match(fnBody("upsert_edge"), /security definer/i);
assert.match(fnBody("upsert_edge"), /search_path to 'public'/);
for (const fn of ["sync_convergence", "wire_image_meaningful", "wire_number_to_images"]) {
  const b = fnBody(fn);
  const inserts = [...b.matchAll(/insert into edges\s*\(([^)]*)\)/gi)];
  assert.ok(inserts.length > 0, fn);
  for (const i of inserts) assert.match(i[1], /metadata/, `${fn}: every edges insert carries metadata`);
  assert.match(b, /'source'/);
  assert.match(b, /'via'/);
  assert.doesNotMatch(b, /security definer/i, `${fn} keeps invoker mode`);
}

// rollback
assert.doesNotMatch(rollback, /edges_metadata_nonempty_chk|UNKNOWN_PRE_ENFORCEMENT/);
assert.match(rollback, /drop constraint if exists edges_relation_type_vocab_chk/);
assert.doesNotMatch(rollback, /truncate|drop\s+table/i);
for (const fn of ["upsert_edge", "sync_convergence", "wire_image_meaningful", "wire_number_to_images"]) {
  assert.match(rollback, new RegExp(`create or replace function public\\.${fn}\\(`), `rollback restores ${fn}`);
}
console.log("g4-graph-relation-enforcement contract: OK");

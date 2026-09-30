import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL("../supabase/migrations/20260930003500_g3_els_one_engine_compat_wrapper_closure_v1.sql", import.meta.url),
  "utf8",
);

const fnStart = sql.indexOf("create or replace function public.fn_els_search");
const fnEnd = sql.indexOf("revoke all on function public.fn_els_search");
assert.ok(fnStart >= 0 && fnEnd > fnStart, "fn_els_search wrapper definition must exist");
const fn = sql.slice(fnStart, fnEnd);

assert.match(fn, /select public\.els_search_core_v1\(p_term,'torah',p_maxskip,p_maxhits,null\)/);
assert.doesNotMatch(fn, /from\s+(public\.)?torah_stream/i, "legacy compatibility function must not scan the corpus directly");
assert.match(fn, /order by \(h->>'skip'\)::int,\(h->>'start'\)::int,\(h->>'dir'\)::int desc/);

const requiredKeys = [
  "'term'","'letters'","'plain'","'els_count'","'min_skip'","'hits'",
  "'searched_maxskip'","'scope'","'corpus_id'","'position_base'","'engine'",
  "'profile'","'coverage'","'skip_domain'","'plain_excluded'","'truncated'","'ordering'"
];
for (const key of requiredKeys) {
  assert.ok(fn.includes(key), "missing legacy projection key: " + key);
}

assert.match(sql, /revoke execute on function public\.els_search_geometry_v1[\s\S]*from anon, authenticated;/);
assert.match(sql, /grant execute on function public\.els_search_geometry_v1[\s\S]*to service_role;/);
assert.ok(sql.includes("TEMPORARY_COMPATIBILITY legacy projection over canonical els_search_core_v1"));

console.log("G3 ELS One-Engine compatibility closure: PASS");

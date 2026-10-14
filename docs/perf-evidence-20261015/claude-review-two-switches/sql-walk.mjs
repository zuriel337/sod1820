// Independent read-only review of PR1105 (fd0e3eb1): FULL pagination walks, baseline vs candidate, per RLS role.
// Reuses the PR's own SQL fixtures/migration as inputs (unmodified, read from a checkout) — no edits to the owner's files.
// usage: PGLITE_MODULE=.../pglite/dist/index.js node sql-walk.mjs <checkout-of-fd0e3eb1>
import assert from 'node:assert/strict'; import { readFile, writeFile } from 'node:fs/promises'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2]); const dir = resolve(root, 'docs/perf-evidence-20261015/two-switches');
const { PGlite } = await import(pathToFileURL(resolve(process.env.PGLITE_MODULE)).href); const db = new PGlite();
const q = async (s, p = []) => (await db.query(s, p)).rows; const run = async (f) => db.exec((await readFile(resolve(dir, f), 'utf8')).replace(/^\\.*$/gm, ''));
await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role lab_admin; create role lab_denied; grant authenticated to lab_admin;');
await run('00_registry_fixture.sql'); await run('01_composite_engine.sql'); await run('02_schema_fixture.sql');
const base = (await readFile(resolve(root, 'supabase/migrations/20261014180000_number_lookup_method_flags.sql'), 'utf8')).match(/create or replace function public\.fn_number_lookup\([\s\S]*?\$function\$;/)[0];
await db.exec(base); await db.exec(await readFile(resolve(root, 'supabase/migrations/20261014190000_number_core_exclude_encrypted.sql'), 'utf8'));
await db.exec(await readFile(resolve(root, 'supabase/migrations/20261014220024_number_lookup_2029_page.sql'), 'utf8'));
const out = { engine: (await q('select version() v'))[0].v, walks: [], failures: [] };
const cols = 'method,phrase,value,source,vip_source,is_verified,dna_status,node_id,category,tags,mathematical_family,order_sensitive,word_boundary_sensitive,final_letter_sensitive,atomic_or_composite,component_methods,component_values,operator,provenance,method_evidence_class,method_governed,method_active,method_scannable,method_executable,method_engine_verified,row_provenance_state,bid_id,word_id,method_version,dependency_version_snapshot,computed_at,engine_run_id,verified_at,verified_run_id,verified_method_version,verified_mismatch_value,total_count';
async function walk(fn, v, size) {
  const rows = []; const totals = []; let cursor = null;
  for (let i = 0; i < 2000; i++) {
    const page = await q(`select ${cols} from public.${fn}($1::bigint,$2::integer,$3::text)`, [v, size, cursor]);
    if (!page.length) break; rows.push(...page); totals.push(...page.map((r) => String(r.total_count))); cursor = page.at(-1).bid_id;
  }
  return { rows, totals };
}
for (const role of ['anon', 'authenticated', 'lab_admin']) {
  await db.exec('reset role'); await q("select set_config('request.jwt.claim.sub',$1,false)", [role === 'lab_admin' ? '00000000-0000-0000-0000-000000000001' : role === 'authenticated' ? '00000000-0000-0000-0000-000000000002' : '']);
  await db.exec(`set role ${role}`);
  for (const v of [787, 7871, 0]) {
    const unpaged = await q(`select ${cols} from public.fn_number_lookup($1::bigint,null,null)`, [v]);
    const unpagedC = await q(`select ${cols} from public.fn_number_lookup_2029_page($1::bigint,null,null)`, [v]);
    for (const size of [1, 3, 7, 20, 500]) {
      const a = await walk('fn_number_lookup', v, size), b = await walk('fn_number_lookup_2029_page', v, size);
      const same = JSON.stringify(a.rows) === JSON.stringify(b.rows) && JSON.stringify(a.totals) === JSON.stringify(b.totals);
      const sameUnpaged = JSON.stringify(unpaged) === JSON.stringify(unpagedC);
      const ids = b.rows.map((r) => r.bid_id); const noDup = new Set(ids).size === ids.length;
      const coversAll = JSON.stringify(ids) === JSON.stringify(unpaged.map((r) => r.bid_id));
      const rec = { role, value: v, pageSize: size, rows: b.rows.length, baselineRows: a.rows.length, identicalWalk: same, identicalUnpaged: sameUnpaged, noDuplicates: noDup, walkEqualsUnpagedOrder: coversAll, totalCountConstant: new Set(b.totals).size <= 1 };
      out.walks.push(rec); if (!same || !sameUnpaged || !noDup || !coversAll) out.failures.push(rec);
    }
  }
}
await db.exec('reset role');
out.summary = { walks: out.walks.length, failures: out.failures.length, rowsByRole: Object.fromEntries(['anon', 'authenticated', 'lab_admin'].map((r) => [r, out.walks.filter((w) => w.role === r && w.value === 7871 && w.pageSize === 7)[0]?.rows])) };
await writeFile(resolve(new URL('.', import.meta.url).pathname, 'sql-walk-results.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary), out.failures.length ? JSON.stringify(out.failures.slice(0, 3)) : 'no failures');

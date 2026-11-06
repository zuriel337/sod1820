import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import { countElsSearches } from "../src/lib/research/researchActivityContract2029.js";

// Runs the REAL supabase/functions/els-search-bridge/index.ts (compiled, Deno shimmed) against a disposable local Postgres that
// holds the live op_trace tables and the live op_trace_* function bodies. Everything the handler would send to PostgREST is
// executed for real except the ELS engine, the capability gate and the rate limiter, which are stubbed because they are not under test.
// Started by: bash scripts/run-reading-activity-sql-test.sh --with-els      (skipped when no database is provided)
const { RA_PG_BIN: BIN, RA_PG_SOCKET: SOCK, RA_PG_PORT: PORT, RA_PG_AS_POSTGRES: AS_PG } = process.env;
const skip = !BIN || !SOCK ? "no local database (run scripts/run-reading-activity-sql-test.sh --with-els)" : false;

function psql(sql) {
  const q = "'" + sql.replace(/'/g, "'\\''") + "'";
  const cmd = `${BIN}/psql -h ${SOCK} -p ${PORT} -d t -v ON_ERROR_STOP=1 -qtA -c ${q}`;
  return (AS_PG === "1" ? execFileSync("su", ["postgres", "-c", cmd], { encoding: "utf8" }) : execFileSync("bash", ["-c", cmd], { encoding: "utf8" })).trim();
}
const U = () => crypto.randomUUID();
const TERM = "משיח", CORPUS = "0123456789abcdef";

test("real els-search-bridge: every search type is traced once, labelled content-free, and counted per search (not per span)", { skip }, async () => {
  const sig = JSON.parse(psql(`select json_object_agg(proname, (select json_agg(json_build_object('n', n, 't', t::regtype::text) order by o) from unnest(proargnames, string_to_array(proargtypes::text, ' ')::oid[]) with ordinality as u(n, t, o))) from pg_proc where proname like 'op_trace_%_v1' and pronamespace = 'public'::regnamespace`));
  const rpcLog = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url)); const json = body => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    if (u.pathname === "/auth/v1/user") return new Headers(init.headers).get("authorization") === "Bearer user-token" ? json({ id: "6c1f3a52-5d3e-4f1a-8a52-0b8f5d2c7e11" }) : new Response("{}", { status: 401 });
    const name = u.pathname.replace("/rest/v1/rpc/", ""); const args = JSON.parse(init.body || "{}"); rpcLog.push(name);
    if (name.startsWith("op_trace_")) {
      const parts = Object.entries(args).map(([k, v]) => { const t = sig[name].find(x => x.n === k)?.t; assert.ok(t, `${name} has no argument ${k}`);
        return v === null ? `${k} => NULL::${t}` : `${k} => $q9$${typeof v === "string" ? v : JSON.stringify(v)}$q9$::${t}`; });
      return json(JSON.parse(psql(`select to_json(public.${name}(${parts.join(", ")}))`)));
    }
    if (name === "edge_rate_limit_check") return json({ allowed: true, count: 1, limit: 60, window_seconds: 3600 });
    if (name === "fn_capability_execution_gate_v1") return json({ allowed: true });
    if (name === "els_search_page_core_v1") return json({ contract: "els_search_page_v1", status: "OK", hits: [], completion: { executed: true } });
    if (name === "els_verify_batch_v1" || name === "els_verify_occurrence_v1") return json({ status: "OK" });
    throw new Error("unexpected rpc " + name);
  };
  let handler;
  globalThis.Deno = { env: { get: k => ({ SUPABASE_URL: "http://sb.local", SUPABASE_SERVICE_ROLE_KEY: "service" })[k] || "" }, serve: fn => { handler = fn; } };
  const out = await build({ entryPoints: ["supabase/functions/els-search-bridge/index.ts"], bundle: true, write: false, format: "esm", platform: "node" });
  await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
  assert.equal(typeof handler, "function");
  const send = async (body, token = "anon-key") => {
    const res = await handler(new Request("http://edge.local/els-search-bridge", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) }));
    assert.equal(res.status, 200, JSON.stringify(await res.clone().json())); return (await res.json()).trace_id;
  };
  const batch = (extra = {}) => ({ op: "verify_batch", term: TERM, scope: "torah", corpus_id: CORPUS, candidates: [{ skip: 10, dir: 1, start: 3 }], interaction_id: U(), ...extra });
  const page = (extra = {}) => ({ op: "page", term: TERM, scope: "torah", skip_min: 2, skip_max: 100, page_size: 10, interaction_id: U(), ...extra });
  const traces = {};

  // Classic-mode UI searches: one search = several verify_batch calls that share a search_id (a fresh interaction_id each, as TzofenEmbed sends)
  const S1 = U(), S2 = U(), S3 = U(), S4 = U();
  traces.regular = [await send(batch({ search_id: S1, search_kind: "regular" })), await send(batch({ search_id: S1, search_kind: "regular" })), await send(batch({ search_id: S1, search_kind: "regular" }))];
  traces.cross = [await send(batch({ search_id: S2, search_kind: "cross", term: "דוד" })), await send(batch({ search_id: S2, search_kind: "cross", term: "מלך" }))];
  traces.forms = [];
  for (let i = 0; i < 5; i += 1) traces.forms.push(await send(batch({ search_id: S3, search_kind: "forms" })));
  traces.regular_signed_in = [await send(batch({ search_id: S4, search_kind: "regular" }), "user-token")];
  // native flow: no search_id; the first page (no cursor) opens the search, continuation pages do not
  traces.native = [await send(page()), await send(page({ after_skip: 12, after_start: 5, after_dir: 1 })), await send(page({ after_skip: 20, after_start: 9, after_dir: -1 }))];
  // adaptive scanner (automatic): carries `stage`; two candidate runs, one continuation each
  traces.scanner = [await send(page({ stage: "adaptive_1", after_skip: null, after_start: null, after_dir: null })), await send(page({ stage: "adaptive_1", after_skip: 12, after_start: 5, after_dir: 1 })),
    await send(page({ stage: "adaptive_1", after_skip: null, after_start: null, after_dir: null })), await send(page({ stage: "adaptive_1", after_skip: 30, after_start: 1, after_dir: 1 }))];
  // verification
  traces.verify = [await send({ op: "verify", term: TERM, scope: "torah", skip: 10, dir: 1, start: 3, interaction_id: U() }), await send({ op: "verify", term: TERM, scope: "torah", skip: 11, dir: -1, start: 4, interaction_id: U() }), await send({ op: "verify", term: TERM, scope: "torah", skip: 12, dir: 1, start: 5, interaction_id: U() })];
  traces.batch_without_search = [await send(batch())];

  const all = Object.values(traces).flat();
  // (a) the label is stored on exactly one span per trace (the engine span) and is readable
  assert.equal(psql(`select count(*) from public.op_trace_spans where resources ? 'els_activity'`), String(all.length));
  assert.equal(psql(`select count(*) from public.op_trace_spans`), String(all.length * 3), "root + gate + engine = 3 spans per trace");
  const label = JSON.parse(psql(`select resources->'els_activity' from public.op_trace_spans where trace_id = '${traces.cross[0]}' and resources ? 'els_activity'`));
  assert.deepEqual(label, { schema: 1, origin: "interactive", search_start: false, search_kind: "cross", search_id: S2 });
  assert.equal(psql(`select resources::text like '%${TERM}%' or replay::text like '%${TERM}%' from public.op_trace_spans where resources ? 'els_activity' limit 1`), "f", "no term in the stored label");
  // capability names and the gate input are the live ones
  assert.equal(psql(`select string_agg(distinct capability, ',' order by capability) from public.op_trace_roots`), "els:page,els:verify,els:verify_batch");
  // (b) the metric SQL counts searches, not spans
  const rows = psql(readFileSync("supabase/proposed/els_search_metric_v1.sql", "utf8").replace(/--.*$/gm, "").replace(/;\s*$/, "")).split("\n").map(l => l.split("|"));
  const sql = Object.fromEntries(rows.map(([m, n]) => [m, Number(n)]));
  assert.deepEqual(sql, { scanner_runs: 2, search_cross: 1, search_forms: 1, search_regular: 2, search_unspecified: 1, verify_calls: 4 });
  assert.ok(Object.values(sql).reduce((a, b) => a + b, 0) < all.length, "searches + scanner + verify (11) are far fewer than traces (" + all.length + ") and spans (" + all.length * 3 + ")");
  // (c) SQL and the executable contract agree
  const spans = JSON.parse(psql(`select json_agg(json_build_object('trace_id', r.trace_id, 'capability', s.capability, 'identity_class', r.identity_class, 'els_activity', s.resources->'els_activity')) from public.op_trace_roots r join public.op_trace_spans s on s.trace_id = r.trace_id and s.kind = 'db_rpc' and s.resources ? 'els_activity'`));
  const js = countElsSearches(spans);
  assert.deepEqual({ regular: js.regular, cross: js.cross, forms: js.forms, unspecified: js.unspecified, scanner_runs: js.scanner_runs, verify_calls: js.verify_calls },
    { regular: sql.search_regular, cross: sql.search_cross, forms: sql.search_forms, unspecified: sql.search_unspecified, scanner_runs: sql.scanner_runs, verify_calls: sql.verify_calls });
  // identity class is preserved per trace (the signed-in search is a user trace)
  assert.equal(psql(`select identity_class from public.op_trace_roots where trace_id = '${traces.regular_signed_in[0]}'`), "user");
  // (d) spans written by the OLD function (no label) are not countable, and not zero-filled
  psql(`select public.op_trace_begin_v1(p_trace_id => '${U()}'::uuid, p_root_span_id => '${U()}'::uuid, p_context => '{"capability":"els:page","surface":"edge:els-search-bridge","identity_class":"anon"}'::jsonb)`);
  assert.equal(psql(`select count(*) from public.op_trace_roots where trace_id not in (select trace_id from public.op_trace_spans where resources ? 'els_activity') and capability = 'els:page'`), "1");
  // sample traces for the report
  for (const [kind, ids] of Object.entries(traces)) {
    const row = psql(`select json_build_object('kind', '${kind}', 'capability', r.capability, 'identity', r.identity_class, 'trace', left(r.trace_id::text, 8), 'spans', (select json_agg(json_build_object('kind', s.kind, 'name', s.name, 'resources', s.resources) order by s.started_at, s.kind) from public.op_trace_spans s where s.trace_id = r.trace_id)) from public.op_trace_roots r where r.trace_id = '${ids[0]}'`);
    console.log("TRACE_SAMPLE " + row);
  }
  console.log("METRIC_SQL " + JSON.stringify(sql));
});

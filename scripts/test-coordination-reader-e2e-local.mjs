// LOCAL ONLY e2e: MCP handler -> real Postgres function (minimal harness DB "coordtest").
// The rpc shim stands in for PostgREST: token "uid:<uuid>" -> request.jwt.claims for role authenticated.
// Run: PGHOST=<sockdir> PGPORT=54999 PGUSER=pgtest node scripts/test-coordination-reader-e2e-local.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { handleMcp, TOOL } from "../supabase/functions/coordination-mcp/handler.js";

const psql = (sql) => execFileSync("psql", ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-d", "coordtest", "-c", sql], { encoding: "utf8" });
const lit = (v) => (v === null || v === undefined ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const rpc = async (token, a) => {
  const uid = token.replace(/^uid:/, "");
  const claims = JSON.stringify({ sub: uid, role: "authenticated" });
  const arr = a.p_scope_terms ? `array[${a.p_scope_terms.map(lit).join(",")}]::text[]` : "null";
  try {
    const out = psql(`begin; set local role authenticated; select set_config('request.jwt.claims', ${lit(claims)}, true);
      select public.coordination_read_current(${lit(a.p_task_key)}, ${arr}, ${a.p_active_only}, ${a.p_limit}, ${lit(a.p_exclude_task_key)}); commit;`);
    return { data: JSON.parse(out.split("\n").filter((l) => l.startsWith("{")).pop()), error: null };
  } catch (e) { return { data: null, error: { code: /42501|not authorized/.test(String(e.stderr || e)) ? "42501" : "XX000", message: "db" } }; }
};
const call = async (uid, args) => { const [s, r] = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: TOOL.name, arguments: args } }, "uid:" + uid, { rpc }); return { s, r, body: JSON.parse(r.result.content[0].text) }; };
const A1 = "00000000-0000-0000-0000-0000000000a1", A2 = "00000000-0000-0000-0000-0000000000a2", A4 = "00000000-0000-0000-0000-0000000000a5";
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok", name); };

await t("flagged reader detects active writer + file overlap", async () => {
  const { s, body } = await call(A1, { scope_terms: ["App2029.jsx"] });
  assert.equal(s, 200); assert.equal(body.verdict, "ACTIVE_WRITER_TERM_MATCH"); assert.equal(body.rows[0].task_key, "T_ACTIVE_APP");
});
await t("BEFORE->AFTER released scope does not block; shared-frame ACK_CLAIMED_WRITE does", async () => {
  assert.equal((await call(A1, { scope_terms: ["releasedzone"] })).body.verdict, "NO_TERM_MATCH_COMPARE_ACTIVE_SCOPES");
  const ack = await call(A1, { scope_terms: ["SystemFrame2029.jsx"] });
  assert.equal(ack.body.verdict, "ACTIVE_WRITER_TERM_MATCH"); assert.equal(ack.body.rows[0].task_key, "T_ACK");
  assert.equal((await call(A1, { scope_terms: ["cyclezone/first"] })).body.verdict, "NO_TERM_MATCH_COMPARE_ACTIVE_SCOPES");
  assert.equal((await call(A1, { scope_terms: ["cyclezone/second"] })).body.verdict, "ACTIVE_WRITER_TERM_MATCH");
});
await t("reviewer's READ_ONLY AFTER on a shared key does not release the writer; dir claim covers files beneath", async () => {
  assert.equal((await call(A1, { scope_terms: ["sharedzone"] })).body.verdict, "ACTIVE_WRITER_TERM_MATCH");
  assert.equal((await call(A1, { scope_terms: ["src/pages/community/CommunityChat.jsx"] })).body.verdict, "ACTIVE_WRITER_TERM_MATCH");
  assert.equal((await call(A1, { scope_terms: ["src/pages/other/File.jsx"] })).body.verdict, "NO_TERM_MATCH_COMPARE_ACTIVE_SCOPES");
});
await t("glob claims block files they cover; a stale (>30d) matching claim demands review", async () => {
  assert.equal((await call(A1, { scope_terms: ["src/foo/bar/x.ts"] })).body.verdict, "ACTIVE_WRITER_TERM_MATCH");
  const old = await call(A1, { scope_terms: ["ancientzone"] });
  assert.equal(old.body.verdict, "OLDER_OPEN_CLAIMS_MATCH_REVIEW"); assert.equal(old.r.result.isError, true);
});
await t("old still-open BEFORE is detected (the view-window drop is asserted in the SQL tests)", async () => {
  assert.equal((await call(A1, { scope_terms: ["oldopenzone"] })).body.verdict, "ACTIVE_WRITER_TERM_MATCH");
});
psql(`insert into public.work_log(task_key, status, assignment_scope, topic, created_at)
  select 'T_BULK_' || g, 'BEFORE_BRANCH_ONLY_PASSIVE_ACTIVE_WRITER', 'bulkzone/file' || g, 'bulk', now() - interval '20 minutes' from generate_series(1, 80) g;
  insert into public.work_log(task_key, status, assignment_scope, topic, created_at)
  select 'T_BULK_' || g, 'AFTER_BRANCH_ONLY_SCOPE_RELEASED_PASSIVE', 'bulkzone/file' || g, 'bulk', now() - interval '10 minutes' from generate_series(1, 10) g;`);
await t(">50 active writers: even a clean scope is INCOMPLETE (list truncated), never an all-clear", async () => {
  const { r, body } = await call(A1, { scope_terms: ["community/chat"] });
  assert.equal(body.verdict, "COORDINATION_INCOMPLETE"); assert.equal(r.result.isError, true);
});
await t("70 matching writers (50-row page) is INCOMPLETE", async () => {
  const { r, body } = await call(A1, { scope_terms: ["bulkzone"], limit: 50 });
  assert.equal(body.verdict, "COORDINATION_INCOMPLETE"); assert.equal(r.result.isError, true);
});
await t("after the crowd clears, an independent scope is a complete NO_TERM_MATCH and a hit still blocks only its own scope", async () => {
  psql(`delete from public.work_log where task_key like 'T_BULK_%'`);
  assert.equal((await call(A1, { scope_terms: ["community/chat"] })).body.verdict, "NO_TERM_MATCH_COMPARE_ACTIVE_SCOPES");
  assert.equal((await call(A1, { scope_terms: ["App2029.jsx"] })).body.verdict, "ACTIVE_WRITER_TERM_MATCH");
});
await t("unflagged user -> 403 COORDINATION_UNVERIFIED", async () => {
  const { s, body } = await call(A2, {}); assert.equal(s, 403); assert.equal(body.verdict, "COORDINATION_UNVERIFIED");
});
await t("revocation is immediate with the same token; re-grant restores", async () => {
  assert.equal((await call(A4, { scope_terms: ["App2029.jsx"] })).s, 200);
  psql(`update auth.users set raw_app_meta_data='{}' where id='${A4}'`);
  assert.equal((await call(A4, { scope_terms: ["App2029.jsx"] })).s, 403);
  psql(`update auth.users set raw_app_meta_data='{"sod1820_coordination_reader": true}' where id='${A4}'`);
  assert.equal((await call(A4, { scope_terms: ["App2029.jsx"] })).s, 200);
});
await t("DB unavailable (wrong db) -> fail closed 502", async () => {
  const bad = async () => ({ data: null, error: { code: "XX000", message: "connection refused" } });
  const [s, r] = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: TOOL.name, arguments: {} } }, "x", { rpc: bad });
  assert.equal(s, 502); assert.equal(JSON.parse(r.result.content[0].text).verdict, "COORDINATION_UNVERIFIED");
});
console.log(`E2E_PASS ${n}`);

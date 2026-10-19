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
await t("independent scope -> NO_TERM_MATCH_IN_ACTIVE_ROWS (only the overlapping scope is blocked)", async () => {
  assert.equal((await call(A1, { scope_terms: ["community/chat"] })).body.verdict, "NO_TERM_MATCH_IN_ACTIVE_ROWS");
});
await t("80-row scope is INCOMPLETE, not 'no overlap'", async () => {
  const { r, body } = await call(A1, { scope_terms: ["bulkzone"], limit: 50 });
  assert.equal(body.verdict, "COORDINATION_INCOMPLETE"); assert.equal(r.result.isError, true);
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

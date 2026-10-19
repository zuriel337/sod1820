import assert from "node:assert/strict";
import { handleMcp, bearerOf, TOOL } from "../supabase/functions/coordination-mcp/handler.js";

const NOW = Date.parse("2026-10-19T12:00:00Z");
const payload = (o = {}) => ({ checked_at: new Date(NOW).toISOString(), total_matches: 1, returned: 1, limit: 25, truncated: false,
  rows: [{ id: "i1", created_at: "2026-10-18T00:00:00Z", task_key: "T1", status: "BEFORE_X_ACTIVE_WRITER", assignment_scope: "src/App2029.jsx" }], ...o });
const run = (args, rpc, token = "tok", extra = {}) => handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: TOOL.name, arguments: args } }, token, { rpc, now: () => NOW, ...extra });
const text = (r) => JSON.parse(r.result.content[0].text);
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok", name); };
const ok = (d) => async () => ({ data: d, error: null });

await t("tools/list: one read-only tool", async () => {
  const [s, r] = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" }, null, {});
  assert.equal(s, 200); assert.equal(r.result.tools.length, 1); assert.equal(r.result.tools[0].annotations.readOnlyHint, true);
});
await t("valid reader + active writer -> ACTIVE_WRITER_OVERLAP", async () => {
  const [s, r] = await run({ scope_terms: ["App2029.jsx"] }, ok(payload()));
  assert.equal(s, 200); assert.equal(text(r).verdict, "ACTIVE_WRITER_OVERLAP"); assert.equal(text(r).total_matches, 1);
});
await t("complete empty result with scope -> NO_ACTIVE_OVERLAP_FOUND", async () => {
  const [, r] = await run({ scope_terms: ["community/chat"] }, ok(payload({ total_matches: 0, returned: 0, rows: [] })));
  assert.equal(text(r).verdict, "NO_ACTIVE_OVERLAP_FOUND"); assert.equal(r.result.isError, undefined);
});
await t("no scope given -> never claims 'no overlap'", async () => {
  const [, r] = await run({}, ok(payload({ total_matches: 0, returned: 0, rows: [] })));
  assert.equal(text(r).verdict, "NO_ACTIVE_WRITERS_LISTED");
});
await t("active_only=false never claims overlap status", async () => {
  const [, r] = await run({ task_key: "T1", active_only: false }, ok(payload({ total_matches: 0, returned: 0, rows: [] })));
  assert.equal(text(r).verdict, "HISTORY_READ_NO_OVERLAP_CLAIM");
});
await t("truncated (50 of 80) -> INCOMPLETE error, rows withheld, never 'no overlap'", async () => {
  const rows = Array.from({ length: 50 }, (_, i) => ({ id: "i" + i, created_at: "2026-10-18T00:00:00Z", task_key: "T" + i, status: "BEFORE_X" }));
  const [s, r] = await run({ scope_terms: ["bulkzone"], limit: 50 }, ok(payload({ total_matches: 80, returned: 50, limit: 50, truncated: true, rows })));
  assert.equal(s, 200); assert.equal(r.result.isError, true); assert.equal(text(r).verdict, "COORDINATION_INCOMPLETE"); assert.equal(text(r).rows, undefined);
});
await t("no token -> 401, rpc never called", async () => {
  let called = false; const [s] = await run({}, async () => { called = true; }, null);
  assert.equal(s, 401); assert.equal(called, false);
});
await t("revoked/denied (42501) -> 403 fail closed, DB text not leaked", async () => {
  const [s, r] = await run({}, async () => ({ data: null, error: { code: "42501", message: "secret detail" } }));
  assert.equal(s, 403); assert.equal(text(r).verdict, "COORDINATION_UNVERIFIED"); assert.doesNotMatch(JSON.stringify(r), /secret detail/);
});
await t("expired JWT -> fail closed", async () => {
  const [s, r] = await run({}, async () => ({ data: null, error: { message: "JWT expired" } }));
  assert.equal(s, 403); assert.equal(r.result.isError, true);
});
await t("server error (500/XX000) -> 502 fail closed", async () => {
  const [s, r] = await run({}, async () => ({ data: null, error: { code: "XX000", message: "boom" } }));
  assert.equal(s, 502); assert.equal(text(r).verdict, "COORDINATION_UNVERIFIED");
});
await t("rpc throws / rejects -> fail closed", async () => {
  const [s, r] = await run({}, async () => { throw new Error("network"); }); assert.equal(s, 502); assert.equal(r.result.isError, true);
});
await t("rpc hangs -> timeout fails closed", async () => {
  const [s] = await run({}, () => new Promise(() => {}), "tok", { timeoutMs: 20 }); assert.equal(s, 502);
});
await t("malformed / incomplete responses all fail closed (never treated as empty)", async () => {
  const bad = [undefined, null, [], "x", {}, payload({ rows: undefined }), payload({ returned: 2 }), payload({ total_matches: -1 }),
    payload({ truncated: true }), payload({ truncated: false, total_matches: 5 }), payload({ limit: 99 }), payload({ checked_at: "nope" }),
    payload({ checked_at: new Date(NOW - 3_600_000).toISOString() }), payload({ rows: [{ id: "i", created_at: "x" }] }),
    payload({ rows: [{ id: "i1", created_at: "x", task_key: "T", status: "S", what_we_did: "leak" }] }),
    payload({ rows: [{ id: "i1", created_at: "x", task_key: "T", status: "S", dispatch_session_url: "u" }] }),
    payload({ total_matches: 0, returned: 0, rows: [], limit: 99 }), payload({ returned: 1, rows: new Array(60).fill({}) })];
  for (const d of bad) { const [s, r] = await run({ scope_terms: ["abc"] }, ok(d)); assert.equal(s, 502, JSON.stringify(d)); assert.equal(text(r).verdict, "COORDINATION_UNVERIFIED"); }
});
await t("response limit larger than requested limit fails closed", async () => {
  const [s] = await run({ limit: 5 }, ok(payload({ limit: 25 }))); assert.equal(s, 502);
});
await t("argument validation", async () => {
  for (const a of [{ limit: 500 }, { limit: 1.5 }, { scope_terms: ["ab"] }, { scope_terms: new Array(11).fill("abcd") }, { task_key: 5 }, { active_only: "yes" }, { exclude_task_key: 7 }]) {
    const [, r] = await run(a, ok(payload())); assert.equal(r.error.code, -32602);
  }
});
await t("only fixed rpc params are forwarded", async () => {
  let seen; await run({ task_key: "K", scope_terms: ["community"], evil: "x" }, async (_t, args) => { seen = args; return { data: payload(), error: null }; });
  assert.deepEqual(Object.keys(seen).sort(), ["p_active_only", "p_exclude_task_key", "p_limit", "p_scope_terms", "p_task_key"]);
});
await t("unknown tool / method rejected", async () => {
  const [, r1] = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "execute_sql" } }, "t", {});
  assert.equal(r1.error.code, -32602);
  const [, r2] = await handleMcp({ jsonrpc: "2.0", id: 2, method: "resources/read" }, "t", {}); assert.equal(r2.error.code, -32601);
});
await t("bearer parsing", async () => {
  const h = (v) => ({ headers: new Headers(v ? { authorization: v } : {}) });
  assert.equal(bearerOf(h("Bearer a.b.c")), "a.b.c"); assert.equal(bearerOf(h("Basic x")), null); assert.equal(bearerOf(h()), null);
});
console.log(`NODE_PASS ${n}`);

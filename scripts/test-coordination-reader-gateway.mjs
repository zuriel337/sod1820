import assert from "node:assert/strict";
import { handleMcp, bearerOf, TOOL } from "../supabase/functions/coordination-mcp/handler.js";

const call = (args, token = "t", rpc) => handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: TOOL.name, arguments: args } }, token, { rpc });
const okRpc = async () => ({ data: [{ task_key: "X" }], error: null });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok", name); };

await t("tools/list exposes one read-only tool", async () => {
  const [s, r] = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" }, null, {});
  assert.equal(s, 200); assert.equal(r.result.tools.length, 1); assert.equal(r.result.tools[0].annotations.readOnlyHint, true);
});
await t("no token -> 401, rpc never called", async () => {
  let called = false; const [s] = await call({}, null, async () => { called = true; });
  assert.equal(s, 401); assert.equal(called, false);
});
await t("permission denied (42501) fails closed, no DB message leaked", async () => {
  const [s, r] = await call({}, "t", async () => ({ data: null, error: { code: "42501", message: "secret detail" } }));
  assert.equal(s, 403); assert.match(r.result.content[0].text, /COORDINATION_UNVERIFIED/); assert.doesNotMatch(JSON.stringify(r), /secret detail/);
});
await t("expired JWT fails closed", async () => {
  const [s, r] = await call({}, "t", async () => ({ data: null, error: { message: "JWT expired" } }));
  assert.equal(s, 403); assert.equal(r.result.isError, true);
});
await t("backend outage fails closed (502), no rows", async () => {
  const [s, r] = await call({}, "t", async () => ({ data: null, error: { code: "XX000", message: "boom" } }));
  assert.equal(s, 502); assert.equal(r.result.isError, true);
});
await t("argument validation rejects oversized / wrong types", async () => {
  for (const a of [{ limit: 500 }, { scope_terms: ["ab"] }, { scope_terms: new Array(11).fill("abcd") }, { task_key: 5 }, { active_only: "yes" }]) {
    const [, r] = await call(a, "t", okRpc); assert.equal(r.error.code, -32602);
  }
});
await t("only fixed rpc params are forwarded", async () => {
  let seen; await call({ task_key: "K", scope_terms: ["community"], evil: "x" }, "t", async (_t, args) => { seen = args; return { data: [], error: null }; });
  assert.deepEqual(Object.keys(seen).sort(), ["p_active_only", "p_limit", "p_scope_terms", "p_task_key"]);
});
await t("unknown tool / method rejected", async () => {
  const [, r1] = await handleMcp({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "execute_sql" } }, "t", {});
  assert.equal(r1.error.code, -32602);
  const [, r2] = await handleMcp({ jsonrpc: "2.0", id: 2, method: "resources/read" }, "t", {});
  assert.equal(r2.error.code, -32601);
});
await t("bearer parsing", async () => {
  const h = (v) => ({ headers: new Headers(v ? { authorization: v } : {}) });
  assert.equal(bearerOf(h("Bearer a.b.c")), "a.b.c"); assert.equal(bearerOf(h("Basic x")), null); assert.equal(bearerOf(h()), null);
});
console.log(`PASS ${n}`);

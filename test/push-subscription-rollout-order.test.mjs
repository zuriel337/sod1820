// A6: deploy-order safety of the DEF-001b push RPCs. The frontend (RPC callers) can reach users before
// supabase/proposed/20261106121000_def001b_visitor_id_exposure_step1.sql is applied; push_subscription_upsert_v1 and
// push_subscription_delete_v1 then answer "function not found" (PostgREST PGRST202 / HTTP 404). That single call must fall back,
// once, to the previous direct table write. Every other failure must NOT touch the table, and once the RPC exists the table is
// never reached. Part 1 drives the store with a stub client; part 2 bundles the real src/lib/push.js and drives
// enablePush / disablePush end to end against a stub client (no network, no DB).
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { build } from "esbuild";
import { isRpcMissing, upsertPushSubscription, deletePushSubscription } from "../src/lib/pushSubscriptionStore.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const NOT_FOUND = {
  data: null, status: 404, statusText: "Not Found",
  error: { code: "PGRST202", message: "Could not find the function public.push_subscription_upsert_v1(p_auth, p_endpoint) in the schema cache", details: null, hint: null },
};
const ok = { data: null, error: null, status: 204 };
const fail = (status, code, message) => ({ data: null, status, error: { code, message } });

// Stub client: records every call, answers from the given handlers.
function makeClient({ rpc = () => ok, upsert = () => ({ error: null }), del = () => ({ error: null }) } = {}) {
  const calls = { rpc: [], from: [], upsert: [], delete: [] };
  return {
    calls,
    rpc: async (name, args) => { calls.rpc.push({ name, args }); return rpc(name, args); },
    from: (table) => {
      calls.from.push(table);
      return {
        upsert: async (row, opts) => { calls.upsert.push({ table, row, opts }); return upsert(row, opts); },
        delete: () => ({ eq: async (col, val) => { calls.delete.push({ table, col, val }); return del(col, val); } }),
      };
    },
  };
}
const SUB = {
  endpoint: "https://push.example.invalid/endpoint-SECRET-1", p256dh: "P256DH-SECRET", auth: "AUTH-SECRET",
  topics: ["a"], userAgent: "UA/1", userId: null, visitorId: "00000000-0000-4000-8000-000000000001",
};
const SECRETS = [SUB.endpoint, SUB.p256dh, SUB.auth, SUB.visitorId];

// Records console output for the duration of fn (nothing may be logged on any path).
async function withConsoleCapture(fn) {
  const seen = [];
  const methods = ["log", "info", "warn", "error", "debug", "trace"];
  const originals = methods.map((m) => console[m]);
  methods.forEach((m) => { console[m] = (...a) => seen.push([m, a]); });
  try { return { value: await fn(), console: seen }; } finally { methods.forEach((m, i) => { console[m] = originals[i]; }); }
}

test("isRpcMissing: only 'function not found' qualifies", () => {
  const yes = [
    NOT_FOUND,
    { error: { code: "PGRST202" } },
    { error: { message: "Could not find the function public.x() in the schema cache" } },
    { error: { message: "anything" }, status: 404 },
    { error: { message: "anything", status: 404 } },
    { error: { code: "42883", message: "function foo(text) does not exist" }, status: 404 }, // PostgREST answers 404 for undefined_function
  ];
  for (const r of yes) assert.equal(isRpcMissing(r), true, JSON.stringify(r));
  const no = [
    undefined, null, {}, { error: null }, { error: null, status: 404 }, ok,
    fail(403, "42501", "permission denied for function push_subscription_upsert_v1"),
    fail(400, "P0001", "invalid endpoint"),
    fail(400, "P0001", "invalid keys"),
    fail(401, "PGRST301", "JWT expired"),
    fail(500, "XX000", "internal error"),
    fail(503, "PGRST002", "Could not query the database for the schema cache. Retrying."),
    { data: null, status: 0, error: { message: "TypeError: Failed to fetch" } },
  ];
  for (const r of no) assert.equal(isRpcMissing(r), false, JSON.stringify(r));
});

test("upsert: RPC present -> RPC only, the table is never reached (the state after the SQL is applied)", async () => {
  const c = makeClient();
  const res = await upsertPushSubscription(c, SUB);
  assert.deepEqual(res, { ok: true, via: "rpc" });
  assert.equal(c.calls.rpc.length, 1);
  assert.equal(c.calls.rpc[0].name, "push_subscription_upsert_v1");
  assert.deepEqual(c.calls.rpc[0].args, {
    p_endpoint: SUB.endpoint, p_p256dh: SUB.p256dh, p_auth: SUB.auth, p_topics: ["a"], p_user_agent: "UA/1", p_visitor: SUB.visitorId,
  });
  assert.deepEqual(c.calls.from, []);
});

test("upsert: RPC missing (PGRST202 / 404) -> exactly one fallback write with the previous release's row shape", async () => {
  const c = makeClient({ rpc: () => NOT_FOUND });
  const res = await upsertPushSubscription(c, SUB);
  assert.deepEqual(res, { ok: true, via: "table" });
  assert.equal(c.calls.rpc.length, 1, "the RPC is tried once, not retried");
  assert.deepEqual(c.calls.from, ["push_subscriptions"]);
  assert.equal(c.calls.upsert.length, 1, "exactly one fallback write");
  const { row, opts } = c.calls.upsert[0];
  assert.deepEqual(opts, { onConflict: "endpoint" });
  assert.match(row.last_seen, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual({ ...row, last_seen: null }, {
    endpoint: SUB.endpoint, p256dh: SUB.p256dh, auth: SUB.auth, user_id: null, visitor_id: SUB.visitorId,
    topics: ["a"], user_agent: "UA/1", last_seen: null,
  });
});

test("upsert fallback: a signed-in subscription is stored against the account, never against a visitor id", async () => {
  const c = makeClient({ rpc: () => NOT_FOUND });
  await upsertPushSubscription(c, { ...SUB, userId: "11111111-1111-4111-8111-111111111111", visitorId: null });
  assert.equal(c.calls.upsert[0].row.user_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(c.calls.upsert[0].row.visitor_id, null);
});

test("upsert: any other RPC failure is reported as is and never retried through the table", async () => {
  const failures = [
    fail(403, "42501", "permission denied for function push_subscription_upsert_v1"),
    fail(400, "P0001", "invalid endpoint"),
    fail(401, "PGRST301", "JWT expired"),
    fail(500, "XX000", "internal error"),
    fail(503, "PGRST002", "schema cache unavailable"),
    { data: null, status: 0, error: { message: "TypeError: Failed to fetch" } },
  ];
  for (const f of failures) {
    const c = makeClient({ rpc: () => f });
    const res = await upsertPushSubscription(c, SUB);
    assert.deepEqual(res, { ok: false, error: f.error.message });
    assert.equal(c.calls.rpc.length, 1);
    assert.deepEqual(c.calls.from, [], `${f.error.code || f.error.message}: the table must not be touched`);
  }
});

test("upsert: a failing fallback write is an error (not silent success) and is not retried", async () => {
  const c = makeClient({ rpc: () => NOT_FOUND, upsert: () => ({ error: { message: "new row violates row-level security policy" } }) });
  const res = await upsertPushSubscription(c, SUB);
  assert.deepEqual(res, { ok: false, error: "new row violates row-level security policy" });
  assert.equal(c.calls.rpc.length, 1);
  assert.equal(c.calls.upsert.length, 1);
});

test("upsert: a client that throws is not masked by the fallback", async () => {
  const c = makeClient({ rpc: () => { throw new Error("boom"); } });
  await assert.rejects(upsertPushSubscription(c, SUB), /boom/);
  assert.deepEqual(c.calls.from, []);
});

test("delete: RPC present -> RPC only", async () => {
  const c = makeClient();
  assert.deepEqual(await deletePushSubscription(c, SUB.endpoint), { ok: true, via: "rpc" });
  assert.deepEqual(c.calls.rpc, [{ name: "push_subscription_delete_v1", args: { p_endpoint: SUB.endpoint } }]);
  assert.deepEqual(c.calls.from, []);
});

test("delete: RPC missing -> exactly one fallback delete by endpoint; other failures never touch the table", async () => {
  const missing = makeClient({ rpc: () => NOT_FOUND });
  assert.deepEqual(await deletePushSubscription(missing, SUB.endpoint), { ok: true, via: "table" });
  assert.equal(missing.calls.rpc.length, 1);
  assert.deepEqual(missing.calls.delete, [{ table: "push_subscriptions", col: "endpoint", val: SUB.endpoint }]);

  for (const f of [fail(403, "42501", "permission denied"), fail(500, "XX000", "internal error"), { data: null, status: 0, error: { message: "Failed to fetch" } }]) {
    const c = makeClient({ rpc: () => f });
    assert.deepEqual(await deletePushSubscription(c, SUB.endpoint), { ok: false, error: f.error.message });
    assert.deepEqual(c.calls.from, []);
  }

  const bad = makeClient({ rpc: () => NOT_FOUND, del: () => ({ error: { message: "permission denied for table push_subscriptions" } }) });
  assert.deepEqual(await deletePushSubscription(bad, SUB.endpoint), { ok: false, error: "permission denied for table push_subscriptions" });
  assert.equal(bad.calls.delete.length, 1);
});

test("nothing is logged and no secret is returned, on any path", async () => {
  const { value, console: logged } = await withConsoleCapture(async () => {
    const out = [];
    for (const rpc of [() => ok, () => NOT_FOUND, () => fail(500, "XX000", "internal error")]) {
      out.push(await upsertPushSubscription(makeClient({ rpc }), SUB));
      out.push(await deletePushSubscription(makeClient({ rpc }), SUB.endpoint));
    }
    return out;
  });
  assert.deepEqual(logged, []);
  const dump = JSON.stringify(value);
  for (const s of SECRETS) assert.ok(!dump.includes(s), "results must not echo endpoint, keys or visitor id");
});

// ---- part 2: the real src/lib/push.js, bundled, with browser globals and the Supabase client stubbed ----------------------------

const stubModules = {
  "supabase.js": "export const supabase = new Proxy({}, { get: (_, k) => globalThis.__push.client[k].bind(globalThis.__push.client) });",
  "tracking.js": "export const getVisitorId = () => globalThis.__push.visitorId;",
};
const bundled = await build({
  entryPoints: [path.join(root, "src/lib/push.js")],
  bundle: true, write: false, format: "esm", platform: "browser", logLevel: "silent",
  define: { "import.meta.env.VITE_VAPID_PUBLIC_KEY": JSON.stringify("AQIDBA") },
  plugins: [{
    name: "stub-push-deps",
    setup(b) {
      b.onResolve({ filter: /^\.\/(supabase|tracking)\.js$/ }, (a) => ({ path: a.path.slice(2), namespace: "stub" }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({ contents: stubModules[a.path], loader: "js" }));
    },
  }],
});
const pushModule = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

// Browser surface used by push.js. Installed once; `state.sub` is the current PushManager subscription.
const state = { sub: null };
const mkSub = () => ({
  endpoint: SUB.endpoint,
  toJSON() { return { endpoint: SUB.endpoint, keys: { p256dh: SUB.p256dh, auth: SUB.auth } }; },
  async unsubscribe() { state.unsubscribed = true; return true; },
});
const reg = { pushManager: { getSubscription: async () => state.sub, subscribe: async () => (state.sub = mkSub()) } };
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true, writable: true });
Object.defineProperty(globalThis, "PushManager", { value: class {}, configurable: true, writable: true });
Object.defineProperty(globalThis, "Notification", { value: { permission: "default", requestPermission: async () => "granted" }, configurable: true, writable: true });
Object.defineProperty(globalThis, "navigator", {
  value: { userAgent: "UA/1", serviceWorker: { register: async () => reg, ready: Promise.resolve(reg) } }, configurable: true, writable: true,
});
const withClient = (client, visitorId = SUB.visitorId) => { globalThis.__push = { client, visitorId }; state.sub = null; state.unsubscribed = false; };

test("push.js: configured and supported in the harness", () => {
  assert.equal(pushModule.PUSH_CONFIGURED, true);
  assert.equal(pushModule.pushSupported(), true);
});

test("push.js enablePush: RPC missing (frontend live before the SQL) -> subscribe still succeeds through the direct table write", async () => {
  const c = makeClient({ rpc: () => NOT_FOUND });
  withClient(c);
  const { value, console: logged } = await withConsoleCapture(() => pushModule.enablePush({ userId: null, topics: ["t"] }));
  assert.deepEqual(value, { ok: true });
  assert.equal(c.calls.rpc.length, 1);
  assert.equal(c.calls.upsert.length, 1);
  assert.equal(c.calls.upsert[0].table, "push_subscriptions");
  assert.equal(c.calls.upsert[0].row.endpoint, SUB.endpoint);
  assert.equal(c.calls.upsert[0].row.visitor_id, SUB.visitorId);
  assert.equal(c.calls.upsert[0].row.user_id, null);
  assert.deepEqual(c.calls.upsert[0].row.topics, ["t"]);
  assert.deepEqual(logged, []);
});

test("push.js enablePush: RPC present -> RPC only; anonymous sends the visitor id, signed-in sends none", async () => {
  const anon = makeClient();
  withClient(anon);
  assert.deepEqual(await pushModule.enablePush({ userId: null }), { ok: true });
  assert.equal(anon.calls.rpc[0].args.p_visitor, SUB.visitorId);
  assert.deepEqual(anon.calls.from, []);

  const signed = makeClient();
  withClient(signed);
  assert.deepEqual(await pushModule.enablePush({ userId: "11111111-1111-4111-8111-111111111111" }), { ok: true });
  assert.equal(signed.calls.rpc[0].args.p_visitor, null);
  assert.deepEqual(signed.calls.from, []);
});

test("push.js enablePush: a real RPC failure is reported to the UI and never goes through the table", async () => {
  const c = makeClient({ rpc: () => fail(403, "42501", "permission denied for function push_subscription_upsert_v1") });
  withClient(c);
  assert.deepEqual(await pushModule.enablePush({ userId: null }), { ok: false, reason: "error", error: "permission denied for function push_subscription_upsert_v1" });
  assert.deepEqual(c.calls.from, []);
});

test("push.js enablePush: RPC missing and the fallback write fails too -> error, not silent success", async () => {
  const c = makeClient({ rpc: () => NOT_FOUND, upsert: () => ({ error: { message: "permission denied for table push_subscriptions" } }) });
  withClient(c);
  assert.deepEqual(await pushModule.enablePush({ userId: null }), { ok: false, reason: "error", error: "permission denied for table push_subscriptions" });
  assert.equal(c.calls.upsert.length, 1);
});

test("push.js disablePush: unsubscribes the browser and removes the row; falls back once when the RPC is missing", async () => {
  const missing = makeClient({ rpc: () => NOT_FOUND });
  withClient(missing);
  state.sub = mkSub();
  assert.deepEqual(await pushModule.disablePush(), { ok: true });
  assert.equal(state.unsubscribed, true);
  assert.equal(missing.calls.rpc.length, 1);
  assert.deepEqual(missing.calls.delete, [{ table: "push_subscriptions", col: "endpoint", val: SUB.endpoint }]);

  const present = makeClient();
  withClient(present);
  state.sub = mkSub();
  assert.deepEqual(await pushModule.disablePush(), { ok: true });
  assert.deepEqual(present.calls.rpc, [{ name: "push_subscription_delete_v1", args: { p_endpoint: SUB.endpoint } }]);
  assert.deepEqual(present.calls.from, []);

  const broken = makeClient({ rpc: () => fail(500, "XX000", "internal error") });
  withClient(broken);
  state.sub = mkSub();
  assert.deepEqual(await pushModule.disablePush(), { ok: true }, "unsubscribe stays best effort");
  assert.deepEqual(broken.calls.from, []);
});

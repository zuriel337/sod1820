// M0-B (ZURIEL 12.11.2026): paid AI only for a verified signed-in user, server-derived limit identity,
// paid AI fails CLOSED and public compute fails OPEN on limiter failure; trusted server paths unchanged.
// Pure decision functions + the real handlers with synthetic I/O. No network, no live project.
import test from "node:test";
import assert from "node:assert/strict";
import {
  checkBucket, enforcePaidAiLimits, enforcePublicComputeLimits, limiterKey, paidAiAdmission,
  paidAiLimitHttp, platformClientIp, publicComputeSubject, SIGN_IN_REQUIRED,
} from "../supabase/functions/_shared/edgeCallerLimits.js";
import { createMaterialGate } from "../supabase/functions/_shared/materialGate.js";

const SECRET = "synthetic-service-key";
const UID = "11111111-2222-4333-8444-555555555555";
const req = (headers = {}) => new Request("https://fixture.invalid/fn", { method: "POST", headers });

// Records every RPC; `answers` maps an RPC name to a value, an Error (thrown) or a function.
function rpcRecorder(answers = {}) {
  const calls = [];
  const serviceRpc = async (name, args) => {
    calls.push({ name, args });
    const a = answers[name];
    if (a instanceof Error) throw a;
    if (typeof a === "function") return a(args, calls);
    if (a !== undefined) return a;
    if (name === "edge_rate_limit_check") return { allowed: true, count: 1, limit: args.p_limit, window_seconds: args.p_window_seconds };
    if (name === "ai_quota_check") return { allowed: true, used: 1, limit: args.p_limit_override, tier: args.p_tier };
    throw new Error(`unexpected rpc ${name}`);
  };
  return { serviceRpc, calls };
}
const user = (tier = "user") => ({ verified: true, userRef: UID, tier, identity: `u:${UID}` });
const guest = (identity = "ip:x") => ({ verified: false, userRef: null, tier: "anon", identity });
const paid = (rpc, caller, extra = {}) => enforcePaidAiLimits({
  serviceRpc: rpc.serviceRpc, secret: SECRET, scope: "test-paid", caller,
  accountLimit: 20, globalLimit: 60, globalDailyCap: 300, ...extra,
});

test("guest is refused for paid AI with a stable sign_in_required code and zero limiter I/O", async () => {
  for (const caller of [guest(), guest(""), { verified: true, userRef: "not-a-uuid", tier: "user" }, null, {}]) {
    assert.deepEqual(paidAiAdmission(caller).error, SIGN_IN_REQUIRED);
    const rpc = rpcRecorder();
    const d = await paid(rpc, caller);
    assert.equal(d.state, "refused");
    assert.equal(paidAiLimitHttp(d).status, 401);
    assert.equal(rpc.calls.length, 0);
  }
});

test("verified user is allowed within quota: account bucket, global hourly bucket, global daily cap", async () => {
  const rpc = rpcRecorder();
  const d = await paid(rpc, user());
  assert.equal(d.state, "allowed");
  assert.deepEqual(rpc.calls.map((c) => c.name), ["edge_rate_limit_check", "edge_rate_limit_check", "ai_quota_check"]);
  const [account, global, daily] = rpc.calls.map((c) => c.args);
  assert.match(account.p_key_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(account.p_key_hash, global.p_key_hash);
  assert.deepEqual([account.p_limit, account.p_window_seconds, global.p_limit, global.p_window_seconds], [20, 3600, 60, 3600]);
  assert.match(daily.p_identity, /^g:[0-9a-f]{64}$/);
  assert.deepEqual([daily.p_tier, daily.p_limit_override], ["global_cap", 300]);
  assert.ok(!JSON.stringify(rpc.calls).includes(UID), "raw user id never reaches the limiter tables");
});

test("account bucket exhausted -> 429 rate_limited with Retry-After; global daily -> daily_cap_reached", async () => {
  const denyAccount = rpcRecorder({ edge_rate_limit_check: { allowed: false, count: 21, limit: 20, window_seconds: 3600 } });
  const a = await paid(denyAccount, user());
  assert.equal(a.state, "denied");
  assert.equal(a.bucket, "account");
  const http = paidAiLimitHttp(a);
  assert.equal(http.status, 429);
  assert.equal(http.error, "rate_limited");
  assert.ok(Number(http.headers["Retry-After"]) >= 1);
  assert.equal(denyAccount.calls.length, 1, "global buckets are not consumed after an account denial");
  const denyDaily = rpcRecorder({ ai_quota_check: { allowed: false, used: 300, limit: 300, tier: "global_cap" } });
  const d = await paid(denyDaily, user());
  assert.equal(d.bucket, "global_daily");
  assert.equal(paidAiLimitHttp(d).error, "daily_cap_reached");
});

test("quota/limiter infrastructure failure is a refusal (503) for paid AI", async () => {
  const cases = [
    { edge_rate_limit_check: new Error("down") },
    { edge_rate_limit_check: null },
    { edge_rate_limit_check: { ok: true } },
    { ai_quota_check: new Error("down") },
    { ai_quota_check: null },
    { ai_quota_check: { allowed: "yes" } },
  ];
  for (const answers of cases) {
    const d = await paid(rpcRecorder(answers), user());
    assert.equal(d.state, "unavailable", JSON.stringify(answers));
    assert.equal(paidAiLimitHttp(d).status, 503);
  }
  const noSecret = await enforcePaidAiLimits({ serviceRpc: rpcRecorder().serviceRpc, secret: "", scope: "s", caller: user(), accountLimit: 1, globalLimit: 1 });
  assert.equal(noSecret.state, "unavailable", "no server secret -> no key -> refuse");
});

test("admin is allowed and neither counted against nor blocked by the global daily cap", async () => {
  const rpc = rpcRecorder({ ai_quota_check: { allowed: false } });
  const d = await paid(rpc, user("admin"));
  assert.equal(d.state, "allowed");
  assert.deepEqual(rpc.calls.map((c) => c.name), ["edge_rate_limit_check", "edge_rate_limit_check"]);
});

test("public compute fails OPEN on limiter failure but still returns 429 on an explicit denial", async () => {
  const base = { secret: SECRET, scope: "test-public", subjectLimit: 60 };
  for (const answers of [{ edge_rate_limit_check: new Error("down") }, { edge_rate_limit_check: null }, { edge_rate_limit_check: { nope: 1 } }]) {
    const rpc = rpcRecorder(answers);
    const d = await enforcePublicComputeLimits({ ...base, serviceRpc: rpc.serviceRpc, req: req({ "cf-connecting-ip": "198.51.100.7" }) });
    assert.equal(d.state, "allowed");
    assert.deepEqual(d.degraded, ["subject", "global"]);
  }
  const deny = rpcRecorder({ edge_rate_limit_check: { allowed: false, count: 61, limit: 60, window_seconds: 3600 } });
  const denied = await enforcePublicComputeLimits({ ...base, serviceRpc: deny.serviceRpc, req: req({ "cf-connecting-ip": "198.51.100.7" }) });
  assert.equal(denied.state, "denied");
  assert.equal(denied.bucket, "subject");
  const ok = rpcRecorder();
  const allowed = await enforcePublicComputeLimits({ ...base, serviceRpc: ok.serviceRpc, req: req({ "cf-connecting-ip": "198.51.100.7" }) });
  assert.equal(allowed.state, "allowed");
  assert.deepEqual(ok.calls.map((c) => [c.args.p_limit, c.args.p_window_seconds]), [[60, 3600], [120, 60]]);
});

test("public compute subject: platform address only; rotating user-agent, first XFF hop or visitor_id is the same bucket", async () => {
  assert.equal(platformClientIp(req({ "cf-connecting-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.1, 198.51.100.7" })), "198.51.100.7");
  assert.equal(platformClientIp(req({ "x-forwarded-for": "203.0.113.1, 198.51.100.7" })), "198.51.100.7", "last hop, never the client-set first hop");
  const keys = [];
  for (const headers of [
    { "x-forwarded-for": "203.0.113.1, 198.51.100.7", "user-agent": "a" },
    { "x-forwarded-for": "203.0.113.99, 198.51.100.7", "user-agent": "b" },
  ]) {
    const s = publicComputeSubject({ req: req(headers) });
    keys.push(await limiterKey(SECRET, "els-search-bridge", s.part));
  }
  assert.equal(keys[0], keys[1]);
  assert.notEqual(await limiterKey(SECRET, "x", "ip:198.51.100.7"), await limiterKey("other-secret", "x", "ip:198.51.100.7"), "salted by the server secret");
  assert.equal(publicComputeSubject({ userId: UID, req: req({ "cf-connecting-ip": "198.51.100.7" }) }).kind, "user");
  assert.equal((await checkBucket(async () => ({ allowed: true }), "not-a-key", 60, 1)).state, "unavailable");
});

test("materialGate.resolveCaller: changed visitor_id never changes the guest identity; a verified user is keyed by id", async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/auth/v1/user")) return Response.json({ id: UID });
    if (String(url).includes("/rest/v1/users?")) return Response.json([{ role: "user" }]);
    throw new Error(`unexpected ${url}`);
  };
  const mg = createMaterialGate({ supabaseUrl: "https://fixture.invalid", serviceKey: SECRET, anonKey: "anon", fetchImpl });
  const a = await mg.resolveCaller(req({ "cf-connecting-ip": "198.51.100.7" }), { visitor_id: "v-one" });
  const b = await mg.resolveCaller(req({ "cf-connecting-ip": "198.51.100.7" }), { visitor_id: "v-two" });
  assert.equal(a.identity, b.identity);
  assert.match(a.identity, /^ip:[0-9a-f]{64}$/);
  assert.equal(a.visitor, null);
  const none = await mg.resolveCaller(req({}), { visitor_id: "v-three" });
  assert.equal(none.identity, "", "no platform address and no verified user -> empty identity (refused downstream)");
  const u1 = await mg.resolveCaller(req({ authorization: "Bearer user-jwt" }), { visitor_id: "v-one" });
  const u2 = await mg.resolveCaller(req({ authorization: "Bearer user-jwt" }), { visitor_id: "v-two" });
  assert.equal(u1.identity, `u:${UID}`);
  assert.equal(u2.identity, u1.identity);
  // paidAiLimits keys the account bucket by the verified id: visitor_id cannot reset it
  const rpcKeys = [];
  const mg2 = createMaterialGate({ supabaseUrl: "https://fixture.invalid", serviceKey: SECRET, anonKey: "anon", fetchImpl: async (url, init = {}) => {
    if (String(url).endsWith("/rpc/edge_rate_limit_check")) { rpcKeys.push(JSON.parse(init.body).p_key_hash); return Response.json({ allowed: true, window_seconds: 3600 }); }
    if (String(url).endsWith("/rpc/ai_quota_check")) return Response.json({ allowed: true });
    return fetchImpl(url);
  } });
  await mg2.paidAiLimits(u1, { scope: "number-researcher", accountLimit: 20, globalLimit: 60, globalDailyCap: 300 });
  await mg2.paidAiLimits(u2, { scope: "number-researcher", accountLimit: 20, globalLimit: 60, globalDailyCap: 300 });
  assert.equal(rpcKeys[0], rpcKeys[2], "same account bucket regardless of visitor_id");
  assert.equal((await mg2.paidAiLimits(a, { scope: "number-researcher", accountLimit: 20, globalLimit: 60 })).state, "refused");
});

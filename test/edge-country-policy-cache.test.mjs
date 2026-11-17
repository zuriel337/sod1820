import test from "node:test";
import assert from "node:assert/strict";
import { createCountryPolicyCache, COUNTRY_POLICY_TIMING } from "../edge-country-policy.js";

// EDGE_COUNTRY_POLICY_NONBLOCKING_20261117 (ZURIEL 17.11.2026, test branch): the edge's country policy (public.edge_blocked_countries) is
// read per instance. A copy up to 5 minutes old is used as before; an older one (up to 60 minutes) is used at once while ONE background read
// replaces it; only an instance with no usable copy waits for the read, at most 3 s. A failed or unusable read never removes a good copy.

const MIN = 60 * 1000;
const policyOf = (...codes) => new Map(codes.map(code => [code, { mode: "blocked", strictLevel: 1 }]));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

// A controllable world: the clock, every read (each one a deferred answer) and the bounded wait.
function world({ maxStaleMs, coldWaitMs } = {}) {
  let t = 1_000_000;
  const reads = [], waits = [], background = [];
  const cache = createCountryPolicyCache({
    freshMs: 5 * MIN, maxStaleMs, coldWaitMs, now: () => t,
    read: () => { const d = deferred(); reads.push(d); return d.promise; },
    wait: ms => { const d = deferred(); waits.push({ ms, ...d }); return { promise: d.promise, cancel: () => {} }; },
  });
  const get = () => cache.get({ waitUntil: p => background.push(p) });
  return { cache, reads, waits, background, get, advance: ms => { t += ms; } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("a new instance waits for the first read, as before; then a copy under 5 minutes is used with no read", async () => {
  const w = world();
  const first = w.get();
  await settle();
  assert.equal(w.reads.length, 1, "one read");
  w.reads[0].resolve(policyOf("ZZ"));
  const a = await first;
  assert.equal(a.state, "waited");
  assert.ok(a.policy.has("ZZ"));
  w.advance(4 * MIN);
  const b = await w.get();
  assert.equal(b.state, "fresh");
  assert.equal(w.reads.length, 1, "no read while the copy is fresh");
});

test("after 5 minutes the reader gets the last copy at once; one background read replaces it", async () => {
  const w = world();
  const first = w.get(); await settle(); w.reads[0].resolve(policyOf("ZZ")); await first;
  w.advance(6 * MIN);
  const a = await w.get();
  assert.equal(a.state, "refresh", "served at once");
  assert.ok(a.policy.has("ZZ"), "the last copy still applies");
  assert.equal(w.reads.length, 2, "a background read started");
  assert.equal(w.background.length >= 1, true, "the read is handed to waitUntil so the instance keeps it alive");
  const b = await w.get();
  assert.equal(b.state, "refresh");
  assert.equal(w.reads.length, 2, "never two reads at once");
  w.reads[1].resolve(policyOf("YY"));
  await settle();
  const c = await w.get();
  assert.equal(c.state, "fresh");
  assert.ok(c.policy.has("YY") && !c.policy.has("ZZ"), "the next request gets the new policy");
});

test("a read that never answers does not hold a reader on a warm instance", async () => {
  const w = world();
  const first = w.get(); await settle(); w.reads[0].resolve(policyOf("ZZ")); await first;
  w.advance(10 * MIN);
  const raced = await Promise.race([w.get(), new Promise(resolve => setTimeout(() => resolve("held"), 50))]);
  assert.notEqual(raced, "held", "answered without waiting for the read");
  assert.equal(raced.state, "refresh");
});

test("a failed or unusable read keeps the last good copy", async () => {
  const w = world();
  const first = w.get(); await settle(); w.reads[0].resolve(policyOf("ZZ")); await first;
  w.advance(6 * MIN);
  await w.get(); w.reads[1].reject(new Error("timeout")); await settle();
  let r = await w.get();
  assert.equal(r.state, "refresh"); assert.ok(r.policy.has("ZZ"));
  w.reads[2].resolve(null); await settle();
  r = await w.get();
  assert.equal(r.state, "refresh"); assert.ok(r.policy.has("ZZ"), "an unusable answer (not a list) never replaces a good copy");
});

test("a new instance waits at most the bound; then no policy (the existing fail-open), and the late read still lands", async () => {
  const w = world({ coldWaitMs: 3000 });
  const first = w.get();
  await settle();
  assert.equal(w.waits[0].ms, 3000, "the reader's wait is bounded");
  w.waits[0].resolve();
  const a = await first;
  assert.equal(a.state, "none");
  assert.equal(a.policy.size, 0);
  w.reads[0].resolve(policyOf("ZZ")); await settle();
  const b = await w.get();
  assert.equal(b.state, "fresh"); assert.ok(b.policy.has("ZZ"));
});

test("a copy older than 60 minutes is not used at once: the reader waits for the read as before, or gets the last copy if it fails", async () => {
  const w = world();
  const first = w.get(); await settle(); w.reads[0].resolve(policyOf("ZZ")); await first;
  w.advance(61 * MIN);
  const pending = w.get(); await settle();
  assert.equal(w.reads.length, 2);
  w.reads[1].resolve(policyOf("YY"));
  const a = await pending;
  assert.equal(a.state, "waited"); assert.ok(a.policy.has("YY"));
  w.advance(61 * MIN);
  const failing = w.get(); await settle();
  w.reads[2].reject(new Error("down"));
  const b = await failing;
  assert.equal(b.state, "fallback"); assert.ok(b.policy.has("YY"), "a failed read keeps the last copy (as before)");
});

test("the bounds are the documented ones", () => {
  assert.equal(COUNTRY_POLICY_TIMING.maxStaleMs, 60 * MIN);
  assert.equal(COUNTRY_POLICY_TIMING.coldWaitMs, 3000);
  assert.ok(COUNTRY_POLICY_TIMING.readTimeoutMs >= COUNTRY_POLICY_TIMING.coldWaitMs, "a background read may finish after the reader stopped waiting");
});

// The real middleware (middleware.js -> middleware-core.js) with a synthetic policy table and clock: no live call is made.
test("the real middleware: a blocked country stays blocked, and a warm instance never waits for the policy read", async () => {
  const { default: middleware } = await import("../middleware.js");
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  let t = Date.now(), table = [{ code: "ZZ", mode: "blocked", strict_level: 1 }], hang = null, policyReads = 0;
  Date.now = () => t;
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    if (u.pathname === "/rest/v1/edge_blocked_countries") {
      policyReads += 1;
      if (hang) return hang.promise.then(() => Response.json(table));
      return Response.json(table);
    }
    if (["/rest/v1/rpc/log_edge", "/rest/v1/rpc/log_crawl"].includes(u.pathname)) return new Response(null, { status: 204 });
    throw new Error("unexpected synthetic dependency: " + u.pathname);
  };
  const browser = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
  const call = async (country, pending = []) => {
    const response = await middleware(new Request("https://sod1820.co.il/", { headers: { "user-agent": browser, "x-vercel-ip-country": country } }),
      { waitUntil: p => pending.push(p) });
    return { response, pending };
  };
  try {
    const cold = await call("IL");
    assert.equal(cold.response.headers.get("x-sod-country-policy"), "waited", "a new instance waits for the first read, as before");
    assert.equal((await call("ZZ")).response.status, 403, "the blocked country is blocked");

    t += 6 * 60 * 1000;
    hang = deferred();
    const started = performance.now();
    const warm = await call("IL");
    const tookMs = performance.now() - started;
    assert.equal(warm.response.headers.get("x-sod-country-policy"), "refresh");
    assert.ok(tookMs < 200, `the reader did not wait for the policy read (${tookMs.toFixed(0)} ms)`);
    assert.equal((await call("ZZ")).response.status, 403, "while the read is pending, the last policy still blocks");
    assert.equal(policyReads, 2, "one background read, not one per request");

    table = [];
    hang.resolve();
    await Promise.all(warm.pending);
    const after = await call("ZZ");
    assert.notEqual(after.response.status, 403, "the new policy applies from the next request");
    assert.equal(after.response.headers.get("x-sod-country-policy"), "fresh");
  } finally {
    globalThis.fetch = originalFetch; Date.now = originalNow;
  }
});

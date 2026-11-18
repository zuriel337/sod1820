import test from "node:test";
import assert from "node:assert/strict";
import { BIG_NUMBER_ELIGIBILITY, createBigNumberEligibility, parseBigNumberList, readBigNumberList } from "../edge-big-number-eligibility.js";

// BIG_NUMBER_ELIGIBILITY_UNKNOWN_503_20261118 (ZURIEL 18.11.2026, branch only). Crawlers on /number/NNNNN (five digits or more):
// eligible → served · not eligible → 403 as before · unknown (source down, no copy that may be relied on) → 503 + Retry-After + no-store.
// No pass-through on failure, no 403→404 swap, no hard-coded list, and an independent block is never re-decided here.

const HOUR = 60 * 60 * 1000;
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function world() {
  let t = 5_000_000;
  const reads = [], background = [];
  const el = createBigNumberEligibility({ now: () => t, read: () => { const d = deferred(); reads.push(d); return d.promise; } });
  return { el, reads, background, get: v => el.get(v, { waitUntil: p => background.push(p) }), advance: ms => { t += ms; } };
}
const settle = () => new Promise(r => setImmediate(r));

test("timing constants are the documented ones (fresh 60 min, stale copy 24 h, read 1.5 s, hold 30 s, Retry-After 120 s)", () => {
  assert.deepEqual({ ...BIG_NUMBER_ELIGIBILITY }, { freshMs: HOUR, maxStaleMs: 24 * HOUR, readTimeoutMs: 1500, failureHoldMs: 30000, retryAfterSeconds: 120, maxValues: 100000 });
});

test("only an array of safe integers above 9999 is a usable answer", () => {
  assert.deepEqual([...parseBigNumberList([10401, 27010])], [10401, 27010]);
  assert.equal(parseBigNumberList([]).size, 0, "an empty list is the source's own answer: nothing is eligible");
  for (const bad of [null, {}, "x", [9999], [12345.5], ["12345"], [12345, null], [Number.MAX_SAFE_INTEGER + 2], { message: "error" }]) {
    assert.equal(parseBigNumberList(bad), null, JSON.stringify(bad));
  }
  assert.equal(parseBigNumberList(new Array(3).fill(10000), { maxValues: 2 }), null, "an absurdly long answer is unusable");
});

test("a new instance waits for one read: in the list → eligible, absent → not eligible; then the copy is reused for an hour", async () => {
  const w = world();
  const a = w.get(27010);
  await settle();
  w.reads[0].resolve(new Set([27010]));
  assert.deepEqual(await a, { decision: "eligible", state: "read" });
  assert.deepEqual(await w.get(12345), { decision: "not_eligible", state: "fresh" });
  w.advance(HOUR - 1);
  await w.get(27010);
  assert.equal(w.reads.length, 1, "no read while the copy is fresh");
});

test("no copy and the read fails → unknown; during the 30 s hold no new read starts; after it one read is tried again", async () => {
  const w = world();
  const a = w.get(27010);
  await settle();
  w.reads[0].reject(new Error("down"));
  assert.deepEqual(await a, { decision: "unknown", state: "failed" });
  assert.deepEqual(await w.get(27010), { decision: "unknown", state: "held" });
  assert.equal(w.reads.length, 1);
  w.advance(30000);
  const b = w.get(27010);
  await settle();
  assert.equal(w.reads.length, 2);
  w.reads[1].resolve(new Set([27010]));
  assert.equal((await b).decision, "eligible");
});

test("a copy between 1 and 24 hours old decides at once while one background read replaces it; a failed read never removes the copy", async () => {
  const w = world();
  const first = w.get(27010); await settle(); w.reads[0].resolve(new Set([27010])); await first;
  w.advance(2 * HOUR);
  assert.deepEqual(await w.get(27010), { decision: "eligible", state: "stale" }, "the crawler does not wait for the refresh");
  assert.equal(w.reads.length, 2); assert.equal(w.background.length, 1);
  w.reads[1].reject(new Error("down")); await settle();
  assert.deepEqual(await w.get(27010), { decision: "eligible", state: "stale" }, "copy kept after a failed refresh");
  assert.equal(w.reads.length, 2, "no new read during the hold");
  assert.deepEqual(await w.get(12345), { decision: "not_eligible", state: "stale" }, "a usable copy still refuses non-eligible values");
});

test("a copy older than 24 hours is no longer relied on: failure → unknown, not the old answer", async () => {
  const w = world();
  const first = w.get(27010); await settle(); w.reads[0].resolve(new Set([27010])); await first;
  w.advance(25 * HOUR);
  const a = w.get(27010); await settle();
  w.reads[1].reject(new Error("down"));
  assert.deepEqual(await a, { decision: "unknown", state: "failed" });
});

test("concurrent crawlers on a cold instance share ONE read", async () => {
  const w = world();
  const all = [w.get(27010), w.get(10401), w.get(12345)];
  await settle();
  assert.equal(w.reads.length, 1);
  w.reads[0].resolve(new Set([27010, 10401]));
  assert.deepEqual((await Promise.all(all)).map(r => r.decision), ["eligible", "eligible", "not_eligible"]);
});

test("readBigNumberList: HTTP error, unusable body and a hanging source all throw; the hang is cut at the timeout", async () => {
  const url = "https://x.test/rest/v1/rpc/content_big_numbers";
  await assert.rejects(readBigNumberList({ url, fetchImpl: async () => Response.json([10401], { status: 500 }) }), /HTTP 500/);
  await assert.rejects(readBigNumberList({ url, fetchImpl: async () => Response.json({ code: "PGRST" }) }), /unusable/);
  await assert.rejects(readBigNumberList({ url, fetchImpl: async () => new Response("<html>", { status: 200 }) }));
  const t0 = Date.now();
  await assert.rejects(readBigNumberList({ url, timeoutMs: 60, fetchImpl: (_u, { signal }) => new Promise((_r, rej) => signal.addEventListener("abort", () => rej(signal.reason))) }), /timed out/);
  assert.ok(Date.now() - t0 < 1000);
  assert.deepEqual([...(await readBigNumberList({ url, fetchImpl: async () => Response.json([10401, 27010]) }))], [10401, 27010]);
});

// ── The real middleware (a fresh module instance per test, so each starts as a new edge instance) ──
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const BAD_BOT = "python-requests/2.31";
const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
let instance = 0;
async function run({ path, ua, big }) {
  const { default: middleware } = await import(`../middleware-core.js?i=${++instance}`);
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ u, body: opts.body && opts.body !== "{}" ? JSON.parse(opts.body) : null });
    if (u.endsWith("/rpc/content_big_numbers")) return big(opts);
    if (u.endsWith("/rpc/blocked_countries") || u.includes("edge_blocked_countries")) return Response.json([]);
    return Response.json(null);
  };
  const pending = [];
  try {
    const req = new Request(`https://sod1820.co.il${path}`, { headers: { "user-agent": ua, "x-vercel-ip-country": "US" } });
    const res = await middleware(req, { waitUntil: p => pending.push(p) });
    await Promise.allSettled(pending);
    return { res, calls, bigCalls: calls.filter(c => c.u.endsWith("/rpc/content_big_numbers")).length, crawl: calls.find(c => c.u.endsWith("/rpc/log_crawl"))?.body };
  } finally { globalThis.fetch = orig; }
}
const refused = res => res && (res.status === 403 || res.status === 503);

test("middleware: Googlebot on an eligible big number is served", async () => {
  const r = await run({ path: "/number/27010", ua: GOOGLEBOT, big: async () => Response.json([10401, 27010]) });
  assert.ok(!refused(r.res), `status ${r.res?.status}`);
  assert.equal(r.crawl.p_blocked, false);
});

test("middleware: Googlebot on a non-eligible big number keeps the 403 (not 404, not 503)", async () => {
  const r = await run({ path: "/number/12345", ua: GOOGLEBOT, big: async () => Response.json([10401, 27010]) });
  assert.equal(r.res.status, 403);
  assert.equal(r.res.headers.get("cache-control"), "no-store");
});

for (const [name, big] of [
  ["the source throws", async () => { throw new TypeError("fetch failed"); }],
  ["the source answers HTTP 503", async () => Response.json({ message: "unavailable" }, { status: 503 })],
  ["the source answers an unusable body", async () => Response.json(["27010"])],
]) {
  test(`middleware: ${name} with no copy → light 503, Retry-After 120, no-store, never the page`, async () => {
    const r = await run({ path: "/number/27010", ua: GOOGLEBOT, big });
    assert.equal(r.res.status, 503);
    assert.equal(r.res.headers.get("retry-after"), "120");
    assert.equal(r.res.headers.get("cache-control"), "no-store");
    assert.equal(await r.res.text(), "Temporarily unavailable", "nothing about the page in the body");
    assert.equal(r.crawl.p_blocked, true, "crawl log counts it as not served");
  });
}

test("middleware: a hanging source is cut at 1.5 s and answers 503", async () => {
  const t0 = Date.now();
  const r = await run({ path: "/number/27010", ua: GOOGLEBOT, big: ({ signal }) => new Promise((_r, rej) => signal.addEventListener("abort", () => rej(signal.reason))) });
  const ms = Date.now() - t0;
  assert.equal(r.res.status, 503);
  assert.ok(ms >= 1400 && ms < 3000, `took ${ms} ms`);
});

test("middleware: a bad bot is refused for its own reason — the eligibility source is not called and the answer stays 403", async () => {
  const r = await run({ path: "/number/27010", ua: BAD_BOT, big: async () => { throw new Error("must not be called"); } });
  assert.equal(r.res.status, 403);
  assert.equal(r.bigCalls, 0);
});

test("middleware: a human browser on a big number never calls the eligibility source and is not refused", async () => {
  const r = await run({ path: "/number/12345", ua: BROWSER, big: async () => { throw new Error("must not be called"); } });
  assert.ok(!refused(r.res));
  assert.equal(r.bigCalls, 0);
});

test("middleware: a crawler on a small number (four digits) never calls the eligibility source", async () => {
  const r = await run({ path: "/number/1820", ua: GOOGLEBOT, big: async () => { throw new Error("must not be called"); } });
  assert.ok(!refused(r.res));
  assert.equal(r.bigCalls, 0);
});

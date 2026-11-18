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
  return { el, reads, background, get: v => el.get(v), advance: ms => { t += ms; }, now: () => t };
}
const settle = () => new Promise(r => setImmediate(r));

test("timing constants are the documented ones (fresh 60 min, failure-only copy 6 h, read 1.5 s, hold 30 s, Retry-After 120 s)", () => {
  assert.deepEqual({ ...BIG_NUMBER_ELIGIBILITY }, { freshMs: HOUR, failureCopyMaxMs: 6 * HOUR, readTimeoutMs: 1500, failureHoldMs: 30000, retryAfterSeconds: 120, maxValues: 100000 });
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

async function seeded(list) {
  const w = world();
  const first = w.get(27010); await settle(); w.reads[0].resolve(new Set(list)); await first;
  return w;
}

test("routine: after an hour the next crawler waits for ONE new read — the old copy is not used while the source answers", async () => {
  const w = await seeded([27010]);
  w.advance(HOUR);
  const a = w.get(27010); await settle();
  assert.equal(w.reads.length, 2, "a new read, not the old copy");
  w.reads[1].resolve(new Set([27010]));
  assert.deepEqual(await a, { decision: "eligible", state: "read" });
});

test("a number that becomes eligible after the copy was made is admitted at the next routine read (within the hour)", async () => {
  const w = await seeded([27010]);
  assert.equal((await w.get(10401)).decision, "not_eligible", "not yet in the list");
  w.advance(HOUR);
  const a = w.get(10401); await settle();
  w.reads[1].resolve(new Set([27010, 10401]));
  assert.deepEqual(await a, { decision: "eligible", state: "read" });
});

test("a number whose eligibility is withdrawn is refused at the next routine read; the old copy does not keep it admitted", async () => {
  const w = await seeded([27010, 10401]);
  w.advance(HOUR);
  const a = w.get(10401); await settle();
  w.reads[1].resolve(new Set([27010]));
  assert.deepEqual(await a, { decision: "not_eligible", state: "read" });
});

test("persistent failure: the last good copy decides only after a failed read and only until it is 6 h old; then 503 (unknown)", async () => {
  const w = await seeded([27010]);
  const copyAt = w.now();
  const STEP = 10 * 60 * 1000;
  let sawFallback = false, sawHeld = false;
  w.advance(HOUR);
  while (w.now() - copyAt < 6 * HOUR) {
    const before = w.reads.length;
    const a = w.get(27010); await settle();
    if (w.reads.length > before) w.reads.at(-1).reject(new Error("down"));
    const r = await a;
    assert.equal(r.decision, "eligible", `copy age ${(w.now() - copyAt) / HOUR} h`);
    sawFallback ||= r.state === "fallback";
    // within the 30 s hold: no new read, the copy still decides (and still refuses non-eligible values)
    w.advance(1000);
    const h = await w.get(12345);
    assert.equal(h.decision, "not_eligible"); sawHeld ||= h.state === "held";
    w.advance(STEP);
  }
  assert.ok(sawFallback && sawHeld);
  const before = w.reads.length;
  const last = w.get(27010); await settle();
  if (w.reads.length > before) w.reads.at(-1).reject(new Error("still down"));
  assert.deepEqual(await last, { decision: "unknown", state: "failed" }, "copy over 6 h: no decision → 503");
  assert.equal(w.el.snapshot().readAt, copyAt, "failed reads never refreshed or extended the copy");
});

test("an unusable answer (wrong shape) counts as a failure, not as an empty list", async () => {
  const w = world();
  const a = w.get(27010); await settle(); w.reads[0].reject(new Error("big-number eligibility read: unusable answer"));
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

test("middleware: security blocks stay in force whatever the eligibility copy says (bad bot on an ELIGIBLE number, crawler on a private path)", async () => {
  const bad = await run({ path: "/number/27010", ua: BAD_BOT, big: async () => Response.json([27010]) });
  assert.equal(bad.res.status, 403);
  assert.equal(bad.bigCalls, 0);
  const priv = await run({ path: "/journey", ua: GOOGLEBOT, big: async () => Response.json([27010]) });
  assert.equal(priv.res.status, 403, "private/expensive path stays refused to crawlers");
  assert.equal(priv.bigCalls, 0);
});

// ── /research: the one crawler exception (goodbot by User-Agent, exact path, GET/HEAD, no query) ──
async function runMethod({ path, ua, method }) {
  const { default: middleware } = await import(`../middleware-core.js?i=${++instance}`);
  const orig = globalThis.fetch;
  globalThis.fetch = async (u) => (String(u).endsWith("/rpc/content_big_numbers") ? Response.json([]) : Response.json([]));
  try {
    const req = new Request(`https://sod1820.co.il${path}`, { method, headers: { "user-agent": ua, "x-vercel-ip-country": "US" } });
    return await middleware(req, { waitUntil: () => {} });
  } finally { globalThis.fetch = orig; }
}
const AI_BOT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)";

test("middleware: a goodbot (User-Agent class) reaches only the closed /research document with GET/HEAD and no query", async () => {
  for (const method of ["GET", "HEAD"]) {
    const res = await runMethod({ path: "/research", ua: GOOGLEBOT, method });
    assert.ok(!res || res.status !== 403, `${method} /research continues to the closed document`);
  }
  for (const [path, method, ua, why] of [
    ["/research?x=1", "GET", GOOGLEBOT, "any query"],
    ["/research/", "GET", GOOGLEBOT, "trailing slash is another path"],
    ["/research/abc", "GET", GOOGLEBOT, "sub-path"],
    ["/research", "POST", GOOGLEBOT, "other method"],
    ["/research", "GET", AI_BOT, "AI crawler"],
    ["/research", "GET", BAD_BOT, "bad bot"],
    ["/journey", "GET", GOOGLEBOT, "other private path"],
    ["/profile", "GET", GOOGLEBOT, "account path"],
  ]) {
    const res = await runMethod({ path, ua, method });
    assert.equal(res?.status, 403, why);
  }
});

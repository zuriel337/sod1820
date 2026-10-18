// F5 contract pins for the /post/:slug and legacy /:slug existence check in middleware-core.js.
// Zero network: global fetch is mocked. Every assertion here must hold for the current middleware AND for any
// candidate that removes the lookup wait from ordinary visitors; the one deliberate decision point is the
// "human document navigation to a missing slug" case, switched by F5_CANDIDATE=A (default = current behaviour).
// Run: node --test test/post-middleware-f5-contract.test.mjs   (MW_DIR=<dir> tests another copy of middleware-core.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const MW_DIR = process.env.MW_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATE_A = process.env.F5_CANDIDATE === "A";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const SLURP = "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)";
const NAV = { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", "accept-language": "he-IL", accept: "text/html" };

let seq = 0;
async function setup({ existing = ["exists-a"], countries = [], failure = null } = {}) {
  const calls = [];
  const realFetch = globalThis.fetch, realNow = Date.now;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    calls.push(u.replace(/^.*\/(rest|functions)\/v1\//, ""));
    if (u.includes("/rpc/public_post_slug_exists")) {
      if (failure === "500") return new Response("{}", { status: 500 });
      if (failure === "throw") throw new TypeError("network");
      if (failure === "slow") return new Promise((_, rej) => opts?.signal?.addEventListener("abort", () => rej(new DOMException("timeout", "TimeoutError"))));
      return new Response(JSON.stringify(existing.includes(JSON.parse(opts.body).p_slug)));
    }
    if (u.includes("edge_blocked_countries")) return new Response(JSON.stringify(countries));
    return new Response("null");
  };
  const mw = (await import(pathToFileURL(path.join(MW_DIR, "middleware-core.js")).href + "?t=" + seq++)).default;
  const slugCalls = () => calls.filter((c) => c.includes("public_post_slug_exists")).length;
  async function call(p, { ua = CHROME, method = "GET", nav = false, country = "IL", headers = {} } = {}) {
    const req = new Request("https://sod1820.co.il" + p, { method, redirect: "manual", headers: { "user-agent": ua, "x-vercel-ip-country": country, ...(nav ? NAV : {}), ...headers } });
    const res = await mw(req, { waitUntil: () => {} });
    return { res, next: res.headers.get("x-middleware-next") === "1" };
  }
  return { call, calls, slugCalls, advance: (ms) => { const base = realNow(); Date.now = () => base + ms; }, restore: () => { globalThis.fetch = realFetch; Date.now = realNow; } };
}
const run = async (opts, fn) => { const s = await setup(opts); try { await fn(s); } finally { s.restore(); } };

for (const method of ["GET", "HEAD"]) {
  test(`${method}: search bot gets a real 404 + noindex for a missing /post/:slug, and passes for an existing one`, () => run({}, async (s) => {
    const miss = await s.call("/post/missing-a", { ua: GOOGLEBOT, method });
    assert.equal(miss.res.status, 404);
    assert.match(miss.res.headers.get("x-robots-tag"), /noindex/);
    assert.equal(miss.res.headers.get("x-sod-route"), "not-found");
    const hit = await s.call("/post/exists-a", { ua: GOOGLEBOT, method });
    assert.equal(hit.next, true);
  }));

  test(`${method}: legacy /:slug -> 308 to /post/:slug for existing, 404 for missing (browser and goodbot)`, () => run({}, async (s) => {
    for (const ua of [CHROME, GOOGLEBOT]) {
      const ok = await s.call("/exists-a", { ua, method, nav: ua === CHROME });
      assert.equal(ok.res.status, 308);
      assert.equal(ok.res.headers.get("location"), "https://sod1820.co.il/post/exists-a");
      const gone = await s.call("/missing-a", { ua, method, nav: ua === CHROME });
      assert.equal(gone.res.status, 404);
    }
  }));
}

test("unlisted search engine (classified 'browser', no Sec-Fetch metadata) keeps the real 404", () => run({}, async (s) => {
  const r = await s.call("/post/missing-a", { ua: SLURP });
  assert.equal(r.res.status, 404);
}));

test("fail-open: Supabase 500 / network error never turns into a 404", async () => {
  for (const failure of ["500", "throw"]) {
    await run({ failure }, async (s) => {
      for (const p of ["/post/missing-a", "/missing-a"]) assert.equal((await s.call(p, { ua: GOOGLEBOT })).next, true, `${failure} ${p} must fail open`);
    });
  }
});

test("HANG: a Supabase that never answers (current: holds the document with no bound; candidate A: fail-open after the timeout)", () => run({ failure: "slow" }, async (s) => {
  const deadline = new Promise((r) => setTimeout(() => r("STILL_WAITING"), 3000));
  for (const p of ["/post/missing-a", "/missing-a"]) {
    const r = await Promise.race([s.call(p, { ua: GOOGLEBOT }), deadline]);
    if (CANDIDATE_A) assert.equal(r.next, true, `${p} must fail open once the lookup budget is spent`);
    else assert.equal(r, "STILL_WAITING", "current code has no lookup timeout (documented gap)");
    if (!CANDIDATE_A) break; // the deadline is already spent
  }
}), { timeout: 15000 });

test("failure is not cached as an answer: the next request asks again", () => run({ failure: "500" }, async (s) => {
  await s.call("/post/missing-a", { ua: GOOGLEBOT });
  await s.call("/post/missing-a", { ua: GOOGLEBOT });
  assert.equal(s.slugCalls(), 2);
}));

test("new post / deleted post are bounded by the 10 minute in-isolate cache", () => run({ existing: [] }, async (s) => {
  assert.equal((await s.call("/post/new-a", { ua: GOOGLEBOT })).res.status, 404);
  s.calls.length = 0;
  assert.equal((await s.call("/post/new-a", { ua: GOOGLEBOT })).res.status, 404);
  assert.equal(s.slugCalls(), 0, "second request is served from cache");
  s.advance(10 * 60 * 1000 + 1000);
  s.calls.length = 0;
  await s.call("/post/new-a", { ua: GOOGLEBOT });
  assert.equal(s.slugCalls(), 1, "after the TTL the slug is looked up again (a newly published post becomes visible)");
}));

test("security/country gates run before any existence lookup (no RPC for gated requests)", async () => {
  await run({}, async (s) => { const r = await s.call("/post/exists-a", { ua: "python-requests/2.31.0" }); assert.equal(r.res.status, 403); assert.equal(s.slugCalls(), 0); });
  await run({}, async (s) => { const r = await s.call("/post/exists-a", { ua: CHROME, nav: true, country: "CN" }); assert.equal(r.next, true); });
  await run({ countries: [{ code: "CN", mode: "blocked", strict_level: 1 }] }, async (s) => { const r = await s.call("/post/missing-a", { ua: CHROME, nav: true, country: "CN" }); assert.equal(r.res.status, 403); assert.equal(s.slugCalls(), 0); });
  await run({ countries: [{ code: "SG", mode: "strict", strict_level: 2 }] }, async (s) => { const r = await s.call("/post/missing-a", { ua: CHROME, nav: true, country: "SG" }); assert.equal(r.res.status, 200); assert.equal(r.res.headers.get("x-sod-edge-policy"), "strict-l2"); assert.equal(s.slugCalls(), 0); });
  await run({ countries: [{ code: "SG", mode: "quarantine", strict_level: 3 }] }, async (s) => { const r = await s.call("/post/missing-a", { ua: CHROME, nav: true, country: "SG" }); assert.equal(r.res.status, 200); assert.equal(r.res.headers.get("x-sod-edge-policy"), "quarantine"); assert.equal(s.slugCalls(), 0); });
  await run({ countries: [{ code: "CN", mode: "blocked", strict_level: 1 }] }, async (s) => { const r = await s.call("/post/missing-a", { ua: GOOGLEBOT, country: "CN" }); assert.equal(r.res.status, 404, "goodbot passes a country block, then gets the real 404"); });
});

test("DECISION POINT: human document navigation to a missing /post/:slug", () => run({}, async (s) => {
  const r = await s.call("/post/missing-a", { ua: CHROME, nav: true });
  if (CANDIDATE_A) {
    assert.equal(r.next, true, "candidate A: no wait, SPA renders the noindex Not Found page (HTTP 200)");
    assert.equal(s.slugCalls(), 0);
  } else {
    assert.equal(r.res.status, 404, "current: real 404 for browsers too");
    assert.equal(s.slugCalls(), 1);
  }
}));

test("existing post for a human navigation passes either way (current: after one lookup; candidate A: with none)", () => run({}, async (s) => {
  const r = await s.call("/post/exists-a", { ua: CHROME, nav: true });
  assert.equal(r.next, true);
  assert.equal(s.slugCalls(), CANDIDATE_A ? 0 : 1);
}));

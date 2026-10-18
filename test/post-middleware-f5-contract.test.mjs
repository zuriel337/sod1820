// F5 Candidate A contract pins for the /post/:slug and legacy /:slug existence check in middleware-core.js.
// Zero network: global fetch is mocked. The only request that skips public_post_slug_exists is a human GET document
// navigation (kind=browser + Sec-Fetch-Mode: navigate + Sec-Fetch-Dest: document) to /post/:slug.
// Run: node --test test/post-middleware-f5-contract.test.mjs   (MW_DIR=<dir> tests another copy of middleware-core.js)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const MW_DIR = process.env.MW_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const BINGBOT = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
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

test("HANG: a Supabase that never answers is cut at 800ms and fails open (crawler and legacy paths)", () => run({ failure: "slow" }, async (s) => {
  const keepAlive = setInterval(() => {}, 50); // AbortSignal.timeout timers are unref'd in Node; keep the test loop alive
  try { for (const p of ["/post/missing-a", "/missing-a"]) {
    const t0 = performance.now();
    const r = await s.call(p, { ua: GOOGLEBOT });
    const ms = performance.now() - t0;
    assert.equal(r.next, true, `${p} must fail open once the lookup budget is spent`);
    assert.ok(ms >= 700 && ms < 1100, `${p} released after ${ms.toFixed(0)}ms, expected ~800ms`);
  } } finally { clearInterval(keepAlive); }
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

test("human GET document navigation: existing post, cold cache, does not call the existence RPC", () => run({}, async (s) => {
  const r = await s.call("/post/exists-a", { ua: CHROME, nav: true });
  assert.equal(r.next, true);
  assert.equal(s.slugCalls(), 0);
}));

test("human GET document navigation: missing post is not looked up and reaches the SPA (200 + client noindex Not Found)", () => run({}, async (s) => {
  const r = await s.call("/post/missing-a", { ua: CHROME, nav: true });
  assert.equal(r.next, true);
  assert.equal(s.slugCalls(), 0);
}));

test("human GET navigation with a slow/failing Supabase is not held at all", () => run({ failure: "slow" }, async (s) => {
  const t0 = performance.now();
  const r = await s.call("/post/missing-a", { ua: CHROME, nav: true });
  assert.equal(r.next, true);
  assert.ok(performance.now() - t0 < 100);
}));

test("only the exact pair navigate+document skips the lookup", () => run({}, async (s) => {
  for (const h of [{ "sec-fetch-mode": "navigate" }, { "sec-fetch-dest": "document" }, { "sec-fetch-mode": "cors", "sec-fetch-dest": "empty" }, { "sec-fetch-mode": "navigate", "sec-fetch-dest": "iframe" }]) {
    const r = await s.call("/post/missing-a", { ua: CHROME, headers: h });
    assert.equal(r.res.status, 404, JSON.stringify(h));
  }
}));

test("real 404 for Googlebot, Bingbot, Slurp and HEAD (even HEAD with Sec-Fetch navigation headers) on a missing post", () => run({}, async (s) => {
  let n = 0;
  for (const [ua, extra] of [[GOOGLEBOT, {}], [BINGBOT, {}], [SLURP, {}], [GOOGLEBOT, { nav: true }], [CHROME, { nav: true, method: "HEAD" }], [CHROME, { method: "HEAD" }]]) {
    s.calls.length = 0;
    const r = await s.call("/post/missing-b" + n++, { ua, ...extra }); // unique slug: a cache hit would hide the lookup
    assert.equal(r.res.status, 404, `${ua.slice(0, 30)} ${JSON.stringify(extra)}`);
    assert.equal(s.slugCalls(), 1);
    assert.match(r.res.headers.get("x-robots-tag"), /noindex/);
  }
}));

test("HEAD navigation to an existing post still performs the lookup and passes", () => run({}, async (s) => {
  const r = await s.call("/post/exists-a", { ua: CHROME, nav: true, method: "HEAD" });
  assert.equal(r.next, true);
  assert.equal(s.slugCalls(), 1);
}));

test("legacy /:slug is unchanged for human GET navigation: 308 or 404 after a lookup", () => run({}, async (s) => {
  const ok = await s.call("/exists-a", { ua: CHROME, nav: true });
  assert.equal(ok.res.status, 308);
  assert.equal(s.slugCalls(), 1);
  const gone = await s.call("/missing-a", { ua: CHROME, nav: true });
  assert.equal(gone.res.status, 404);
  assert.equal(s.slugCalls(), 2);
}));

test("the SPA owns the human 'not found' answer: noindex + not-found copy for a missing post", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(path.join(MW_DIR, "src/pages/Post2029Page.jsx"), "utf8");
  assert.match(src, /title: "הפוסט לא נמצא"[\s\S]{0,160}noindex: true/);
});

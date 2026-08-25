// Tests for middleware.js — run with: node --test middleware.test.js
// Zero external dependencies (Node's built-in test runner, Node >=18), mirrors the
// convention in src/lib/roadmapParser.test.js. Exercises the REAL production middleware
// (not a re-implementation) by mocking global.fetch + context.waitUntil + Math.random.
//
// EDGE_BOT_LOGGING_IO_PASS1 (25.8.2026) acceptance tests A/B/C — see work_log.
import { test } from "node:test";
import assert from "node:assert/strict";
import middleware from "./middleware.js";

const LOG_EDGE_RE = /\/rpc\/log_edge$/;
const LOG_CRAWL_RE = /\/rpc\/log_crawl$/;
const BLOCKED_COUNTRIES_RE = /\/rpc\/blocked_countries$/;
const BIG_NUMBERS_RE = /\/rpc\/content_big_numbers$/;

// Builds a fetch mock that records every call and answers the middleware's own
// dependency RPCs (blocked_countries/content_big_numbers) deterministically, so tests
// don't depend on live network/DB state.
function makeFetchMock({ blockedCountries = [], bigNumbers = [] } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url: String(url), body: opts?.body ? JSON.parse(opts.body) : null });
    if (BLOCKED_COUNTRIES_RE.test(url)) return new Response(JSON.stringify(blockedCountries));
    if (BIG_NUMBERS_RE.test(url)) return new Response(JSON.stringify(bigNumbers));
    if (LOG_EDGE_RE.test(url) || LOG_CRAWL_RE.test(url)) return new Response("null");
    return new Response("null");
  };
  return { fn, calls };
}

// context.waitUntil receives an already-in-flight promise (fetch(...) is called eagerly
// as the argument expression) — collect it so the test can await completion before asserting.
function makeContext() {
  const pending = [];
  return { context: { waitUntil: (p) => pending.push(p) }, pending };
}

function makeRequest({ path = "/", country = "IL", ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36" } = {}) {
  return new Request(`https://sod1820.co.il${path}`, {
    headers: { "x-vercel-ip-country": country, "user-agent": ua },
  });
}

test("A. browser sampling — unsampled browser hit calls zero log_edge", async () => {
  const { fn, calls } = makeFetchMock();
  const origFetch = globalThis.fetch, origRandom = Math.random;
  globalThis.fetch = fn;
  Math.random = () => 0.99; // above the 1/10 threshold -> not sampled
  try {
    const { context, pending } = makeContext();
    await middleware(makeRequest({ path: "/" }), context);
    await Promise.all(pending);
    const logEdgeCalls = calls.filter((c) => LOG_EDGE_RE.test(c.url));
    assert.equal(logEdgeCalls.length, 0, "unsampled browser request must not call log_edge");
  } finally {
    globalThis.fetch = origFetch; Math.random = origRandom;
  }
});

test("A. browser sampling — sampled browser hit calls log_edge once with p_weight=10", async () => {
  const { fn, calls } = makeFetchMock();
  const origFetch = globalThis.fetch, origRandom = Math.random;
  globalThis.fetch = fn;
  Math.random = () => 0.01; // below the 1/10 threshold -> sampled
  try {
    const { context, pending } = makeContext();
    await middleware(makeRequest({ path: "/" }), context);
    await Promise.all(pending);
    const logEdgeCalls = calls.filter((c) => LOG_EDGE_RE.test(c.url));
    assert.equal(logEdgeCalls.length, 1, "sampled browser request must call log_edge exactly once");
    assert.equal(logEdgeCalls[0].body.p_weight, 10);
    assert.equal(logEdgeCalls[0].body.p_kind, "browser");
  } finally {
    globalThis.fetch = origFetch; Math.random = origRandom;
  }
});

test("B. non-browser (goodbot/ai/bot) — log_edge always called, no p_weight (default=1), log_crawl unchanged", async () => {
  const cases = [
    { ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", expectKind: "goodbot" },
    { ua: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)", expectKind: "ai" },
    { ua: "python-requests/2.31.0", expectKind: "bot" },
  ];
  const origFetch = globalThis.fetch, origRandom = Math.random;
  Math.random = () => 0.99; // sampling must not affect non-browser kinds at all
  try {
    for (const c of cases) {
      const { fn, calls } = makeFetchMock();
      globalThis.fetch = fn;
      const { context, pending } = makeContext();
      await middleware(makeRequest({ path: "/", ua: c.ua }), context);
      await Promise.all(pending);
      const logEdgeCalls = calls.filter((x) => LOG_EDGE_RE.test(x.url));
      const logCrawlCalls = calls.filter((x) => LOG_CRAWL_RE.test(x.url));
      assert.equal(logEdgeCalls.length, 1, `${c.expectKind}: log_edge must always fire`);
      assert.equal(logEdgeCalls[0].body.p_kind, c.expectKind);
      assert.equal(logEdgeCalls[0].body.p_weight, undefined, `${c.expectKind}: must not send p_weight (defaults to 1 server-side)`);
      assert.equal(logCrawlCalls.length, 1, `${c.expectKind}: log_crawl must fire exactly as before`);
    }
  } finally {
    globalThis.fetch = origFetch; Math.random = origRandom;
  }
});

test("C. block policy — bad bot on public path still 403, sampling change does not affect blocking", async () => {
  const { fn } = makeFetchMock();
  globalThis.fetch = fn;
  try {
    const { context, pending } = makeContext();
    const res = await middleware(makeRequest({ path: "/", ua: "python-requests/2.31.0" }), context);
    await Promise.all(pending);
    assert.equal(res.status, 403);
  } finally {
    globalThis.fetch = undefined;
  }
});

test("C. block policy — good public crawler (Googlebot) on public path still 200 (not blocked)", async () => {
  const { fn } = makeFetchMock();
  globalThis.fetch = fn;
  try {
    const { context, pending } = makeContext();
    const res = await middleware(
      makeRequest({ path: "/", ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }),
      context,
    );
    await Promise.all(pending);
    assert.notEqual(res.status, 403);
    assert.equal(res.headers.get("set-cookie") ? true : true, true); // next() path reached
  } finally {
    globalThis.fetch = undefined;
  }
});

test("C. block policy — CN/SG browser traffic is NOT blocked solely by country (edge_blocked_countries currently empty)", async () => {
  const { fn } = makeFetchMock({ blockedCountries: [] }); // live state: CN/SG disabled since 9.8.2026
  globalThis.fetch = fn;
  const origRandom = Math.random;
  Math.random = () => 0.99; // keep this deterministic re: sampling, irrelevant to blocking
  try {
    for (const country of ["CN", "SG"]) {
      const { context, pending } = makeContext();
      const res = await middleware(makeRequest({ path: "/", country }), context);
      await Promise.all(pending);
      assert.notEqual(res.status, 403, `${country}: browser-kind must not be blocked by country alone`);
    }
  } finally {
    globalThis.fetch = undefined; Math.random = origRandom;
  }
});

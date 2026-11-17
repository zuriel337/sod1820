// What a Post address answers, end to end, after the edge stopped asking the database for browsers (16.11.2026, middleware-core.js
// edgePostLookupRequired): the real edge middleware and the real public document handler run in sequence, for a browser and for Google,
// over one synthetic database that behaves like the live one (read 16.11.2026):
//  - RLS posts_anon_read hides rows tagged טיוטה from the anonymous key, and public_post_slug_exists runs as the caller, so for a draft the
//    edge lookup itself says "no such post";
//  - rows tagged פורום stay readable to the anonymous key: the edge lookup says "exists", and only the document handler hides them
//    (hasSuppressedPublicPostTag in api/og.js).
// The crawler path still runs the edge lookup, exactly as every request did before the change, so it is the "before" column: for every
// case the browser's final status must equal the crawler's, and nothing of a hidden post may reach either response.
// Needs the generated protected-review receipt: run `node scripts/build-public-reading-production.mjs` first (CI does, in the same step).
import test from "node:test";
import assert from "node:assert/strict";
import publicMiddleware from "../public-reading-deploy/middleware.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";

const SITE = "https://sod1820.co.il";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const AGENTS = {
  browser: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
  crawler: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};
const SHELL = '<html><head><title>static</title><meta name="robots" content="index, follow"/></head><body><div id="root">existing shell</div></body></html>';
const HIDDEN_MARKS = ["HIDDEN-TITLE", "HIDDEN-EXCERPT", "HIDDEN-BODY", "hidden-cover.webp"];

// Each case gets its own addresses: the edge keeps an answer per address for ten minutes inside one process.
let serial = 0;
function database(kind) {
  const n = ++serial;
  const hidden = { title: "HIDDEN-TITLE", excerpt: "HIDDEN-EXCERPT", content: "<p>HIDDEN-BODY</p>", image_url: `${API}/storage/v1/object/public/media/hidden-cover.webp` };
  const rows = [
    { id: 10 + n, wp_id: 1000 + n, slug: `old-post-${n}`, source: "wordpress", title: "פוסט ותיק", excerpt: "תקציר ציבורי", content: "<p>גוף</p>", image_url: null, tags: [], categories: [], date: "2020-01-01" },
    { id: 20 + n, wp_id: 360000 + n, slug: `new-post-${n}`, source: "sod1820", title: "פוסט חדש", excerpt: "תקציר", content: "<p>גוף</p>", image_url: null, tags: [], categories: [], date: "2026-01-01" },
    { id: 30 + n, wp_id: 2000 + n, slug: `%d7%a9%d7%9c%d7%95%d7%9d-${n}`, source: "wordpress", title: "שלום", excerpt: "", content: "<p>גוף</p>", image_url: null, tags: [], categories: [], date: "2019-01-01" },
    { id: 40 + n, wp_id: 3000 + n, slug: `draft-old-${n}`, source: "wordpress", ...hidden, tags: ["טיוטה"], categories: [], date: "2021-01-01" },
    { id: 50 + n, wp_id: 4000 + n, slug: `forum-old-${n}`, source: "wordpress", ...hidden, tags: ["פורום"], categories: [], date: "2021-01-01" },
    { id: 60 + n, wp_id: 370000 + n, slug: `forum-new-${n}`, source: "sod1820", ...hidden, tags: ["פורום"], categories: [], date: "2026-02-01" },
  ];
  const anonVisible = rows.filter(row => !row.tags.includes("טיוטה"));   // RLS posts_anon_read
  return { n, rows, anonVisible, kind };
}

// One fetch for the whole request: the edge's own reads, the slug lookup, and the document handler's post read.
function supabaseFetch(db, { outage = false, lookup = "answer" } = {}) {
  const calls = [];
  const fetcher = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    calls.push(url.pathname + (url.pathname === "/rest/v1/posts" ? "?" + url.search.slice(1) : ""));
    if (url.origin !== API) throw new Error("unexpected origin " + url.origin);
    if (url.pathname === "/rest/v1/edge_blocked_countries") return Response.json([]);
    if (["/rest/v1/rpc/log_edge", "/rest/v1/rpc/log_crawl"].includes(url.pathname)) return new Response(null, { status: 204 });
    if (url.pathname === "/rest/v1/rpc/content_big_numbers") return Response.json([]);
    if (url.pathname === "/rest/v1/rpc/public_post_slug_exists") {
      if (lookup === "hang") return new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal.reason)));
      if (outage || lookup === "fail") return new Response('{"message":"synthetic outage"}', { status: 503 });
      const { p_slug, p_encoded_slug } = JSON.parse(init.body);
      return Response.json(db.anonVisible.some(row => row.slug === p_slug || row.slug === p_encoded_slug));
    }
    if (url.pathname === "/rest/v1/posts") {
      if (outage) throw new TypeError("fetch failed (synthetic outage)");
      const slug = url.searchParams.get("slug"), wp = url.searchParams.get("wp_id");
      const wanted = slug?.startsWith("in.(") ? slug.slice(4, -1).split(",").map(v => v.replace(/^"|"$/g, "")) : slug?.startsWith("eq.") ? [slug.slice(3)] : [];
      const found = db.anonVisible.filter(row => wanted.includes(row.slug) || (wp?.startsWith("eq.") && String(row.wp_id) === wp.slice(3)));
      return Response.json(found.slice(0, Number(url.searchParams.get("limit") || 1)));
    }
    if (url.pathname.startsWith("/rest/v1/")) return outage ? new Response("{}", { status: 503 }) : Response.json([]);
    throw new Error("unexpected synthetic dependency " + url.pathname);
  };
  return { fetcher, calls };
}

function nodeResponse() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), String(v)); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; } };
}

// The platform runs the edge first; when it lets the request through (x-middleware-next), the document function answers.
async function visit(path, agent, fetchSetup, method = "GET") {
  const original = globalThis.fetch; globalThis.fetch = fetchSetup.fetcher;
  const keepAlive = setInterval(() => {}, 50);   // Node does not hold the loop open for AbortSignal.timeout's timer; the edge runtime does
  try {
    const pending = [];
    const edge = await publicMiddleware(new Request(SITE + path, { method, headers: { "user-agent": agent, "x-vercel-ip-country": "IL" } }), { waitUntil: p => pending.push(p) });
    await Promise.all(pending);
    // A rewrite (the Post document freshness gate, 17.11.2026) also reaches the document function: at the rewritten address, with the
    // request headers the edge overrode (x-middleware-override-headers / x-middleware-request-*), exactly as the platform forwards them.
    const rewrite = edge.headers.get("x-middleware-rewrite");
    if (edge.headers.get("x-middleware-next") !== "1" && !rewrite) return { by: "edge", status: edge.status, robots: edge.headers.get("x-robots-tag") || "", body: await edge.text(), headers: edge.headers };
    const url = rewrite ? new URL(rewrite) : new URL(path, SITE);
    if (url.origin !== SITE || url.pathname !== new URL(path, SITE).pathname) throw new Error("the edge rewrote a document to another address: " + url.href);
    const overridden = {};
    for (const name of (edge.headers.get("x-middleware-override-headers") || "").split(",").filter(Boolean)) {
      const value = edge.headers.get("x-middleware-request-" + name); if (value !== null) overridden[name] = value;
    }
    const res = nodeResponse();
    await publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => SHELL })({
      method, headers: { host: "sod1820.co.il", "user-agent": agent, ...overridden }, url: url.pathname + url.search,
      query: { ...Object.fromEntries(url.searchParams), path: url.pathname } }, res);
    return { by: "document", status: res.code, robots: res.headers.get("x-robots-tag") || "", body: res.body, headers: res.headers };
  } finally { clearInterval(keepAlive); globalThis.fetch = original; }
}

const lookups = calls => calls.filter(path => path === "/rest/v1/rpc/public_post_slug_exists").length;
function assertNothingHidden(result, label) {
  for (const mark of HIDDEN_MARKS) assert.ok(!result.body.includes(mark), `${label}: "${mark}" must not reach the response`);
}

const CASES = [
  // [label, path builder, expected status, hidden?]
  ["public old address", db => `/old-post-${db.n}`, 200, false],
  ["public old address, Hebrew percent-encoded", db => `/%D7%A9%D7%9C%D7%95%D7%9D-${db.n}`, 200, false],
  ["public /post/ address", db => `/post/new-post-${db.n}`, 200, false],
  ["missing old address", db => `/no-such-post-${db.n}`, 404, false],
  ["missing /post/ address", db => `/post/no-such-post-${db.n}`, 404, false],
  ["draft (hidden by RLS) at its old address", db => `/draft-old-${db.n}`, 404, true],
  ["forum post (readable, suppressed) at its old address", db => `/forum-old-${db.n}`, 404, true],
  ["forum post (readable, suppressed) at /post/", db => `/post/forum-new-${db.n}`, 404, true],
];

for (const [label, pathOf, expected, hidden] of CASES) {
  test(`${label}: browser and Google end with ${expected}; the browser asks the database once, at the document`, async () => {
    const results = {};
    for (const [who, agent] of Object.entries(AGENTS)) {
      const db = database(label);
      const setup = supabaseFetch(db);
      const result = await visit(pathOf(db), agent, setup);
      results[who] = { ...result, lookups: lookups(setup.calls), postReads: setup.calls.filter(p => p.startsWith("/rest/v1/posts?")).length };
      assert.equal(result.status, expected, `${who} ${label}: ${result.by} answered ${result.status}`);
      if (expected === 200) assert.match(result.robots, /^index/, `${who} ${label}: indexable`);
      else assert.match(result.robots, /noindex/, `${who} ${label}: never indexable`);
      if (hidden) assertNothingHidden(result, `${who} ${label}`);
    }
    assert.equal(results.browser.lookups, 0, "the browser's document no longer waits for the edge lookup");
    assert.equal(results.browser.by, "document", "the document handler answers the browser");
    assert.ok(results.browser.postReads >= 1, "the document handler read the post itself");
    assert.equal(results.crawler.lookups, 1, "Google still gets the edge lookup (the behaviour before the change)");
    assert.equal(results.browser.status, results.crawler.status, "same final status as before the change");
  });
}

test("draft: the edge already said 'no such post' to Google before the change; forum: only the document handler hides it, for both", async () => {
  const draftDb = database("draft-edge"), forumDb = database("forum-edge");
  const draft = await visit(`/draft-old-${draftDb.n}`, AGENTS.crawler, supabaseFetch(draftDb));
  assert.equal(draft.by, "edge"); assert.equal(draft.status, 404);
  const forum = await visit(`/forum-old-${forumDb.n}`, AGENTS.crawler, supabaseFetch(forumDb));
  assert.equal(forum.by, "document", "the edge lookup lets a readable forum row through: the hiding never depended on it");
  assert.equal(forum.status, 404); assertNothingHidden(forum, "forum via crawler");
});

test("source unavailable: 503 + Retry-After for the browser and for Google, never a 200 shell or a 404", async () => {
  for (const [who, agent] of Object.entries(AGENTS)) for (const path of [n => `/old-post-${n}`, n => `/post/new-post-${n}`, n => `/forum-old-${n}`]) {
    const db = database("outage");
    const result = await visit(path(db.n), agent, supabaseFetch(db, { outage: true }));
    assert.equal(result.by, "document", `${who}: the edge fails open on an unavailable lookup`);
    assert.equal(result.status, 503, `${who} ${path(db.n)}`);
    assert.equal(result.headers.get("retry-after"), "60");
    assert.match(result.robots, /noindex/);
    assertNothingHidden(result, `${who} outage`);
  }
});

test("Google, lookup unavailable or unanswered: the edge fails open within its bound and the document handler still gives 200 / 404", async () => {
  for (const lookup of ["fail", "hang"]) for (const [path, expected, hidden] of [[n => `/old-post-${n}`, 200, false], [n => `/no-such-post-${n}`, 404, false], [n => `/draft-old-${n}`, 404, true], [n => `/forum-old-${n}`, 404, true]]) {
    const db = database("lookup-" + lookup);
    const started = Date.now();
    const result = await visit(path(db.n), AGENTS.crawler, supabaseFetch(db, { lookup }));
    assert.equal(result.by, "document", `${lookup}: fail-open`);
    assert.equal(result.status, expected, `${lookup} ${path(db.n)}`);
    if (hidden) assertNothingHidden(result, `lookup ${lookup}`);
    assert.ok(Date.now() - started < 2500, `bounded (${Date.now() - started} ms)`);
  }
});

test("HEAD follows GET: same status for the browser, no body", async () => {
  for (const [path, expected] of [[n => `/old-post-${n}`, 200], [n => `/no-such-post-${n}`, 404], [n => `/forum-old-${n}`, 404]]) {
    const db = database("head");
    const result = await visit(path(db.n), AGENTS.browser, supabaseFetch(db), "HEAD");
    assert.equal(result.status, expected); assert.equal(result.body, "");
  }
});

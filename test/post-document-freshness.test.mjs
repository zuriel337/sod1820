import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createPostDocumentGate, postDocumentKeysForPath, postDocumentGateCandidate, postDocumentBypassUrl, previewTestList,
  validPostDocumentList, POST_DOCUMENT_FRESHNESS } from "../post-document-freshness.js";
import middleware from "../middleware-core.js";
import { postDocumentCacheHandler, validPurgeTags } from "../public-reading-deploy/api/post-document-cache.js";
import { publicReadingDocumentHandler, postDocumentCdnCacheable, POST_DOCUMENT_CDN_CACHE, POST_DOCUMENT_FRESH_PARAM } from "../public-reading-deploy/api/public-document.js";

// Post document freshness at the edge (ZURIEL 17.11.2026). A kept CDN copy of a Post is used only while the edge holds a list of recent changes
// read at most 5 s ago and the Post is not on it; otherwise the origin builds the document now and its answer is never kept.

const key = slug => createHash("sha256").update(slug, "utf8").digest("hex").slice(0, 16);
const clock = start => { let t = start; return { now: () => t, advance: ms => { t += ms; } }; };

test("address keys: every spelling of a Post's address meets the key the database stores", async () => {
  assert.ok((await postDocumentKeysForPath("/%D7%A2%D7%9C%D7%95%D7%9F-x")).includes(key("%d7%a2%d7%9c%d7%95%d7%9f-x")));
  assert.ok((await postDocumentKeysForPath("/עלון-x")).includes(key("עלון-x")));
  assert.ok((await postDocumentKeysForPath("/post/chosen-one/")).includes(key("chosen-one")));
  assert.ok(!(await postDocumentKeysForPath("/post/chosen-two")).includes(key("chosen-one")));
});

test("candidates: only GET/HEAD Post-shaped addresses without a query string", () => {
  assert.equal(postDocumentGateCandidate("GET", "https://sod1820.co.il/post/x"), true);
  assert.equal(postDocumentGateCandidate("HEAD", "https://sod1820.co.il/%D7%90"), true);
  assert.equal(postDocumentGateCandidate("GET", "https://sod1820.co.il/post/x?fbclid=1"), false);
  assert.equal(postDocumentGateCandidate("POST", "https://sod1820.co.il/post/x"), false);
  assert.equal(postDocumentGateCandidate("GET", "https://sod1820.co.il/gematria"), false, "a known app route is never a Post");
  assert.equal(postDocumentGateCandidate("GET", "https://sod1820.co.il/a/b"), false);
  assert.equal(postDocumentGateCandidate("GET", "https://sod1820.co.il/file.txt"), false);
  assert.equal(postDocumentBypassUrl("https://sod1820.co.il/post/x").href, `https://sod1820.co.il/post/x?${POST_DOCUMENT_FRESHNESS.bypassParam}=1`);
});

test("the gate: fail closed until a list is read, clean after, bypass for a listed Post, for a bulk change, and again after the lease", async () => {
  const c = clock(1_800_000_000_000);
  let list = { version: 1, keys: [key("changed-post")], all_until: null }, reads = 0, fail = false;
  const gate = createPostDocumentGate({ now: c.now, fetchList: async () => { reads++; if (fail) throw new Error("down"); return list; } });

  let d = await gate.decide("/post/quiet-post");
  assert.deepEqual([d.bypass, d.reason, d.refresh], [true, "stale", null], "no list, a lone request: the origin builds it and no read is made for it");
  c.advance(1000);
  d = await gate.decide("/post/quiet-post");
  assert.deepEqual([d.bypass, d.reason], [true, "stale"], "still no list: the origin builds it");
  assert.equal(typeof d.refresh, "function", "a second request within the lease is a burst: the list is read in the background");
  await d.refresh();
  assert.equal(reads, 1);

  d = await gate.decide("/post/quiet-post");
  assert.deepEqual([d.bypass, d.reason, d.refresh], [false, "clean", null], "fresh list, Post not on it: a kept copy may be used, no refresh");
  d = await gate.decide("/post/changed-post");
  assert.deepEqual([d.bypass, d.reason], [true, "changed"]);

  c.advance(POST_DOCUMENT_FRESHNESS.refreshAfterMs + 1);
  d = await gate.decide("/post/quiet-post");
  assert.equal(d.bypass, false); assert.equal(typeof d.refresh, "function", "older than 2 s: refreshed in the background, still usable");

  c.advance(POST_DOCUMENT_FRESHNESS.leaseMs);
  d = await gate.decide("/post/quiet-post");
  assert.deepEqual([d.bypass, d.reason], [true, "stale"], "older than the 5 s lease: no kept copy is used");

  fail = true; await d.refresh();
  d = await gate.decide("/post/quiet-post");
  assert.deepEqual([d.bypass, d.reason], [true, "stale"], "a failed read keeps the gate closed");

  fail = false; list = { version: 1, keys: [], all_until: new Date(c.now() + 60_000).toISOString() };
  await gate.refresh();
  d = await gate.decide("/post/quiet-post");
  assert.deepEqual([d.bypass, d.reason], [true, "all"], "a bulk change: every Post is built fresh until all_until");

  list = { version: 1, keys: ["not-a-key"], all_until: null };
  c.advance(POST_DOCUMENT_FRESHNESS.leaseMs + 1);
  await gate.refresh();
  assert.equal((await gate.decide("/post/quiet-post")).reason, "stale", "an invalid list is never trusted");
  assert.equal(validPostDocumentList({ version: 1, keys: [key("a")], all_until: null }), true);
});

test("no extra call unless the same Post is read again within the lease: quiet instances and crawlers reading many Posts are built fresh, exactly as without a CDN", async () => {
  const c = clock(1_800_000_000_000);
  let reads = 0;
  const gate = createPostDocumentGate({ now: c.now, fetchList: async () => { reads++; return { version: 1, keys: [], all_until: null }; } });
  for (let i = 0; i < 20; i++) {
    const d = await gate.decide("/post/quiet-post");
    assert.deepEqual([d.bypass, d.reason, d.refresh], [true, "stale", null]);
    c.advance(POST_DOCUMENT_FRESHNESS.leaseMs + 1);
  }
  for (let i = 0; i < 300; i++) {   // a crawler: a different Post every 200 ms
    const d = await gate.decide(`/post/crawled-${i}`);
    assert.deepEqual([d.bypass, d.reason, d.refresh], [true, "stale", null]);
    c.advance(200);
  }
  assert.equal(reads, 0, "no list read, no database call, no function call");
  // the same Post read again and again on this instance: one read, then a kept copy may be used while the reads keep coming
  let d = await gate.decide("/post/shared-post"); assert.equal(d.refresh, null);
  c.advance(500); d = await gate.decide("/post/shared-post"); assert.equal(typeof d.refresh, "function"); await d.refresh();
  for (let i = 0; i < 10; i++) { c.advance(400); d = await gate.decide("/post/shared-post"); assert.equal(d.reason, "clean"); if (d.refresh) await d.refresh(); }
  assert.ok(reads >= 1 && reads <= 3, `at most one read per ${POST_DOCUMENT_FRESHNESS.refreshAfterMs} ms during the burst (${reads})`);
});

test("the test list exists only on the protected Preview of the experiment branch", () => {
  const request = new Request("https://x.vercel.app/post/a", { headers: { [POST_DOCUMENT_FRESHNESS.testHeader]: JSON.stringify({ keys: [key("a")] }) } });
  assert.deepEqual(previewTestList(request, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "ccr-dcadb071-v1z5ol" }).keys, [key("a")]);
  assert.equal(previewTestList(request, { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "main" }), null);
  assert.equal(previewTestList(request, { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "another-branch" }), null);
});

function edge() {
  const calls = [], pending = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    if (String(url).endsWith("/rest/v1/rpc/" + POST_DOCUMENT_FRESHNESS.listRpc)) return new Response(JSON.stringify({ version: 1, keys: [key("changed-post")], all_until: null }));
    return new Response("null");
  };
  return { calls, pending, context: { waitUntil: p => pending.push(p) }, fetchImpl };
}
const browser = path => new Request(`https://sod1820.co.il${path}`, { headers: { "x-vercel-ip-country": "IL", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36" } });

test("the real middleware: rewrites to the reserved address with the never-keep header while the list is unknown or lists the Post", async () => {
  const e = edge();
  const original = globalThis.fetch; globalThis.fetch = e.fetchImpl;
  try {
    let res = await middleware(browser("/post/quiet-post"), e.context);
    const rewritten = res.headers.get("x-middleware-rewrite");
    assert.ok(rewritten && new URL(rewritten).searchParams.get("__sod_fresh") === "1", "first request: no list yet, built fresh");
    assert.equal(res.headers.get("x-middleware-request-x-sod-doc-fresh"), "1");
    assert.equal(res.headers.get("x-sod-doc-gate"), "stale");
    assert.match(res.headers.get("set-cookie") || "", /vb=browser/, "the existing cookies are kept");
    await Promise.all(e.pending);
    assert.ok(!e.calls.some(url => url.endsWith("/rpc/" + POST_DOCUMENT_FRESHNESS.listRpc)), "a lone request makes no list read");
    res = await middleware(browser("/post/quiet-post"), e.context);
    assert.equal(res.headers.get("x-sod-doc-gate"), "stale", "the second request of a burst is still built fresh");
    await Promise.all(e.pending);
    assert.ok(e.calls.includes("https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/" + POST_DOCUMENT_FRESHNESS.listRpc),
      "the burst reads the list in the background, directly from the database's public read");
    assert.ok(!e.calls.some(url => url.includes("/api/post-document-cache")), "never through a site function");

    res = await middleware(browser("/post/quiet-post"), e.context);
    assert.equal(res.headers.get("x-middleware-rewrite"), null, "list read, Post not on it: no rewrite");
    assert.equal(res.headers.get("x-middleware-next"), "1");
    assert.equal(res.headers.get("x-sod-doc-gate"), "clean");

    res = await middleware(browser("/post/changed-post"), e.context);
    assert.ok(new URL(res.headers.get("x-middleware-rewrite")).searchParams.has("__sod_fresh"), "a changed Post is built fresh");
    assert.equal(res.headers.get("x-sod-doc-gate"), "changed");

    res = await middleware(browser("/gematria"), e.context);
    assert.equal(res.headers.get("x-middleware-rewrite"), null); assert.equal(res.headers.get("x-sod-doc-gate"), null, "not a Post address: untouched");
    res = await middleware(browser("/post/quiet-post?fbclid=1"), e.context);
    assert.equal(res.headers.get("x-middleware-rewrite"), null, "a query string is never kept anyway: untouched");
  } finally { globalThis.fetch = original; }
});

function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; }, json(value) { this.body = JSON.stringify(value); return this; } };
}
const request = (method, { headers = {}, body = null } = {}) => ({ method, headers: { host: "sod1820.co.il", ...headers }, url: "/api/post-document-cache", query: {}, body });

test("the endpoint serves only the purge: no list, no GET", async () => {
  for (const method of ["GET", "HEAD", "PUT"]) {
    const res = response(); await postDocumentCacheHandler({ authorized: () => true, reviewOrigin: () => "https://x.vercel.app", purgeApi: () => ({ dangerouslyDeleteByTag: async () => {} }) })(request(method), res);
    assert.equal(res.code, 405); assert.equal(res.headers.get("allow"), "POST"); assert.equal(res.headers.get("cache-control"), "no-store");
  }
});

test("the endpoint: purge needs the key in production, valid tags, and the platform purge; every failure is explicit", async () => {
  const deleted = [];
  const api = { dangerouslyDeleteByTag: async tags => { deleted.push(tags); } };
  const prod = (extra = {}) => postDocumentCacheHandler({ authorized: () => true, reviewOrigin: () => null, env: { SOD_POST_DOCUMENT_PURGE_KEY: "k" }, purgeApi: () => api, ...extra });
  const post = (headers, body) => request("POST", { headers, body });
  const cases = [
    [postDocumentCacheHandler({ authorized: () => true, reviewOrigin: () => null, env: {}, purgeApi: () => api }), post({ "x-sod-purge-key": "k" }, { tags: ["post-document-1"] }), 503, "purge_not_configured"],
    [prod(), post({ "x-sod-purge-key": "wrong" }, { tags: ["post-document-1"] }), 401, "unauthorized"],
    [prod(), post({ "x-sod-purge-key": "k" }, { tags: ["anything"] }), 400, "invalid_tags"],
    [prod(), post({ "x-sod-purge-key": "k" }, { tags: Array.from({ length: 17 }, (_, i) => `post-document-${i}`) }), 400, "invalid_tags"],
    [prod({ purgeApi: () => null }), post({ "x-sod-purge-key": "k" }, { tags: ["post-document-1"] }), 503, "purge_unavailable"],
    [prod({ purgeApi: () => ({ dangerouslyDeleteByTag: async () => { throw new Error("x"); } }) }), post({ "x-sod-purge-key": "k" }, { tags: ["post-document-1"] }), 502, "purge_failed"],
  ];
  for (const [handler, req, code, error] of cases) {
    const res = response(); await handler(req, res);
    assert.equal(res.code, code, error); assert.equal(JSON.parse(res.body).error, error);
  }
  assert.equal(deleted.length, 0);
  let res = response(); await prod()(post({ "x-sod-purge-key": "k" }, JSON.stringify({ tags: ["post-document-7", "post-document"] })), res);
  assert.equal(res.code, 200); assert.deepEqual(deleted, [["post-document-7", "post-document"]]);
  res = response();
  await postDocumentCacheHandler({ authorized: () => true, reviewOrigin: () => "https://x.vercel.app", env: {}, purgeApi: () => api })(post({}, { tags: ["post-document-9"] }), res);
  assert.equal(res.code, 200, "the protected Preview (behind Vercel authentication) needs no key");
  assert.deepEqual(validPurgeTags({ tags: ["post-document-1", "post-document-1"] }), ["post-document-1"]);
});

test("the document function: the reserved marker is never kept and never reaches the address it reads; copies live at most 6 minutes", async () => {
  assert.equal(POST_DOCUMENT_CDN_CACHE.freshSeconds + POST_DOCUMENT_CDN_CACHE.staleSeconds, 360);
  const base = { method: "GET", status: 200, state: "public", originalDocument: true, search: "", post: { id: "7" }, articleFirst: "served" };
  assert.equal(postDocumentCdnCacheable(base), true);
  assert.equal(postDocumentCdnCacheable({ ...base, fresh: true }), false);
  assert.equal(postDocumentCdnCacheable({ ...base, path: "/post/a.b" }), false, "an address the edge does not see is never kept");

  const shell = '<html><head><title>s</title><meta name="robots" content="index, follow"/></head><body><div id="root"></div></body></html>';
  const seen = [];
  const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: () => true, readDocument: async () => shell,
    articleFirst: html => ({ html, state: "served" }),
    metadataHandler: async (req, res) => { seen.push({ search: req.publicReadingSearch, query: req.query }); req.publicReadingArticleSource({ id: 5 });
      res.status(200).send('<head><title>p</title><meta name="robots" content="index, follow"/></head>'); } });
  for (const req of [
    { method: "GET", headers: { host: "sod1820.co.il" }, url: `/post/a?${POST_DOCUMENT_FRESH_PARAM}=1`, query: {} },
    { method: "GET", headers: { host: "sod1820.co.il", "x-sod-doc-fresh": "1" }, url: "/post/a", query: {} },
    { method: "GET", headers: { host: "sod1820.co.il" }, url: "/post/a", query: { [POST_DOCUMENT_FRESH_PARAM]: "1" } },
  ]) {
    const res = response(); await handler(req, res);
    assert.equal(res.code, 200); assert.equal(res.headers.get("vercel-cdn-cache-control"), undefined, JSON.stringify(req));
    assert.equal(res.headers.get("x-robots-tag"), "index, follow", "robots unchanged");
  }
  assert.ok(seen.every(s => s.search === "" && !(POST_DOCUMENT_FRESH_PARAM in s.query)), "the marker never reaches the readers");
  const res = response(); await handler({ method: "GET", headers: { host: "sod1820.co.il" }, url: "/post/a", query: {} }, res);
  assert.equal(res.headers.get("vercel-cdn-cache-control"), "max-age=300, stale-while-revalidate=60");
});

test("the reserved marker is cut out of the query without touching any other byte", async () => {
  const { withoutFreshParam } = await import("../public-reading-deploy/api/public-document.js");
  assert.equal(withoutFreshParam("?part=2&part=7&encoded=%2f%2F+%20&path=%2Fkept"), "?part=2&part=7&encoded=%2f%2F+%20&path=%2Fkept");
  assert.equal(withoutFreshParam("?a=%2f&__sod_fresh=1&b=%20"), "?a=%2f&b=%20");
  assert.equal(withoutFreshParam("?__sod_fresh=1"), "");
  assert.equal(withoutFreshParam(""), "");
});

import test from "node:test";
import assert from "node:assert/strict";
import { publicReadingDocumentHandler, postDocumentCdnCacheable, POST_DOCUMENT_CDN_CACHE } from "../public-reading-deploy/api/public-document.js";

// POST_DOCUMENT_CDN_CACHE (ZURIEL 17.11.2026, experiment): only an admitted public Post document, 200, at its own address and with no
// query string, may be kept by the platform CDN, for a bounded time and tagged by Post. Browsers keep no-store. Every other answer
// (pages that are not Posts, 404, 503, closed areas, redirects, query strings, other methods) is exactly as before. The document is the
// same for every reader: nothing the reader sends (cookies, Authorization, language) changes a byte of it.
//
// Needs the generated build receipt (the handler imports it): run `node scripts/build-public-reading-production.mjs` first (CI does).

const SITE = "https://sod1820.co.il";
const shell = '<html><head><title>static</title><meta name="robots" content="index, follow"/></head><body><div id="root">existing shell</div></body></html>';
const head = '<head><title>synthetic</title><meta name="robots" content="index, follow"/></head>';
const POST = { id: "4242", slug: "post-slug", title: "כותרת", content: "<p>גוף</p>" };

function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; } };
}
const request = (url, { method = "GET", headers = {} } = {}) => ({ method, headers: { host: "sod1820.co.il", ...headers }, url, query: {} });

// The metadata owner is replaced by a stub that admits a Post for /post/* and Hebrew single-segment addresses (as the real owner does
// for a public, unsuppressed row) and answers other statuses on request. The article-first step is the identity, so the test measures
// the cache decision only.
function handler({ status = 200, admit = true, articleState = "served" } = {}) {
  return publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE,
    readDocument: async () => shell, articleFirst: (html, options) => ({ html, state: articleState }),
    metadataHandler: async (req, res) => {
      if (admit && /^\/(?:post\/[^/]+|%D7[^/]*)$/i.test(req.publicRequestedPath)) req.publicReadingArticleSource(POST);
      res.status(status).send(head);
    } });
}
async function run(h, req) { const res = response(); await h(req, res); return res; }
const cdn = res => res.headers.get("vercel-cdn-cache-control");

test("an admitted public Post is kept by the CDN for a bounded time, tagged by Post; the browser still gets no-store", async () => {
  for (const path of ["/post/post-slug", "/%D7%90%D7%91"]) {
    for (const method of ["GET", "HEAD"]) {
      const res = await run(handler(), request(path, { method }));
      assert.equal(res.code, 200, path);
      assert.equal(cdn(res), `max-age=${POST_DOCUMENT_CDN_CACHE.freshSeconds}, stale-while-revalidate=${POST_DOCUMENT_CDN_CACHE.staleSeconds}`);
      assert.equal(res.headers.get("vercel-cache-tag"), "post-document,post-document-4242");
      assert.equal(res.headers.get("x-sod-document-cache"), "post-cdn-v1");
      assert.equal(res.headers.get("cache-control"), "no-store", "browsers keep today's behaviour");
    }
  }
  assert.ok(POST_DOCUMENT_CDN_CACHE.freshSeconds <= 300 && POST_DOCUMENT_CDN_CACHE.staleSeconds <= 3600, "the refresh policy stays bounded");
});

test("everything that is not exactly an admitted public Post document keeps no-store and no CDN header", async () => {
  const cases = [
    ["not a Post (Home)", handler(), request("/")],
    ["not a Post (a page)", handler(), request("/gematria")],
    ["a query string", handler(), request("/post/post-slug?fbclid=abc")],
    ["a Post the owner did not admit (hidden, suppressed, unknown)", handler({ admit: false }), request("/post/post-slug")],
    ["a missing Post", handler({ status: 404, admit: false }), request("/post/missing")],
    ["a failed source", handler({ status: 503 }), request("/post/post-slug")],
    ["another method", handler(), request("/post/post-slug", { method: "POST" })],
    ["the direct function address", handler(), { method: "GET", headers: { host: "sod1820.co.il" }, url: "/api/public-document?path=%2Fpost%2Fpost-slug", query: { path: "/post/post-slug" } }],
    ["another host (redirected)", handler(), request("/post/post-slug", { headers: { host: "www.sod1820.co.il" } })],
    ["a cold instance still warming the article renderer (seen on the protected Preview, 17.11.2026)", handler({ articleState: "warming" }), request("/post/post-slug")],
    ["the article step failed", handler({ articleState: "failed" }), request("/post/post-slug")],
  ];
  for (const [label, h, req] of cases) {
    const res = await run(h, req);
    assert.equal(cdn(res), undefined, label);
    assert.equal(res.headers.get("vercel-cache-tag"), undefined, label);
    assert.equal(res.headers.get("cache-control"), "no-store", label);
  }
});

test("the kept document is the same for every reader: cookies, Authorization and language change nothing", async () => {
  const h = handler();
  const plain = await run(h, request("/post/post-slug"));
  const signedIn = await run(h, request("/post/post-slug", { headers: { cookie: "sb-access-token=secret; sod_edge_q_SG=1", authorization: "Bearer member-token",
    "accept-language": "en-US", "user-agent": "Mozilla/5.0 member" } }));
  assert.equal(signedIn.body, plain.body);
  assert.deepEqual([...signedIn.headers].sort(), [...plain.headers].sort());
  assert.doesNotMatch(plain.body, /secret|member-token/);
  assert.equal([...plain.headers.keys()].some(name => name === "set-cookie" || name === "vary"), false, "no per-reader header on a kept document");
});

test("the decision itself: exact inputs only", () => {
  const base = { method: "GET", status: 200, state: "public", originalDocument: true, search: "", post: { id: "7" }, articleFirst: "served" };
  assert.equal(postDocumentCdnCacheable(base), true);
  assert.equal(postDocumentCdnCacheable({ ...base, state: "post-lookup" }), true, "an imported Post at its original address");
  for (const change of [{ method: "PUT" }, { status: 404 }, { status: 503 }, { state: "closed" }, { state: "account" }, { state: "missing" }, { state: "admin-view" }, { state: "service-closed" }, { state: "continuation" },
    { temporarilyClosed: true }, { originalDocument: false }, { search: "a=1" }, { post: null }, { post: { id: "" } }, { post: { id: "a,b" } }, { articleFirst: "warming" }, { articleFirst: "failed" }, { articleFirst: undefined }])
    assert.equal(postDocumentCdnCacheable({ ...base, ...change }), false, JSON.stringify(change));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";

// Contract: a hashed build asset that this deployment does not carry (a tab holding the previous deployment's HTML asks for a chunk
// that is gone) is answered by the document function. Static files that exist are served before any rewrite, so whatever reaches the
// function under /assets/ with a file extension is a miss. It must be a tiny plain-text 404, not the ~11 KB 2029 not-found document
// (HTML is the wrong type for a script, style or font, and every miss would run the metadata reader and render the whole shell).
// Every other unknown address keeps the 2029 not-found document, unchanged.
//
// Needs the generated build receipt (the handler imports it): run `node scripts/build-public-reading-production.mjs` first (CI does).

const SITE = "https://sod1820.co.il", WWW = "https://www.sod1820.co.il";
const shell = '<html><head><title>static</title><meta name="robots" content="index, follow"/></head><body><div id="root">existing shell</div></body></html>';
const head = "<head><title>synthetic</title></head>";

function response() {
  return { headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; },
    json(value) { return this.send(JSON.stringify(value)); } };
}
// The platform rewrite hands the function the ORIGINAL url and no `path` query; the direct form carries `?path=`.
const rewritten = (path, { host = "sod1820.co.il", method = "GET" } = {}) => ({ method, headers: { host }, url: path, query: {} });
const direct = path => ({ method: "GET", headers: { host: "sod1820.co.il" },
  url: `/api/public-document?path=${encodeURIComponent(path)}`, query: { path } });

// Counts every piece of work the document pipeline would do, so "no document work" is measured, not assumed.
function harness({ metadataStatus = 200, ...overrides } = {}) {
  const calls = { shell: 0, metadata: 0, fetch: 0 };
  const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE,
    readDocument: async () => { calls.shell++; return shell; },
    metadataHandler: async (_req, res) => { calls.metadata++; res.status(metadataStatus).send(head); }, ...overrides });
  return { calls, handler };
}
async function withNoNetwork(calls, run) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { calls.fetch++; throw new Error("an asset miss must not read data"); };
  try { return await run(); } finally { globalThis.fetch = original; }
}

const MISSES = [
  "/assets/2029-BEWswQqD.js", "/assets/index-LCpneJ03.css", "/assets/ShareActions-Boqw4csj.css", "/assets/inter-latin-400-AbCdEf12.woff2",
  "/assets/supabase-CkiYJENm.js", "/assets/gematria-Dr35yLNh.js.map", "/assets/hero-9f3a1c.webp", "/assets/chunks/deep/route-X1y2Z3.mjs",
  "/assets/data.json", "/assets/%D7%A9%D7%9C%D7%95%D7%9D-abc123.js", "/assets/a.b.c.d.js", "/assets/.hidden",
];

test("a missing hashed asset is a tiny plain-text 404 with no cache and no index, for every extension and nesting", async () => {
  for (const path of MISSES) {
    const { calls, handler } = harness();
    for (const request of [rewritten(path), direct(path), rewritten(path + "?v=1"), rewritten(path, { method: "HEAD" })]) {
      const res = response(); await withNoNetwork(calls, () => handler(request, res));
      const label = `${request.method} ${request.url}`;
      assert.equal(res.code, 404, label);
      assert.equal(res.headers.get("content-type"), "text/plain; charset=utf-8", label);
      assert.equal(res.headers.get("cache-control"), "no-store", label);
      assert.match(res.headers.get("x-robots-tag"), /noindex/, label);
      assert.equal(res.headers.get("location"), undefined, label);
      assert.equal(res.headers.get("retry-after"), undefined, label);
      assert.ok(!/<[a-z!]/i.test(res.body), `${label}: body must not be markup`);
      assert.ok(res.body.length <= 64, `${label}: body must be tiny, was ${res.body.length} bytes`);
      if (request.method === "HEAD") assert.equal(res.body, "", label); else assert.ok(res.body.length > 0, label);
    }
    assert.deepEqual(calls, { shell: 0, metadata: 0, fetch: 0 }, `${path}: no document, metadata or data work for an asset miss`);
  }
});

test("an asset miss on the www host is answered in place, not redirected to the canonical host", async () => {
  const { calls, handler } = harness();
  const res = response(); await withNoNetwork(calls, () => handler(rewritten("/assets/2029-BEWswQqD.js", { host: "www.sod1820.co.il" }), res));
  assert.equal(res.code, 404); assert.equal(res.headers.get("location"), undefined);
  assert.equal(res.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.deepEqual(calls, { shell: 0, metadata: 0, fetch: 0 });
  // The same host still redirects an ordinary document address: only asset files take the shortcut.
  const doc = response(); await handler(rewritten("/post", { host: "www.sod1820.co.il" }), doc);
  assert.equal(doc.code, 308); assert.equal(doc.headers.get("location"), `${SITE}/post`);
});

test("the asset answer sits behind the activation, origin, method and path guards", async () => {
  const path = "/assets/2029-BEWswQqD.js";
  { const { calls, handler } = harness({ authorized: () => false });
    const res = response(); await handler(rewritten(path), res);
    assert.equal(res.code, 503); assert.equal(calls.metadata + calls.shell, 0); }
  { const { handler } = harness();
    const res = response(); await handler(rewritten(path, { host: "evil.example" }), res); assert.equal(res.code, 421);
    const post = response(); await handler(rewritten(path, { method: "POST" }), post);
    assert.equal(post.code, 405); assert.equal(post.headers.get("allow"), "GET, HEAD");
    for (const bad of ["/assets/%00x.js", "/assets/%0Ax.js", "/assets/%5Cx.js", "/assets/%E0%A4%A.js"]) {
      const res = response(); await handler(rewritten(bad), res); assert.equal(res.code, 400, bad);
    } }
});

test("every other unknown address keeps the 2029 not-found document, including asset-like names outside /assets/", async () => {
  const keepsDocument = [
    "/definitely-not-a-route", "/missing-post",
    "/assets", "/assets/", "/assets/no-extension", "/assets/dir.v1/no-extension", "/assets/x.js/", "/assets/trailing.",
    "/asset/x.js", "/Assets/x.js", "/not-assets/assets/x.js", "/x/assets/2029-BEWswQqD.js", "/assets-2029-BEWswQqD.js",
    "/missing-bundle.js", "/wp-content/uploads/2024/02/logo.jpg", "/favicon-old.png",
  ];
  for (const path of keepsDocument) {
    const { calls, handler } = harness({ metadataStatus: 404 });
    const res = response(); await handler(rewritten(path), res);
    assert.equal(res.code, 404, path);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8", path);
    assert.ok(res.body.includes("existing shell"), `${path}: still the 2029 document`);
    assert.match(res.headers.get("x-robots-tag"), /noindex/, path);
    assert.equal(res.headers.get("cache-control"), "no-store", path);
    assert.equal(calls.shell, 1, path); assert.equal(calls.metadata, 1, path);
  }
});

test("unknown routes with the real metadata reader and no data are the same 404 document as before the asset shortcut", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("[]", { headers: { "Content-Type": "application/json" } });
  try {
    const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => shell });
    for (const path of ["/definitely-not-a-route", "/wp-content/uploads/2024/02/logo.jpg", "/assets/no-extension", "/assets"]) {
      const res = response(); await handler(rewritten(path), res);
      assert.equal(res.code, 404, path); assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8", path);
      assert.match(res.headers.get("x-robots-tag"), /noindex/, path); assert.ok(res.body.includes("existing shell"), path);
    }
    // A normal public document is untouched.
    const ok = response(); await handler(rewritten("/login"), ok);
    assert.equal(ok.code, 200); assert.equal(ok.headers.get("content-type"), "text/html; charset=utf-8");
  } finally { globalThis.fetch = original; }
});

test("the answer is carried by the handler, not by the routing table", () => {
  // Handler-level only: the platform keeps sending every address that is not a file (and not /api/) to the one function, so
  // vercel.json must still hand /assets misses to it, add no asset route, and keep the immutable rule for assets that exist.
  const config = JSON.parse(readFileSync(new URL("../public-reading-deploy/vercel.json", import.meta.url), "utf8"));
  const catchAll = config.rewrites.filter(row => row.source === "/((?!api(?:/|$)).*)");
  assert.equal(catchAll.length, 1); assert.equal(catchAll[0].destination, "/api/public-document");
  assert.ok(!config.rewrites.some(row => /assets/.test(row.source)), "no asset-specific rewrite: the answer is the handler's");
  assert.ok(!(config.redirects || []).some(row => /^\/assets\b/.test(row.source)), "no asset-specific redirect");
  const immutable = config.headers.filter(row => row.source === "/assets/(.*)");
  assert.equal(immutable.length, 1, "the immutable cache rule for existing assets is unchanged");
  assert.equal(immutable[0].headers.find(h => h.key === "Cache-Control").value, "public, max-age=31536000, immutable");
});

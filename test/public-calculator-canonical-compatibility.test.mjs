import test from "node:test";
import assert from "node:assert/strict";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";

const SITE = "https://sod1820.co.il";
const paths = ["/gematria", "/2029/calculator", "/2029/gematria", "/2029/gematria/viral"];
const document = '<html><head><title>shell</title></head><body><div id="root">calculator shell</div></body></html>';
const handler = publicReadingDocumentHandler({
  authorized: () => true,
  indexable: origin => origin === SITE,
  readDocument: async () => document,
  // Use the real metadata handler, not a fixture returning the expected URL.
});
function response() {
  return { headers: new Map(), code: null, body: "",
    setHeader(name, value) { this.headers.set(name.toLowerCase(), value); },
    status(code) { this.code = code; return this; },
    send(value) { this.body = String(value); return this; },
  };
}
async function read(path, method = "GET") {
  const url = new URL(path, SITE);
  const req = { method, url: path, headers: { host: url.host },
    query: { ...Object.fromEntries(url.searchParams), path: url.pathname } };
  const original = structuredClone(req);
  const res = response();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw Error("Calculator metadata must not query or write to a server"); };
  try { await handler(req, res); } finally { globalThis.fetch = originalFetch; }
  assert.equal(calls, 0);
  assert.deepEqual(req, original, "metadata must preserve the requested address and parameters");
  assert.equal(res.code, 200);
  assert.equal(res.headers.get("location"), undefined, "existing aliases still render directly");
  assert.equal(res.headers.get("cache-control"), "no-store");
  return res;
}
function canonical(res) {
  assert.match(res.body, /rel="canonical" href="https:\/\/sod1820\.co\.il\/gematria"/);
  assert.match(res.body, /property="og:url" content="https:\/\/sod1820\.co\.il\/gematria"/);
  assert.ok(res.body.includes("calculator shell"));
}

for (const path of paths) {
  test(`${path}: initial document and sharing use the public calculator canonical`, async () => {
    const res = await read(path);
    canonical(res);
    assert.equal(res.headers.get("x-robots-tag"), "index, follow");
  });
  test(`${path}: ordinary calculation stays noindex and never becomes published numeric truth`, async () => {
    const search = "?q=" + encodeURIComponent("משיח") + "&m=milui&n=1&returnTo=%2Fworld%3Fpart%3D2&part=2&part=7";
    const res = await read(path + search);
    canonical(res);
    assert.match(res.headers.get("x-robots-tag"), /^noindex/);
    assert.ok(!res.body.includes("משיח = 1"), "unverified query results are not publication metadata");
    assert.ok(!res.body.includes("returnTo="));
  });
  test(`${path}: HEAD keeps calculated-query privacy and has no document body`, async () => {
    const res = await read(path + "?q=" + encodeURIComponent("משיח"), "HEAD");
    assert.equal(res.body, "");
    assert.match(res.headers.get("x-robots-tag"), /^noindex/);
  });
}

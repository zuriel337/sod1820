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
  // Metadata (canonical, og:url, robots) never needs the server. The only read allowed is the first-words block of #1463 (ZURIEL
  // 20.11.2026: the calculators' public lists in the first document): a GET of verified, published phrases through the anonymous REST
  // reader and the read-only research_pulse_2029 RPC, at most two, never a write and never another table. It fails here on purpose, and the metadata must not change.
  const calls = [];
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), method: (init.method || "GET").toUpperCase() }); throw Error("no server in this test"); };
  try { await handler(req, res); } finally { globalThis.fetch = originalFetch; }
  assert.ok(calls.length <= 2, "at most the two first-words reads");
  for (const c of calls) {
    // Two read-only public readers: verified, published phrases (GET) and the one public activity reader research_pulse_2029
    // (a read-only RPC; PostgREST calls RPCs with POST). Any other address or write fails.
    const phrases = c.method === "GET" && /\/rest\/v1\/gematria_words\?/.test(c.url) && /is_verified=eq\.true/.test(c.url) && /is_published=eq\.true/.test(c.url);
    const pulse = c.method === "POST" && /\/rest\/v1\/rpc\/research_pulse_2029$/.test(c.url);
    assert.ok(phrases || pulse, `only the first-words public readers, never a write: ${c.method} ${c.url}`);
  }
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

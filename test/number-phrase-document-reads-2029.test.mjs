// S-62 (staged branch): what a first visit to a unique /number/<n> or phrase address reads from the database, measured with the real document
// handler, the real metadata owner and the real first words over a counting stand-in for Supabase. The content, the robots decision and the
// addresses must not change; only the number of reads may.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicReadingDocumentHandler, numberDocumentCdnCacheable, numberDocumentCdnHeaders, NUMBER_DOCUMENT_CDN_ENABLED, NUMBER_DOCUMENT_CDN_CACHE } from "../public-reading-deploy/api/public-document.js";
import { _resetFirstWordsForTests, _resetNumberAnchorsForTests } from "../public-reading-deploy/first-words.js";
import { _resetAdmittedNumbersForTests } from "../src/lib/admittedNumbers2029.js";

const SITE = "https://sod1820.co.il";
const shell = await readFile(new URL("../2029.html", import.meta.url), "utf8");
const response = () => ({ headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); }, status(c) { this.code = c; return this; }, send(v) { this.body = String(v); return this; } });
const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => shell });
const json = body => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

async function visit(path, { headers = {}, data = {} } = {}) {
  const calls = [], original = globalThis.fetch;
  globalThis.fetch = async url => {
    const u = String(url).replace("https://linswmnnkjxvweumprav.supabase.co/rest/v1/", "");
    calls.push(u.split("?")[0]);
    if (u.startsWith("rpc/is_number_indexable") || u.startsWith("rpc/is_phrase_indexable")) return json(data.indexable ?? true);
    if (u.startsWith("rpc/posts_by_number_strict")) return json([]);
    if (u.startsWith("gematria_words")) return json(u.includes("phrase=eq.") ? [{ phrase: "אם כל חי", ragil: 1015 }] : [{ phrase: "אור" }, { phrase: "רז" }, { phrase: "גאולה" }]);
    if (u.startsWith("number_anchors")) return json(data.anchor ? [data.anchor] : []);
    return json([]);
  };
  try {
    const res = response();
    await handler({ method: "GET", headers: { host: "sod1820.co.il", ...headers }, url: path, query: {} }, res);
    const counts = {}; for (const c of calls) counts[c] = (counts[c] || 0) + 1;
    return { res, calls, counts };
  } finally { globalThis.fetch = original; }
}
const fresh = () => { _resetFirstWordsForTests(); _resetNumberAnchorsForTests(); _resetAdmittedNumbersForTests(); };

test("a first visit to a number reads number_anchors once (it was twice), nothing else changes", async () => {
  fresh();
  const { res, counts, calls } = await visit("/number/4242", { data: { anchor: { fact: "עובדה מאומתת", hint: "רמז" } } });
  assert.equal(res.code, 200);
  assert.equal(counts.number_anchors, 1, "one anchor read for the metadata and the words together");
  assert.deepEqual(counts, { number_anchors: 1, gematria_words: 1, "rpc/posts_by_number_strict": 1, "rpc/is_number_indexable": 1 });
  assert.equal(calls.length, 4);
  assert.equal(res.headers.get("x-robots-tag"), "index, follow");
  assert.equal(res.headers.get("x-sod-first-words"), "served");
  assert.match(res.body, /<title>✦ עובדה מאומתת/, "the share title still carries the verified anchor");
  assert.match(res.body, /<link rel="canonical" href="https:\/\/sod1820\.co\.il\/number\/4242"\s*\/?>/, "the canonical address is unchanged");
});

test("a first visit to a phrase still makes its three reads and no more", async () => {
  fresh();
  const { res, counts } = await visit("/number/" + encodeURIComponent("אם כל חי"));
  assert.equal(res.code, 200);
  assert.deepEqual(counts, { "rpc/is_phrase_indexable": 1, gematria_words: 2 });
  assert.equal(res.headers.get("x-sod-first-words"), "served");
});

test("the document is the same bytes for a browser, Googlebot and an AI crawler", async () => {
  const bodies = [];
  for (const ua of ["Mozilla/5.0 (Windows NT 10.0) Chrome/130", "Mozilla/5.0 (compatible; Googlebot/2.1)", "Mozilla/5.0 (compatible; GPTBot/1.1)"]) {
    fresh();
    const { res } = await visit("/number/4242", { headers: { "user-agent": ua }, data: { anchor: { fact: "עובדה" } } });
    bodies.push(res.body);
  }
  assert.equal(bodies[0], bodies[1]);
  assert.equal(bodies[1], bodies[2]);
});

test("a number that is not admitted is still noindex, and a failing decision is still a 503 with noindex", async () => {
  fresh();
  const no = await visit("/number/4243", { data: { indexable: false } });
  assert.equal(no.res.code, 200);
  assert.equal(no.res.headers.get("x-robots-tag"), "noindex, follow");
  fresh();
  const original = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes("is_number_indexable") ? new Response("{}", { status: 500 }) : json([]);
  try {
    const res = response();
    await handler({ method: "GET", headers: { host: "sod1820.co.il" }, url: "/number/4244", query: {} }, res);
    assert.equal(res.code, 503);
  } finally { globalThis.fetch = original; }
});

test("stage 2 is staged and off: a served number document is not kept until the switch is turned on", async () => {
  fresh();
  assert.equal(NUMBER_DOCUMENT_CDN_ENABLED, false);
  const { res } = await visit("/number/4242", { data: { anchor: { fact: "עובדה" } } });
  assert.equal(res.headers.get("x-sod-first-words"), "served");
  assert.equal(res.headers.get("vercel-cdn-cache-control"), undefined);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("stage 2 decision, when switched on: exact inputs only, and only a document that carries its words", () => {
  const ok = { method: "GET", status: 200, state: "public", originalDocument: true, search: "", post: null, path: "/number/4242", wordsState: "served" };
  assert.equal(numberDocumentCdnCacheable(ok, true), true);
  assert.equal(numberDocumentCdnCacheable(ok), false, "off by default");
  for (const change of [{ wordsState: "none" }, { wordsState: "no-slot" }, { status: 503 }, { status: 404 }, { search: "?q=1" }, { method: "POST" }, { path: "/number" }, { path: "/number/1/2" },
    { path: "/post/x" }, { state: "closed" }, { temporarilyClosed: true }, { fresh: true }, { originalDocument: false }, { post: { id: 1 } }]) {
    assert.equal(numberDocumentCdnCacheable({ ...ok, ...change }, true), false, JSON.stringify(change));
  }
  assert.equal(numberDocumentCdnCacheable({ ...ok, method: "HEAD" }, true), true);
  assert.deepEqual(numberDocumentCdnHeaders("/number/4242"), { "Vercel-CDN-Cache-Control": "max-age=300, stale-while-revalidate=60", "Vercel-Cache-Tag": "number-document,number-document-number", "X-Sod-Document-Cache": "number-cdn-v1" });
  assert.equal(numberDocumentCdnHeaders("/number/" + encodeURIComponent("אם"))["Vercel-Cache-Tag"], "number-document,number-document-phrase");
  assert.equal(NUMBER_DOCUMENT_CDN_CACHE.freshSeconds + NUMBER_DOCUMENT_CDN_CACHE.staleSeconds, 360, "a hidden number leaves within 6 minutes of the kept copy (plus the 10 minute bound of the words)");
});

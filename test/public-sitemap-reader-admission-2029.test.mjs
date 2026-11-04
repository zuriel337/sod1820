import test from "node:test";
import assert from "node:assert/strict";
import sitemap from "../api/sitemap.js";
import { getBookReaderManifest } from "../src/data/bookReader2029.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";

const boundBook = slug => {
  const manifest = getBookReaderManifest(slug);
  assert.ok(manifest, slug);
  return { id: `fixture-${slug}`, type: "book", label: manifest.title, book_slug: slug, is_active: true,
    metadata: { slug }, source_ref_prefixes: [`book:${slug}`],
    identity_tiers: { digital_object: { mime: "application/pdf", url: manifest.pdfUrl } } };
};
async function invoke(books, { legacy = false, source = "ready", failNodes = false } = {}) {
  const original = globalThis.fetch, heads = [], reads = [];
  globalThis.fetch = async (raw, options = {}) => {
    const url = new URL(raw), method = options.method || "GET";
    if (method === "HEAD") {
      heads.push(url.href);
      assert.equal(options.credentials, "omit"); assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      if (source === "failed") throw new Error("synthetic source outage");
      return new Response(null, { status: source === "missing" ? 404 : 200,
        headers: { "Content-Type": source === "wrong-type" ? "text/html" : "application/pdf" } });
    }
    assert.equal(url.origin, "https://linswmnnkjxvweumprav.supabase.co");
    assert.ok(method === "GET" || method === "POST" && url.pathname === "/rest/v1/rpc/sitemap_numbers");
    reads.push(url.pathname);
    if (url.pathname === "/rest/v1/nodes") {
      assert.equal(url.searchParams.get("type"), "eq.book"); assert.equal(url.searchParams.get("is_active"), "eq.true");
      if (failNodes) throw new Error("synthetic node read failure");
    }
    return new Response(JSON.stringify(url.pathname === "/rest/v1/nodes" ? books : []));
  };
  const res = { code: null, headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
  try {
    await sitemap(legacy ? {} : { publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
      publicReadingProductionArtifact: true }, res);
    return { ...res, heads, reads };
  } finally { globalThis.fetch = original; }
}

test("XML applies the existing reader decision before any PDF probe, retaining only the open Ahavat reader", async () => {
  const result = await invoke([boundBook("daat-tevunot"), boundBook("bentov-brief-tour-higher-consciousness"), boundBook("ahavat-torah")]);
  assert.equal(result.code, 200); assert.deepEqual(result.heads, [getBookReaderManifest("ahavat-torah").pdfUrl]);
  assert.match(result.body, /<loc>https:\/\/sod1820.co.il\/book\/ahavat-torah<\/loc>/);
  assert.doesNotMatch(result.body, /<loc>[^<]*\/book\/(?:daat-tevunot|bentov-brief-tour-higher-consciousness)<\/loc>/);
  assert.equal(result.reads.filter(path => path === "/rest/v1/nodes").length, 1, "reuse the already authorized rows");
});

test("invalid, unbound, inactive and ambiguous book identities cannot trigger source probes or indexing", async () => {
  const valid = boundBook("ahavat-torah");
  for (const books of [[{ ...valid, is_active: false }], [{ ...valid, identity_tiers: {} }], [valid, { ...valid, id: "different-identity" }]]) {
    const result = await invoke(books);
    assert.equal(result.code, 200); assert.deepEqual(result.heads, []);
    assert.doesNotMatch(result.body, /<loc>[^<]*\/book\/ahavat-torah<\/loc>/);
  }
});

test("failed source reads stay failed and no-store; unavailable files are not advertised as ready", async () => {
  for (const options of [{ source: "failed" }, { failNodes: true }]) {
    const result = await invoke([boundBook("ahavat-torah")], options);
    assert.equal(result.code, 503); assert.equal(result.headers["cache-control"], "no-store");
    assert.doesNotMatch(result.body, /<urlset/);
  }
  for (const source of ["missing", "wrong-type"]) {
    const result = await invoke([boundBook("ahavat-torah")], { source });
    assert.equal(result.code, 200); assert.doesNotMatch(result.body, /<loc>[^<]*\/book\/ahavat-torah<\/loc>/);
  }
});

test("the preserved Legacy sitemap path keeps its previous book identity metadata without new source probes", async () => {
  const result = await invoke([boundBook("daat-tevunot"), boundBook("ahavat-torah")], { legacy: true });
  assert.equal(result.code, 200); assert.deepEqual(result.heads, []);
  assert.match(result.body, /<loc>[^<]*\/book\/daat-tevunot<\/loc>/);
  assert.match(result.body, /<loc>[^<]*\/book\/ahavat-torah<\/loc>/);
});

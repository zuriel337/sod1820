import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readBookPdfBytes2029 } from "../src/components/books2029/bookPdfSource2029.js";
import { getBookReaderManifest, getAllBookReaderManifests } from "../src/data/bookReader2029.js";

const bytes = new TextEncoder().encode("%PDF-test-witness");
const manifest = { pdfUrl: "https://example.test/source.pdf", pdfBytes: bytes.length, pdfSha256: createHash("sha256").update(bytes).digest("hex") };
test("source bytes require the exact witness hash and bounded length, not successful HTTP alone", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const cases = [
    { body: bytes, type: "application/pdf", pass: true },
    { body: new Uint8Array(bytes.length), type: "application/pdf", error: /witness_mismatch/ },
    { body: bytes.slice(1), type: "application/pdf", error: /pdf_size/ },
    { body: new Uint8Array(bytes.length + 1), type: "application/pdf", error: /pdf_size/ },
    { body: bytes, type: "text/html", error: /pdf_response/ },
  ];
  for (const item of cases) {
    globalThis.fetch = async (url, options) => { assert.equal(url, manifest.pdfUrl); assert.equal(options.credentials, "omit"); return new Response(item.body, { headers: { "content-type": item.type } }); };
    if (item.pass) assert.deepEqual(await readBookPdfBytes2029(manifest), bytes);
    else await assert.rejects(readBookPdfBytes2029(manifest), item.error);
  }
});
test("controlled rendering is an Ahavat-only variant of the existing reader", () => {
  const book = getBookReaderManifest("ahavat-torah");
  assert.equal(book.pdfRenderer, "controlled_page"); assert.equal(book.pdfPages, 99); assert.equal(book.pdfBytes, 2078469);
  assert.equal(book.pdfSha256, "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  assert.equal(getAllBookReaderManifests().filter(item => item.pdfRenderer === "controlled_page").length, 1);
  const shared = readFileSync(new URL("../src/components/books2029/BookSourceReader2029.jsx", import.meta.url), "utf8");
  const deep = readFileSync(new URL("../src/pages/AhavatTorahSystem2029Page.jsx", import.meta.url), "utf8");
  assert.match(shared, /manifest\.pdfRenderer === "controlled_page"/); assert.match(shared, /import\("\.\/BookPdfPage2029\.jsx"\)/);
  assert.match(deep, /import\("\.\.\/components\/books2029\/BookPdfPage2029\.jsx"\)/);
  assert.match(deep, /fallbackHref=\{pdfUrl\}/); assert.match(deep, /href=\{pdfUrl\}/);
  const renderer = readFileSync(new URL("../src/components/books2029/BookPdfPage2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(renderer, /<canvas[^>]*\bkey=/, "the completed raster and paint metadata must retain the same display surface during page changes");
});

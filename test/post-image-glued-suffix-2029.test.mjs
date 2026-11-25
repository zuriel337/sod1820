// Post 2 (25.11.2026): a stored image carried "&#038;ssl=1" glued to its address, which Storage rejects (400, a broken image) although the file exists.
// The reading copy points at the exact stored file, the authored address is kept in data-source-src, and nothing else is touched.
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { postReadingHtml2029 } from "../src/lib/research/postArticleCore2029.js";

const STORE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2026/05/1000633154-586x1024.webp";
const read = html => { const { window } = new JSDOM("<!doctype html><body></body>"); globalThis.document = window.document; globalThis.NodeFilter = window.NodeFilter;
  try { const t = window.document.createElement("template"); t.innerHTML = postReadingHtml2029(html); return t.content; } finally { delete globalThis.document; delete globalThis.NodeFilter; } };

test("the real Post 2 tag: the glued suffix is dropped from the reading copy, the authored address is kept", () => {
  const image = read(`<img data-recalc-dims="1" height="1024" width="586" decoding="async" src="${STORE}&#038;ssl=1" alt="" class="wp-image-36881"/>`).querySelector("img");
  assert.equal(image.getAttribute("src"), STORE);
  assert.equal(image.getAttribute("data-source-src"), STORE + "&ssl=1", "the authored address (as the browser reads it) is kept");
  assert.equal(image.getAttribute("width"), "586"); assert.equal(image.getAttribute("height"), "1024"); assert.equal(image.getAttribute("class"), "wp-image-36881");
});

test("the other spellings of the same suffix, and only a stored image", () => {
  for (const suffix of ["&amp;ssl=1", "&ssl=1", "?ssl=1"]) assert.equal(read(`<img src="${STORE}${suffix}">`).querySelector("img").getAttribute("src"), STORE, suffix);
  for (const html of [`<img src="${STORE}">`, `<img src="${STORE}?v=2">`, `<img src="${STORE}?w=10&ssl=1">`, `<img src="${STORE}&ssl=2">`,
    '<img src="https://i0.wp.com/example.com/a.png?w=1209&ssl=1">', '<img src="https://example.com/a.jpg&ssl=1">']) {
    const image = read(html).querySelector("img");
    assert.equal(image.hasAttribute("data-source-src"), false, html);
    assert.equal(image.getAttribute("src"), html.match(/src="([^"]+)"/)[1].replace(/&amp;/g, "&"), html);
  }
});

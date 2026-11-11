import test from "node:test";
import assert from "node:assert/strict";

// The browser robots tag follows the server decision: a public page that is not admitted for indexing is "noindex, follow";
// private, closed and protected-review pages stay "noindex, nofollow"; an admitted page is "index, follow".
function fakeDocument() {
  const nodes = [];
  const make = (tag) => { const attrs = new Map(); return { tag, attrs, setAttribute(k, v) { attrs.set(k, v); }, getAttribute: (k) => attrs.get(k) }; };
  return {
    title: "", head: {
      querySelector(selector) { const m = /^(meta|link)\[(\w+)="([^"]+)"\]$/.exec(selector); return m ? nodes.find(n => n.tag === m[1] && n.attrs.get(m[2]) === m[3]) || null : null; },
      querySelectorAll() { return []; },
      appendChild(node) { nodes.push(node); },
    },
    getElementById() { return null; }, body: { appendChild() {} },
    createElement: make, nodes,
  };
}
async function robotsFor(options) {
  const doc = fakeDocument();
  globalThis.document = doc; globalThis.window = { location: { pathname: "/number/1" } };
  const { applySeo } = await import("../src/lib/seo.js");
  applySeo({ title: "x", path: "/number/1", ...options });
  return doc.nodes.find(n => n.tag === "meta" && n.attrs.get("name") === "robots")?.attrs.get("content");
}
test("noindex with follow is noindex, follow; without follow it stays nofollow; admitted is index, follow", async () => {
  assert.equal(await robotsFor({ noindex: false }), "index, follow");
  assert.equal(await robotsFor({ noindex: true, follow: true }), "noindex, follow");
  assert.equal(await robotsFor({ noindex: true }), "noindex, nofollow");
  assert.equal(await robotsFor({ noindex: true, follow: false }), "noindex, nofollow");
  assert.equal(await robotsFor({ noindex: false, follow: true }), "index, follow");
});
test("the number page passes follow only for a public address", async () => {
  const { readFileSync } = await import("node:fs");
  const page = readFileSync(new URL("../src/pages/Number2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /noindex: !admitted,\s*\/\/[^\n]*\n\s*follow: Boolean\(resolvedAddress\?\.publicAddress\)/);
});

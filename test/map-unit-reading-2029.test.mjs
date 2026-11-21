import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { compactMapUnitHtml, mapUnitReading } from "../src/lib/research/mapUnitReading2029.js";

test("the two curated links use the published unit ids in both directions", () => {
  for (const [id, other] of [[5107, 5113], [5113, 5107]]) {
    const unit = mapUnitReading(id);
    const dest = mapUnitReading(other);
    assert.equal(unit.href, "/post/" + dest.slug + "?unit=" + dest.key + "#" + dest.key);
    assert.equal(mapUnitReading(id, dest.key), null);
  }
});

test("collapse retains source anchors, citations and media, once and in order", () => {
  const dom = new JSDOM("");
  globalThis.document = dom.window.document;
  try {
    const unit = mapUnitReading(5113);
    const html = '<section id="' + unit.key + '"><h2>כותרת</h2><p id="source">מקור</p><video controls></video></section>';
    const rendered = compactMapUnitHtml(html, 5113);
    const body = JSDOM.fragment(rendered);
    const depth = body.querySelector("details");
    assert.equal(depth.open, false);
    assert.deepEqual([...depth.children].map(node => node.tagName), ["SUMMARY", "P", "VIDEO"]);
    assert.equal(body.querySelectorAll("#source").length, 1);
    assert.equal(compactMapUnitHtml(rendered, 5113), rendered);
    assert.equal(compactMapUnitHtml(html, 5107), html);
    assert.equal(compactMapUnitHtml(html, 5112), html);
  } finally { delete globalThis.document; dom.window.close(); }
});

test("the salt equation links to canonical number reading with the expression and method from the compact unit", () => {
  const dom = new JSDOM("");
  globalThis.document = dom.window.document;
  try {
    const { key } = mapUnitReading(5113);
    const html = `<section id="${key}"><h2>ברית מלח</h2><p>בגימטריה רגילה, ערך המילה ״מלח״ הוא <span data-gem="78">78</span>.</p></section>`;
    const unit = JSDOM.fragment(compactMapUnitHtml(html, 5113));
    const link = unit.querySelector("[data-map-equation]");
    const url = new URL(link.getAttribute("href"), "https://sod1820.co.il");
    assert.match(url.pathname, /\/number\/78$/);
    assert.equal(url.searchParams.get("focus"), "מלח");
    assert.equal(url.searchParams.get("method"), "רגיל");
    assert.equal(link.textContent, "מלח = 78");
    assert.equal(unit.querySelector("[data-map-depth] [data-gem]").textContent, "78");
    const unrelated = html.replace("״מלח״", "״גיל״");
    assert.equal(JSDOM.fragment(compactMapUnitHtml(unrelated, 5113)).querySelector("[data-map-equation]"), null);
  } finally { delete globalThis.document; dom.window.close(); }
});

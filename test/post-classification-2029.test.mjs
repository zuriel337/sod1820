import test from "node:test";
import assert from "node:assert/strict";
import { postClassification2029, postsCatalogScope2029, fetchPostsCatalog2029 } from "../src/lib/research/postsCatalog2029Projection.js";

test("a new Post resolves an approved series and publisher without inheriting media or quality", () => {
  const row = { id: 99001, author: "בדרך לנצח", categories: ["מימד חמש", "וידאו", "רמזי הגאולה"], tags: [], quality: 5 };
  const result = postClassification2029(row);
  assert.deepEqual(result.series.map(item => [item.key, item.href]), [["dimension-five", "/2029/posts?series=dimension-five"]]);
  assert.deepEqual(result.credit, { name: "בדרך לנצח", prefix: "מפרסם" });
  assert.equal(result.items.filter(item => item.name === "מימד חמש").length, 1);
  assert.equal(result.items.find(item => item.name === "רמזים חזקים").role, "editorial");
  assert.deepEqual(result.legacyMediaLabels.map(item => item.role), ["legacy-media-label"]);
  assert.ok(result.items.every(item => !("quality" in item) && item.role !== "medium"));
});

test("an unresolved source classification remains reachable without a series/topic/publisher guess", () => {
  const row = { author: "manifestaffirms", categories: ["מימד חמש", "שבילי שפה", "גימטריה", "גימטריות", "כללי"], tags: [] };
  const result = postClassification2029(row);
  assert.deepEqual(result.series, []);
  assert.deepEqual(result.credit, { name: "manifestaffirms", prefix: "ייחוס במקור" });
  assert.deepEqual(result.sourceCategories.map(item => item.name), row.categories);
  assert.ok(result.items.every(item => item.role === "source-category" && item.href.startsWith("/2029/posts?category=")));
  assert.deepEqual(postClassification2029({ categories: [], tags: [] }).items, [], "no invented general-series membership");
  assert.deepEqual(postClassification2029({ categories: ["מה קורה הבורא"], author: "אלון לוי" }).series, [], "category is not the approved exact series tag");
});

test("tag-only series membership and multiple series keep each existing identity", () => {
  const result = postClassification2029({ author: "אלון לוי", tags: ["מה קורה הבורא", "סוד החשמל"], categories: ["תיעוד אירועים"] });
  assert.deepEqual(result.series.map(item => item.key), ["mah-kore-habora", "sod-hashmal"]);
  assert.equal(result.credit.prefix, "ייחוס במקור", "a series publisher is not silently attributed to its content");
  assert.equal(result.items.find(item => item.name === "תיעוד אירועים").role, "content-family");
  const after = postClassification2029({ author: "בדרך לנצח", tags: [], categories: ["מימד חמש"] });
  assert.equal(after.series[0].key, "dimension-five", "source correction resolves on the next read with no Post-ID list");
});

test("suppressed sources expose no classification or attribution", () => {
  for (const tag of ["טיוטה", "פורום"]) {
    const result = postClassification2029({ author: "בדרך לנצח", categories: ["מימד חמש", "וידאו"], tags: [tag] });
    assert.deepEqual(result.items, []);
    assert.equal(result.credit, undefined);
  }
});

test("historical video and series URLs preserve their original result sets and describe the distinction", async () => {
  for (const category of ["וידאו", "מימד חמש", "סוד החשמל"]) {
    const scope = postsCatalogScope2029("category=" + encodeURIComponent(category));
    assert.equal(scope.kind, "category");
    assert.ok(scope.compatibilityNote);
    assert.match(scope.label, /סיווג/);
    const calls = [];
    const query = { then: yes => Promise.resolve({ data: [], error: null, count: 0 }).then(yes) };
    for (const method of ["select", "or", "overlaps", "eq", "order", "range"]) query[method] = (...args) => { calls.push([method, ...args]); return query; };
    await fetchPostsCatalog2029({ scope, client: { from: () => query } });
    assert.deepEqual(calls.find(call => call[0] === "overlaps"), ["overlaps", "categories", [category]]);
    assert.ok(!calls.some(call => call[0] === "eq"), "old category results are not silently restricted by a publisher");
    assert.ok(!calls[0][1].includes("content"), "no full-body scan to invent a media dimension on index load");
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readThrough, discoveryTotals, discoveryModel, writerHref, numberHref, writerActivityLine, CONTENT_SOURCES_2029 } from "../src/lib/research/discoveryCenter2029.js";
import { PUBLIC_READING_READ_RPCS } from "../public-reading-deploy/transport.js";

test("totals are by type, never summed, and a type without a real number is left out (no invented zero)", () => {
  const rows = discoveryTotals({ gematria_public: 12579, research_public: 0, contributions: 5187, replies: null, updates_live: 2460, ciphers_public: 116, writers_with_public_material: 1115 });
  assert.deepEqual(rows.map(row => row.key), ["gematria", "contributions", "updates", "ciphers", "writers"]);
  assert.equal(rows.find(row => row.key === "contributions").value, 5187);
  assert.deepEqual(discoveryTotals(null), []);
});
test("the feed model keeps credit only as the server sent it and is null when it carries nothing", () => {
  assert.equal(discoveryModel(null), null);
  assert.equal(discoveryModel({ featured: null, latest_discoveries: [], latest_contributions: [], active_writers: [] }), null);
  const model = discoveryModel({
    featured: { id: "w1", phrase: "מעבדות לחירות היום", value: 1237, created_at: "2026-11-26T10:00:00Z", credit_name: "סלי מור", credit_slug: "sali-mor" },
    latest_discoveries: [{ id: "w2", phrase: "שר הדין", value: 569, created_at: "2026-11-20T10:00:00Z", credit_name: null, credit_slug: null }, { id: "bad", phrase: "", value: 1 }],
    latest_contributions: [{ id: "c1", excerpt: "טקסט", author_name: "חבר/ת הקהילה", author_slug: null, created_at: "2026-11-25T10:00:00Z" }, { id: "c2", excerpt: "" }],
    active_writers: [{ slug: "sod1820", display_name: "sod1820", is_site_account: true, gematria: 7 }, { display_name: "" }],
  });
  assert.equal(model.featured.creditSlug, "sali-mor");
  assert.equal(model.featured.method, "רגיל", "a discovery without a method is the regular one");
  assert.equal(model.latest.length, 1, "an item without a phrase is dropped");
  assert.equal(model.latest[0].creditName, null, "no public writer, no credit");
  assert.equal(model.contributions.length, 1);
  assert.equal(model.writers.length, 1);
  assert.equal(model.writers[0].siteAccount, true);
});
test("links are exact: a writer page by slug, a number page by value; a source has no writer page", () => {
  assert.equal(writerHref("sali-mor"), "/community/researcher/sali-mor");
  assert.equal(writerHref(null), null);
  assert.equal(numberHref(1237), "/number/1237");
  assert.equal(numberHref(0), null);
  assert.ok(CONTENT_SOURCES_2029["בדרך לנצח"], "a content source is labelled as a source");
  assert.equal(writerActivityLine({ research: 66, contributions: null, gematria: null }), "66 רשומות מחקר");
});
test("the public-reading worker admits the two argument-less readers; the admin selection is not a public read", () => {
  assert.ok(PUBLIC_READING_READ_RPCS.includes("discovery_center_feed_v1"));
  assert.ok(PUBLIC_READING_READ_RPCS.includes("discovery_center_stats_v1"));
  assert.ok(!PUBLIC_READING_READ_RPCS.includes("admin_set_home_featured_discovery_v1"));
});

test("the identity of a discovery is phrase + method + value; a non-regular method keeps its own place and its own value", () => {
  const model = discoveryModel({
    featured: { id: "w1", phrase: "תפרצי בתשפז", method: "ריבוע", method_label: "ריבוע", value: 5787, credit_name: "יניב לוי", credit_slug: "yaniv-levi" },
    featured_with: [{ id: "w2", phrase: "ימין ושמאול תפרצי", method: "מילוי", method_label: "מילוי", value: 2026, credit_name: "יניב לוי", credit_slug: "yaniv-levi" }, { id: "w3", phrase: "א", method: "מסתתר", value: 1 }, { id: "w4", phrase: "ב", method: "רגיל", value: 2 }],
    latest_discoveries: [{ id: "a", phrase: "רוסיה איראן סין ארהב", method: "מסתתר", method_label: "מסתתר", value: 1237 }],
  });
  assert.deepEqual([model.featured.method, model.featured.value], ["ריבוע", 5787]);
  assert.deepEqual(model.featuredWith.map(d => [d.method, d.value]), [["מילוי", 2026], ["מסתתר", 1]], "at most two beside the featured one");
  assert.equal(model.latest[0].method, "מסתתר");
});

test("deploy-order degradation: a reader that is not applied yet (PGRST202 / 404) or a failing call draws nothing, never an invented value", async () => {
  // discovery_center_feed_v1 / discovery_center_stats_v1 / admin_set_home_featured_discovery_v1 may be called before their SQL is applied
  assert.equal(await readThrough(async () => ({ data: null, error: { code: "PGRST202", message: "function not found" } })), null);
  assert.equal(await readThrough(async () => ({ data: null, error: { status: 404 } })), null);
  assert.equal(await readThrough(async () => { throw new Error("network"); }), null);
  assert.equal(await readThrough(async () => ({ data: "text", error: null })), null);
  assert.deepEqual(await readThrough(async () => ({ data: { featured: null }, error: null })), { featured: null });
  assert.equal(discoveryModel(null), null);
  assert.deepEqual(discoveryTotals(null), []);
});

test("the writers tile says what it counts: writers with a public profile and public material (not everyone who wrote)", () => {
  const tile = discoveryTotals({ writers_with_public_material: 15 }).find(row => row.key === "writers");
  assert.equal(tile.value, 15);
  assert.equal(tile.label, "כותבים בפרופיל ציבורי עם חומר");
});

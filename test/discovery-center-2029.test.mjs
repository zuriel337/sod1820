import test from "node:test";
import assert from "node:assert/strict";
import { discoveryTotals, discoveryModel, writerHref, numberHref, writerActivityLine, CONTENT_SOURCES_2029 } from "../src/lib/research/discoveryCenter2029.js";
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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONTENT_SERIES_2029,
  buildContentSeriesCatalog2029,
  contentSeriesMembershipFilter,
  projectContentSeriesItems,
} from "../src/lib/research/contentSeries2029Projection.js";

const byKey = Object.fromEntries(CONTENT_SERIES_2029.map((spec) => [spec.key, spec]));

function post(id, {
  title = `פריט ${id}`,
  author = null,
  categories = [],
  tags = [],
} = {}) {
  return {
    id,
    slug: `post-${id}`,
    title,
    excerpt: `תקציר ${id}`,
    author,
    categories,
    tags,
    image_url: `https://example.com/${id}.jpg`,
    date: "2026-10-20T00:00:00Z",
    modified: "2026-10-21T00:00:00Z",
  };
}

test("approved content map keeps series distinct from topic and channel identities", () => {
  assert.deepEqual(CONTENT_SERIES_2029.map((spec) => spec.key), [
    "mah-kore-habora",
    "dimension-five",
    "sod-hashmal",
  ]);
  assert.equal(CONTENT_SERIES_2029.some((spec) => spec.key === "cipher"), false);
  assert.equal(CONTENT_SERIES_2029.some((spec) => spec.key === "or-geula"), false);
});

test("membership filters use exact existing tag/category evidence", () => {
  assert.equal(contentSeriesMembershipFilter(byKey["mah-kore-habora"]), 'tags.cs.{"מה קורה הבורא"}');
  assert.equal(contentSeriesMembershipFilter(byKey["dimension-five"]), 'categories.cs.{"מימד חמש"}');
  assert.equal(
    contentSeriesMembershipFilter(byKey["sod-hashmal"]),
    'categories.cs.{"סוד החשמל"},tags.cs.{"סוד החשמל"}',
  );
});

test("Alon series includes only exact tagged Alon items and never all author material", () => {
  const projected = projectContentSeriesItems([
    post("exact", { author: "אלון לוי", tags: ["מה קורה הבורא"] }),
    post("other-series", { author: "אלון לוי", tags: ["אחר"] }),
    post("wrong-author", { author: "אדם אחר", tags: ["מה קורה הבורא"] }),
  ], byKey["mah-kore-habora"]);
  assert.deepEqual(projected.items.map((item) => item.id), ["exact"]);
  assert.deepEqual(projected.excluded.map((item) => item.reason), ["membership_not_exact", "author_not_mapped"]);
});

test("Dimension Five includes text/audio/video membership only for the approved publisher", () => {
  const projected = projectContentSeriesItems([
    post("text", { author: "בדרך לנצח", categories: ["מימד חמש"] }),
    post("audio", { author: "בדרך לנצח", categories: ["מימד חמש"] }),
    post("pending-map", { author: "מפרסם אחר", categories: ["מימד חמש"] }),
  ], byKey["dimension-five"]);
  assert.deepEqual(projected.items.map((item) => item.id), ["text", "audio"]);
  assert.equal(projected.excluded[0].reason, "author_not_mapped");
});

test("Sod Hashmal series preserves per-item authorship instead of assigning the publisher", () => {
  const projected = projectContentSeriesItems([
    post("source", { author: "סוד החשמל", categories: ["סוד החשמל"] }),
    post("guest", { author: "יניב לוי", tags: ["סוד החשמל"] }),
  ], byKey["sod-hashmal"]);
  assert.deepEqual(projected.items.map((item) => item.author), ["סוד החשמל", "יניב לוי"]);
});

test("draft and forum rows never enter a public Home/World series preview", () => {
  const projected = projectContentSeriesItems([
    post("draft", { author: "אלון לוי", tags: ["מה קורה הבורא", "טיוטה"] }),
    post("forum", { author: "אלון לוי", tags: ["מה קורה הבורא", "פורום"] }),
  ], byKey["mah-kore-habora"]);
  assert.equal(projected.items.length, 0);
  assert.deepEqual(projected.excluded.map((item) => item.reason), ["draft_or_forum", "draft_or_forum"]);
});

test("shared catalog preserves unknown totals instead of inventing zero", () => {
  const catalog = buildContentSeriesCatalog2029([
    { key: "mah-kore-habora", rows: [post("one", { author: "אלון לוי", tags: ["מה קורה הבורא"] })], total: null },
    { key: "dimension-five", rows: [], total: 24 },
  ], { homeOnly: true });
  assert.equal(catalog.byKey["mah-kore-habora"].total, null);
  assert.equal(catalog.byKey["dimension-five"].total, 24);
  assert.equal(catalog.byKey["sod-hashmal"].total, null);
  assert.equal(catalog.byKey["mah-kore-habora"].homeOnly, true);
});

test("adopted projection consumes shared descriptors instead of copying a series identity map", async () => {
  const identity = await import("../src/lib/research/contentSeries2029Identity.js");
  assert.equal(CONTENT_SERIES_2029, identity.CONTENT_SERIES_2029);
  const source = readFileSync("src/lib/research/contentSeries2029Projection.js", "utf8");
  assert.match(source, /contentSeries2029Identity/);
  assert.doesNotMatch(source, /mah-kore-habora|dimension-five|DEC-SERIES/);
});

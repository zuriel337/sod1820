import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CONTENT_SERIES_2029,
  buildContentSeriesCatalog2029,
  contentSeriesMembershipFilter,
  projectContentSeriesItems,
} from "../src/lib/research/contentSeries2029Projection.js";
import { contentSeriesAdmissionFilter } from "../src/lib/research/contentSeries2029Identity.js";

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
    "reality-map",
    "mah-kore-habora",
    "dimension-five",
    "sod-hashmal",
    "messages-from-righteous",
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

// ZURIEL decision 6 (11.11.2026) replaces the tag-only rule of DEC-SERIES-005: every Post of the exact author belongs to the series.
test("Alon series includes every Post of the exact author, tagged or not, and never another author or an alias", () => {
  const projected = projectContentSeriesItems([
    post("exact", { author: "אלון לוי", tags: ["מה קורה הבורא"] }),
    post("untagged", { author: "אלון לוי", tags: ["אחר"] }),
    post("wrong-author", { author: "אדם אחר", tags: ["מה קורה הבורא"] }),
    post("alias", { author: " אלון לוי ", tags: ["מה קורה הבורא"] }),
  ], byKey["mah-kore-habora"]);
  assert.deepEqual(projected.items.map((item) => item.id), ["exact", "untagged"]);
  assert.deepEqual(projected.items.map((item) => item.author), ["אלון לוי", "אלון לוי"], "the author credit is the Post's own");
  assert.deepEqual(projected.excluded.map((item) => item.reason), ["author_not_mapped", "author_not_mapped"]);
});

// ZURIEL decision 7 (11.11.2026): 5003 and 5004 have dual membership; no other Post of another publisher is admitted.
test("Dimension Five admits exactly the approved Posts 5003 and 5004 besides the exact publisher", () => {
  const projected = projectContentSeriesItems([
    post(5003, { categories: ["מימד חמש", "הצופן בסרטים"] }),
    post(5004, { categories: ["מימד חמש", "הצופן בסרטים"] }),
    post(5037, { categories: ["מימד חמש"] }),
    post(5116, { author: "מדריך לריפוי 10 הספירות", categories: ["מימד חמש", "וידאו"] }),
    post(5100, { author: "בדרך לנצח", categories: ["מימד חמש"] }),
  ], byKey["dimension-five"]);
  assert.deepEqual(projected.items.map((item) => String(item.id)), ["5003", "5004", "5100"]);
  assert.deepEqual(projected.items.map((item) => item.author ?? null), [null, null, "בדרך לנצח"], "no invented publisher or author");
  assert.deepEqual(projected.excluded.map((item) => item.reason), ["author_not_mapped", "author_not_mapped"]);
});

test("the server filter is the same admission as the row rule", () => {
  assert.equal(contentSeriesAdmissionFilter(byKey["mah-kore-habora"]), 'author.eq."אלון לוי"');
  assert.equal(contentSeriesAdmissionFilter(byKey["dimension-five"]), 'and(categories.cs.{"מימד חמש"},author.eq."בדרך לנצח"),id.in.(5003,5004)');
  for (const key of ["reality-map", "sod-hashmal", "messages-from-righteous"]) {
    assert.equal(contentSeriesAdmissionFilter(byKey[key]), contentSeriesMembershipFilter(byKey[key]), key);
  }
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

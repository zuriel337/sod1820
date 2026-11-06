import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SERIES_2029, contentSeriesKeysForPost } from "../src/lib/research/contentSeries2029Identity.js";
import { buildContentSeriesCatalog2029 } from "../src/lib/research/contentSeries2029Projection.js";
import { postRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { seriesCatalogToSystemItems } from "../src/lib/research/systemFeedPublicSources2029.js";
import { feedRows, mergeSystemFeedItems } from "../src/lib/systemFeed2029.js";
import { nowModels, nowSeriesHref } from "../src/lib/nowPublications2029.js";
import { isHomeDocumentationPost, isHomeStandalonePost } from "../src/lib/research/homeLaunchPosts2029.js";

// Projection of reality-map Posts into the unified "עכשיו" stream, through the EXISTING mechanism (the shared stream's Post
// items + the series catalog's Post items, merged by identity). Nothing here adds a store, a copy or a second reader.
const post = (id, fields = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null,
  source: "sod1820", wp_id: 40000 + id, home_hidden: false, date: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z", modified: "2026-11-01T10:00:00Z", ...fields });
const stream = rows => rows.map(row => postRowToWorldUpdate(row)).filter(Boolean);
const catalogItems = rows => seriesCatalogToSystemItems(buildContentSeriesCatalog2029(CONTENT_SERIES_2029.map(spec => ({ key: spec.key, rows, total: rows.length })), { homeOnly: true }));
// The same composition useSystemFeed2029 performs: shared stream first, then the series catalog.
const nowFor = (streamRows, catalogRows = streamRows) => {
  const items = mergeSystemFeedItems(stream(streamRows), catalogItems(catalogRows));
  return { items, models: nowModels(feedRows(items, { limit: 160, caps: { group: 40, post: 40, convergence: 40, finding: 12, gallery: 10 } })) };
};

test("a Post with the exact tag is recognised as מפת המציאות in Now, with its series link, and joins no other Now lens", () => {
  const tagged = post(10, { tags: ["מפת המציאות"], title: "מוצר דגל חדש" });
  const { models } = nowFor([tagged]);
  assert.equal(models.length, 1);
  const [model] = models;
  assert.equal(model.seriesKey, "reality-map");
  assert.equal(model.seriesLabel, "מפת המציאות");
  assert.ok(model.byline.includes("מפת המציאות"), "the affiliation is shown");
  assert.equal(nowSeriesHref(model), "/2029/posts?series=reality-map");
  assert.ok(model.lenses.has("series") && model.lenses.has("all"));
  for (const other of ["messages", "reality", "hints", "sources"]) assert.equal(model.lenses.has(other), false, `not mixed into the ${other} lens`);
  assert.equal(model.typeLabel, "פוסט");
  assert.equal(model.href, "/post/p-10");
});

test("one Post appears once in the stream even when both sources carry it, and even with several series affiliations", () => {
  const onlyReality = post(11, { tags: ["מפת המציאות"] });
  const two = post(12, { tags: ["מפת המציאות"], categories: ["סוד החשמל"], date: "2026-11-02T10:00:00Z" });
  const { items, models } = nowFor([onlyReality, two]);
  assert.equal(items.filter(item => item.id === "post:11").length, 1);
  assert.equal(items.filter(item => item.id === "post:12").length, 1);
  assert.equal(models.filter(model => model.id === "post:12").length, 1, "one Now row");
  assert.deepEqual(contentSeriesKeysForPost(two), ["reality-map", "sod-hashmal"]);
  assert.equal(models.find(model => model.id === "post:12").seriesKey, "reality-map", "the primary series attribution; the Post itself is not duplicated");
  // Same identity, no copy of the Post or a second identifier.
  assert.deepEqual(new Set(items.map(item => item.sourceRef)).size, items.length);
  assert.ok(items.every(item => /^posts:\d+$/.test(item.sourceRef)));
});

test("a Post older than the shared stream window is still represented through the series catalog, with the same identity", () => {
  const older = post(13, { tags: ["מפת המציאות"], date: "2026-05-01T10:00:00Z" });
  const { items, models } = nowFor([], [older]);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "post:13"); assert.equal(items[0].sourceRef, "posts:13"); assert.equal(items[0].seriesKey, "reality-map");
  assert.equal(models[0].seriesLabel, "מפת המציאות");
});

test("removing the tag removes the affiliation in Now without removing the Post", () => {
  const before = post(14, { tags: ["מפת המציאות", "אחר"] });
  assert.equal(nowFor([before]).models[0].seriesKey, "reality-map");
  const after = { ...before, tags: ["אחר"] };
  const { items, models } = nowFor([after]);
  assert.equal(models.length, 1, "the Post is still in the stream");
  assert.equal(items[0].id, "post:14");
  assert.equal(models[0].seriesKey, null); assert.equal(models[0].seriesLabel, "");
  assert.equal(models[0].lenses.has("series"), false);
  // The series catalog no longer returns it either: nothing remembers the old membership.
  assert.equal(catalogItems([after]).some(item => item.sourceRef === "posts:14"), false);
});

test("Now order follows the stream's own rules (newest first), not the reality-map list order", () => {
  const rows = [post(20, { tags: ["מפת המציאות"], date: "2026-10-01T10:00:00Z" }), post(21, { date: "2026-11-03T10:00:00Z" }),
    post(22, { tags: ["מפת המציאות"], date: "2026-10-20T10:00:00Z" }), post(23, { date: "2026-10-10T10:00:00Z" })];
  assert.deepEqual(nowFor(rows).models.map(model => model.id), ["post:21", "post:22", "post:23", "post:20"]);
});

test("reality-map Posts stay out of the documentation pool and of the standalone area, so no Home source repeats them", () => {
  const rows = [post(30, { tags: ["מפת המציאות"], categories: ["תיעוד אירועים", "רמזים חזקים"] }), post(31, { tags: ["מפת המציאות"] })];
  for (const row of rows) {
    assert.equal(contentSeriesKeysForPost(row).includes("reality-map"), true);
    assert.equal(isHomeDocumentationPost(row), false, "event documentation and the smart gauge are not touched");
    assert.equal(isHomeStandalonePost(row), false);
  }
  // A strong-hints Post without the tag is not pulled into the series by its category.
  const strong = post(32, { categories: ["תיעוד אירועים", "רמזים חזקים"] });
  assert.equal(contentSeriesKeysForPost(strong).includes("reality-map"), false);
  assert.equal(isHomeDocumentationPost(strong), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SERIES_2029, contentSeriesKeysForPost } from "../src/lib/research/contentSeries2029Identity.js";
import { buildContentSeriesCatalog2029 } from "../src/lib/research/contentSeries2029Projection.js";
import { postRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { seriesCatalogToSystemItems } from "../src/lib/research/systemFeedPublicSources2029.js";
import { feedRows, mergeSystemFeedItems } from "../src/lib/systemFeed2029.js";
import { readFileSync } from "node:fs";
import { nowModels, nowSeriesHref, REALITY_MAP_BLINK_MS } from "../src/lib/nowPublications2029.js";
import { isHomeDocumentationPost, isHomeStandalonePost } from "../src/lib/research/homeLaunchPosts2029.js";

// Projection of reality-map Posts into the unified "עכשיו" stream, through the EXISTING mechanism (the shared stream's Post
// items + the series catalog's Post items, merged by identity). Nothing here adds a store, a copy or a second reader.
const post = (id, fields = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null,
  source: "sod1820", wp_id: 40000 + id, home_hidden: false, date: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z", modified: "2026-11-01T10:00:00Z", ...fields });
const stream = rows => rows.map(row => postRowToWorldUpdate(row)).filter(Boolean);
const catalogItems = rows => seriesCatalogToSystemItems(buildContentSeriesCatalog2029(CONTENT_SERIES_2029.map(spec => ({ key: spec.key, rows, total: rows.length })), { homeOnly: true }));
// The same composition useSystemFeed2029 performs: shared stream first, then the series catalog.
const nowFor = (streamRows, catalogRows = streamRows, now = undefined) => {
  const items = mergeSystemFeedItems(stream(streamRows), catalogItems(catalogRows));
  return { items, models: nowModels(feedRows(items, { limit: 160, caps: { group: 40, post: 40, convergence: 40, finding: 12, gallery: 10 } }), now) };
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
  // ZURIEL 16.11.2026: only the NEWEST reality-map publication (post:22) leads; every other row keeps the stream's own time order
  assert.deepEqual(nowFor(rows).models.map(model => model.id), ["post:22", "post:21", "post:23", "post:20"]);
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

test("the newest reality-map publication leads the stream with a blinking-dot marker and yields to a newer one; ordinary rows keep their time order", () => {
  const older = post(21, { tags: ["מפת המציאות"], title: "ישן", modified: "2026-11-01T10:00:00Z", date: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z" });
  const newest = post(22, { tags: ["מפת המציאות"], title: "אחרון", modified: "2026-11-03T10:00:00Z", date: "2026-11-03T10:00:00Z", created_at: "2026-11-03T10:00:00Z" });
  const plainNewer = post(23, { title: "רגיל חדש", modified: "2026-11-05T10:00:00Z", date: "2026-11-05T10:00:00Z", created_at: "2026-11-05T10:00:00Z" });
  const { models } = nowFor([older, newest, plainNewer]);
  assert.equal(models[0].title, "אחרון", "the newest reality-map publication leads, even above a newer ordinary post");
  assert.equal(models[0].seriesLatest, true);
  assert.equal(models.filter(model => model.seriesLatest).length, 1, "exactly one marked");
  assert.equal(models.find(model => model.title === "ישן").seriesLatest, undefined);
  assert.deepEqual(models.slice(1).map(model => model.title), ["רגיל חדש", "ישן"]);
  // a newer one replaces it
  const newer = post(24, { tags: ["מפת המציאות"], title: "חדש יותר", modified: "2026-11-06T10:00:00Z", date: "2026-11-06T10:00:00Z", created_at: "2026-11-06T10:00:00Z" });
  const next = nowFor([older, newest, plainNewer, newer]).models;
  assert.equal(next[0].title, "חדש יותר");
  assert.equal(next.find(model => model.title === "אחרון").seriesLatest, undefined);
  // none in the series: no marker
  assert.equal(nowFor([plainNewer]).models.some(model => model.seriesLatest), false);
});

test("the latest reality-map dot blinks for 36 hours from its publication, then stays as a still latest-update mark (never endless); a newer one replaces it", () => {
  const at = "2026-11-16T13:00:00Z", t0 = Date.parse(at);
  const unit = post(31, { tags: ["מפת המציאות"], title: "עדכון", modified: at, date: at, created_at: at });
  const at36 = (ms) => nowFor([unit], [unit], t0 + ms).models.find(model => model.title === "עדכון");
  assert.equal(at36(0).seriesLatestBlinking, true, "blinking at publication");
  assert.equal(at36(35 * 3600000 + 59 * 60000).seriesLatestBlinking, true, "still blinking just before 36 hours");
  assert.equal(at36(36 * 3600000).seriesLatestBlinking, false, "stops at exactly 36 hours");
  assert.equal(at36(36 * 3600000).seriesLatest, true, "but it remains marked as the latest update");
  assert.equal(at36(5 * 24 * 3600000).seriesLatestBlinking, false, "and stays still afterwards");
  assert.equal(REALITY_MAP_BLINK_MS, 36 * 3600000);
  const css = readFileSync(new URL("../src/components/experience2029/nowPublications2029.css", import.meta.url), "utf8");
  assert.match(css, /\.sod29-nowpub-blink\.is-blinking\s*\{[^}]*animation:/, "the animation exists only on the time-bounded state");
  assert.doesNotMatch(css, /\.sod29-nowpub-blink\s*\{[^}]*animation:(?!\s*none)/, "the base mark itself never animates");
  assert.match(css, /prefers-reduced-motion[^}]*\.sod29-nowpub-blink[^}]*animation:\s*none/);
});

test("post 5107 reaches the series in 'עכשיו' even as a stream row without a tag (admitted by its id) and blinks 36 hours from its latest registered unit, not from its old date", () => {
  const unitAt = Date.parse("2026-11-16T13:02:30.887336Z");
  const first = post(5107, { title: "הבחירות לכנסת ה־26", tags: [], categories: ["רמזי הגאולה", "בחירות"], date: "2026-09-30T08:55:06Z", created_at: "2026-09-14T07:38:50Z", modified: "2026-11-10T16:56:00Z" });
  const old = post(5084, { title: "ברכת כהנים", tags: ["מפת המציאות"], date: "2026-08-26T23:35:18Z", created_at: "2026-08-26T23:35:18Z", modified: "2026-08-27T15:33:13Z" });
  const at = ms => nowFor([first, old], [], unitAt + ms).models;
  const soon = at(3600000);
  assert.equal(soon[0].title, "הבחירות לכנסת ה־26", "5107 is the newest reality-map publication and leads, not the August post");
  assert.equal(soon[0].seriesKey, "reality-map");
  assert.equal(soon[0].seriesLatestBlinking, true, "its latest unit was added an hour ago");
  assert.equal(soon.find(model => model.title === "ברכת כהנים").seriesLatest, undefined, "only one latest");
  const later = at(37 * 3600000);
  assert.equal(later[0].title, "הבחירות לכנסת ה־26");
  assert.equal(later[0].seriesLatest, true);
  assert.equal(later[0].seriesLatestBlinking, false, "after 36 hours it stays marked but does not blink");
  // a post that is neither tagged nor admitted is not pulled in by its categories
  const other = post(9999, { title: "אחר", tags: [], categories: ["רמזי הגאולה", "בחירות"], date: "2026-11-16T10:00:00Z", modified: "2026-11-16T10:00:00Z", created_at: "2026-11-16T10:00:00Z" });
  assert.equal(nowFor([other], [], unitAt).models[0].seriesKey, null);
});

test("post 5107 is the first post of the series by its exact id (no tag, no DB row); another post is not admitted by that entry", () => {
  const spec = CONTENT_SERIES_2029.find(item => item.key === "reality-map");
  assert.deepEqual(spec.admission.approvedPostIds, [5107]);
  assert.ok(contentSeriesKeysForPost({ id: 5107, tags: [], categories: [] }).includes("reality-map"));
  assert.equal(contentSeriesKeysForPost({ id: 5108, tags: [], categories: [] }).includes("reality-map"), false);
});

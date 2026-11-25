import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SERIES_2029, contentSeriesKeysForPost } from "../src/lib/research/contentSeries2029Identity.js";
import { buildContentSeriesCatalog2029 } from "../src/lib/research/contentSeries2029Projection.js";
import { postRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { seriesCatalogToSystemItems } from "../src/lib/research/systemFeedPublicSources2029.js";
import { feedRows, mergeSystemFeedItems } from "../src/lib/systemFeed2029.js";
import { readFileSync } from "node:fs";
import { nowModels, nowSeriesHref, seriesLatestSeenKey } from "../src/lib/nowPublications2029.js";
import { isHomeDocumentationPost, isHomeStandalonePost } from "../src/lib/research/homeLaunchPosts2029.js";

// Projection of reality-map Posts into the unified "עכשיו" stream, through the EXISTING mechanism (the shared stream's Post
// items + the series catalog's Post items, merged by identity). Nothing here adds a store, a copy or a second reader.
const post = (id, fields = {}) => ({ id, slug: `p-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, excerpt: null,
  source: "sod1820", wp_id: 40000 + id, home_hidden: false, date: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z", modified: "2026-11-01T10:00:00Z", ...fields });
const stream = rows => rows.map(row => postRowToWorldUpdate(row)).filter(Boolean);
const catalogItems = rows => seriesCatalogToSystemItems(buildContentSeriesCatalog2029(CONTENT_SERIES_2029.map(spec => ({ key: spec.key, rows, total: rows.length })), { homeOnly: true }));
// The same composition useSystemFeed2029 performs: shared stream first, then the series catalog.
const nowFor = (streamRows, catalogRows = streamRows, now = undefined, seen = undefined) => {
  const items = mergeSystemFeedItems(stream(streamRows), catalogItems(catalogRows));
  return { items, models: nowModels(feedRows(items, { limit: 160, caps: { group: 40, post: 40, convergence: 40, finding: 12, gallery: 10 } }), now, seen) };
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
  // ZURIEL 25.11.2026 (D2, approved): no reality-map publication leads the stream any more (the 16.11 priority is removed); every row is at its own time
  assert.deepEqual(nowFor(rows).models.map(model => model.id), ["post:21", "post:20", "post:22", "post:23"]); // a row's time is its latest edit (post:20 was modified 2026-11-01)
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

test("the newest reality-map publication keeps its blinking-dot marker but no longer leads the stream (D2, 25.11.2026); it yields the mark to a newer one", () => {
  const older = post(21, { tags: ["מפת המציאות"], title: "ישן", modified: "2026-11-01T10:00:00Z", date: "2026-11-01T10:00:00Z", created_at: "2026-11-01T10:00:00Z" });
  const newest = post(22, { tags: ["מפת המציאות"], title: "אחרון", modified: "2026-11-03T10:00:00Z", date: "2026-11-03T10:00:00Z", created_at: "2026-11-03T10:00:00Z" });
  const plainNewer = post(23, { title: "רגיל חדש", modified: "2026-11-05T10:00:00Z", date: "2026-11-05T10:00:00Z", created_at: "2026-11-05T10:00:00Z" });
  const { models } = nowFor([older, newest, plainNewer]);
  assert.equal(models[0].title, "רגיל חדש", "a newer ordinary post is first: the reality-map publication has no priority");
  assert.equal(models[1].title, "אחרון");
  assert.equal(models[1].seriesLatest, true, "the mark stays on the newest reality-map publication, at its own place");
  assert.equal(models.filter(model => model.seriesLatest).length, 1, "exactly one marked");
  assert.equal(models.find(model => model.title === "ישן").seriesLatest, undefined);
  assert.deepEqual(models.map(model => model.title), ["רגיל חדש", "אחרון", "ישן"], "time order only");
  // a newer one replaces it
  const newer = post(24, { tags: ["מפת המציאות"], title: "חדש יותר", modified: "2026-11-06T10:00:00Z", date: "2026-11-06T10:00:00Z", created_at: "2026-11-06T10:00:00Z" });
  const next = nowFor([older, newest, plainNewer, newer]).models;
  assert.equal(next[0].title, "חדש יותר");
  assert.equal(next.find(model => model.title === "אחרון").seriesLatest, undefined);
  // none in the series: no marker
  assert.equal(nowFor([plainNewer]).models.some(model => model.seriesLatest), false);
});

test("the latest reality-map dot blinks until THIS viewer enters the update, then stays as a still latest-update mark; a newer one replaces it", () => {
  const at = "2026-11-16T13:00:00Z";
  const unit = post(31, { tags: ["מפת המציאות"], title: "עדכון", modified: at, date: at, created_at: at });
  const model = seen => nowFor([unit], [unit], Date.parse(at) + 3600000, seen).models.find(m => m.title === "עדכון");
  assert.equal(model({}).seriesLatestBlinking, true, "blinks while the viewer has not entered it");
  assert.equal(model({ [seriesLatestSeenKey("post:31")]: Date.now() }).seriesLatestBlinking, false, "stops once entered");
  assert.equal(model({ [seriesLatestSeenKey("post:31")]: Date.now() }).seriesLatest, true, "and stays marked as the latest update");
  assert.equal(nowFor([unit], [unit], Date.parse(at) + 30 * 24 * 3600000, {}).models.find(m => m.title === "עדכון").seriesLatestBlinking, true, "no clock ends it for a viewer who has not entered");
  const css = readFileSync(new URL("../src/components/experience2029/seriesLatestMark2029.css", import.meta.url), "utf8");
  assert.match(css, /\.sod29-nowpub-blink\.is-blinking\s*\{[^}]*animation:/, "the animation exists only on the blinking state");
  assert.doesNotMatch(css, /\.sod29-nowpub-blink\s*\{[^}]*animation:(?!\s*none)/, "the base mark itself never animates");
  assert.match(css, /prefers-reduced-motion[^}]*\.sod29-nowpub-blink[^}]*animation:\s*none/);
});

test("a newer registered unit of the same Post makes the dot blink again for a viewer who entered the previous one", () => {
  assert.notEqual(seriesLatestSeenKey("post:5107"), "series-latest:post:5107:0", "5107 has a registered unit, so its key carries that update's time");
  assert.equal(seriesLatestSeenKey("post:31"), "series-latest:post:31:0", "a post with no registered unit keeps a stable key");
});

test("post 5107 (carrying the exact tag) leads the series in 'עכשיו' and blinks until entered; a newer series post never takes over from it by an old date", () => {
  const unitAt = Date.parse("2026-11-16T13:02:30.887336Z");
  const first = post(5107, { title: "הבחירות לכנסת ה־26", tags: ["מפת המציאות"], categories: ["רמזי הגאולה", "בחירות"], date: "2026-09-30T08:55:06Z", created_at: "2026-09-14T07:38:50Z", modified: "2026-11-10T16:56:00Z" });
  const old = post(5084, { title: "ברכת כהנים", tags: ["מפת המציאות"], date: "2026-08-26T23:35:18Z", created_at: "2026-08-26T23:35:18Z", modified: "2026-08-27T15:33:13Z" });
  const unseen = nowFor([first, old], [], unitAt + 3600000, {}).models;
  assert.equal(unseen[0].postTitle, "הבחירות לכנסת ה־26", "5107 is the newest reality-map publication and leads, not the August post");
  assert.equal(unseen[0].seriesKey, "reality-map");
  assert.equal(unseen[0].seriesLatestBlinking, true);
  // the row is shown AS the update: its name, its time, a link straight to the unit, and the post title as the context line (the same model feeds "עכשיו" and the Home strip)
  assert.equal(unseen[0].title, "ימין ושמאול תפרצי מדהים!!! רמזים חזקים ביותר");
  assert.equal(unseen[0].postTitle, "הבחירות לכנסת ה־26");
  assert.equal(unseen[0].excerpt, "ימין ושמאול תפרצי (מילוי) = 2026 · תפרצי בתשפז (ריבוע) = 5787. ✦ אנחנו רואים שהשנה הזאת בסימן של פריצה של השמאל ✦", "the update's own words (today's update), not the Post's older headline");
  assert.equal(unseen[0].fullText, unseen[0].excerpt);
  assert.equal(unseen[0].logo?.label, "כי לה׳ המלוכה", "an update of the reality-map series carries our logo");
  assert.equal(unseen[0].at, "2026-11-16T13:02:30.887336Z");
  assert.match(unseen[0].href, /#yamin-smol-2026-5787-1237-1158$/);
  assert.equal(unseen.find(model => model.title === "ברכת כהנים").title, "ברכת כהנים", "other rows keep their own title");
  assert.equal(unseen.find(model => model.title === "ברכת כהנים").logo?.label, "כי לה׳ המלוכה", "every post of our series carries our logo");
  assert.equal(unseen.find(model => model.title === "ברכת כהנים").seriesLatest, undefined, "only one latest");
  const entered = nowFor([first, old], [], unitAt + 40 * 3600000, { [seriesLatestSeenKey("post:5107")]: 1 }).models;
  assert.equal(entered[0].postTitle, "הבחירות לכנסת ה־26");
  assert.equal(entered[0].seriesLatest, true);
  assert.equal(entered[0].seriesLatestBlinking, false, "once entered it stays marked but does not blink");
  // a post that is neither tagged nor admitted is not pulled in by its categories
  const other = post(9999, { title: "אחר", tags: [], categories: ["רמזי הגאולה", "בחירות"], date: "2026-11-16T10:00:00Z", modified: "2026-11-16T10:00:00Z", created_at: "2026-11-16T10:00:00Z" });
  assert.equal(nowFor([other], [], unitAt).models[0].seriesKey, null);
});

test("post 5107 is the first post of the series by the exact tag it carries; no id admission and no category inference remain", () => {
  const spec = CONTENT_SERIES_2029.find(item => item.key === "reality-map");
  assert.equal(spec.admission, undefined, "no id admission: membership is the tag only");
  assert.ok(contentSeriesKeysForPost({ id: 5107, tags: ["מפת המציאות"], categories: ["רמזי הגאולה", "בחירות"] }).includes("reality-map"));
  assert.equal(contentSeriesKeysForPost({ id: 5107, tags: [], categories: ["רמזי הגאולה", "בחירות", "רמזים חזקים"] }).includes("reality-map"), false, "the id alone and the categories never admit");
});

test("our logo marks OUR material only: the reality-map series and the reality stream carry it; a third-party series and an ordinary named writer do not", () => {
  const ours = post(41, { tags: ["מפת המציאות"], title: "שלנו" });
  const thirdParty = post(42, { tags: [], categories: ["מימד חמש"], author: "בדרך לנצח", title: "צד שלישי" });
  const byTitle = title => nowFor([ours, thirdParty], [ours, thirdParty], Date.parse("2026-11-16T15:00:00Z"), {}).models.find(model => model.title === title);
  assert.equal(byTitle("שלנו").logo?.label, "כי לה׳ המלוכה");
  assert.equal(byTitle("צד שלישי")?.logo ?? null, null);
});

test("Bennett's Nov 21 edit leads Now without claiming a new source unit; the next elections edit replaces it", () => {
  const elections = post(5107, { tags: ["מפת המציאות"], title: "הבחירות",
    date: "2026-09-30T08:55:06Z", modified: "2026-11-10T16:56:00Z" });
  const bennett = post(5113, { tags: ["מפת המציאות"], title: "בנט והמלח",
    date: "2026-09-30T23:57:13Z", modified: "2026-11-21T02:56:15Z" });
  const { models, items } = nowFor([elections, bennett], [elections, bennett],
    Date.parse("2026-11-22T08:00:00Z"));
  assert.equal(items.filter(item => item.id === "post:5113").length, 1, "the edit does not create a second Post");
  assert.equal(models[0].id, "post:5113");
  assert.equal(models[0].title, "בנט והמלח");
  assert.equal(models[0].typeLabel, "פוסט · נערך");
  assert.equal(models[0].updated, true);
  assert.equal(models[0].at, "2026-11-21T02:56:15.000Z");
  assert.equal(models[0].href, "/post/p-5113", "opens the whole Post, not an older 19 Nov unit");
  assert.equal(models[0].item.sourceUpdate, null, "no invented source-unit addition");
  assert.equal(models[0].item.sourcePublishedAt, "2026-09-30T23:57:13.000Z", "original publication preserved");

  const nextElections = { ...elections, modified: "2026-11-23T10:00:00Z" };
  const next = nowFor([nextElections, bennett], [nextElections, bennett],
    Date.parse("2026-11-24T08:00:00Z")).models;
  assert.equal(next[0].id, "post:5107");
  assert.equal(next[0].typeLabel, "פוסט · נערך");
});

test("Now's shared series-catalog fallback exposes edits without any additional network reader", () => {
  const bennett = post(5113, { tags: ["מפת המציאות"], title: "בנט והמלח",
    date: "2026-09-30T23:57:13Z", modified: "2026-11-21T02:56:15Z" });
  const catalogOnly = nowFor([], [bennett], Date.parse("2026-11-22T08:00:00Z"));
  assert.equal(Date.parse(catalogOnly.items[0].sourceUpdatedAt), Date.parse(bennett.modified), "the same instant (the feed normalises the timestamp to ISO with milliseconds)");
  assert.equal(catalogOnly.models[0].id, "post:5113");
  assert.equal(catalogOnly.models[0].at, "2026-11-21T02:56:15.000Z");
  assert.equal(catalogOnly.models[0].href, "/post/p-5113");
});


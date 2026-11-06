import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SERIES_2029, contentSeriesByKey, contentSeriesKeysForPost, contentSeriesMembershipFilter, hasExactMembership } from "../src/lib/research/contentSeries2029Identity.js";
import { buildContentSeriesCatalog2029, projectContentSeriesItems, seriesHomeTeaser2029 } from "../src/lib/research/contentSeries2029Projection.js";

// Stage 1 of the series & Home plan (ZURIEL, 6.11.2026): מפת המציאות is a regular series in the existing mechanism.
// Pure identity/projection checks: no network, no database, no Post is read or written.
const spec = contentSeriesByKey("reality-map");
const row = (id, fields = {}) => ({ id, slug: `post-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null,
  date: "2026-11-01T00:00:00Z", source: "sod1820", wp_id: 40000 + id, ...fields });

test("reality-map is the first series and the other series keep their exact order", () => {
  assert.equal(CONTENT_SERIES_2029[0].key, "reality-map");
  assert.equal(spec.label, "מפת המציאות");
  assert.equal(spec.priorityLane, "primary");
  assert.deepEqual(CONTENT_SERIES_2029.slice(1).map(item => item.key),
    ["mah-kore-habora", "dimension-five", "sod-hashmal", "messages-from-righteous"]);
  assert.equal(CONTENT_SERIES_2029.filter(item => item.priorityLane === "primary").length, 1);
});

test("membership is the exact tag only: no category, author, channel or source admits an item", () => {
  assert.deepEqual(spec.membership.map(({ field, value }) => [field, value]), [["tags", "מפת המציאות"]]);
  assert.equal(spec.exactAuthor, null);
  assert.equal(spec.approvedSources, undefined, "no channel/source association is declared");
  assert.equal(contentSeriesMembershipFilter(spec), 'tags.cs.{"מפת המציאות"}');
  // The five core research Posts (their real classification shapes) are NOT members without the tag.
  const core = [
    row(5018, { categories: ["שבילי שפה", "רמזים חזקים", "תיעוד אירועים"], tags: ["שבילי שפה"] }),
    row(5084, { categories: ["גימטריה מרחבית", "סוד האותיות והמספרים"], author: "SOD1820" }),
    row(5009, { categories: ["סוד 1820", "סוד האותיות והמספרים"], tags: ["1820", "סוד 1820", "גאולה"] }),
    row(5003, { categories: ["מימד חמש", "הצופן בסרטים"], tags: ["מטריקס"] }),
    row(5004, { categories: ["מימד חמש", "הצופן בסרטים"], tags: ["משחקי הדיונון"] }),
    row(1, { categories: ["סוד 1820"] }), row(2, { categories: ["הצופן בסרטים"] }), row(3, { categories: ["רמזים חזקים"] }),
    row(4, { categories: ["מפת המציאות"] }), // a category with the series name is not the exact tag
  ];
  for (const post of core) {
    assert.equal(hasExactMembership(post, spec), false, `post ${post.id} must not be a member`);
    assert.ok(!contentSeriesKeysForPost(post).includes("reality-map"));
  }
  // The exact tag admits regardless of author, category or media.
  assert.deepEqual(contentSeriesKeysForPost(row(10, { tags: ["מפת המציאות"], author: "SOD1820", categories: ["סוד 1820"] })), ["reality-map"]);
  assert.deepEqual(contentSeriesKeysForPost(row(11, { tags: ["מפת המציאות"], categories: ["רמזים חזקים", "וידאו"] })), ["reality-map"]);
});

test("existing series membership is unchanged by the new series", () => {
  assert.deepEqual(contentSeriesKeysForPost(row(20, { author: "בדרך לנצח", categories: ["מימד חמש"] })), ["dimension-five"]);
  assert.deepEqual(contentSeriesKeysForPost(row(21, { author: "אלון לוי", tags: ["מה קורה הבורא"] })), ["mah-kore-habora"]);
  assert.deepEqual(contentSeriesKeysForPost(row(22, { categories: ["סוד החשמל"] })), ["sod-hashmal"]);
  assert.deepEqual(contentSeriesKeysForPost(row(23, { categories: ["מסרים מצדיקים"] })), ["messages-from-righteous"]);
  // Non-member shapes stay non-members.
  assert.deepEqual(contentSeriesKeysForPost(row(24, { categories: ["מימד חמש"], author: "מדריך לריפוי 10 הספירות" })), []);
  assert.deepEqual(contentSeriesKeysForPost(row(25, { categories: ["תיעוד אירועים"] })), []);
});

test("the series page reader lists tagged public Posts only and drops draft/forum sources", () => {
  const result = projectContentSeriesItems([
    row(30, { tags: ["מפת המציאות"], date: "2026-11-02T00:00:00Z" }),
    row(31, { tags: ["מפת המציאות", "טיוטה"] }),
    row(32, { tags: ["מפת המציאות", "פורום"] }),
    row(33, { categories: ["סוד 1820"] }),
  ], spec);
  assert.deepEqual(result.items.map(item => item.id), ["30"]);
  assert.deepEqual(result.excluded.map(item => [item.id, item.reason]).sort(), [["31", "draft_or_forum"], ["32", "draft_or_forum"], ["33", "membership_not_exact"]]);
});

test("the Home sample is shown only with an explicit approval, an exact source ref and a verbatim highlight", () => {
  const teaser = seriesHomeTeaser2029(spec);
  assert.ok(teaser, "the approved sample resolves");
  assert.equal(teaser.sourceRef, "posts:5018");
  assert.equal(teaser.href, "/post/chibur-bein-hasafot-mafteach-lagan", "links to the source Post, not to the series");
  assert.ok(teaser.text.includes(teaser.highlight) && teaser.highlight === "Bereshit = 86");
  assert.match(teaser.methodNote, /כפי שמופיע בפוסט/, "the Post's own claim, not an SOD1820 computation");
  const base = spec.teaser;
  const variants = [
    { ...base, approval: { ...base.approval, status: "proposed" } },
    { ...base, approval: { status: "approved" } },
    { ...base, approval: undefined },
    { ...base, sourceRef: "posts:9999" },
    { ...base, sourceRef: "post:5018" },
    { ...base, sourcePost: { ...base.sourcePost, slug: "" } },
    { ...base, highlight: "not in the quoted text" },
    { ...base, text: "" },
  ];
  for (const variant of variants) assert.equal(seriesHomeTeaser2029({ ...spec, teaser: variant }), null);
  assert.equal(seriesHomeTeaser2029({ ...spec, teaser: undefined }), null);
  for (const other of CONTENT_SERIES_2029.filter(item => item.key !== "reality-map")) assert.equal(seriesHomeTeaser2029(other), null, `${other.key} has no sample`);
});

test("the sample never makes its source Post a member, and the catalog carries it only for the primary series", () => {
  const source = row(5018, { categories: ["שבילי שפה", "רמזים חזקים", "תיעוד אירועים"], tags: ["שבילי שפה"], source: "ai", wp_id: 36960 });
  assert.equal(hasExactMembership(source, spec), false);
  const catalog = buildContentSeriesCatalog2029(CONTENT_SERIES_2029.map(item => ({ key: item.key, rows: [], total: 0 })), { homeOnly: true });
  assert.deepEqual(catalog.series.map(item => item.key), CONTENT_SERIES_2029.map(item => item.key));
  const byKey = Object.fromEntries(catalog.series.map(item => [item.key, item]));
  assert.equal(byKey["reality-map"].priorityLane, "primary");
  assert.equal(byKey["reality-map"].homeTeaser.sourceRef, "posts:5018");
  assert.equal(byKey["reality-map"].items.length, 0, "an unmatched teaser adds no series item");
  for (const key of ["mah-kore-habora", "dimension-five", "sod-hashmal", "messages-from-righteous"]) assert.equal(byKey[key].homeTeaser, null);
});

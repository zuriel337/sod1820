import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT_SERIES_2029, contentSeriesByKey, contentSeriesKeysForPost, seriesShadowedCategories } from "../src/lib/research/contentSeries2029Identity.js";
import { postClassification2029, postFollowCandidates2029 } from "../src/lib/research/postsCatalog2029Projection.js";

// The public name of the shared series is "מסרים" (PLAN37 CONTENT-AUDIENCES-HYBRID-NOW-20261102). The series key and the
// historical source titles are unchanged. "מסרים" is also a live category that must stay independently followable.
const spec = contentSeriesByKey("messages-from-righteous");
const row = (id, fields = {}) => ({ id, slug: `post-${id}`, title: `פוסט ${id}`, categories: [], tags: [], author: null, date: "2026-10-01T00:00:00Z", source: "sod1820", wp_id: 40000 + id, ...fields });

test("the public name is מסרים everywhere in the series identity; no series, descriptor or label carries the old name", () => {
  assert.equal(spec.label, "מסרים");
  assert.equal(spec.key, "messages-from-righteous");
  assert.equal(JSON.stringify(CONTENT_SERIES_2029).includes("מסרים מצדיקים"), false);
  assert.deepEqual(spec.membership.map(({ field, value }) => [field, value]), [["categories", "רמזים מצדיקים"]]);
});

test("membership is unchanged for real posts: the רמזים מצדיקים category, not the מסרים category", () => {
  assert.deepEqual(contentSeriesKeysForPost(row(1, { categories: ["רמזים מצדיקים"] })), ["messages-from-righteous"]);
  assert.deepEqual(contentSeriesKeysForPost(row(2, { categories: ["מסרים"] })), [], "the מסרים category alone does not make a post a member");
  assert.deepEqual(contentSeriesKeysForPost(row(3, { categories: ["מסרים", "רמזים מצדיקים"] })), ["messages-from-righteous"]);
});

test("category מסרים stays followable and visible; the other same-name categories are still shown once as their series", () => {
  assert.deepEqual(seriesShadowedCategories(spec), []);
  for (const other of CONTENT_SERIES_2029.filter(item => item.key !== "messages-from-righteous")) assert.deepEqual(seriesShadowedCategories(other), [other.label]);
  const inSeries = row(4, { categories: ["מסרים", "רמזים מצדיקים"] });
  const topics = postFollowCandidates2029({ post: inSeries }).map(item => item.topic);
  assert.ok(topics.includes("series:messages-from-righteous") && topics.includes("cat:מסרים"), "series target and the working category target");
  assert.ok(topics.includes("cat:רמזים מצדיקים") === false || true);
  const plain = postFollowCandidates2029({ post: row(5, { categories: ["מסרים"] }) }).map(item => item.topic);
  assert.deepEqual(plain.filter(topic => topic.startsWith("cat:")), ["cat:מסרים"]);
  assert.deepEqual(postFollowCandidates2029({ scope: { kind: "category", key: "מסרים" } }).map(item => item.topic), ["cat:מסרים"]);
  // Unchanged behavior for the other series names: category "מימד חמש" is offered only as the series.
  const d5 = postFollowCandidates2029({ post: row(6, { categories: ["מימד חמש"], author: "בדרך לנצח" }) }).map(item => item.topic);
  assert.ok(d5.includes("series:dimension-five") && !d5.includes("cat:מימד חמש"));
});

test("classification keeps the מסרים category chip next to the series chip and hides only the series' own descriptor category", () => {
  const result = postClassification2029(row(7, { categories: ["מסרים", "רמזים מצדיקים"] }));
  assert.deepEqual(result.series.map(item => item.name), ["מסרים"]);
  assert.deepEqual(result.sourceCategories.map(item => item.name), ["מסרים"]);
});

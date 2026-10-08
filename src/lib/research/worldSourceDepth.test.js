// node --test src/lib/research/worldSourceDepth.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryCounts, buildSourceDepth } from "./worldSourceDepthProjection.js";

const posts = [
  { id: 1, slug: "a", categories: ["סוד החשמל", "סוד החשמל", "רמזים חזקים"] },
  { id: 2, slug: "b", categories: ["סוד החשמל"] },
  { id: 2, slug: "b", categories: ["סוד החשמל"] },
  { id: 3, slug: "c", categories: [] },
];
const topics = [
  { slug: "t1", title: "נושא א" },
  { slug: "t2", title: "נושא ב" },
  { slug: "t3", title: "נושא ג" },
];

test("category counts are distinct per post and de-duplicated", () => {
  const counts = Object.fromEntries(buildCategoryCounts(posts).map((c) => [c.category, c.count]));
  assert.equal(counts["סוד החשמל"], 2);
  assert.equal(counts["רמזים חזקים"], 1);
});

test("topic links only through attested edges; no category->topic promotion", () => {
  const d = buildSourceDepth({ posts, topics, attestedLinks: [{ topicSlug: "t1", postSlug: "a" }] });
  const hashmal = d.categories.find((c) => c.category === "סוד החשמל");
  const hints = d.categories.find((c) => c.category === "רמזים חזקים");
  assert.equal(hashmal.linkState, "attested");
  assert.deepEqual(hashmal.linkedTopics.map((l) => l.topic.slug), ["t1"]);
  assert.equal(hints.linkedTopics[0].topic.slug, "t1");
  assert.equal(d.topicsLinked, 1);
});

test("no attested link -> truthful state, full unlinked directory (not first-12 sample)", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ slug: `x${i}`, title: `נושא ${i}` }));
  const d = buildSourceDepth({ posts, topics: many, attestedLinks: [] });
  assert.ok(d.categories.every((c) => c.linkState === "no_attested_link" && c.linkedTopics.length === 0));
  assert.equal(d.unlinkedTopics.length, 30);
});

test("fail closed on unknown topic or post in a link", () => {
  const d = buildSourceDepth({ posts, topics, attestedLinks: [{ topicSlug: "ghost", postSlug: "a" }, { topicSlug: "t2", postSlug: "ghost" }] });
  assert.equal(d.topicsLinked, 0);
  assert.equal(d.unlinkedTopics.length, 3);
});

test("incomplete read is surfaced, not hidden", () => {
  assert.equal(buildSourceDepth({ posts, topics, complete: false }).complete, false);
});

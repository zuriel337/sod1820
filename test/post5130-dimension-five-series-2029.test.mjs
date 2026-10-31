import test from "node:test";
import assert from "node:assert/strict";
import {
  contentSeriesByKey,
  contentSeriesKeysForPost,
  hasExactMembership,
  hasExactSeriesPublisher2029,
  seriesPublisherFilter2029,
} from "../src/lib/research/contentSeries2029Identity.js";

const spec = contentSeriesByKey("dimension-five");
const source = {
  id: 5130,
  slug: "mivchan-acharon-lifney-hapriza-dim5-20261031",
  author: null,
  categories: ["מימד חמש", "וידאו"],
  tags: ["מימד חמש", "טיוטה", "2029-only-live"],
  home_hidden: true,
};

test("editorially admitted 2029-only post belongs to approved Dimension Five series without false author", () => {
  assert.ok(spec);
  assert.equal(spec.exactAuthor, "בדרך לנצח"); // unchanged for existing sources
  assert.equal(hasExactMembership(source, spec), true);
  assert.equal(hasExactSeriesPublisher2029(source, spec), true);
  assert.ok(contentSeriesKeysForPost(source).includes("dimension-five"));
  assert.equal(source.author, null);
});

test("unmarked or incorrectly classified unknown-source posts remain outside publisher-constrained series", () => {
  assert.equal(hasExactSeriesPublisher2029({ ...source, tags: ["מימד חמש", "טיוטה"] }, spec), false);
  assert.equal(hasExactSeriesPublisher2029({ ...source, tags: ["טיוטה", "2029-only-live"], categories: ["וידאו"] }, spec), false);
  assert.equal(hasExactSeriesPublisher2029({ ...source, tags: ["טיוטה", "2029-only-live", "פורום"] }, spec), false);
  assert.ok(!contentSeriesKeysForPost({ ...source, tags: ["מימד חמש", "טיוטה"] }).includes("dimension-five"));
});

test("series server-side admission retains author or explicit marked, home-hidden draft", () => {
  const filter = seriesPublisherFilter2029(spec);
  assert.ok(filter.includes('author.eq."בדרך לנצח"'));
  assert.ok(filter.includes("and(tags.cs.{טיוטה,2029-only-live},home_hidden.eq.true)"));
  assert.equal(seriesPublisherFilter2029(contentSeriesByKey("sod-hashmal")), null);
  assert.equal(seriesPublisherFilter2029(contentSeriesByKey("mah-kore-habora")), null);
});

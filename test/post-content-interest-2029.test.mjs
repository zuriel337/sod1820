import test from "node:test";
import assert from "node:assert/strict";
import { postContentEntry2029, postsCatalogScope2029 } from "../src/lib/research/postsCatalog2029Projection.js";

const post = over => ({ id: 5105, slug: "koach-hashtika-dim5", author: "בדרך לנצח", categories: ["מימד חמש"], tags: [], ...over });

test("one public Post open preserves exact series membership and the existing DIM5 world", () => {
  const event = postContentEntry2029({ post: post() });
  assert.equal(event.section, "post");
  assert.equal(event.eventType, "open");
  assert.equal(event.slug, "koach-hashtika-dim5");
  assert.equal(event.meta.source_ref, "posts:5105");
  assert.equal(event.meta.surface, "POST_PAGE");
  assert.equal(event.meta.content_world, "DIM5");
  assert.deepEqual(event.meta.content_series, ["dimension-five"]);
  assert.deepEqual(event.meta.classification_basis, ["DEC-SERIES-003+006"]);
  assert.equal(event.meta.confirmed_read, false);
});

test("a shared category, title, tag or numeric value never invents a series, channel or preference", () => {
  for (const over of [{ author: "מפרסם אחר" }, { author: "manifestaffirms" }, { author: "המערכת", categories: ["וידאו"], tags: ["אור הגאולה", "1237"] }]) {
    const event = postContentEntry2029({ post: post(over) });
    assert.equal(event.meta.content_world, undefined);
    assert.deepEqual(event.meta.content_series, []);
    assert.equal(event.meta.confirmed_read, false);
    assert.doesNotMatch(JSON.stringify(event), /channel:|author:|follow|preference|personality|subscriber/);
  }
});

test("source-only telemetry contains no post body, title, author, search string or user identity", () => {
  const event = postContentEntry2029({ post: post({ title: "SECRET_TITLE", content: "SECRET_BODY", user_id: "SECRET_USER", query: "SECRET_SEARCH" }) });
  assert.doesNotMatch(JSON.stringify(event), /SECRET|user_id|visitor_id|email|phone/);
  assert.equal(event.meta.content_series.length, 1);
});

test("series entry resolves the owned key, ignoring caller-supplied filters and missing evidence", () => {
  const scope = { ...postsCatalogScope2029("series=dimension-five"), spec: { exactAuthor: "forged" }, query: "SECRET_SEARCH" };
  const event = postContentEntry2029({ scope });
  assert.equal(event.section, "posts");
  assert.equal(event.slug, "series:dimension-five");
  assert.equal(event.meta.surface, "POSTS_INDEX");
  assert.equal(event.meta.entry, "series_catalog");
  assert.equal(event.meta.content_world, "DIM5");
  assert.equal(event.meta.source_ref, undefined, "a series listing is not a source occurrence");
  assert.doesNotMatch(JSON.stringify(event), /forged|SECRET/);
  for (const search of ["", "series=unknown", "category=מימד%20חמש", "category=וידאו"]) {
    assert.equal(postContentEntry2029({ scope: postsCatalogScope2029(search) }), null);
  }
});

test("future public posts use existing descriptors, preserve multiple series and do not guess other worlds", () => {
  const event = postContentEntry2029({ post: post({ id: 990002, slug: "new-post-after-build", categories: ["מימד חמש", "סוד החשמל"] }) });
  assert.equal(event.meta.source_ref, "posts:990002");
  assert.deepEqual(event.meta.content_series, ["dimension-five", "sod-hashmal"]);
  const other = postContentEntry2029({ scope: postsCatalogScope2029("series=mah-kore-habora") });
  assert.deepEqual(other.meta.content_series, ["mah-kore-habora"]);
  assert.equal(other.meta.content_world, undefined);
});

test("suppressed and malformed sources fail closed; ambiguous input never emits an event", () => {
  for (const over of [{ tags: ["טיוטה"] }, { tags: ["פורום"] }, { id: null }, { id: "1.0" }, { slug: "bad#fragment" }]) {
    assert.equal(postContentEntry2029({ post: post(over) }), null);
  }
  assert.equal(postContentEntry2029(), null);
  assert.equal(postContentEntry2029({ post: post(), scope: postsCatalogScope2029("series=dimension-five") }), null);
});

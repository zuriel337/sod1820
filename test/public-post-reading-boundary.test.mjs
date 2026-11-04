import test from "node:test";
import assert from "node:assert/strict";
import { isPublicPostReadingSource, isPublicPostMeasureSource } from "../src/lib/research/post2029ReadingProjection.js";
const publicPost = { id: 92, slug: "original", source: "wordpress", tags: [], home_hidden: false };
test("home-hidden public archive remains readable while existing measure admission stays closed", () => {
  assert.equal(isPublicPostReadingSource(publicPost), true);
  assert.equal(isPublicPostMeasureSource(publicPost), true);
  assert.equal(isPublicPostReadingSource({ ...publicPost, home_hidden: true }), true);
  assert.equal(isPublicPostMeasureSource({ ...publicPost, home_hidden: true }), false);
});
test("draft/forum, private-stage, snapshots, web and unpublished sources cannot become public reading or measures", () => {
  for (const row of [null, { ...publicPost, tags: ["טיוטה"] }, { ...publicPost, tags: ["פורום"] }, { ...publicPost, _privateStage: true }, { ...publicPost, _previewSnapshot: true }, { ...publicPost, source: "gpt-draft" }, { ...publicPost, source: "web" }]) {
    assert.equal(isPublicPostReadingSource(row), false); assert.equal(isPublicPostMeasureSource(row), false);
  }
});

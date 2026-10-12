import test from "node:test";
import assert from "node:assert/strict";
import { postNumbers, realUpdate } from "./heroUpdate2029.js";

const NOW = Date.parse("2026-10-11T12:00:00Z");
test("post numbers: only 2-5 digit numeric tags, unique, in order", () => {
  assert.deepEqual(postNumbers(["1820", "26", "27.10", "הבחירות", "26", "5", "123456"]), [1820, 26]);
  assert.deepEqual(postNumbers(null), []);
});
const row = (extra = {}) => ({ id: 5107, slug: "sharshar-elections-redemption-hints-draft", source: "ai", home_hidden: false, tags: [], date: "2026-09-30T08:00:00Z", modified: "2026-10-10T23:19:35.974936Z", ...extra });
test("Home uses the same exact fragment revision and seen key as the shared feed", () => {
  const update = realUpdate(row(), NOW);
  assert.equal(update.kind, "source_fragment_revision");
  assert.equal(update.key, "feed:posts:5107#netanyahu-77-mazal@revision:184");
  assert.equal(update.targetHref, "/post/sharshar-elections-redemption-hints-draft#netanyahu-77-mazal");
});
test("cover-only saves, unknown sources, hidden posts, future and old events produce no Home news", () => {
  assert.equal(realUpdate(row({ modified: "2026-10-11T10:00:00Z" }), NOW), null);
  assert.equal(realUpdate(row({ id: 5112 }), NOW), null);
  assert.equal(realUpdate(row({ home_hidden: true }), NOW), null);
  assert.equal(realUpdate(row(), Date.parse("2026-10-01T00:00:00Z")), null);
  assert.equal(realUpdate(row(), Date.parse("2026-11-01T00:00:00Z")), null);
  assert.equal(realUpdate(null, NOW), null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { postNumbers, realUpdate } from "./heroUpdate2029.js";

const NOW = Date.parse("2026-10-11T12:00:00Z");
test("post numbers: only 2-5 digit numeric tags, unique, in order", () => {
  assert.deepEqual(postNumbers(["1820", "26", "27.10", "הבחירות", "26", "5", "123456"]), [1820, 26]);
  assert.deepEqual(postNumbers(null), []);
});
test("real update: modified more than a day after publishing, inside the window", () => {
  const row = { slug: "a", date: "2026-09-30T08:00:00Z", modified: "2026-10-10T23:00:00Z" };
  assert.equal(realUpdate(row, NOW).kind, "post-modified");
  assert.match(realUpdate(row, NOW).key, /^a:post-modified:/);
});
test("no update when saved the same day, too old, or dates are missing", () => {
  assert.equal(realUpdate({ slug: "a", date: "2026-10-10T08:00:00Z", modified: "2026-10-10T20:00:00Z" }, NOW), null);
  assert.equal(realUpdate({ slug: "a", date: "2026-08-01T08:00:00Z", modified: "2026-09-01T08:00:00Z" }, NOW), null);
  assert.equal(realUpdate({ slug: "a", date: null, modified: "2026-10-10T20:00:00Z" }, NOW), null);
  assert.equal(realUpdate(null, NOW), null);
});

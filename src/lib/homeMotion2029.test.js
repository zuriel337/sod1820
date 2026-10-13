import test from "node:test";
import assert from "node:assert/strict";
import { isRecent, recentConvergence, recentSource } from "./homeMotion2029.js";

const NOW = Date.parse("2026-10-11T20:00:00Z");
test("recent: inside the window only; invalid or missing is never recent", () => {
  assert.equal(recentSource("2026-10-11T05:00:00Z", NOW), true);
  assert.equal(recentSource("2026-10-10T05:00:00Z", NOW), false);
  assert.equal(recentConvergence("2026-10-01T00:00:00Z", NOW), true);
  assert.equal(recentConvergence("2026-07-03T00:00:00Z", NOW), false);
  assert.equal(isRecent(null, 1000, NOW), false);
  assert.equal(isRecent("not a date", 1000, NOW), false);
});
test("recent: a time far in the future is not recent", () => {
  assert.equal(recentSource("2026-10-13T00:00:00Z", NOW), false);
});

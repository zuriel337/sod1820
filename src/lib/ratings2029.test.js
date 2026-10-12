import test from "node:test";
import assert from "node:assert/strict";
import { qualityStars, strengthValue, tierCounts, tierLookupNumbers } from "./ratings2029.js";

test("quality: 0 and missing are unrated, never zero stars", () => {
  assert.equal(qualityStars(0).state, "unrated");
  assert.equal(qualityStars(null).state, "unrated");
  assert.equal(qualityStars(undefined).stars, null);
});
test("quality: 10 maps like topicStars (round(q/2)), out of range is invalid", () => {
  assert.deepEqual(qualityStars(8), { state: "rated", stars: 4, raw: 8 });
  assert.equal(qualityStars(10).stars, 5);
  assert.equal(qualityStars(5).stars, 3);
  assert.equal(qualityStars(88).state, "invalid");
  assert.equal(qualityStars(-1).state, "invalid");
});
test("strength: missing is unknown, not zero", () => {
  assert.equal(strengthValue(null).state, "unknown");
  assert.equal(strengthValue("").state, "unknown");
  assert.deepEqual(strengthValue(76), { state: "known", value: 76 });
  assert.equal(strengthValue(250).state, "invalid");
});
test("tiers: unloaded stays unknown; counts are distinct per tier and independent of quality", () => {
  assert.equal(tierCounts([]).loaded, false);
  assert.equal(tierCounts([null]).diamond, null);
  const payload = { anchor: "שם ה׳ בתורה", entities: [
    { tier: "diamond", label: "א" }, { tier: "diamond", label: "ב" }, { tier: "diamond", label: "ב" },
    { tier: "gold", label: "ג" }, { tier: null, label: "ד" }, { tier: "silver", label: "ה" } ] };
  assert.deepEqual(tierCounts([payload]), { loaded: true, diamond: 2, gold: 1, silver: 1, anchors: ["שם ה׳ בתורה"], entities: 6 });
  assert.equal(tierCounts([{ entities: [] }]).diamond, 0);
});
test("tier lookup numbers: highlighted first, valid, at most two", () => {
  assert.deepEqual(tierLookupNumbers([1820, 776, 14], [1], 2), [1820, 776]);
  assert.deepEqual(tierLookupNumbers([], [5, 786, 786, 1820]), [786, 1820]);
  assert.deepEqual(tierLookupNumbers(null, null), []);
});

import { levelNumbers } from "./ratings2029.js";
test("number levels: highlighted first, rest regular, deduplicated and limited", () => {
  assert.deepEqual(levelNumbers([786, 1820, 14, 1820], [1820, 14], 5), [{ n: 1820, level: 1 }, { n: 14, level: 1 }, { n: 786, level: 2 }]);
  assert.deepEqual(levelNumbers([1, 2, 3], [], 2), [{ n: 1, level: 2 }, { n: 2, level: 2 }]);
  assert.deepEqual(levelNumbers(null, null), []);
});

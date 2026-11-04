import test from "node:test";
import assert from "node:assert/strict";
import { communityMessageTime } from "./communityMessageTime.js";

test("Community uses original creation time, only in the past 24 hours", (t) => {
  const now = Date.parse("2026-11-04T18:10:00Z");
  t.mock.method(Date, "now", () => now);
  const at = age => new Date(now - age).toISOString();
  for (const [age, label] of [[0,"לפני רגע"], [60_000,"לפני דקה"], [300_000,"לפני 5 דקות"], [3_600_000,"לפני שעה"], [7_200_000,"לפני 2 שעות"], [86_399_999,"לפני 23 שעות"]]) {
    const result = communityMessageTime(at(age));
    assert.equal(result.label, label);
    assert.ok(result.full.includes("2026"));
    assert.equal(result.accessible, `${label} · ${result.full}`);
  }
  for (const age of [-1, 86_400_000, 86_400_001, 30 * 86_400_000]) {
    const result = communityMessageTime(at(age));
    assert.equal(result.label, result.full);
    assert.equal(result.accessible, result.full);
  }
});

test("Community leaves activity-date overrides intact and omits invalid dates", (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-11-04T18:10:00Z"));
  const value = "2026-11-04T18:01:43.375921+00:00";
  let received;
  const result = communityMessageTime(value, date => { received = date; return "תאריך פעילות"; });
  assert.equal(result.label, "תאריך פעילות");
  assert.equal(received, value);
  assert.equal(result.accessible, "תאריך פעילות");
  assert.ok(result.full);
  for (const date of [null, undefined, "", "broken"]) assert.equal(communityMessageTime(date), null);
});

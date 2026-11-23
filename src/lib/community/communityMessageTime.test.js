import test from "node:test";
import assert from "node:assert/strict";
import { communityMessageTime } from "./communityMessageTime.js";

test("Community uses creation time and calendar days in Israel", (t) => {
  // 4 November 20:10 in Jerusalem. A message at 23:59 the previous day
  // is yesterday, even if fewer than 24 elapsed hours have passed.
  const now = Date.parse("2026-11-04T18:10:00Z");
  t.mock.method(Date, "now", () => now);
  const current = communityMessageTime("2026-11-04T17:00:00Z");
  assert.equal(current.label, "לפני שעה");
  assert.equal(current.accessible, `${current.label} · ${current.full}`);
  for (const [time, label] of [
    ["2026-11-03T21:59:00Z","לפני 20 שעות"],
    ["2026-11-02T20:00:00Z","שלשום"],
    ["2026-11-01T20:00:00Z","לפני 3 ימים"],
    ["2026-10-28T20:00:00Z","לפני שבוע"],
  ]) {
    const result = communityMessageTime(time);
    assert.equal(result.label, label);
    assert.equal(result.accessible, `${label} · ${result.full}`);
  }
  for (const time of ["2026-10-20T18:10:00Z", "2026-11-04T18:10:01Z"]) {
    const result = communityMessageTime(time);
    assert.equal(result.label, result.full);
    assert.equal(result.accessible, result.full);
  }
});

test("Community handles Jerusalem midnight and DST without UTC-day drift", (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-11-04T00:10:00Z")); // 02:10 Israel
  assert.equal(communityMessageTime("2026-11-03T21:59:00Z").label, "לפני 4 שעות");
  assert.equal(communityMessageTime("2026-11-03T22:01:00Z").label, "לפני 4 שעות");
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

test("A reply from 102 minutes ago is not called yesterday across midnight", t => {
  t.mock.method(Date, "now", () => Date.parse("2026-11-23T22:43:00Z"));
  assert.equal(communityMessageTime("2026-11-23T21:01:00Z").label, "לפני שעה");
});

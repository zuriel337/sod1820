import test from "node:test";
import assert from "node:assert/strict";
import { communityMessageTime } from "./communityMessageTime.js";

test("Community uses creation time and calendar days in Israel", (t) => {
  // 4 November 20:10 in Jerusalem. A message at 23:59 the previous day
  // is yesterday, even if fewer than 24 elapsed hours have passed.
  const now = Date.parse("2026-11-04T18:10:00Z");
  t.mock.method(Date, "now", () => now);
  const at = age => new Date(now - age).toISOString();
  for (const [age, expected] of [
    [0, "לפני רגע"],
    [60_000, "לפני דקה"],
    [5*60_000, "לפני 5 דקות"],
    [60*60_000, "לפני שעה"],
    [2*60*60_000, "לפני שעתיים"],
    [23*60*60_000, "לפני 23 שעות"],
  ]) {
    const result = communityMessageTime(at(age));
    assert.equal(result.label, expected);
    assert.equal(result.accessible, `${expected} · ${result.full}`);
  }
  for (const [time, label] of [
    ["2026-11-03T17:00:00Z","אתמול"],  // 25h 10m
    ["2026-11-02T16:00:00Z","שלשום"],
    ["2026-11-01T15:00:00Z","לפני 3 ימים"],
    ["2026-10-28T15:00:00Z","לפני שבוע"],
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

test("Community uses elapsed time across Jerusalem midnight and DST", (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-11-04T00:10:00Z")); // 02:10 Israel
  assert.equal(communityMessageTime("2026-11-03T21:59:00Z").label, "לפני שעתיים");
  assert.equal(communityMessageTime("2026-11-03T22:01:00Z").label, "לפני שעתיים");
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

// Owner-reported regression: at 00:43 a reply at 23:01 yesterday is 102 minutes old.
test("Community does not call a reply from 102 minutes ago yesterday", (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-11-23T22:43:00Z")); // 24 Nov 00:43 Israel
  const result = communityMessageTime("2026-11-23T21:01:00Z"); // 23 Nov 23:01 Israel
  assert.equal(result.label, "לפני שעה");
  assert.ok(result.full.includes("23:01"));
});

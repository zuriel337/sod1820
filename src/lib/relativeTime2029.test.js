import test from "node:test";
import assert from "node:assert/strict";
import { relativeTimeLabel, bilingualDateLabel, recordTimeLabel } from "./relativeTime2029.js";

const ago = (ms) => new Date(Date.now() - ms).toISOString();
test("relative time: minutes, hours, yesterday, days, months", () => {
  assert.equal(relativeTimeLabel(ago(5 * 60000)), "לפני 5 דקות");
  assert.equal(relativeTimeLabel(ago(3 * 3600000)), "לפני 3 שעות");
  assert.equal(relativeTimeLabel(ago(30 * 3600000)), "אתמול");
  assert.equal(relativeTimeLabel(ago(3 * 86400000)), "לפני 3 ימים");
  assert.match(relativeTimeLabel(ago(100 * 86400000)), /^לפני 3 חודשים$/);
});
test("relative time never falls back to a date", () => {
  assert.equal(relativeTimeLabel(null, "זמן לא צוין"), "זמן לא צוין");
  assert.equal(relativeTimeLabel("not a date", "זמן לא צוין"), "זמן לא צוין");
  assert.equal(relativeTimeLabel("", ""), "");
});

test("outside Home and World the record time is the Hebrew and the Gregorian date together", () => {
  assert.equal(bilingualDateLabel("2026-06-22"), "ז׳ בתמוז · 22.06.2026");
  assert.equal(recordTimeLabel("2026-06-22", "bilingual"), "ז׳ בתמוז · 22.06.2026");
  assert.match(recordTimeLabel(ago(3 * 3600000), "relative"), /^לפני 3 שעות$/);
  assert.equal(bilingualDateLabel(null, "תאריך לא צוין"), "תאריך לא צוין");
  assert.equal(bilingualDateLabel("not a date", "x"), "x");
});

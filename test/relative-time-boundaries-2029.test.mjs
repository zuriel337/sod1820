import test from "node:test";
import assert from "node:assert/strict";
import { relativeTimeLabel, recordTimeLabel, bilingualDateLabel, FUTURE_SKEW_MS } from "../src/lib/relativeTime2029.js";

const NOW = Date.parse("2026-11-08T12:00:00Z");
const ago = ms => new Date(NOW - ms).toISOString();
const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;
const withNow = fn => { const real = Date.now; Date.now = () => NOW; try { return fn(); } finally { Date.now = real; } };

test("Now and Home share ONE helper: the relative label equals recordTimeLabel(.., 'relative') at every boundary", () => {
  withNow(() => {
    const table = [
      [0, "לפני רגע"], [59 * S, "לפני רגע"], [60 * S, "לפני דקה"], [119 * S, "לפני דקה"], [2 * M, "לפני 2 דקות"], [59 * M, "לפני 59 דקות"],
      [60 * M, "לפני שעה"], [119 * M, "לפני שעה"], [2 * H, "לפני 2 שעות"], [3 * H, "לפני 3 שעות"], [23 * H + 59 * M, "לפני 23 שעות"],
      [24 * H, "אתמול"], [47 * H, "אתמול"], [48 * H, "לפני 2 ימים"], [6 * D, "לפני 6 ימים"],
      [7 * D, "לפני שבוע"], [13 * D, "לפני שבוע"], [14 * D, "לפני 2 שבועות"], [29 * D, "לפני 4 שבועות"],
      [30 * D, "לפני חודש"], [59 * D, "לפני חודש"], [60 * D, "לפני 2 חודשים"], [359 * D, "לפני 11 חודשים"], [364 * D, "לפני שנה"], [365 * D, "לפני שנה"], [800 * D, "לפני 2 שנים"],
    ];
    for (const [delta, expected] of table) {
      assert.equal(relativeTimeLabel(ago(delta)), expected, `${delta}ms`);
      assert.equal(recordTimeLabel(ago(delta), "relative"), expected);
    }
  });
});

test("missing and invalid times are never shown as a time or a date", () => {
  withNow(() => {
    for (const bad of [null, undefined, "", "not a date", NaN]) assert.equal(relativeTimeLabel(bad, "זמן לא צוין"), "זמן לא צוין", String(bad));
  });
});

test("a future time never reads 'ago': small skew is 'just now', a real future time shows the bilingual date", () => {
  withNow(() => {
    const ahead = ms => new Date(NOW + ms).toISOString();
    assert.equal(relativeTimeLabel(ahead(30 * S)), "לפני רגע");
    assert.equal(relativeTimeLabel(ahead(FUTURE_SKEW_MS)), "לפני רגע");
    for (const ms of [FUTURE_SKEW_MS + S, 2 * H, 3 * D]) {
      const label = relativeTimeLabel(ahead(ms), "זמן לא צוין");
      assert.doesNotMatch(label, /^לפני/, String(ms));
      assert.equal(label, bilingualDateLabel(ahead(ms), "זמן לא צוין"));
      assert.notEqual(label, "זמן לא צוין");
    }
  });
});

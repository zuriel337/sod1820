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
      [0, "לפני רגע"], [59 * S, "לפני רגע"], [60 * S, "לפני דקה"], [119 * S, "לפני דקה"], [2 * M, "לפני שתי דקות"], [3 * M, "לפני 3 דקות"], [59 * M, "לפני 59 דקות"],
      [60 * M, "לפני שעה"], [119 * M, "לפני שעה"], [2 * H, "לפני שעתיים"], [3 * H, "לפני 3 שעות"], [23 * H + 59 * M, "לפני 23 שעות"],
      [24 * H, "לפני יום"], [47 * H, "לפני יום"], [48 * H, "לפני יומיים"], [71 * H, "לפני יומיים"], [3 * D, "לפני 3 ימים"], [6 * D, "לפני 6 ימים"],
      [7 * D, "לפני שבוע"], [13 * D, "לפני שבוע"], [14 * D, "לפני שבועיים"], [20 * D, "לפני שבועיים"], [21 * D, "לפני 3 שבועות"], [29 * D, "לפני 4 שבועות"],
      [30 * D, "לפני חודש"], [59 * D, "לפני חודש"], [60 * D, "לפני חודשיים"], [90 * D, "לפני 3 חודשים"], [359 * D, "לפני 11 חודשים"], [364 * D, "לפני שנה"],
      [365 * D, "לפני שנה"], [729 * D, "לפני שנה"], [730 * D, "לפני שנתיים"], [1100 * D, "לפני 3 שנים"],
    ];
    for (const [delta, expected] of table) {
      assert.equal(relativeTimeLabel(ago(delta)), expected, `${delta}ms`);
      assert.equal(recordTimeLabel(ago(delta), "relative"), expected);
    }
  });
});

test("no count of two is ever written as a digit, and no 'אתמול' remains in the shared helper", () => {
  withNow(() => {
    for (let delta = 0; delta < 800 * D; delta += 37 * M) {
      const label = relativeTimeLabel(ago(delta));
      assert.doesNotMatch(label, /לפני 2 /, label);
      assert.doesNotMatch(label, /אתמול|לפני 0 |לפני 1 /, label);
      assert.match(label, /^לפני /);
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

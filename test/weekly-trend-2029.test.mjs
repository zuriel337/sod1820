import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weeklyTrend, trendText, behaviourTrends, halfWeekTrends, addedTrends, priorWeeks } from "../src/lib/weeklyTrend2029.js";

// ZURIEL 25.11.2026: a weekly trend with percentages on the statistics page and on the Home line. Pure rules: no invented week, no percentage on a tiny base,
// behaviour events only at or above the privacy floor, and the reader's real windows (24h / 168h / 720h: 336h is clamped to 24h by the server).
test("a percentage only on a base that means something; otherwise the two numbers", () => {
  assert.deepEqual(weeklyTrend(534, 188), { recent: 534, earlier: 188, dir: "up", pct: 184 });
  assert.equal(trendText(weeklyTrend(534, 188)), "↑ 184%");
  assert.equal(trendText(weeklyTrend(90, 100)), "↓ 10%");
  assert.equal(trendText(weeklyTrend(7, 7)), "ללא שינוי");
  assert.equal(weeklyTrend(3, 1).pct, null);
  assert.equal(trendText(weeklyTrend(3, 1)), "↑ 3 מול 1");
  assert.equal(weeklyTrend(0, 0), null, "nothing then and nothing now is not a trend");
  assert.equal(weeklyTrend(5, -1), null); assert.equal(weeklyTrend(null, 4), null); assert.equal(weeklyTrend(2.5, 4), null);
});

const d168 = { version: 1, hours: 168, threshold: { events: 10, sessions: 5 }, added: { posts: 3, community_messages: 22, contributions: 0, codes: 0 },
  activity: [{ surface: "activity_2029", event_type: "compute", events: 722 }, { surface: "activity_2029", event_type: "search", events: 73 }, { surface: "els", event_type: "search", events: 122 }, { surface: "els", event_type: "cross_search", events: 17 }] };
const d720 = { version: 1, hours: 720, added: { posts: 9, community_messages: 100, contributions: 0, codes: 2 },
  activity: [{ surface: "activity_2029", event_type: "compute", events: 1700 }, { surface: "activity_2029", event_type: "search", events: 90 }, { surface: "els", event_type: "search", events: 300 }, { surface: "els", event_type: "cross_search", events: 40 }] };

test("the reader serves 24h, 168h and 720h only, so the basis is the average week before: (720 - 168) / 168 weeks", () => {
  assert.ok(Math.abs(priorWeeks(d168, d720) - 552 / 168) < 1e-9);
  assert.equal(priorWeeks({ hours: 168 }, { hours: 168 }), null);
  assert.equal(priorWeeks(null, d720), null);
});

test("behaviour trends: events above the floor in both periods, the cipher searches add search and cross search, the rest are left out", () => {
  const t = behaviourTrends(d168, d720);
  const byKey = Object.fromEntries(t.map(x => [x.key, x]));
  assert.equal(byKey.compute.recent, 722); assert.equal(byKey.compute.earlier, Math.round((1700 - 722) / (552 / 168))); assert.equal(byKey.compute.basis, "average");
  assert.equal(byKey.els.recent, 139); assert.equal(byKey.els.earlier, Math.round((340 - 139) / (552 / 168)));
  assert.ok(!byKey.search, "73 recent but only 17 earlier in total: below the floor once averaged is dropped, never drawn as a number");
  assert.ok(!byKey.save, "no events at all: not drawn as zero");
  assert.ok(t.every(x => Number.isInteger(x.pct) || x.pct === null));
});

test("a payload that is not the measured version, or missing a window, gives nothing", () => {
  assert.deepEqual(behaviourTrends(null, d720), []); assert.deepEqual(behaviourTrends(d168, { ...d720, version: 2 }), []); assert.deepEqual(behaviourTrends(d168, { ...d720, hours: 168 }), []);
  assert.deepEqual(addedTrends(d168, null), {});
});

test("content added: the average week before, no floor (public content is not behaviour), a small base shows the numbers and not a percentage", () => {
  const a = addedTrends(d168, d720);
  assert.equal(a.posts.recent, 3); assert.equal(a.posts.earlier, Math.round(6 / (552 / 168))); assert.equal(a.posts.pct, null);
  assert.equal(a.community_messages.recent, 22); assert.equal(a.community_messages.earlier, Math.round(78 / (552 / 168))); assert.equal(a.community_messages.dir, "down"); assert.equal(a.community_messages.pct, -8);
  assert.ok(!("contributions" in a), "0 and 0: no trend");
  assert.equal(a.codes.recent, 0); assert.equal(a.codes.pct, null, "0 this week against an average above zero is a real fall, but the earlier base is below 5: the numbers, not a percentage");
});

test("wiring: the stats page reads 168h and 720h from the one reader (never 336h), the Home line reads its week-before lazily in a separate module", () => {
  const stats = readFileSync("src/pages/Stats2029Page.jsx", "utf8"), home = readFileSync("src/components/experience2029/HomeComposition2029.jsx", "utf8");
  assert.match(stats, /readResearchPulse\(168\), readResearchPulse\(720\)/); assert.doesNotMatch(stats, /336/);
  assert.match(home, /import\("\.\.\/\.\.\/lib\/research\/homeWeekBefore2029\.js"\)/);
  assert.doesNotMatch(readFileSync("src/lib/research/home2029Projection.js", "utf8"), /Prev7d/, "the Home's own read budget is unchanged");
});

test("while the measurement is younger than two weeks, the server's own halves of the week stand in, labelled as halves, never as a week", () => {
  const live = { ...d168, trend: [{ recent: 534, earlier: 188, surface: "activity_2029", event_type: "compute" }, { recent: 50, earlier: 4, surface: "activity_2029", event_type: "search" }, { recent: 99, earlier: 99, surface: "els", event_type: "search" }] };
  const h = halfWeekTrends(live);
  assert.deepEqual(h.map(x => [x.key, x.basis, x.pct]), [["compute", "halves", 184]]);
  assert.deepEqual(halfWeekTrends({ ...live, version: 2 }), []);
});

test("no count of people anywhere in the weekly trend surfaces (ZURIEL 25.11.2026: only the number of contributions)", () => {
  const stats = readFileSync("src/pages/Stats2029Page.jsx", "utf8"), home = readFileSync("src/components/experience2029/HomeComposition2029.jsx", "utf8");
  assert.doesNotMatch(stats, /writers7d|אנשים שהביאו/); assert.doesNotMatch(home, /writers7d|אנשים הביאו|אדם אחד הביא/);
  assert.match(home, /תרומות השבוע/);
});

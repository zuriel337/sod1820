// TRAFFIC_DAY_CONTEXT_V1 — canonical Shabbat/Yom-Tov context guard.
// The context changes interpretation/baselines only. It must never change traffic
// classification or mutate Adaptive Strict policy without a fresh Human Gate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getDayContext,
  annotateTrafficRows,
  DAY_CONTEXT_VERSION,
} from "../src/lib/dayContext.js";

const roshHashana2 = getDayContext("2026-09-13");
assert.equal(roshHashana2.version, DAY_CONTEXT_VERSION);
assert.equal(roshHashana2.day, "2026-09-13");
assert.equal(roshHashana2.schedule, "israel");
assert.equal(roshHashana2.is_holiday, true, "13.9.2026 is Rosh Hashana II in Israel");
assert.equal(roshHashana2.is_shabbat, false);
assert.equal(roshHashana2.day_type, "holiday");
assert.equal(roshHashana2.expected_human_traffic, "very_low");
assert.equal(roshHashana2.suppress_human_drop_as_policy_success, true);

const shabbatYomTov = getDayContext("2026-09-12");
assert.equal(shabbatYomTov.is_shabbat, true, "12.9.2026 is Shabbat");
assert.equal(shabbatYomTov.is_holiday, true, "12.9.2026 is also Rosh Hashana I");
assert.equal(shabbatYomTov.day_type, "shabbat");
assert.equal(shabbatYomTov.expected_human_traffic, "very_low");

const ordinary = getDayContext("2026-09-16");
assert.equal(ordinary.is_shabbat, false);
assert.equal(ordinary.is_holiday, false);
assert.equal(ordinary.day_type, "normal");
assert.equal(ordinary.expected_human_traffic, "normal");
assert.equal(ordinary.suppress_human_drop_as_policy_success, false);

for (const ctx of [roshHashana2, shabbatYomTov, ordinary]) {
  assert.equal(ctx.human_bot_unknown_separate, true);
  assert.equal(ctx.js_challenge_is_human_proof, false);
  assert.equal(ctx.automatic_policy_change_allowed, false);
  assert.equal(ctx.human_gate_required_for_policy_change, true);
}

const rows = annotateTrafficRows([
  { day: "2026-09-13", browser: 10, goodbot: 17 },
  { day: "2026-09-16", browser: 100, goodbot: 20 },
]);
assert.equal(rows[0].day_context.day_type, "holiday");
assert.equal(rows[1].day_context.day_type, "normal");
assert.equal(rows[0].browser, 10, "context must not rewrite traffic counts");
assert.equal(rows[0].goodbot, 17, "context must not rewrite bot counts");

// Wiring guard: all day-granularity traffic entry points should consume the shared owner.
const visits = readFileSync(new URL("../src/lib/visits.js", import.meta.url), "utf8");
assert.match(visits, /from ["']\.\/dayContext\.js["']/);
for (const fn of ["getVisitsTwoMeter", "getTrafficComposition", "getEntriesDaily", "getEntriesSeries"]) {
  const start = visits.indexOf(`function ${fn}(`);
  assert.ok(start > -1, `${fn} must exist`);
  const body = visits.slice(start, start + 900);
  assert.ok(/annotateTrafficRows/.test(body), `${fn} must attach canonical day_context`);
}
assert.match(visits, /getCrawlIntel[\s\S]{0,800}annotateTrafficPayloadDaily/);
assert.match(visits, /getInfraLoad[\s\S]{0,800}annotateTrafficPayloadDaily/);

console.log("TRAFFIC_DAY_CONTEXT_V1 PASS");

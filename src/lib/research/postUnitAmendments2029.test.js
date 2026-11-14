import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROVEN_POST_SOURCE_UPDATES, publicProvenPostSourceUpdates, registeredUnitIds, unitAmendments } from "./postSourceUpdates2029.js";

// The exact public body of post 5107 as read on 2026-11-14 (= post_revisions id 266, md5 a10ea4de28ac262ec5d14e0262db9b13, 22010 chars).
const BODY = readFileSync(new URL("../../../docs/reviews/elections-5107-unit-inventory-20261114/SOURCE_posts5107_rev266_22010.html", import.meta.url), "utf8");
const row = { id: 5107, slug: "sharshar-elections-redemption-hints-draft", source: "ai", modified: "2026-11-10T16:56:00.412935Z", tags: [], content: BODY };

test("R-1: the live body, its modified stamp and the registry agree — all six units project, each with ITS OWN proven addition time", () => {
  assert.equal(BODY.length, 22010);
  const events = publicProvenPostSourceUpdates(row);
  assert.equal(events.length, 6);
  const byId = Object.fromEntries(events.map((e) => [e.targetId, e.at]));
  assert.equal(byId["knesset-sworn-1234-1011"], "2026-11-10T15:39:37.816Z");
  assert.equal(byId["election-turnout-777-news-signal"], "2026-11-10T10:25:40.166Z");
  assert.equal(byId["netanyahu-77-mazal"], "2026-10-10T23:19:35.974Z");
});

test("R-1: the 1437 lines are an AMENDMENT of the sworn unit — recorded from the version history, never a new unit, a new Now event or a re-stamped date", () => {
  assert.ok(BODY.includes("משיח י-הוה — משולש = 1437"), "the 1437 lines are in the live body");
  const [amendment, ...rest] = unitAmendments(5107, "knesset-sworn-1234-1011");
  assert.equal(rest.length, 0);
  assert.equal(amendment.at, "2026-11-10T16:56:00.412935Z");
  assert.equal(amendment.at, row.modified, "the amendment time is the last-update stamp, exactly posts.modified");
  assert.deepEqual([amendment.beforeRevision, amendment.afterRevision], [265, 266]);
  assert.equal(amendment.emitsNowEvent, false);
  const sworn = PROVEN_POST_SOURCE_UPDATES[5107].find((e) => e.targetId === "knesset-sworn-1234-1011");
  assert.equal(sworn.updatedAt, "2026-11-10T15:39:37.816125Z", "the unit keeps its own addition time");
  assert.equal(publicProvenPostSourceUpdates(row).filter((e) => e.targetId === "knesset-sworn-1234-1011").length, 1, "no second event");
});

test("fail closed: a body whose version no longer matches projects nothing; unknown ids are not registered", () => {
  assert.deepEqual(publicProvenPostSourceUpdates({ ...row, modified: "2026-11-11T06:46:17.566164Z" }), []);
  assert.deepEqual(publicProvenPostSourceUpdates({ ...row, content: BODY.replace('id="knesset-sworn-1234-1011"', 'id="x"') }).filter((e) => e.targetId === "knesset-sworn-1234-1011"), []);
  assert.equal(registeredUnitIds(5107).length, 6);
  assert.equal(registeredUnitIds(5107).includes("unknown"), false);
  assert.deepEqual(unitAmendments(5107, "sharshar-shoes-66"), []);
});

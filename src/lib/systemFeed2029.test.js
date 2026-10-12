import test from "node:test";
import assert from "node:assert/strict";
import { feedRows, feedKindLabel, feedHref, feedSeenKey, isNewItem } from "./systemFeed2029.js";

const NOW = Date.parse("2026-10-11T20:00:00Z");
const src = (id, at, extra = {}) => ({ id, kind: "source", sourceKind: "group_message", label: `מקור ${id}`, at, arrivalAt: at, ...extra });
const conv = (id, at, slug) => ({ id, kind: "convergence", label: `התכנסות ${id}`, at, approvedAt: at, slug });

test("labels and hrefs follow the item kind", () => {
  assert.equal(feedKindLabel(src("a", "2026-10-11T10:00:00Z")), "מקור · טרם נבדק");
  assert.equal(feedKindLabel({ kind: "source", sourceKind: "post" }), "פוסט");
  assert.equal(feedKindLabel({ kind: "convergence" }), "התכנסות");
  assert.equal(feedHref(conv("c", "2026-10-11T10:00:00Z", "meron")), "/topic/meron");
  assert.equal(feedHref(src("a", "2026-10-11T10:00:00Z")), "/world#world-sources");
  assert.equal(feedHref({ kind: "source", sourceKind: "post", href: "/post/x" }), "/post/x");
});
test("new = recent window and unseen", () => {
  assert.equal(isNewItem(src("a", "2026-10-11T10:00:00Z"), NOW), true);
  assert.equal(isNewItem(src("a", "2026-10-09T10:00:00Z"), NOW), false);
  assert.equal(isNewItem(conv("c", "2026-10-02T10:00:00Z", "x"), NOW), true);
  assert.equal(isNewItem(conv("c", "2026-07-02T10:00:00Z", "x"), NOW), false);
  const rows = feedRows([src("a", "2026-10-11T10:00:00Z")], { now: NOW, seen: { "feed:a": 1 } });
  assert.equal(rows[0].isNew, false);
});
test("updates chronological: curated older strength never hides a fresh public source", () => {
  const items = [src("old", "2026-10-10T10:00:00Z"), src("new", "2026-10-11T18:00:00Z"), conv("strongOld", "2026-07-01T10:00:00Z", "s"), { id: "x" }, null];
  const rows = feedRows(items, { now: NOW, strongIds: { strongOld: true }, limit: 3 });
  assert.deepEqual(rows.map((r) => r.id), ["new", "old", "strongOld"]);
  assert.equal(feedRows([], { now: NOW }).length, 0);
});

test("a burst of one kind does not drown the others (bucket caps)", () => {
  const burst = Array.from({ length: 10 }, (_, i) => src(`g${i}`, `2026-10-11T${String(10 + i).padStart(2, "0")}:00:00Z`));
  const rows = feedRows([...burst, conv("c1", "2026-07-01T10:00:00Z", "a"), { id: "p1", kind: "source", sourceKind: "post", label: "פוסט", at: "2026-10-01T10:00:00Z", href: "/post/p" }], { now: NOW, limit: 8 });
  assert.equal(rows.filter((r) => r.kind === "source" && r.item.sourceKind === "group_message").length, 4);
  assert.ok(rows.some((r) => r.id === "c1") && rows.some((r) => r.id === "p1"));
});


test("the same source revision remains unseen until its exact version is read", () => {
  const base = { id: "post:5107", kind: "source", sourceKind: "post", label: "פוסט הבחירות",
    href: "/post/elections", at: "2026-10-11T19:00:00Z" };
  const updated = { ...base, sourceUpdate: {
    label: "נתניהו בן 77",
    eventKey: "posts:5107#netanyahu-77@revision:184",
    targetHref: "/post/elections#netanyahu-77",
  }};
  const fresh = feedRows([updated], { now: NOW });
  assert.equal(fresh[0].title, "נתניהו בן 77");
  assert.equal(fresh[0].sourceTitle, "פוסט הבחירות");
  assert.equal(fresh[0].isNew, true);
  assert.equal(fresh[0].href, "/post/elections", "the native deep link stays deferred until route restoration passes");
  assert.equal(feedSeenKey(updated), "feed:posts:5107#netanyahu-77@revision:184");
  const seenEarlier = { "feed:post:5107": 1234, "feed:posts:5107#netanyahu-77@revision:183": 1234 };
  assert.equal(feedRows([updated], { now: NOW, seen: seenEarlier })[0].isNew, true);
  assert.equal(feedRows([updated], { now: NOW,
    seen: { ...seenEarlier, [feedSeenKey(updated)]: 1234 } })[0].isNew, false);
});

test("the public feed reserves four bounded slots for recent post sources", () => {
  const posts = Array.from({ length: 6 }, (_, i) => ({
    id: "post:" + i, kind: "source", sourceKind: "post", label: "פוסט " + i,
    at: "2026-10-11T" + String(10 + i).padStart(2, "0") + ":00:00Z",
  }));
  const rows = feedRows(posts, { now: NOW, limit: 8 });
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.id), ["post:5", "post:4", "post:3", "post:2"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { homePostKeys, claimHomeItems, reserveHomePost } from "../src/lib/research/homePlacement2029.js";

test("Home placement resolves the same post across numeric ID, sourceRef, slug and href", () => {
  const main = { id: 5107, slug: "sharshar-elections-redemption-hints-draft" };
  const source = { id: "post:5107", sourceRef: "posts:5107", href: "/post/sharshar-elections-redemption-hints-draft" };
  let used = reserveHomePost(new Set(), main);
  assert.ok(homePostKeys(source).some(key => used.has(key)));
  const result = claimHomeItems([source, { id: 5116, slug: "seventh-to-tenth-sefirot-2027" }], used, 4);
  assert.deepEqual(result.items.map(x => x.id), [5116]);
});

test("Dedicated secondary story is never repeated as a Recent card or World arrival", () => {
  const story = { slug: "flydubai-fz1073-363-14000-remzei-geula" };
  let used = reserveHomePost(new Set(), story);
  const updates = claimHomeItems([
    { id: 5112, slug: story.slug },
    { id: 5107, slug: "sharshar-elections-redemption-hints-draft" },
  ], used, 4);
  assert.equal(updates.items.length, 1);
  const arrivals = claimHomeItems([
    { sourceRef: "posts:5112", href: `/post/${story.slug}` },
    { sourceRef: "posts:5107", href: "/post/sharshar-elections-redemption-hints-draft" },
    { id: "group:7", sourceKind: "group_message" },
  ], updates.reserved, 4);
  assert.deepEqual(arrivals.items.map(x => x.id), ["group:7"]);
});

test("If a category overlaps across cinema and visual series, the same Post appears only once", () => {
  const cinema = claimHomeItems([{ id: 5003, slug: "matrix-506" }, { id: 5004, slug: "squid-game-456" }], new Set(), 3);
  const series = claimHomeItems([
    { id: 5003, slug: "matrix-506" },
    { id: 5080, slug: "bend-the-matrix" },
  ], cinema.reserved, 3);
  assert.deepEqual(series.items.map(x => x.id), [5080]);
});

test("Encoded and decoded legacy video slug share the same canonical identity", () => {
  const a = { slug: "%D7%A6%D7%95%D7%A4%D7%9F" };
  const b = { href: "/post/%D7%A6%D7%95%D7%A4%D7%9F" };
  const result = claimHomeItems([a, b], new Set(), 4);
  assert.equal(result.items.length, 1);
});

test("No item may be rendered when remaining budget is zero", () => {
  assert.deepEqual(claimHomeItems([{ slug: "matrix-506" }], new Set(), 0).items, []);
});

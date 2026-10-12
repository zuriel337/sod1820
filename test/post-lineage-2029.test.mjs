import test from "node:test";
import assert from "node:assert/strict";
import { buildPostTree } from "../src/lib/research/postLineage2029.js";

test("a child's addition marks its parent inside the tree (Bennett -> Elections)", () => {
  const tree = buildPostTree(5113, new Set(["bennett-israel-78"]));
  assert.equal(tree.parent.id, 5107);
  assert.equal(tree.parent.changedAt, "2026-10-12T14:06:54.127Z");
  assert.equal(tree.current.here, true);
  assert.deepEqual(tree.units.map((unit) => unit.id), ["bennett-israel-78"]);
  assert.deepEqual(tree.origins.map((origin) => origin.slug), ["yam-hamelach-tiferet-geula"]);
});

test("the parent post lists the continuing post and its own source units; a stale unit is not shown", () => {
  const tree = buildPostTree(5107, new Set(["sharshar-shoes-66"]));
  assert.equal(tree.parent, null);
  assert.deepEqual(tree.units.map((unit) => unit.id), ["sharshar-shoes-66"]);
  assert.equal(tree.children[0].id, 5113);
  assert.equal(tree.children[0].changedAt, "2026-10-12T14:06:54.127Z");
  assert.equal(tree.current.changedAt, "2026-10-12T14:06:54.127Z");
});

test("posts outside the declared tree get no tree", () => {
  assert.equal(buildPostTree(1), null);
});

test("tree marks are not system updates: module exposes no feed/event shape", () => {
  const tree = buildPostTree(5107, null);
  assert.equal(JSON.stringify(tree).includes("eventKey"), false);
  assert.equal(JSON.stringify(tree).includes("feed:"), false);
});

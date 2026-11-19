import test from "node:test";
import assert from "node:assert/strict";
import { buildPostTree } from "../src/lib/research/postLineage2029.js";

const find = (node, predicate) => predicate(node) ? node : (node.children || []).map((child) => find(child, predicate)).find(Boolean) || null;

test("the same declared tree is shown from either post: Elections -> units + axis 631 -> Bennett -> units", () => {
  for (const viewing of [5107, 5113]) {
    const { root, hereId } = buildPostTree(viewing, new Set(["sharshar-shoes-66", "bennett-israel-78"]));
    assert.equal(hereId, viewing);
    assert.equal(root.id, 5107);
    const axis = root.children.find((node) => node.kind === "axis");
    assert.equal(axis.label, "ציר 631");
    const bennett = axis.children[0];
    assert.equal(bennett.id, 5113);
    assert.equal(bennett.origins[0].slug, "yam-hamelach-tiferet-geula");
    assert.equal(find(root, (node) => node.here).id, viewing);
  }
});

test("a child's addition marks every ancestor (axis and parent post) but not the unrelated branch", () => {
  const newest = "bennett-salt-covenant-unity-20261119";
  const { root } = buildPostTree(5113, new Set([newest, "bennett-israel-78"]));
  const axis = root.children.find((node) => node.kind === "axis");
  const bennett = axis.children[0];
  assert.equal(bennett.children[0].id, newest);
  assert.equal(bennett.changedAt, "2026-11-19T16:19:09.953Z");
  assert.equal(axis.changedAt, bennett.changedAt);
  assert.equal(root.changedAt, bennett.changedAt);
  assert.equal(find(root, node => node.id === "yamin-smol-2026-5787-1237-1158").addedAt, "2026-11-16T13:02:30.887336Z");
  const unit = find(root, (node) => node.id === "bennett-israel-78");
  assert.equal(unit.addedAt, "2026-10-12T14:06:54.127591Z");
});

test("units of the viewed post are guarded by the loaded source; the other post's certified units are not", () => {
  const { root } = buildPostTree(5113, new Set());
  assert.equal(find(root, (node) => node.id === "bennett-israel-78"), null);
  assert.ok(find(root, (node) => node.id === "sharshar-shoes-66"));
});

test("posts outside the declared tree get no tree, and tree marks are not feed events", () => {
  assert.equal(buildPostTree(1), null);
  const raw = JSON.stringify(buildPostTree(5107, null));
  assert.equal(raw.includes("eventKey") || raw.includes("feed:"), false);
});

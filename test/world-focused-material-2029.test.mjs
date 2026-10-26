import test from "node:test";
import assert from "node:assert/strict";
import { worldFocusedMaterialWindow } from "../src/lib/research/worldFocusedMaterial2029.js";
import { WORLD_SOURCE_ITEMS_PAGE_SIZE } from "../src/lib/research/worldPeopleSourcesProjection.js";

const rows = Array.from({ length: 1000 }, (_, id) => ({ sourceRef: `posts:${id}`, title: `Source ${id}` }));

test("a source hundreds of rows deep is visible with at most one extra card", () => {
  const result = worldFocusedMaterialWindow(rows, { sourceRef: "posts:846" });
  assert.equal(result.rows.length, WORLD_SOURCE_ITEMS_PAGE_SIZE + 1);
  assert.strictEqual(result.rows[0], rows[846]);
  assert.deepEqual(result.rows.slice(1), rows.slice(0, WORLD_SOURCE_ITEMS_PAGE_SIZE));
  assert.equal(result.focusState, "visible");
  assert.equal(result.hasMore, true);
  assert.equal(rows[0].sourceRef, "posts:0", "source order is not mutated");
});

test("ordinary pages keep their order and a focused source is never duplicated", () => {
  assert.deepEqual(worldFocusedMaterialWindow(rows).rows, rows.slice(0, WORLD_SOURCE_ITEMS_PAGE_SIZE));
  assert.deepEqual(worldFocusedMaterialWindow(rows, { sourceRef: "posts:2" }).rows, rows.slice(0, WORLD_SOURCE_ITEMS_PAGE_SIZE));
  const result = worldFocusedMaterialWindow(rows, { sourceRef: "posts:20", limit: 24 });
  assert.equal(result.rows.length, 24);
  assert.equal(result.rows.filter((row) => row.sourceRef === "posts:20").length, 1);
  assert.equal(worldFocusedMaterialWindow(rows.slice(0, 13), { sourceRef: "posts:12" }).hasMore, false);
});

test("an unavailable/private-not-returned source does not synthesize a card or another read", () => {
  for (const sourceRef of ["posts:private", "posts:9999", " posts:3", "posts:03"]) {
    const result = worldFocusedMaterialWindow(rows, { sourceRef });
    assert.equal(result.focusState, "unavailable");
    assert.equal(result.focusedItem, null);
    assert.deepEqual(result.rows, rows.slice(0, WORLD_SOURCE_ITEMS_PAGE_SIZE));
  }
});

test("an explicit user filter is preserved instead of silently showing excluded material", () => {
  const filtered = rows.slice(0, 3);
  const result = worldFocusedMaterialWindow(filtered, { sourceRef: "posts:846", availableItems: rows });
  assert.equal(result.focusState, "filtered_out");
  assert.deepEqual(result.rows, filtered);
  assert.equal(result.hasMore, false);
});

test("unknown and invalid limits retain the normal bounded page", () => {
  for (const limit of [null, -1, 0, Infinity, NaN, "1000"]) {
    assert.equal(worldFocusedMaterialWindow(rows, { limit }).rows.length, WORLD_SOURCE_ITEMS_PAGE_SIZE);
  }
  assert.equal(worldFocusedMaterialWindow([]).focusState, "idle");
});

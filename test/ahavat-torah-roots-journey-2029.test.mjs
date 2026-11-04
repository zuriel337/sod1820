import assert from "node:assert/strict";
import test from "node:test";
import { AHAVAT_ROOT_COLUMNS, ahavatRootColumnJourney } from "../src/data/ahavatTorahRoots2029.js";

test("continuous root reading visits all ten original columns exactly once in printed order", () => {
  let column = AHAVAT_ROOT_COLUMNS[0];
  const visited = [];
  while (column) {
    const journey = ahavatRootColumnJourney(column.id);
    visited.push(column.id);
    assert.equal(journey.position, visited.length);
    assert.equal(journey.total, 10);
    assert.equal(journey.previous?.id || null, AHAVAT_ROOT_COLUMNS[visited.length - 2]?.id || null);
    column = journey.next;
  }
  assert.deepEqual(visited, AHAVAT_ROOT_COLUMNS.map(item => item.id));
  assert.deepEqual(visited.map(id => ahavatRootColumnJourney(id).current.page), [31,31,32,32,33,33,34,34,35,35]);
  assert.equal(ahavatRootColumnJourney("roots:35:left").next, null);
  assert.equal(ahavatRootColumnJourney("roots:31:right").previous, null);
});

test("reverse navigation preserves original source objects and rejects fabricated column identities", () => {
  for (const column of AHAVAT_ROOT_COLUMNS) {
    const journey = ahavatRootColumnJourney(column.id);
    assert.equal(journey.current, column);
    if (journey.next) assert.equal(ahavatRootColumnJourney(journey.next.id).previous, column);
    if (journey.previous) assert.equal(ahavatRootColumnJourney(journey.previous.id).next, column);
  }
  for (const id of [null, "", "roots:30:right", "roots:36:left", "roots:31:middle"]) assert.equal(ahavatRootColumnJourney(id), null);
});

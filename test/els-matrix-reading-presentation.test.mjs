import assert from "node:assert/strict";
import test from "node:test";
import { elsMatrixReadingMode, sameElsMatrixReadingAxis, selectElsMatrixReading } from "../src/lib/research/elsMatrixReadingPresentation.js";
const axis = { term: "אורניומ", scope: "torah", corpusId: "0b022e8eef6f9c16", start: 81020, skip: 10101, dir: 1 };
const continuation = { contextSnapshot: { elsMatrixContext: { axis } } };

test("a different occurrence, term or corpus cannot inherit a reading result or progress", () => {
  const result = { state: "COMPLETE", axis: { ...axis }, findings: [] };
  const session = { busy: true, currentTurn: { kind: "els_matrix_reading", continuation, progress: { elapsedMs: 20 } },
    thread: [{ role: "raziel", continuation, elsMatrixReading: result }] };
  assert.equal(selectElsMatrixReading(session, axis).result, result);
  assert.equal(selectElsMatrixReading(session, axis).progress.elapsedMs, 20);
  for (const patch of [{ start: 81021 }, { term: "אחר" }, { corpusId: "other" }, { scope: "tanakh" }, { dir: -1 }, { skip: 11 }]) {
    const other = { ...axis, ...patch };
    assert.equal(sameElsMatrixReadingAxis(axis, other), false);
    assert.deepEqual(selectElsMatrixReading(session, other), { active: true, matching: false, progress: null, result: null });
  }
  assert.equal(selectElsMatrixReading({ thread: [{ role: "raziel", continuation, elsMatrixReading: { ...result, axis: { ...axis, start: 81021 } } }] }, axis).result, null);
  assert.equal(selectElsMatrixReading({ thread: [{ role: "raziel", elsMatrixReading: result }] }, axis).result, null, "missing lineage is not a match");
});

test("live reading requires an explicit build opt-in; undefined and unrecognised values remain off", () => {
  for (const value of [undefined, null, "", "true", "demo", true]) assert.equal(elsMatrixReadingMode(value), "off");
  assert.equal(elsMatrixReadingMode("preview"), "preview");
  assert.equal(elsMatrixReadingMode("on"), "on");
});

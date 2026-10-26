import test from "node:test";
import assert from "node:assert/strict";
import {
  RAZIEL_COMPANION_VIEW_DEFAULT,
  RAZIEL_COMPANION_VIEW_STORAGE_KEY,
  normalizeRazielCompanionView,
  readRazielCompanionView,
  writeRazielCompanionView,
} from "./razielCompanionPreference2029.js";

function storageWith(initial = null) {
  const values = new Map(initial == null ? [] : [[RAZIEL_COMPANION_VIEW_STORAGE_KEY, initial]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: () => values.get(RAZIEL_COMPANION_VIEW_STORAGE_KEY),
  };
}

test("Raziel companion preference defaults safely for missing and malformed local values", () => {
  assert.equal(normalizeRazielCompanionView(null), RAZIEL_COMPANION_VIEW_DEFAULT);
  assert.equal(normalizeRazielCompanionView("research"), RAZIEL_COMPANION_VIEW_DEFAULT);
  assert.equal(readRazielCompanionView(storageWith()), RAZIEL_COMPANION_VIEW_DEFAULT);
  assert.equal(readRazielCompanionView(storageWith("broken-value")), RAZIEL_COMPANION_VIEW_DEFAULT);
  assert.equal(readRazielCompanionView({ getItem() { throw new Error("blocked"); } }), RAZIEL_COMPANION_VIEW_DEFAULT);
});

test("Raziel companion preference persists only the three presentation values", () => {
  for (const value of ["quiet", "hints", "open"]) {
    const storage = storageWith();
    assert.equal(writeRazielCompanionView(value, storage), value);
    assert.equal(storage.value(), value);
    assert.equal(readRazielCompanionView(storage), value);
  }
  const storage = storageWith();
  assert.equal(writeRazielCompanionView("unknown", storage), RAZIEL_COMPANION_VIEW_DEFAULT);
  assert.equal(storage.value(), RAZIEL_COMPANION_VIEW_DEFAULT);
});

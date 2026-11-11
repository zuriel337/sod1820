import test from "node:test";
import assert from "node:assert/strict";
import { hintStateFromProfile, checkSourceHint, HINT_STATES } from "./postSourceHintCheck2029.js";

const rows = (value) => [{ methodKey: "רגיל", displayLabel: "רגיל", computedValue: value, definitionVersion: 3 }];

test("verified needs the engine's regular-method value to equal the stated number; mismatch shows both", () => {
  const ok = hintStateFromProfile(566, rows(566));
  assert.equal(ok.state, HINT_STATES.verified);
  assert.equal(ok.method.label, "רגיל");
  const bad = hintStateFromProfile(77, rows(521));
  assert.deepEqual([bad.state, bad.claimed, bad.value], [HINT_STATES.mismatch, 77, 521]);
});

test("no engine row, no stated number, or a failed read is UNCHECKED — never ✓ and never a verdict", async () => {
  assert.equal(hintStateFromProfile(1237, []).state, HINT_STATES.unchecked);
  assert.equal(hintStateFromProfile("לא מספר", rows(5)).state, HINT_STATES.unchecked);
  assert.equal((await checkSourceHint({ expression: "ביטוי", stated: 1237, readProfile: async () => { throw new Error("rpc down"); } })).state, HINT_STATES.unchecked);
  assert.equal((await checkSourceHint({ expression: "", stated: 566, readProfile: async () => rows(566) })).state, HINT_STATES.unchecked);
  assert.equal((await checkSourceHint({ expression: "משיח בן יוסף", stated: "566", readProfile: async () => rows(566) })).state, HINT_STATES.verified);
});

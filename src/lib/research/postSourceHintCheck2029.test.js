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

test("the method the source names is honoured; a free description of a method is never guessed", async () => {
  const profile = [
    { methodKey: "רגיל", displayLabel: "רגיל", computedValue: 384, definitionVersion: 1 },
    { methodKey: "קדמי", displayLabel: "משולש", computedValue: 1437, definitionVersion: 1 },
    { methodKey: "אותיות אחרי", displayLabel: "אותיות אחרי", computedValue: 1237, definitionVersion: 1 },
    { methodKey: "ריבוע", displayLabel: "ריבוע", computedValue: 1110, definitionVersion: 1 },
  ];
  assert.equal(hintStateFromProfile(1437, profile, { methodText: "משולש" }).state, HINT_STATES.verified);
  assert.equal(hintStateFromProfile(1437, profile).state, HINT_STATES.mismatch); // regular = 384: the bare number is NOT the triangular claim
  assert.equal(hintStateFromProfile(1237, profile, { methodText: "אותיות אחרי" }).state, HINT_STATES.verified);
  const free = hintStateFromProfile(1400, profile, { methodText: "ריבוע [מספר] משולש מילה" });
  assert.deepEqual([free.state, free.reason], [HINT_STATES.unchecked, "method_not_a_single_engine_method"]);
});

test("a bare claim that differs in the regular method lists the other engine methods where it does hold — information, not verification", () => {
  const profile = [
    { methodKey: "רגיל", displayLabel: "רגיל", computedValue: 384 },
    { methodKey: "קדמי", displayLabel: "משולש", computedValue: 1437 },
    { methodKey: "משולש גדול", displayLabel: "משולש גדול", computedValue: 1437 },
  ];
  const r = hintStateFromProfile(1437, profile);
  assert.deepEqual([r.state, r.value, r.otherMethods], [HINT_STATES.mismatch, 384, ["משולש", "משולש גדול"]]);
  assert.deepEqual(hintStateFromProfile(1437, profile, { methodText: "משולש" }).otherMethods, []);
});

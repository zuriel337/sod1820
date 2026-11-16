import test from "node:test";
import assert from "node:assert/strict";
import { loadUnitTrace, loadMethodChoices } from "./unitGematriaTrace2029.js";

const rows = [{ methodKey: "regular", displayLabel: "רגיל", computedValue: 1273, sortOrder: 1 }, { methodKey: "hidden", displayLabel: "מסתתר", computedValue: 1237, sortOrder: 7 }, { methodKey: "zero", displayLabel: "אפס", computedValue: 0, sortOrder: 9 }];
// a trace shaped like the canonical projection input (gematria_method_trace); the projection itself is the real one
const trace = (key, input, result) => ({ projection: { dimensions: { trace: { status: "ok", method_key: key, input, result, steps: [] } } } });

test("the pipeline reads ONLY through the injected canonical readers and stores nothing it did not read", async () => {
  const calls = [];
  const out = await loadUnitTrace({ phrase: "ימין שמאל", methodKey: "regular", readProfile: async (p) => { calls.push(["profile", p]); return rows; }, readTrace: async (k, p) => { calls.push(["trace", k, p]); return trace(k, p, 1273); } });
  assert.deepEqual(calls.map((c) => c[0]), ["profile", "trace"]);
  assert.ok(["ready", "unavailable"].includes(out.phase));
});

test("an unreadable engine is 'unavailable' — no step is invented", async () => {
  assert.equal((await loadUnitTrace({ phrase: "x", methodKey: "regular", readProfile: async () => { throw new Error("down"); }, readTrace: async () => null })).phase, "unavailable");
  assert.equal((await loadUnitTrace({ phrase: "x", methodKey: "regular", readProfile: async () => rows, readTrace: async () => null })).phase, "unavailable");
  assert.equal((await loadUnitTrace({ phrase: "", methodKey: "regular" })).reason, "no_phrase");
  assert.equal((await loadUnitTrace({ phrase: "x", methodKey: "nope", readProfile: async () => rows, readTrace: async () => null })).phase, "unavailable");
});

test("a source's method TEXT is resolved by the engine's own profile; a free description stays unchecked (no guess)", async () => {
  const out = await loadUnitTrace({ phrase: "התחלה חדשה", stated: 1237, methodText: "מסתתר", readProfile: async () => rows, readTrace: async () => null });
  assert.equal(out.phase, "unavailable");                                 // no trace in this stub, but the method resolved: check.method is the engine's row
  assert.equal(out.check?.method?.key, "hidden");
  const free = await loadUnitTrace({ phrase: "x", stated: 1237, methodText: "ריבוע [מספר] משולש מילה", readProfile: async () => rows, readTrace: async () => null });
  assert.equal(free.reason, "no_method");
});

test("the method picker lists the engine's own values, in the registry order, without zero values", async () => {
  const choices = await loadMethodChoices("ימין שמאל", { readProfile: async () => rows });
  assert.deepEqual(choices.map((c) => [c.key, c.value]), [["regular", 1273], ["hidden", 1237]]);
  assert.deepEqual(await loadMethodChoices("1237", { readProfile: async () => rows }), [], "a bare number has no methods");
  assert.deepEqual(await loadMethodChoices("x", { readProfile: async () => { throw new Error("down"); } }), []);
});

test("no claim → no gap: an item without a stated number never shows 'the source claimed 0'", async () => {
  for (const stated of [null, undefined, ""]) {
    const out = await loadUnitTrace({ phrase: "x", methodKey: "regular", stated, readProfile: async () => rows, readTrace: async () => null });
    assert.equal(out.gap ?? null, null);
  }
});

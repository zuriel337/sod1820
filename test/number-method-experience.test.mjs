import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectGematriaTrace, traceNumber, isVerifiedMethodTrace } from "../src/lib/research/gematriaTracePresentation.js";
import { projectNumberMethodProfileRow, buildRazielMicro, deriveHiddenCrossings } from "../src/lib/research/numberCoreProjection.js";
import { buildSemanticAnimationProjection } from "../src/lib/research/semanticAnimationProjection.js";

// Read-only canonical RPC snapshot, 2026-10-09, linswmnnkjxvweumprav.
// This fixture is evidence for presentation compatibility, never a runtime value source.
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/spatial/canonical-number-methods-20261009.json", import.meta.url)));
const trace = (key) => structuredClone(fixtures.find((item) => item.method_key === key).trace);

test("every executable canonical trace has a complete readable projection; contextual method has no result", () => {
  for (const item of fixtures) {
    const before = JSON.stringify(item.trace);
    const model = projectGematriaTrace(item.trace);
    if (item.trace.trace_kind === "context_required") {
      assert.equal(model.state, "context_required");
      assert.equal(model.result, null);
      assert.deepEqual(model.lines, []);
    } else {
      assert.equal(model.state, "ready", item.method_key);
      assert.equal(model.result, item.trace.result);
      assert.ok(model.lines.length > 1, item.method_key);
      assert.ok(model.instruction);
    }
    assert.equal(JSON.stringify(item.trace), before);
  }
});

test("word boundaries, reverse order, per-word reset, substitutions and positions remain distinct", () => {
  const regular = projectGematriaTrace(trace("רגיל"));
  assert.deepEqual(regular.groups.map((group) => group.label), ["אופק", "אדנק"]);
  assert.equal(regular.groups.flatMap((g) => g.rows).length, 8);
  const reverse = projectGematriaTrace(trace("משולש הפוך"));
  assert.equal(reverse.groups[0].rows[0].token, "ק");
  assert.equal(reverse.groups[0].rows[0].position, 8);
  assert.equal(reverse.groups[0].rows[1].prefix, "נק");
  const reset = projectGematriaTrace(trace("ריבוע"));
  assert.equal(reset.groups[1].rows[0].prefix, "א");
  assert.equal(reset.groups[1].subtotal, 216);
  const substituted = projectGematriaTrace(trace("אטבח"));
  assert.equal(substituted.groups[0].rows[0].transformed, "ט");
  const weighted = projectGematriaTrace(trace("משולש מדרגות"));
  assert.equal(weighted.groups[1].rows[0].position, 1);
  assert.equal(weighted.groups[0].rows[2].value, 240);
});

test("composite keeps component order and fails closed on component mismatch", () => {
  const input = trace("מילוי בלבד");
  const model = projectGematriaTrace(input);
  assert.equal(model.operator, "diff");
  assert.deepEqual(model.components.map((c) => [c.methodKey, c.value]), [["מילוי", 1237], ["רגיל", 342]]);
  input.steps.components[0].component_value = 1238;
  assert.equal(projectGematriaTrace(input).state, "incomplete");
});

test("missing numbers never become zero; actual zero remains available", () => {
  for (const value of [null, undefined, "", " ", false, true, [], {}, NaN, Infinity]) {
    assert.equal(traceNumber(value), null);
    assert.equal(projectNumberMethodProfileRow({ method_key: "אות רבתי", computed_value: value }).computedValue, null);
  }
  assert.equal(projectNumberMethodProfileRow({ method_key: "מסתתר", computed_value: 0 }).computedValue, 0);
  assert.doesNotMatch(buildRazielMicro({ root: 1237, expression: "א", activeResult: null }).lead, /→ 0/);
  assert.deepEqual(deriveHiddenCrossings({ expression: "אב", methodProfile: [
    { methodKey: "רגיל", dbColumn: "ragil", computedValue: 0 },
    { methodKey: "מסתתר", dbColumn: "mistater", computedValue: null },
  ], candidates: [{ phrase: "גד", ragil: 0, mistater: null }] }), []);
});

test("stale identities, bad parity, missing steps and malformed boundaries are not displayed", () => {
  const input = trace("רגיל");
  assert.equal(isVerifiedMethodTrace(input, { expression: "אחר" }), false);
  assert.equal(isVerifiedMethodTrace(input, { methodKey: "מילוי" }), false);
  assert.equal(isVerifiedMethodTrace(input, { expectedValue: 0 }), false);
  input.verification.parity = null;
  assert.equal(projectGematriaTrace(input).state, "unverified");
  const boundary = trace("רגיל");
  boundary.steps[4].contribution = 1;
  assert.equal(projectGematriaTrace(boundary).state, "incomplete");
  const missing = trace("רגיל");
  missing.steps[0].running_subtotal = null;
  assert.equal(projectGematriaTrace(missing).state, "incomplete");
});

test("animation accepts engine word boundaries without animating a phantom letter", () => {
  const input = trace("מילוי");
  const projection = buildSemanticAnimationProjection({ selection: { expression: input.input, method: input.method_key, resultValue: input.result }, trace: input });
  assert.equal(projection.trace.status, "accepted");
  assert.equal(projection.cues.filter((cue) => cue.kind === "trace_step_reveal").length, 8);
});

test("Finding adapter refuses contextual or stale trace results", async () => {
  let source = readFileSync(new URL("../src/lib/research/gematriaTrace.js", import.meta.url), "utf8");
  source = source.replace('import { supabase } from "../supabase.js";', "const supabase = null;");
  for (const file of ["universalFinding.js", "gematriaTracePresentation.js"]) source = source.replace(`"./${file}"`, JSON.stringify(new URL(`../src/lib/research/${file}`, import.meta.url).href));
  const { gematriaTraceToFinding } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.equal(gematriaTraceToFinding(trace("אות רבתי")), null);
  assert.equal(gematriaTraceToFinding(trace("מילוי"), { inputText: "ביטוי אחר" }), null);
  const finding = gematriaTraceToFinding(trace("מילוי"));
  assert.equal(finding.subject.value, 1237);
  assert.equal(finding.projection.dimensions.trace.verification.parity, true);
});

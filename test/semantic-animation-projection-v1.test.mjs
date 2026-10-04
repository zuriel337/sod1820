import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSemanticAnimationProjection as build, CUE_KINDS } from "../src/lib/research/semanticAnimationProjection.js";

const selection = { expression: "אבג", method: "רגיל", resultValue: 6, sourceRef: "src:1", findingId: "f1" };
const trace = {
  input: "אבג",
  method_key: "רגיל",
  result: 6,
  steps: [
    { scope: "letter", token: "א", contribution: 1, running_subtotal: 1 },
    { scope: "letter", token: "ב", contribution: 2, running_subtotal: 3 },
    { scope: "letter", token: "ג", contribution: 3, running_subtotal: 6 },
  ],
};
const kinds = (projection) => projection.cues.map((cue) => cue.kind);

test("full governed sequence emits only valid cue kinds", () => {
  const projection = build({
    selection,
    trace,
    relations: [{ id: "r1", findingId: "f2", followed: true, convergent: true }],
    invokedAction: { kind: "source_open", sourceRef: "src:1" },
  });
  assert.deepEqual(kinds(projection), [
    "focus_enter", "expression_reveal",
    "trace_step_reveal", "trace_step_reveal", "trace_step_reveal",
    "result_reveal", "relation_connect", "relation_follow", "convergence",
    "source_open", "settle",
  ]);
  assert.ok(kinds(projection).every((kind) => CUE_KINDS.includes(kind)));
  assert.equal(projection.trace.status, "accepted");
});

test("result reveal targets supplied canonical result only", () => {
  const projection = build({ selection: { ...selection, resultValue: 999 } });
  const result = projection.cues.find((cue) => cue.kind === "result_reveal");
  assert.equal(result.target.value, 999);
  assert.equal(result.presentation.countUp.intermediate, "presentation_only");
});

test("trace identity mismatch fails closed", () => {
  for (const [badTrace, reason] of [
    [{ ...trace, input: "אב" }, "expression_mismatch"],
    [{ ...trace, method_key: "אחר" }, "method_mismatch"],
    [{ ...trace, result: 7 }, "result_mismatch"],
    [{ status: "error" }, "trace_unusable"],
  ]) {
    const projection = build({ selection, trace: badTrace });
    assert.equal(projection.trace.reason, reason);
    assert.ok(!kinds(projection).includes("trace_step_reveal"));
  }
});

test("unsupported or partial trace steps fail closed", () => {
  const cases = [
    [[{ ...trace.steps[0], scope: "word" }], "trace_step_scope_unsupported"],
    [[{ ...trace.steps[0], token: "" }], "trace_step_token_missing"],
    [[{ ...trace.steps[0], contribution: null }], "trace_step_contribution_invalid"],
    [[{ ...trace.steps[0], running_subtotal: null }], "trace_step_subtotal_invalid"],
    [[...trace.steps.slice(0, 2), { ...trace.steps[2], running_subtotal: 5 }], "trace_final_subtotal_mismatch"],
    [[], "trace_without_steps"],
  ];
  for (const [steps, reason] of cases) {
    const projection = build({ selection, trace: { ...trace, steps } });
    assert.equal(projection.trace.reason, reason);
    assert.ok(!kinds(projection).includes("trace_step_reveal"));
  }
});

test("sourceRef and return availability do not imply actions", () => {
  const projection = build({ selection: { ...selection, sourceRef: "src:1" } });
  assert.ok(!kinds(projection).includes("source_open"));
  assert.ok(!kinds(projection).includes("exact_return"));
});

test("source_open and exact_return require explicit invokedAction", () => {
  const source = build({ selection, invokedAction: { kind: "source_open", sourceRef: "src:1", locator: "p.4" } });
  assert.equal(source.cues.find((cue) => cue.kind === "source_open")?.target.sourceRef, "src:1");
  const back = build({ selection, invokedAction: { kind: "exact_return", href: "/2029/number/358", selection: { expression: "משיח" } } });
  assert.equal(back.cues.find((cue) => cue.kind === "exact_return")?.target.href, "/2029/number/358");
});

test("relations are never discovered locally", () => {
  const projection = build({ selection, relations: [{ id: "r1" }, { findingId: "x" }, null, { id: "ok", relationRef: "rel:1" }] });
  assert.equal(projection.cues.filter((cue) => cue.kind === "relation_connect").length, 1);
  assert.equal(projection.relationsRejected.length, 3);
});

test("signature is deterministic and selection changes cancel previous projection", () => {
  const first = build({ selection, trace });
  const same = build({ selection: { findingId: "f1", sourceRef: "src:1", resultValue: 6, method: "רגיל", expression: "אבג" }, trace });
  assert.equal(first.signature, same.signature);
  const next = build({ selection: { ...selection, expression: "דה", resultValue: 9 }, previousSignature: first.signature });
  assert.notEqual(first.signature, next.signature);
  assert.equal(next.lifecycle.cancelPrevious, true);
  assert.equal(next.lifecycle.supersedes, first.signature);
});

test("reduced motion is deterministic and removes count-up", () => {
  const projection = build({ selection, trace, reducedMotion: true });
  assert.ok(projection.cues.every((cue) => cue.durationMs === 0 && cue.startMs === 0));
  assert.equal(projection.cues.find((cue) => cue.kind === "result_reveal").presentation.countUp, null);
  assert.equal(build({ selection, trace, reducedMotion: true }).signature, projection.signature);
});

test("provenance and truth-state pass through unchanged", () => {
  const provenance = { engine: "fn_method_profile" };
  const truthState = { tier: "CANDIDATE" };
  const projection = build({ selection, provenance, truthState });
  assert.equal(projection.provenance, provenance);
  assert.equal(projection.truthState, truthState);
});

test("empty selection yields no cues", () => {
  assert.equal(build({}).status, "empty");
  assert.equal(build({}).cues.length, 0);
});

test("helper has no UI, DB, engine formula, or browser dependency", () => {
  const source = readFileSync(new URL("../src/lib/research/semanticAnimationProjection.js", import.meta.url), "utf8");
  const stripped = source.replace(/\/\/.*$/gm, "");
  assert.ok(!/^\s*import\s/m.test(source));
  assert.ok(!/supabase|\.rpc\(|\.insert\(|\.update\(|\.upsert\(|fetch\(|localStorage|document\.|window\./.test(stripped));
  assert.ok(!/Math\.|\.reduce\(|gematria_value|fn_method_value/.test(stripped));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSemanticAnimationProjection as build, CUE_KINDS } from "../src/lib/research/semanticAnimationProjection.js";

const selection = { expression: "אבג", method: "רגיל", resultValue: 6, sourceRef: "src:1", findingId: "f1" };
const trace = { input: "אבג", method_key: "רגיל", result: 6, steps: [{ letter: "א" }, { letter: "ב" }, { letter: "ג" }] };
const kinds = (p) => p.cues.map((c) => c.kind);

test("full sequence from governed inputs, all kinds valid", () => {
  const p = build({ selection, trace, relations: [{ id: "r1", findingId: "f2", followed: true, convergent: true }], returnTo: { href: "/x" } });
  assert.deepEqual(kinds(p), ["focus_enter", "expression_reveal", "trace_step_reveal", "trace_step_reveal", "trace_step_reveal", "result_reveal", "relation_connect", "relation_follow", "convergence", "source_open", "exact_return", "settle"]);
  assert.ok(kinds(p).every((k) => CUE_KINDS.includes(k)));
  assert.equal(p.trace.status, "accepted");
});

test("result cue targets supplied canonical result; count-up is presentation only", () => {
  const p = build({ selection: { ...selection, resultValue: 999 }, trace: null });
  const r = p.cues.find((c) => c.kind === "result_reveal");
  assert.equal(r.target.value, 999);
  assert.equal(r.presentation.countUp.intermediate, "presentation_only");
});

test("trace identity gate fails closed on expression/method/result mismatch and unsupported", () => {
  for (const [bad, reason] of [
    [{ ...trace, input: "אב" }, "expression_mismatch"],
    [{ ...trace, method_key: "אחר" }, "method_mismatch"],
    [{ ...trace, result: 7 }, "result_mismatch"],
    [{ ...trace, steps: [] }, "trace_without_steps"],
    [{ status: "error" }, "trace_unusable"],
  ]) {
    const p = build({ selection, trace: bad });
    assert.equal(p.trace.reason, reason);
    assert.ok(!kinds(p).includes("trace_step_reveal"));
  }
  assert.equal(build({ selection: { expression: "אבג" }, trace }).trace.reason, "selection_identity_incomplete");
});

test("relations only if supplied and existing; never discovered", () => {
  const p = build({ selection, relations: [{ id: "r1" }, { findingId: "x" }, null, { id: "ok", relationRef: "rel:1" }] });
  assert.equal(p.cues.filter((c) => c.kind === "relation_connect").length, 1);
  assert.equal(p.relationsRejected.length, 3);
});

test("deterministic signature, independent of key order; changes with selection", () => {
  const a = build({ selection, trace });
  const b = build({ selection: { sourceRef: "src:1", findingId: "f1", resultValue: 6, method: "רגיל", expression: "אבג" }, trace });
  assert.equal(a.signature, b.signature);
  assert.notEqual(a.signature, build({ selection: { ...selection, expression: "דה", resultValue: 9 } }).signature);
});

test("selection change cancels previous and rebuilds", () => {
  const a = build({ selection, trace });
  const b = build({ selection: { ...selection, expression: "דה" }, previousSignature: a.signature });
  assert.equal(b.lifecycle.cancelPrevious, true);
  assert.equal(b.lifecycle.supersedes, a.signature);
  assert.equal(build({ selection, trace, previousSignature: a.signature }).lifecycle.cancelPrevious, false);
});

test("reduced-motion profile is deterministic: zero timing, no count-up", () => {
  const p = build({ selection, trace, reducedMotion: true });
  assert.ok(p.cues.every((c) => c.durationMs === 0 && c.startMs === 0));
  assert.equal(p.cues.find((c) => c.kind === "result_reveal").presentation.countUp, null);
  assert.deepEqual(build({ selection, trace, reducedMotion: true }).signature, p.signature);
});

test("provenance and truth-state pass through unchanged; absent stays null", () => {
  const provenance = { engine: "fn_method_profile" };
  const truthState = { tier: "CANDIDATE" };
  const p = build({ selection, provenance, truthState });
  assert.equal(p.provenance, provenance);
  assert.equal(p.truthState, truthState);
  assert.equal(build({ selection }).truthState, null);
});

test("empty selection yields no cues", () => {
  assert.equal(build({}).status, "empty");
  assert.equal(build({}).cues.length, 0);
});

test("source has no UI/engine/DB/formula dependency and no canonical writes", () => {
  const src = readFileSync(new URL("../src/lib/research/semanticAnimationProjection.js", import.meta.url), "utf8");
  assert.ok(!/^\s*import\s/m.test(src), "no imports at all");
  assert.ok(!/supabase|\.rpc\(|\.insert\(|\.update\(|\.upsert\(|fetch\(|localStorage|document\.|window\./.test(src.replace(/\/\/.*$/gm, "")));
  assert.ok(!/Math\.|\.reduce\(|gematria_value|fn_method_value/.test(src.replace(/\/\/.*$/gm, "")));
});

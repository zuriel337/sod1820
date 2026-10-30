import assert from "node:assert/strict";
import test from "node:test";
import {
  ELS_MATRIX_READING_ACK_UPPER_BOUND_USD, ELS_MATRIX_READING_ACTION, ELS_MATRIX_READING_FOCUS_DEFAULT, ELS_MATRIX_READING_LIMITS, ELS_MATRIX_READING_NEIGHBORHOOD, ELS_MATRIX_READING_START, ELS_MATRIX_READING_SUBJECT,
  cleanElsMatrixReadingStory, elsMatrixReadingPhase, isLiveFableReading, normalizeElsMatrixReadingAction, normalizeElsMatrixReadingResult,
} from "../supabase/functions/_shared/elsMatrixReadingAction.js";
import { DEFAULTS, LIMITS, estimateCost } from "../supabase/functions/_shared/elsMatrixReading.js";

const token = "a".repeat(60);
const act = (patch) => normalizeElsMatrixReadingAction({ id: ELS_MATRIX_READING_ACTION, op: "preview", ...patch });

test("the closed action: ids, ops, bounds; unknown keys, wrong types and out-of-range values refuse the whole action", () => {
  assert.deepEqual(act({}), { id: ELS_MATRIX_READING_ACTION, op: "preview" });
  assert.deepEqual(act({ window: { rows: 21, cols: 31 }, cap: 25, story: " סיפור  קצר " }), { id: ELS_MATRIX_READING_ACTION, op: "preview", window: { rows: 21, cols: 31 }, cap: 25, story: "סיפור קצר" });
  assert.deepEqual(act({ window: { rows: 21 } }).window, { rows: 21, cols: 41 }, "a missing side falls back to the starting value");
  for (const bad of [
    { id: "x" }, { op: "run" }, { extra: 1 }, { window: { rows: 8, cols: 41 } }, { window: { rows: 36, cols: 41 } }, { window: { rows: 33, cols: 14 } }, { window: { rows: 33, cols: 46 } },
    { window: { rows: 33, cols: 41, depth: 1 } }, { window: "33x41" }, { cap: 4 }, { cap: 61 }, { cap: 25.5 }, { story: 5 }, { story: "א".repeat(301) }, { job_token: token }, { ack_upper_bound_usd: 2 },
  ]) assert.equal(act(bad), null, JSON.stringify(bad).slice(0, 70));
  assert.equal(normalizeElsMatrixReadingAction(null), null);
  assert.equal(normalizeElsMatrixReadingAction([]), null);
});

test("start requires the acknowledged upper bound; status and cancel carry only a well-formed job token", () => {
  assert.equal(act({ op: "start" }), null);
  assert.equal(act({ op: "start", ack_upper_bound_usd: 0 }), null);
  assert.equal(act({ op: "start", ack_upper_bound_usd: 11 }), null);
  assert.equal(act({ op: "start", ack_upper_bound_usd: "2" }), null);
  assert.equal(act({ op: "start", ack_upper_bound_usd: 2 }).ack_upper_bound_usd, 2);
  for (const op of ["status", "cancel"]) {
    assert.deepEqual(act({ op, job_token: token }), { id: ELS_MATRIX_READING_ACTION, op, job_token: token });
    for (const bad of [{}, { job_token: "short" }, { job_token: `${token}!` }, { job_token: token, cap: 25 }, { job_token: token, window: { rows: 21, cols: 31 } }, { job_token: token, story: "x" }, { job_token: token, ack_upper_bound_usd: 2 }])
      assert.equal(act({ op, ...bad }), null, `${op} ${JSON.stringify(bad).slice(0, 60)}`);
  }
});

test("the story is data: tags, control characters and the quote characters of the prompt frame are removed", () => {
  assert.equal(cleanElsMatrixReadingStory('<b>שלום</b> „עולם” "טוב"\n\tיום'), "שלום עולם טוב יום");
  assert.equal(cleanElsMatrixReadingStory(null), "");
  assert.equal(act({ story: "   " }).story, undefined, "an empty story is simply not there");
});

test("the engine and the contract share one set of limits and starting values (33x41, cap 60 are a starting point, not a rule)", () => {
  assert.deepEqual([ELS_MATRIX_READING_START.rows, ELS_MATRIX_READING_START.cols, ELS_MATRIX_READING_START.cap], [33, 41, 60]);
  assert.deepEqual([DEFAULTS.rows, DEFAULTS.cols, DEFAULTS.cap], [33, 41, 60]);
  assert.deepEqual([LIMITS.minRows, LIMITS.maxRows, LIMITS.minCols, LIMITS.maxCols, LIMITS.minCap, LIMITS.maxCap], [9, 35, 15, 45, 5, 60]);
  assert.equal(ELS_MATRIX_READING_SUBJECT.length <= 300, true);
  assert.ok(Object.isFrozen(ELS_MATRIX_READING_LIMITS));
});

test("the ceiling the card shows before the one click covers the computed upper bound of every window the limits allow", () => {
  // ~17.9 input tokens per cell was measured (16,858 tokens for 943 cells); allow 25% on top
  const worst = Math.ceil(ELS_MATRIX_READING_LIMITS.rows.max * ELS_MATRIX_READING_LIMITS.cols.max * 17.9 * 1.25);
  const bound = estimateCost({ model: "claude-fable-5-1", inputTokens: worst, maxTokens: 64_000, cap: 60 }).upper_bound_usd;
  assert.ok(bound < ELS_MATRIX_READING_ACK_UPPER_BOUND_USD, `worst-case bound ${bound} must stay under the ceiling ${ELS_MATRIX_READING_ACK_UPPER_BOUND_USD}`);
  assert.ok(ELS_MATRIX_READING_ACK_UPPER_BOUND_USD < 2.5, "and the ceiling is not a blank cheque");
});

test("a result is kept as the contract only: known keys, bounded values; anything else is dropped", () => {
  assert.equal(normalizeElsMatrixReadingResult({ contract: "other" }), null);
  assert.equal(normalizeElsMatrixReadingResult(null), null);
  const kept = normalizeElsMatrixReadingResult({ contract: "els_matrix_reading_v1", ok: true, state: "COMPLETE", secret: "x", findings: Array.from({ length: 300 }, (_, i) => ({ id: i, text: "א".repeat(2000), deep: { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } } })), cost: { usd: Infinity } });
  assert.equal(kept.secret, undefined);
  assert.equal(kept.findings.length, 120);
  assert.equal(kept.findings[0].text.length, 700);
  assert.equal(kept.cost.usd, null, "a non-finite number never reaches the card");
  assert.equal(JSON.stringify(kept.findings[0].deep).includes('"g"'), false, "depth is bounded");
});

test("the phase names never upgrade a result", () => {
  const p = (state, extra = {}) => elsMatrixReadingPhase({ contract: "els_matrix_reading_v1", ok: true, state, ...extra });
  assert.equal(p("PREVIEW").phase, "preview");
  assert.deepEqual(p("RUNNING", { job: { poll_after_seconds: 20 } }), { phase: "running", done: false, completed: false, pollAfterSeconds: 20 });
  assert.deepEqual([p("COMPLETE").phase, p("COMPLETE").completed], ["complete", true]);
  assert.deepEqual([p("INCOMPLETE", { reason: "max_tokens", continuation_required: true }).completed, p("INCOMPLETE", { reason: "max_tokens", continuation_required: true }).continuationRequired], [false, true]);
  assert.equal(p("FAILED_WITH_REASON", { reason: "engine_unavailable", retryable: true }).retryable, true);
  assert.deepEqual([p("REFUSED", { error: "admin_only" }).phase, p("REFUSED", { error: "admin_only" }).done], ["refused", true]);
  assert.equal(p("CANCEL_REQUESTED").phase, "cancelling");
  assert.equal(elsMatrixReadingPhase({ state: "COMPLETE" }).phase, "error", "a body without the contract is not a result");
  assert.equal(elsMatrixReadingPhase(null).phase, "error");
});

test("only a result from the live provider route is a live Fable reading; a test double, a fixture or a preview is not", () => {
  const live = { contract: "els_matrix_reading_v1", is_test_fixture: false, provider: { kind: "anthropic_live", live_model_call: true }, model: { verified_available: true } };
  assert.equal(isLiveFableReading(live), true);
  for (const patch of [{ is_test_fixture: true }, { provider: { kind: "test_double", live_model_call: true } }, { provider: { live_model_call: true } }, { provider: { live_model_call: false } }, { provider: {} }, { model: { verified_available: false } }, { model: undefined }, { contract: "x" }])
    assert.equal(isLiveFableReading({ ...live, ...patch }), false, JSON.stringify(patch));
  assert.equal(isLiveFableReading(null), false);
});

test("focus: axis_neighborhood (the default when absent) or uniform; anything else, or a focus on a job operation, refuses the whole action", () => {
  const base = { id: "els_matrix_reading_v1", op: "preview" };
  assert.equal(normalizeElsMatrixReadingAction(base).focus, undefined, "absent stays absent: the engine applies the default");
  assert.equal(normalizeElsMatrixReadingAction({ ...base, focus: "uniform" }).focus, "uniform");
  assert.equal(normalizeElsMatrixReadingAction({ ...base, focus: "axis_neighborhood" }).focus, "axis_neighborhood");
  for (const bad of ["far", "", 1, true, "AXIS_NEIGHBORHOOD"]) assert.equal(normalizeElsMatrixReadingAction({ ...base, focus: bad }), null, String(bad));
  const token = "T".repeat(80);
  assert.equal(normalizeElsMatrixReadingAction({ id: "els_matrix_reading_v1", op: "status", job_token: token, focus: "uniform" }), null);
  assert.deepEqual([ELS_MATRIX_READING_FOCUS_DEFAULT, ELS_MATRIX_READING_NEIGHBORHOOD.radius, ELS_MATRIX_READING_NEIGHBORHOOD.targetRatio], ["axis_neighborhood", 8, 2]);
});

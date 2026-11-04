import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildElsRazielMatrixContext } from "../src/lib/research/elsRazielMatrixContext.js";
import { createRazielTurnSucceededAction, normalizeRazielResponse, prepareRazielSessionSubmission } from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState, normalizeRazielTurnProgress, razielSessionReducer } from "../src/lib/research/razielSession2029.js";
import { buildRazielSavedSessionEntity } from "../src/lib/research/razielSavedSession2029.js";
import { attachElsMatrixReadingHooks, buildElsMatrixReadingSubmission } from "../src/lib/research/elsMatrixReadingSession.js";
import { ELS_MATRIX_READING_ACK_UPPER_BOUND_USD, ELS_MATRIX_READING_ACTION, ELS_MATRIX_READING_SUBJECT } from "../supabase/functions/_shared/elsMatrixReadingAction.js";

const state0 = () => createInitialRazielSessionState();
function sample() {
  return { status: "ok", scope: "torah", termRaw: "קולומביה", verification: { state: "MATCH", corpus_id: "0b022e8eef6f9c16" },
    axis: { hitId: "4545_1_248765", skip: 4545, direction: "fwd", start: 248765, length: 8 },
    geometry: { S: 4545 }, matrix: { S: 4545, r0: 40, c0: 3300, cw: 60, rows: Array(30).fill("א".repeat(60)) } };
}
const context = buildElsRazielMatrixContext(sample());
const TOKEN = "T".repeat(80);
const submitArgs = (options = {}) => buildElsMatrixReadingSubmission({ context, ...options });
const prepare = (override = {}) => {
  const built = submitArgs(override.options);
  return prepareRazielSessionSubmission({ state: state0(), researchContext: null, startedAt: "2026-10-29T10:00:00.000Z", createTurnId: () => "turn-1", ...built.submission, ...override.submit });
};

test("the sample matrix context is valid (the card builds it already)", () => {
  assert.ok(context);
  assert.equal(context.axis.term, "קולומביה");
});

test("the submission is closed: fixed subject, deep level, the context's axis as focus; start carries the acknowledged ceiling, preview and cancel do not spend", () => {
  const start = submitArgs();
  assert.equal(start.ok, true);
  assert.deepEqual([start.submission.question, start.submission.intelligenceLevel], [ELS_MATRIX_READING_SUBJECT, "deep"]);
  assert.equal(start.submission.elsMatrixReadingAction.op, "start");
  assert.equal(start.submission.elsMatrixReadingAction.ack_upper_bound_usd, ELS_MATRIX_READING_ACK_UPPER_BOUND_USD);
  assert.equal(start.submission.view.elsMatrixContext, context);
  assert.equal(start.submission.view.elsFocus.occurrenceRef, context.axis.hitId);
  assert.equal(submitArgs({ op: "preview" }).submission.elsMatrixReadingAction.ack_upper_bound_usd, undefined);
  assert.deepEqual(submitArgs({ jobToken: TOKEN }).submission.elsMatrixReadingAction, { id: ELS_MATRIX_READING_ACTION, op: "status", job_token: TOKEN });
  assert.equal(submitArgs({ jobToken: TOKEN, op: "cancel" }).submission.elsMatrixReadingAction.op, "cancel");
  assert.deepEqual(buildElsMatrixReadingSubmission({}), { ok: false, error: "matrix_context_required" });
  assert.deepEqual(buildElsMatrixReadingSubmission({ context: null }), { ok: false, error: "matrix_context_required" });
});

test("the request adapter builds one request: matrix context, the closed action, no free facts, no navigation, no conversation resolution", () => {
  const prepared = prepare({ options: { window: { rows: 21, cols: 31 }, cap: 25, story: "סיפור קצר" } });
  assert.ok(prepared, "a valid reading submission is prepared");
  const { request, turn } = prepared;
  assert.equal(request.subject, ELS_MATRIX_READING_SUBJECT);
  assert.deepEqual([request.facts, request.context, request.intelligenceLevel, request.again, request.conversationResolution], ["", null, "deep", false, null]);
  assert.deepEqual(request.elsMatrixContext, context);
  assert.match(request.elsMatrixReadingAction.request_id, /^[a-f0-9-]{36}$/);
  assert.deepEqual(request.elsMatrixReadingAction, { id: ELS_MATRIX_READING_ACTION, op: "start", window: { rows: 21, cols: 31 }, cap: 25, story: "סיפור קצר", ack_upper_bound_usd: ELS_MATRIX_READING_ACK_UPPER_BOUND_USD, request_id: request.elsMatrixReadingAction.request_id });
  assert.equal(request.researchContract, "public-number-research-run-v1");
  assert.deepEqual([turn.kind, turn.readingOp, turn.question], ["els_matrix_reading", "start", ELS_MATRIX_READING_SUBJECT]);
  assert.equal(prepared.navigation, undefined);
});

test("anything outside the closed shape is refused before a request exists", () => {
  const base = submitArgs().submission;
  const go = (patch) => prepareRazielSessionSubmission({ state: state0(), researchContext: null, startedAt: "2026-10-29T10:00:00.000Z", createTurnId: () => "t", ...base, ...patch });
  assert.ok(go({}));
  assert.equal(go({ view: { surface: "els" } }), null, "no matrix context, no reading");
  assert.equal(go({ view: { ...base.view, elsMatrixContext: { contract: "bad" } } }), null);
  assert.equal(go({ elsMatrixReadingAction: { ...base.elsMatrixReadingAction, cap: 99 } }), null);
  assert.equal(go({ elsMatrixReadingAction: { ...base.elsMatrixReadingAction, op: "start", ack_upper_bound_usd: undefined } }), null, "no acknowledged ceiling, no run");
  assert.equal(go({ companionAction: { id: "personal_area_companion_v1" } }), null);
  assert.equal(go({ elsPlanningAction: { id: "els_guided_planning_v1" } }), null);
  assert.equal(go({ again: true }), null);
  assert.equal(go({ continuationTurnId: "x" }), null);
  assert.equal(go({ viewModeOverride: "surprise" }), null);
  assert.ok(go({ question: "משהו אחר" }), "the question is ignored: the subject is fixed");
  assert.equal(go({ question: "משהו אחר" }).request.subject, ELS_MATRIX_READING_SUBJECT);
});

test("a navigation phrase typed as the question never turns a reading into navigation", () => {
  const prepared = prepare({ submit: { question: "פתח את המספר 358" } });
  assert.equal(prepared.navigation, undefined);
  assert.ok(prepared.request.elsMatrixReadingAction);
});

test("the answer carries the reading only for a reading request; an ordinary answer can never smuggle one in", () => {
  const reading = { contract: "els_matrix_reading_v1", ok: true, state: "COMPLETE", findings: [{ id: "r1.f01", text: "קולומביה" }], secret: "x" };
  const request = prepare().request;
  const ordinary = { ...request, elsMatrixReadingAction: undefined };
  const withReading = normalizeRazielResponse({ v: 1, answer: "תשובה", els_matrix_reading: reading }, "deep", request);
  assert.equal(withReading.elsMatrixReading.state, "COMPLETE");
  assert.equal(withReading.elsMatrixReading.secret, undefined);
  assert.equal(normalizeRazielResponse({ v: 1, answer: "תשובה", els_matrix_reading: reading }, "deep", ordinary).elsMatrixReading, undefined);
  assert.equal(normalizeRazielResponse({ v: 1, answer: "תשובה", els_matrix_reading: reading }, "deep").elsMatrixReading, undefined);
  assert.equal(normalizeRazielResponse({ v: 1, answer: "תשובה", els_matrix_reading: { contract: "other" } }, "deep", request).elsMatrixReading, undefined);
  const message = createRazielTurnSucceededAction({ state: { thread: [], currentTurn: { id: "t", question: ELS_MATRIX_READING_SUBJECT } }, response: withReading, provenance: null, completedAt: "now" }).patch.thread[0];
  assert.deepEqual([message.role, message.text, message.elsMatrixReading.findings.length], ["raziel", "תשובה", 1]);
});

test("turn_progress is display state of the running turn only: it needs a busy turn with the same id and a well-formed progress", () => {
  const idle = state0();
  const progress = { kind: "els_matrix_reading", phase: "running", elapsedMs: 125_000, polls: 6, expectedMinutes: { min: 3, max: 13 }, providerStatus: "in_progress", batchId: "msgbatch_test01", jobToken: TOKEN, pollSeconds: 20 };
  assert.equal(razielSessionReducer(idle, { type: "turn_progress", turnId: "t", progress }), idle, "no turn, no progress");
  const busy = { ...idle, busy: true, currentTurn: { id: "t", status: "running" } };
  const next = razielSessionReducer(busy, { type: "turn_progress", turnId: "t", progress });
  assert.deepEqual([next.currentTurn.progress.phase, next.currentTurn.progress.elapsedMs, next.currentTurn.progress.batchId, next.currentTurn.progress.jobToken], ["running", 125_000, "msgbatch_test01", TOKEN]);
  assert.match(next.announcement, /חלפו 2 דקות/);
  assert.equal(razielSessionReducer(busy, { type: "turn_progress", turnId: "other", progress }), busy);
  assert.equal(razielSessionReducer(busy, { type: "turn_progress", turnId: "t", progress: { ...progress, phase: "dancing" } }), busy);
  assert.equal(razielSessionReducer(busy, { type: "turn_progress", turnId: "t", progress: { kind: "other" } }), busy);
  assert.equal(normalizeRazielTurnProgress({ ...progress, jobToken: "short", batchId: "nope", elapsedMs: -5 }).jobToken, undefined);
  assert.equal(normalizeRazielTurnProgress({ ...progress, batchId: "nope" }).batchId, undefined);
  assert.equal(razielSessionReducer({ ...busy, currentTurn: { id: "t", status: "running", progress: next.currentTurn.progress } }, { type: "turn_failed", completedAt: "x", error: "unavailable" }).busy, false);
  assert.match(razielSessionReducer(busy, { type: "turn_progress", turnId: "t", progress: { ...progress, phase: "cancelling" } }).announcement, /מבטל/);
});

test("the hooks of a long turn are non-enumerable (never in the body), progress respects the mount, cancel is idempotent", () => {
  const request = prepare().request;
  const dispatched = [];
  let mounted = true;
  const hooks = attachElsMatrixReadingHooks(request, { turnId: "turn-1", dispatch: (a) => dispatched.push(a), isMounted: () => mounted });
  assert.deepEqual(Object.keys(request).filter((k) => k.startsWith("__")), []);
  assert.equal(JSON.stringify(request).includes("__razielProgress"), false);
  request.__razielProgress({ kind: "els_matrix_reading", phase: "running" });
  mounted = false;
  request.__razielProgress({ kind: "els_matrix_reading", phase: "running" });
  assert.deepEqual(dispatched.map((a) => [a.type, a.turnId]), [["turn_progress", "turn-1"]], "nothing is dispatched after unmount");
  assert.equal(request.__razielCancelSignal.aborted, false);
  assert.deepEqual([hooks.cancel(), hooks.cancel(), request.__razielCancelSignal.aborted], [true, false, true]);
  assert.equal(attachElsMatrixReadingHooks({ subject: "x" }, { turnId: "t", dispatch() {} }), null, "an ordinary request gets no hooks");
});

test("the provider only exposes the reading as an explicit call: nothing renders, mounts or effects its way into a model call", () => {
  const provider = readFileSync(new URL("../src/lib/research/RazielSessionProvider2029.jsx", import.meta.url), "utf8");
  assert.match(provider, /const submitElsMatrixReading = useCallback\(\(options = \{\}\) => \{[\s\S]*buildElsMatrixReadingSubmission\(options\)[\s\S]*submit\(built\.submission\)/);
  assert.match(provider, /const cancelActiveTurn = useCallback/);
  const effects = [...provider.matchAll(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g)].map((m) => m[0]).join("\n");
  assert.doesNotMatch(effects, /submitElsMatrixReading|elsMatrixReading|askRaziel|transport/);
  assert.equal((provider.match(/await transport\(request\)/g) || []).length, 1, "the single AI boundary is unchanged");
  assert.doesNotMatch(provider, /fetch\(|functions\.invoke|setInterval/);
  const supabase = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
  assert.equal((supabase.match(/runElsMatrixReadingTurn/g) || []).length, 2, "one import, one call in askRaziel");
});

test("a malformed reading cannot report a successful save that silently loses its structured result", () => {
  const saved = buildRazielSavedSessionEntity({ busy: false, contextSnapshot: null, thread: [
    { role: "user", text: ELS_MATRIX_READING_SUBJECT, turnId: "t" },
    { role: "raziel", text: "קריאת מטריצה הושלמה", turnId: "t", elsMatrixReading: { contract: "els_matrix_reading_v1", state: "COMPLETE", job: { token: TOKEN }, findings: [{ id: "x" }] } },
  ] }, { now: () => "2026-10-29T10:00:00.000Z", createId: () => "s1" });
  assert.equal(saved.ok, false, "COMPLETE without occurrence context and receipts is not saveable");
  assert.equal(saved.entity, undefined);
  assert.equal(JSON.stringify(saved).includes(TOKEN), false);
});

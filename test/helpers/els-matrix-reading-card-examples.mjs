// Builds the example data a card is developed against. EVERY example is TEST DATA: the stream window, the model answer and the engine replays are the recorded EXP-18 run C3
// (Columbia axis, 23x41) served through fakes, and the provider is a test double (provider.kind "test_double", is_test_fixture true, live_model_call false).
// They are never a Fable reading and never a verified finding of a real run; a card must label anything with is_test_fixture:true as an example.
import { writeFileSync, mkdirSync } from "node:fs";
import * as M from "../../supabase/functions/_shared/elsMatrixReading.js";
import { createRazielTurnSucceededAction, normalizeRazielResponse } from "../../src/lib/research/razielSessionRequest2029.js";
import { normalizeRazielTurnProgress, razielSessionReducer, createInitialRazielSessionState } from "../../src/lib/research/razielSession2029.js";
import { ELS_MATRIX_READING_ACTION, ELS_MATRIX_READING_SUBJECT } from "../../supabase/functions/_shared/elsMatrixReadingAction.js";
import { call, message, req, world } from "./els-matrix-reading-world.mjs";

const wrap = (name, payload, extra = {}) => {
  const answer = M.razielReadingAnswer(payload);
  const request = { elsMatrixReadingAction: { id: ELS_MATRIX_READING_ACTION } };
  const normalized = normalizeRazielResponse({ v: 1, answer, els_matrix_reading: payload }, "deep", request);
  const state = { thread: [{ role: "user", text: ELS_MATRIX_READING_SUBJECT, turnId: "example-turn" }], currentTurn: { id: "example-turn", question: ELS_MATRIX_READING_SUBJECT } };
  const thread = createRazielTurnSucceededAction({ state, response: normalized, provenance: null, completedAt: "2026-10-29T10:10:00.000Z" }).patch.thread;
  return {
    _fixture: { name, is_test_fixture: true, source: "recorded EXP-18 run C3 (window, model answer, engine replays) served through fakes; the provider is a test double, not Fable", note: "a real reading has is_test_fixture:false and provider.live_model_call:true" },
    response: payload,
    raziel_answer: answer,
    thread_message: { ...thread[thread.length - 1], elsMatrixReading: "(the bounded copy of `response` that the session keeps on the message: same keys, strings cut at 700 characters, at most 120 findings)" },
    thread_message_keys: Object.keys(thread[thread.length - 1]),
    thread_message_reading_state: thread[thread.length - 1].elsMatrixReading?.state ?? null,
    ...extra,
  };
};

export async function buildCardExamples() {
  const ended = { now: Date.parse("2026-10-29T10:04:00.000Z") };
  const startedWorld = world();
  const started = await call(startedWorld, req("start", { ack_upper_bound_usd: 2 }));
  const jobId = started.body.job.id;
  const statusAction = req("status", { job_id: jobId });
  const registered = options => {
    const next = world(options); next.state.jobs = structuredClone(startedWorld.state.jobs); next.state.customId = startedWorld.state.customId; return next;
  };
  const pollRunning = await call(startedWorld, statusAction, { now: Date.parse("2026-10-29T10:01:30.000Z") });
  const complete = await call(registered({ batchState: "ended" }), statusAction, ended);
  const cut = await call(registered({ batchState: "ended", result: { type: "succeeded", message: message({ stopReason: "max_tokens", text: "{\"findings\":[", usage: { input_tokens: 16858, output_tokens: 64000, output_tokens_details: { thinking_tokens: 63990 } } }) } }), statusAction, ended);
  const errored = await call(registered({ batchState: "ended", result: { type: "errored", error: { type: "api_error" } } }), statusAction, ended);
  const cancelWorld = registered();
  const cancelled = await call(cancelWorld, req("cancel", { job_id: jobId }));
  const preview = await call(world(), req("preview"));
  const adminOnly = await call(world(), req("preview"), { tier: "user" });
  const notEnabled = await call(world(), req("preview"), { enabled: "" });
  const progress = [
    { kind: "els_matrix_reading", phase: "starting", elapsedMs: 0, polls: 0, expectedMinutes: { min: 3, max: 13 } },
    { kind: "els_matrix_reading", phase: "running", elapsedMs: 90_000, polls: 4, expectedMinutes: { min: 3, max: 13 }, providerStatus: "in_progress", batchId: "msgbatch_test01", jobId, pollSeconds: 20 },
    { kind: "els_matrix_reading", phase: "cancelling", elapsedMs: 150_000, polls: 7, expectedMinutes: { min: 3, max: 13 }, providerStatus: "canceling", batchId: "msgbatch_test01", jobId, pollSeconds: 20, cancelling: true },
  ].map(normalizeRazielTurnProgress);
  const turnState = razielSessionReducer({ ...createInitialRazielSessionState(), busy: true, currentTurn: { id: "example-turn", status: "running", kind: "els_matrix_reading", readingOp: "start" } }, { type: "turn_progress", turnId: "example-turn", progress: progress[1] });
  return {
    "preview.json": wrap("preview", preview.body),
    "running-start.json": wrap("running-start", started.body),
    "running-poll.json": wrap("running-poll", pollRunning.body),
    "complete.json": wrap("complete", complete.body),
    "incomplete-max-tokens.json": wrap("incomplete-max-tokens", cut.body),
    "failed-batch-errored.json": wrap("failed-batch-errored", errored.body),
    "cancel-requested.json": wrap("cancel-requested", cancelled.body),
    "refused-admin-only.json": wrap("refused-admin-only", adminOnly.body),
    "refused-not-enabled.json": wrap("refused-not-enabled", notEnabled.body),
    "session-progress.json": { _fixture: { name: "session-progress", is_test_fixture: true, note: "what the session keeps in currentTurn.progress while a reading runs (a batch gives no partial output: only time and the provider's status)" }, progress_examples: progress, current_turn_after_turn_progress: turnState.currentTurn, announcement: turnState.announcement },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL("../fixtures/els-matrix-reading/card-examples/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, value] of Object.entries(await buildCardExamples())) if (value !== undefined) writeFileSync(new URL(name, dir), `${JSON.stringify(value, null, 2)}\n`);
  console.log("card examples written");
}

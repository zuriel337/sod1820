import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { askRaziel, supabase } from "../src/lib/supabase.js";
import { buildElsRazielMatrixContext } from "../src/lib/research/elsRazielMatrixContext.js";
import { createRazielProvenance, createRazielTurnSucceededAction, normalizeRazielResponse, prepareRazielSessionSubmission } from "../src/lib/research/razielSessionRequest2029.js";
import { createInitialRazielSessionState, razielSessionReducer } from "../src/lib/research/razielSession2029.js";
import { attachElsMatrixReadingHooks, buildElsMatrixReadingSubmission } from "../src/lib/research/elsMatrixReadingSession.js";
import { runAiAnalyze, UID, USER_JWT } from "./helpers/ai-analyze-handler.mjs";
import { AXIS, BATCH, message, savedAnswer, world } from "./helpers/els-matrix-reading-world.mjs";

// The whole path with nothing mocked but the network: session adapter -> askRaziel -> the lazy transport -> the REAL ai-analyze handler (types erased) -> reading engine.
// The stream, the canonical engine, Anthropic and the token log are the shared fakes. So every result here is a TEST DOUBLE of the provider (the handler labels the route
// live; these tests never reach a model). That is why nothing here may be quoted as a Fable reading.
const FIXTURE = "https://fixture.invalid";
const sample = { status: "ok", scope: "torah", termRaw: AXIS.term, verification: { state: "MATCH", corpus_id: "0b022e8eef6f9c16" },
  axis: { hitId: `${AXIS.skip}_1_${AXIS.start}`, skip: AXIS.skip, direction: "fwd", start: AXIS.start, length: 8 },
  geometry: { S: AXIS.skip }, matrix: { S: AXIS.skip, r0: 40, c0: 3300, cw: 60, rows: Array(30).fill("א".repeat(60)) } };
const context = buildElsRazielMatrixContext(sample);

function serverFor(w, { role = "admin", counter = { calls: 0, ops: [] }, onCall = () => {} } = {}) {
  const options = (body) => ({
    bearer: USER_JWT, verifiedUid: UID, role, allowed: true, elsVerifyStatus: "match", body,
    envOverrides: { ELS_MATRIX_READING_ENABLED: "1", ELS_MATRIX_READING_JOB_SECRET: "e2e-secret" },
    extraRoute: async ({ url, init }) => {
      const handled = (url.origin === FIXTURE && /\/rest\/v1\/(torah_stream|api_pricing|ai_token_log|rpc\/(els_verify_occurrence_v1|els_matrix_reading_job_))/.test(url.pathname)) || url.origin === "https://api.anthropic.com";
      if (!handled) return null;
      const r = await w.fetchImpl(url.href, init);
      return new Response(await r.text(), { status: r.status });
    },
  });
  Object.defineProperty(supabase, "functions", { configurable: true, value: {
    invoke: async (name, { body }) => {
      assert.equal(name, "ai-analyze");
      counter.calls += 1; counter.ops.push(body.els_matrix_reading_action?.op ?? "none");
      onCall(counter);
      const run = await runAiAnalyze(options(body));
      return { data: run.result, error: run.status >= 400 ? Object.assign(new Error(`HTTP ${run.status}`), { status: run.status }) : null };
    },
  } });
  return counter;
}

/** One session turn the way the provider runs it: prepare -> hooks -> transport (askRaziel) -> normalise -> reduce. */
function turn(options, { state = createInitialRazielSessionState() } = {}) {
  const built = buildElsMatrixReadingSubmission({ context, ...options });
  const prepared = prepareRazielSessionSubmission({ state, researchContext: null, startedAt: "2026-10-29T10:00:00.000Z", createTurnId: () => "turn-e2e", ...built.submission });
  assert.ok(prepared, "the submission is accepted by the request adapter");
  const session = { state: razielSessionReducer(state, { type: "turn_started", turn: prepared.turn, contextSnapshot: prepared.contextSnapshot }), progress: [] };
  const dispatch = (action) => { session.state = razielSessionReducer(session.state, action); if (action.type === "turn_progress") session.progress.push(session.state.currentTurn.progress); };
  const hooks = attachElsMatrixReadingHooks(prepared.request, { turnId: "turn-e2e", dispatch });
  const abort = new AbortController();
  Object.defineProperty(prepared.request, "__razielAbortSignal", { value: abort.signal, enumerable: false, configurable: true });
  const promise = askRaziel(prepared.request).then((raw) => {
    if (!raw) { session.state = razielSessionReducer(session.state, { type: "turn_failed", completedAt: "x", error: "transport_failed" }); return { raw, failed: true }; }
    const response = normalizeRazielResponse(raw, "deep", prepared.request);
    const provenance = createRazielProvenance({ response: raw, turn: prepared.turn, completedAt: "2026-10-29T10:10:00.000Z" });
    session.state = razielSessionReducer(session.state, createRazielTurnSucceededAction({ state: session.state, response, provenance, completedAt: "2026-10-29T10:10:00.000Z" }));
    return { raw, response, provenance };
  });
  return { promise, session, hooks, abort, request: prepared.request };
}

/** Lets the transport wait and wakes it by moving the mocked clock, optionally changing the fake world on a given step. */
async function drive(promise, step = () => {}) {
  let settled = false; let value; let error;
  promise.then((v) => { settled = true; value = v; }, (e) => { settled = true; error = e; });
  for (let i = 0; i < 600 && !settled; i += 1) { await new Promise((resolve) => setImmediate(resolve)); if (settled) break; step(i); mock.timers.tick(20_000); }
  assert.ok(settled, "the turn did not settle");
  if (error) throw error;
  return value;
}
const withTimers = (fn) => async (t) => { mock.timers.enable({ apis: ["setTimeout"] }); try { await fn(t); } finally { mock.timers.reset(); } };

test("one click end to end: start, minutes of polling with progress, the batch ends, the engine verifies, and the Raziel thread receives ONE final message", withTimers(async () => {
  const w = world({ sb: FIXTURE });
  // the provider finishes the batch while the third poll is on its way: deterministic, whatever the speed of the machine
  const counter = serverFor(w, { onCall: (c) => { if (c.ops.filter((op) => op === "status").length === 3) w.state.batchState = "ended"; } });
  const t = turn({ cap: 25, window: { rows: 23, cols: 41 } });
  const done = await drive(t.promise);
  assert.equal(done.failed, undefined);
  const thread = t.session.state.thread;
  assert.equal(thread.filter((m) => m.role === "raziel").length, 1, "one final Raziel message, not one per poll");
  const final = thread.find((m) => m.role === "raziel");
  assert.match(final.text, /קריאת מטריצה \(Fable\) הושלמה/);
  assert.equal(final.elsMatrixReading.state, "COMPLETE");
  assert.equal(final.elsMatrixReading.findings.length, 25);
  // The REAL handler labels its own route live. That label describes the route; here the provider behind it is a fake, so this is not a Fable reading.
  assert.equal(final.elsMatrixReading.provider.kind, "anthropic_live");
  assert.equal(t.session.state.busy, false);
  assert.equal(counter.ops[0], "start");
  assert.equal(counter.ops.filter((op) => op === "start").length, 1, "polling never starts a second run");
  assert.equal(counter.ops.filter((op) => op === "status").length, 3);
  assert.equal(w.state.batchState, "ended");
  assert.equal(w.calls.filter((c) => c.url.endsWith("/messages/batches") && c.method === "POST").length, 1);
  assert.equal(w.tokenLog.length, 1);
  assert.ok(t.session.progress.length >= 3, "progress reached the session while it waited");
  assert.deepEqual([t.session.progress[0].phase, t.session.progress.at(-1).phase], ["starting", "running"]);
  assert.ok(t.session.progress.some((p) => p.batchId === BATCH && p.jobId && !p.jobToken && p.providerStatus === "in_progress"));
  assert.equal(done.provenance.model, "claude-fable-5-1");
  assert.deepEqual(done.provenance.usage, { inputTokens: savedAnswer.summary.usage.input_tokens, outputTokens: savedAnswer.summary.usage.output_tokens });
  // Ordinary follow-up reuses that REAL handler-created private job, through
  // the same transport. Only network/provider/engine are fakes in this test.
  const followup = prepareRazielSessionSubmission({ question: "הסבר את הממצאים מהסריקה", state: t.session.state,
    view: { surface: "els", elsFocus: context.axis }, createTurnId: () => "followup-e2e" });
  assert.equal(followup.request.surfaceSemantic.els.readingJobId, final.elsMatrixReading.job.id);
  const reply = await askRaziel(followup.request);
  assert.ok(reply, "the server accepts the stored job and emits a matching replay receipt");
  assert.ok(reply.facts.some(fact => fact.label === "ELS מאומת"));
  assert.equal(counter.ops.at(-1), "none", "an ordinary question is not another reading action");
  assert.equal(w.calls.filter(c => c.url.endsWith("/messages/batches") && c.method === "POST").length, 1);
}));

test("an explicit cancel: the provider is asked, the end is awaited, and the thread says honestly what became of it and what it cost", withTimers(async () => {
  const w = world({ sb: FIXTURE });
  let t;
  const counter = serverFor(w, { onCall: (c) => {
    const statuses = c.ops.filter((op) => op === "status").length;
    if (statuses === 1 && !w.state.cancelled && !c.cancelAsked) { c.cancelAsked = true; assert.equal(t.hooks.cancel(), true); }
    if (c.ops.includes("cancel") && statuses >= 2) { w.state.batchState = "ended"; w.state.result = { type: "canceled" }; }
  } });
  t = turn({ cap: 25, window: { rows: 23, cols: 41 } });
  const done = await drive(t.promise);
  assert.equal(done.failed, undefined);
  assert.ok(counter.ops.includes("cancel"));
  assert.equal(w.state.cancelled, true);
  const final = t.session.state.thread.find((m) => m.role === "raziel");
  assert.equal(final.elsMatrixReading.state, "FAILED_WITH_REASON");
  assert.equal(final.elsMatrixReading.reason, "batch_canceled");
  assert.match(final.text, /הקריאה נכשלה: batch_canceled/);
  assert.equal(w.tokenLog.length, 0, "no usage came back, so nothing was invented");
  assert.ok(t.session.progress.some((p) => p.phase === "cancelling"));
}));

test("a cut-off answer reaches the thread as NOT completed, with its cost and no findings", withTimers(async () => {
  const w = world({ sb: FIXTURE, result: { type: "succeeded", message: message({ stopReason: "max_tokens", text: "{", usage: { input_tokens: 16858, output_tokens: 64000, output_tokens_details: { thinking_tokens: 63990 } } }) } });
  serverFor(w, { onCall: (c) => { if (c.ops.filter((op) => op === "status").length === 2) w.state.batchState = "ended"; } });
  const t = turn({ cap: 60, window: { rows: 23, cols: 41 } });
  await drive(t.promise);
  const final = t.session.state.thread.find((m) => m.role === "raziel");
  assert.equal(final.elsMatrixReading.state, "INCOMPLETE");
  assert.deepEqual([final.elsMatrixReading.reason, final.elsMatrixReading.findings], ["max_tokens", []]);
  assert.match(final.text, /הקריאה לא הושלמה: התשובה נקטעה \(max_tokens\)/);
  assert.match(final.text, /עלות שנגרמה: \$1\.68/);
  assert.equal(w.tokenLog.length, 1, "the cost of a cut-off reading is still logged");
}));

test("a non-admin, an inactive layer and a preview are answered in the thread without polling", withTimers(async () => {
  const w = world({ sb: FIXTURE });
  const user = serverFor(w, { role: "user" });
  const t1 = turn({});
  await drive(t1.promise);
  assert.match(t1.session.state.thread.find((m) => m.role === "raziel").text, /למנהלים בלבד/);
  assert.deepEqual(user.ops, ["start"], "a refusal is one call, never a poll");
  const w2 = world({ sb: FIXTURE });
  const admin = serverFor(w2);
  const t2 = turn({ op: "preview", window: { rows: 23, cols: 41 }, cap: 25 });
  await drive(t2.promise);
  const preview = t2.session.state.thread.find((m) => m.role === "raziel");
  assert.equal(preview.elsMatrixReading.state, "PREVIEW");
  assert.match(preview.text, /לא הופעל מודל/);
  assert.deepEqual(admin.ops, ["preview"]);
  assert.equal(w2.calls.filter((c) => c.url.endsWith("/messages/batches") && c.method === "POST").length, 0);
}));

test("an older ai-analyze that ignores the action never has its ordinary answer shown as a reading", withTimers(async () => {
  Object.defineProperty(supabase, "functions", { configurable: true, value: { invoke: async () => ({ data: { raziel: { v: 1, answer: "תשובה רגילה" }, engine: "claude", model: "m" }, error: null }) } });
  const t = turn({});
  const done = await drive(t.promise);
  assert.equal(done.failed, true);
  assert.equal(t.session.state.thread.filter((m) => m.role === "raziel").length, 0);
  assert.equal(t.session.state.status, "error");
}));

test("an unmount (abort) while waiting stops quietly: no cancel is sent and the provider keeps the job", withTimers(async () => {
  const w = world({ sb: FIXTURE });
  let t;
  const counter = serverFor(w, { onCall: (c) => { if (c.ops.filter((op) => op === "status").length === 1) t.abort.abort(); } });
  t = turn({ cap: 25, window: { rows: 23, cols: 41 } });
  const done = await drive(t.promise);
  assert.equal(done.failed, true);
  assert.ok(!counter.ops.includes("cancel"));
  assert.equal(w.state.cancelled, false);
}));

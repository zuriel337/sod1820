import assert from "node:assert/strict";
import test from "node:test";
import { runElsMatrixReadingTurn, waitUnlessAborted } from "../src/lib/research/elsMatrixReadingTransport.js";

const ID = "els_matrix_reading_v1";
const TOKEN = "T".repeat(80);
const start = { id: ID, op: "start", ack_upper_bound_usd: 2 };
const result = (state, extra = {}) => ({ contract: "els_matrix_reading_v1", ok: true, state, ...extra });
const answer = (state, extra = {}, text = `answer ${state}`) => ({ data: { raziel: { v: 1, answer: text }, els_matrix_reading: result(state, extra) }, error: null });
const running = (elapsed = 0) => answer("RUNNING", { job: { batch_id: "msgbatch_test01", poll_after_seconds: 20 }, progress: { elapsed_ms: elapsed, provider_status: "in_progress" } });
const started = () => answer("RUNNING", { job: { token: TOKEN, batch_id: "msgbatch_test01", poll_after_seconds: 20 }, progress: { elapsed_ms: 0, provider_status: "in_progress" } });

/** A scripted server: each call takes the next reply; a thrown reply is a network failure. The clock moves only when the transport waits. */
function rig(replies) {
  const calls = [], waits = [], progress = [];
  let clock = 1_000_000;
  const queue = [...replies];
  return {
    calls, waits, progress,
    opts: {
      invoke: async (action) => { calls.push(action); const next = queue.shift(); if (next instanceof Error) throw next; return next ?? { data: null, error: new Error("script exhausted") }; },
      wait: async (ms) => { waits.push(ms); clock += ms; },
      now: () => clock,
      onProgress: (p) => progress.push(p),
    },
  };
}

test("start then poll: the first call only starts; every poll carries the job token; the final answer is returned and stops the loop", async () => {
  const r = rig([started(), running(20_000), running(40_000), answer("COMPLETE", { findings: [] }, "final")]);
  const out = await runElsMatrixReadingTurn({ ...r.opts, action: start });
  assert.equal(out.raziel.answer, "final");
  assert.deepEqual(r.calls.map((c) => c.op), ["start", "status", "status", "status"]);
  assert.ok(r.calls.slice(1).every((c) => c.job_token === TOKEN && c.id === ID));
  assert.deepEqual(r.waits, [20_000, 20_000, 20_000], "it waits the interval the server asked for, never faster");
  assert.equal(r.calls.filter((c) => c.op === "start").length, 1, "polling never starts a second run");
  assert.equal(out.els_matrix_reading.job?.token, undefined, "a complete reading does not carry a token around");
});

test("progress is reported at every step: starting, then running with elapsed time, the provider status, the batch and the token to resume with", async () => {
  const r = rig([started(), running(20_000), answer("COMPLETE")]);
  await runElsMatrixReadingTurn({ ...r.opts, action: start });
  assert.deepEqual(r.progress[0], { kind: "els_matrix_reading", expectedMinutes: { min: 3, max: 13 }, phase: "starting", elapsedMs: 0, polls: 0 });
  const running1 = r.progress[1];
  assert.deepEqual([running1.phase, running1.polls, running1.providerStatus, running1.batchId, running1.jobToken, running1.pollSeconds, running1.cancelling], ["running", 0, "in_progress", "msgbatch_test01", TOKEN, 20, false]);
  assert.equal(r.progress[2].polls, 1);
  assert.equal(r.progress[2].elapsedMs, 20_000);
  const sink = rig([started(), answer("COMPLETE")]);
  const out = await runElsMatrixReadingTurn({ ...sink.opts, onProgress: () => { throw new Error("a broken sink"); }, action: start });
  assert.equal(out.els_matrix_reading.state, "COMPLETE", "a failing progress sink never breaks the turn");
});

test("a preview or a cancel is one call; a refusal at the start is returned as it is (nothing to poll)", async () => {
  const p = rig([answer("PREVIEW")]);
  assert.equal((await runElsMatrixReadingTurn({ ...p.opts, action: { id: ID, op: "preview" } })).els_matrix_reading.state, "PREVIEW");
  assert.deepEqual([p.calls.length, p.waits.length], [1, 0]);
  const c = rig([answer("CANCEL_REQUESTED")]);
  await runElsMatrixReadingTurn({ ...c.opts, action: { id: ID, op: "cancel", job_token: TOKEN } });
  assert.deepEqual([c.calls.length, c.waits.length], [1, 0]);
  const refused = rig([answer("REFUSED", { ok: false, error: "admin_only" })]);
  const out = await runElsMatrixReadingTurn({ ...refused.opts, action: start });
  assert.deepEqual([out.els_matrix_reading.error, refused.calls.length, refused.waits.length], ["admin_only", 1, 0]);
});

test("a failure of the very first call is null (the session reports it); a lost poll is retried, and three in a row hand back a resumable answer", async () => {
  assert.equal(await runElsMatrixReadingTurn({ ...rig([{ data: null, error: new Error("x") }]).opts, action: start }), null);
  assert.equal(await runElsMatrixReadingTurn({ ...rig([new Error("offline")]).opts, action: start }), null);
  const flaky = rig([started(), new Error("offline"), { data: null, error: new Error("5xx") }, answer("COMPLETE")]);
  assert.equal((await runElsMatrixReadingTurn({ ...flaky.opts, action: start })).els_matrix_reading.state, "COMPLETE");
  const lost = rig([started(), new Error("1"), new Error("2"), new Error("3")]);
  const out = await runElsMatrixReadingTurn({ ...lost.opts, action: start });
  assert.equal(out.els_matrix_reading.state, "RUNNING");
  assert.deepEqual([out.els_matrix_reading.poll_interrupted.can_resume, out.els_matrix_reading.job.token], [true, TOKEN]);
  assert.match(out.raziel.answer, /הקריאה עצמה ממשיכה אצל הספק/);
});

test("the wait is bounded: after the maximum the reading is handed back as still running, with its token", async () => {
  const replies = [started(), ...Array.from({ length: 200 }, () => running())];
  const r = rig(replies);
  const out = await runElsMatrixReadingTurn({ ...r.opts, action: start, maxWaitMs: 5 * 60 * 1000 });
  assert.equal(out.els_matrix_reading.state, "RUNNING");
  assert.equal(out.els_matrix_reading.poll_interrupted.why, "עבר זמן ההמתנה המרבי");
  assert.equal(out.els_matrix_reading.job.token, TOKEN);
  assert.ok(r.calls.length < 20);
});

test("an abort (unmount, principal change) stops silently: null, no cancel is sent, the job keeps running at the provider", async () => {
  const controller = new AbortController();
  const r = rig([started(), running(), running()]);
  const opts = { ...r.opts, wait: async (ms) => { r.waits.push(ms); controller.abort(); } };
  const out = await runElsMatrixReadingTurn({ ...opts, action: start, signal: controller.signal });
  assert.equal(out, null);
  assert.ok(r.calls.every((c) => c.op !== "cancel"), "no cancel is ever sent on abort");
});

test("an explicit cancel asks the provider, keeps asking the status so that the end and its cost are reported, and returns the honest final answer", async () => {
  const cancel = new AbortController();
  const r = rig([started(), running(), answer("CANCEL_REQUESTED", { job: { batch_id: "msgbatch_test01", processing_status: "canceling" } }),
    answer("CANCEL_REQUESTED"), answer("FAILED_WITH_REASON", { reason: "batch_canceled" }, "ended as cancelled")]);
  let waits = 0;
  const opts = { ...r.opts, wait: async (ms) => { r.waits.push(ms); waits += 1; if (waits === 2) cancel.abort(); } };
  const out = await runElsMatrixReadingTurn({ ...opts, action: start, cancelSignal: cancel.signal });
  assert.deepEqual(r.calls.map((c) => c.op), ["start", "status", "cancel", "status", "status"].slice(0, r.calls.length));
  assert.ok(r.calls.some((c) => c.op === "cancel" && c.job_token === TOKEN));
  assert.equal(out.raziel.answer, "ended as cancelled");
  assert.equal(r.progress.some((p) => p.phase === "cancelling" && p.cancelling === true), true);
  assert.equal(out.els_matrix_reading.job.token, TOKEN, "a failed or cancelled reading keeps its token for a later check");
});

test("a cancel that the provider is slow to finish does not hang: after the grace period the last answer is returned", async () => {
  const cancel = new AbortController();
  cancel.abort();
  const r = rig([started(), answer("CANCEL_REQUESTED"), ...Array.from({ length: 30 }, () => answer("CANCEL_REQUESTED"))]);
  const out = await runElsMatrixReadingTurn({ ...r.opts, action: start, cancelSignal: cancel.signal, cancelGraceMs: 60_000 });
  assert.equal(out.els_matrix_reading.state, "CANCEL_REQUESTED");
  assert.ok(r.calls.length <= 8);
});

test("resume: a status action polls from where it is, with the token it was given", async () => {
  const r = rig([running(90_000), answer("COMPLETE", {}, "resumed")]);
  const out = await runElsMatrixReadingTurn({ ...r.opts, action: { id: ID, op: "status", job_token: TOKEN } });
  assert.equal(out.raziel.answer, "resumed");
  assert.ok(r.calls.every((c) => c.op === "status" && c.job_token === TOKEN));
});

test("waitUnlessAborted resolves on time or as soon as a signal aborts", async () => {
  const c = new AbortController();
  const t0 = Date.now();
  const pending = waitUnlessAborted(5000, [c.signal]);
  c.abort();
  await pending;
  assert.ok(Date.now() - t0 < 1000);
  const done = Date.now();
  await waitUnlessAborted(20, []);
  assert.ok(Date.now() - done >= 15);
  await waitUnlessAborted(5000, [c.signal]);
});

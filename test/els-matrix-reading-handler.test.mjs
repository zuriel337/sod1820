import assert from "node:assert/strict";
import test from "node:test";
import * as M from "../supabase/functions/_shared/elsMatrixReading.js";
import { ANTH, AXIS, BATCH, KEY, SB, WINDOW23, aiCalls, call, countCalls, fx, json, message, req, savedAnswer, recorded, windowC1, world } from "./helpers/els-matrix-reading-world.mjs";

test("OFF unless enabled by a secret, and admin only: neither touches the stream, the engine or the provider", async () => {
  const off = world();
  assert.deepEqual([(await call(off, req("preview"), { enabled: "" })).status, off.calls.length], [404, 0]);
  const user = world();
  const denied = await call(user, req("create", { ack_upper_bound_usd: 2 }), { tier: "user" });
  assert.deepEqual([denied.status, denied.body.error, user.calls.length], [403, "admin_only", 0]);
  const anon = await call(world(), req("preview"), { tier: "anon" });
  assert.equal(anon.status, 403);
  assert.equal(M.READING_CONTRACT, anon.body.contract);
});

test("a malformed request is refused before any read", async () => {
  const w = world();
  const bad = await call(w, { els_matrix_reading: { contract: "nope" } });
  assert.deepEqual([bad.status, bad.body.error, w.calls.length], [400, "invalid_contract", 0]);
});

test("preview: coverage, request hashes (equal to the measured request), the estimate with its evidence; no model run and no spend", async () => {
  const w = world();
  const { status, body } = await call(w, req("preview"));
  assert.equal(status, 200);
  assert.equal(body.state, "PREVIEW");
  assert.equal(body.spent.usd, 0);
  assert.equal(countCalls(w, (c) => c.url.endsWith("/batches")), 0, "no batch is created");
  assert.equal(body.model.id, "claude-fable-5-1");
  assert.equal(body.model.verified_available, true);
  assert.equal(body.model.check.ok, true);
  assert.deepEqual([body.coverage.rows.from, body.coverage.rows.to, body.coverage.cols.from, body.coverage.cols.to, body.coverage.cells, body.coverage.lines_shown.total], [44, 66, 3315, 3355, 943, 182]);
  assert.equal(body.request.sha256, savedAnswer.request_sha256, "the request is the one measured in EXP-18 (C3: previous instruction, cap 25)");
  assert.equal(body.request.lock_sha256, savedAnswer.lock_sha256);
  assert.equal(body.request.cap, 25);
  assert.equal(body.request.input_tokens, 16858);
  assert.equal(body.axis.verification_state, "MATCH");
  assert.equal(body.estimate.cost_exposure.charged_to_user, false);
  assert.equal(body.experimental.credits_charged, false);
  assert.equal(body.estimate.expected_ils.status, "ESTIMATED");
  assert.ok(body.notes.some((n) => /output cap/.test(n)));
});

test("create needs the acknowledged upper bound; below it the answer is 409 with the figure; at it one batch is created with the previewed request", async () => {
  const w = world();
  assert.equal((await call(w, req("create"))).body.error, "ack_required");
  const low = await call(w, req("create", { ack_upper_bound_usd: 0.5 }));
  assert.deepEqual([low.status, low.body.error], [409, "ack_below_upper_bound"]);
  assert.ok(low.body.required_ack_upper_bound_usd > 1.6);
  assert.equal(countCalls(w, (c) => c.url.endsWith("/batches")), 0);
  const ok = await call(w, req("create", { ack_upper_bound_usd: low.body.required_ack_upper_bound_usd }));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.state, "RUNNING");
  assert.equal(ok.body.job.batch_id, BATCH);
  assert.equal(ok.body.job.poll_after_seconds, 20);
  const created = w.calls.filter((c) => c.url.endsWith("/messages/batches") && c.method === "POST");
  assert.equal(created.length, 1);
  assert.equal(created[0].body.requests.length, 1);
  assert.equal(created[0].body.requests[0].custom_id, M.BATCH_CUSTOM_ID);
  assert.equal(await M.requestSha256(created[0].body.requests[0].params), ok.body.request.sha256);
  assert.equal(created[0].body.requests[0].params.model, "claude-fable-5-1");
  assert.equal(created[0].body.requests[0].params.max_tokens, 64000);
  assert.ok(w.calls.findIndex((c) => c.url.includes("/v1/models/")) < w.calls.findIndex((c) => c.url.endsWith("/messages/batches")), "the model is verified before the batch is created");
  assert.equal(w.tokenLog.length, 0, "nothing is logged before the result is collected");
});

test("an unknown model or an unverified axis stops everything before a batch exists", async () => {
  const noModel = world({ modelHttp: 404 });
  const r1 = await call(noModel, req("create", { ack_upper_bound_usd: 2 }));
  assert.deepEqual([r1.status, r1.body.error, r1.body.model.verified_available], [503, "model_unavailable", false]);
  assert.equal(countCalls(noModel, (c) => c.url.endsWith("/messages/batches")), 0);
  const w = world();
  const wrongAxis = await call(w, { els_matrix_reading: { contract: M.REQUEST_CONTRACT, op: "preview", axis: { ...AXIS, start: 248766 }, window: WINDOW23 } });
  assert.deepEqual([wrongAxis.status, wrongAxis.body.error], [422, "axis_unverified"]);
  assert.equal(aiCalls(w), 0);
});

async function createJob(w) {
  const created = await call(w, req("create", { ack_upper_bound_usd: 2 }));
  assert.equal(created.body.state, "RUNNING");
  return created.body.job.token;
}

test("status while the batch runs: RUNNING, elapsed time, no findings, nothing logged", async () => {
  const w = world();
  const token = await createJob(w);
  const s = await call(w, req("status", { job_token: token, axis: undefined, window: undefined, cap: undefined }));
  assert.equal(s.body.state, "RUNNING");
  assert.equal(s.body.job.elapsed_ms, 30_000);
  assert.equal(s.body.findings, undefined);
  assert.equal(w.tokenLog.length, 0);
});

test("status after the batch ended: COMPLETE with engine-verified findings, coverage, time, cost in USD and an ESTIMATED ILS figure; the cost is logged once", async () => {
  const w = world();
  const token = await createJob(w);
  w.state.batchState = "ended";
  const body1 = (await call(w, req("status", { job_token: token }))).body;
  assert.equal(body1.state, "COMPLETE");
  assert.equal(body1.summary.proposals, 25);
  assert.equal(body1.summary.engine_verified, 25);
  assert.deepEqual([body1.summary.engine_verified_long, body1.summary.unlikely_by_chance, body1.summary.expected_by_chance], [10, 8, 17]);
  assert.equal(body1.findings.length, 25);
  assert.equal(body1.findings[0].verification.state, "ENGINE_VERIFIED");
  assert.equal(body1.findings[0].verification.engine.verification_state, "MATCH");
  assert.equal(body1.cap.reached, true);
  assert.match(body1.cap.meaning, /not proof/);
  assert.equal(body1.timing.elapsed_ms, 189_000);
  assert.equal(body1.output.stop_reason, "end_turn");
  assert.equal(body1.output.thinking_tokens, savedAnswer.summary.usage.output_tokens_details.thinking_tokens);
  assert.equal(body1.cost.usd, savedAnswer.cost.usd);
  assert.equal(body1.cost.ils.status, "ESTIMATED");
  assert.equal(body1.coverage.cells, 943);
  assert.equal(body1.data_class, "ENGINE_VERIFIED_AND_PLAIN_TEXT_FINDINGS");
  assert.equal(body1.is_test_fixture, false);
  assert.equal(body1.experimental.credits_charged, false);
  assert.equal(w.tokenLog.length, 1);
  assert.deepEqual([w.tokenLog[0].kind, w.tokenLog[0].ref, w.tokenLog[0].user_id, w.tokenLog[0].output_tokens], ["els_matrix_reading", BATCH, "admin-1", savedAnswer.summary.usage.output_tokens]);
  const body2 = (await call(w, req("status", { job_token: token }))).body;
  assert.equal(body2.state, "COMPLETE");
  assert.equal(w.tokenLog.length, 1, "asking again does not log the cost again");
});

test("a cut-off answer is INCOMPLETE (CONTINUATION_REQUIRED), shows no findings, and its cost is still recorded", async () => {
  const w = world({ batchState: "ended", result: { type: "succeeded", message: message({ stopReason: "max_tokens", text: '{"findings":[{"id":"F1","line":"C21+","text":"קולו', usage: { input_tokens: 16858, output_tokens: 64000, output_tokens_details: { thinking_tokens: 63994 } } }) } });
  const token = await createJob(w);
  const body = (await call(w, req("status", { job_token: token }))).body;
  assert.equal(body.state, "INCOMPLETE");
  assert.equal(body.reason, "max_tokens");
  assert.equal(body.continuation_required, true);
  assert.deepEqual(body.findings, []);
  assert.equal(body.summary, null);
  assert.ok(Math.abs(body.cost.usd - 1.68429) < 0.001, `cost ${body.cost.usd}`);
  assert.equal(w.tokenLog.length, 1);
  const invalid = world({ batchState: "ended", result: { type: "succeeded", message: message({ text: "not json" }) } });
  const t2 = await createJob(invalid);
  const b2 = (await call(invalid, req("status", { job_token: t2 }))).body;
  assert.deepEqual([b2.state, b2.reason], ["INCOMPLETE", "invalid_json"]);
});

test("a failed batch is FAILED_WITH_REASON and nothing is logged; an engine outage keeps the answer collectable", async () => {
  const errored = world({ batchState: "ended", result: { type: "errored", error: { type: "api_error" } } });
  const body = (await call(errored, req("status", { job_token: await createJob(errored) }))).body;
  assert.deepEqual([body.state, body.reason, errored.tokenLog.length], ["FAILED_WITH_REASON", "batch_errored", 0]);
  const down = world({ batchState: "ended" });
  const token = await createJob(down);
  down.state.engineDown = true;
  const outage = await call(down, req("status", { job_token: token }));
  assert.deepEqual([outage.status, outage.body.state, outage.body.reason, outage.body.retryable], [503, "FAILED_WITH_REASON", "engine_unavailable", true]);
  assert.equal(down.tokenLog.length, 1, "the cost was incurred, so it is recorded once");
  down.state.engineDown = false;
  assert.equal((await call(down, req("status", { job_token: token }))).body.state, "COMPLETE");
  assert.equal(down.tokenLog.length, 1);
});

test("the job token cannot be forged, borrowed by another identity, used after it expires, or replayed against a changed stream", async () => {
  const w = world({ batchState: "ended" });
  const token = await createJob(w);
  assert.equal((await call(w, req("status", { job_token: `${token}x` }))).body.error, "invalid_job_token");
  const other = await call(w, req("status", { job_token: token }), { identity: "u:admin-2" });
  assert.deepEqual([other.status, other.body.error], [403, "job_belongs_to_another_identity"]);
  const late = await call(w, req("status", { job_token: token }), { now: Date.parse("2026-10-29T10:00:00.000Z") + M.JOB_TTL_MS + 1000 });
  assert.deepEqual([late.status, late.body.error], [410, "job_token_expired"]);
  const changed = world({ batchState: "ended", stream: windowC1.grid.map((r, k) => (k === 3 ? r.s.replace(/^./u, "ב") : r.s)) });
  const t2 = await createJob(world({ batchState: "ended" })); // a token made against the real stream
  const mismatch = await call(changed, req("status", { job_token: t2 }));
  assert.equal(mismatch.body.reason, "stream_changed_since_the_request");
  assert.equal(mismatch.body.state, "FAILED_WITH_REASON");
});

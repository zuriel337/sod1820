import assert from "node:assert/strict";
import test from "node:test";
import { runAiAnalyze, UID, USER_JWT } from "./helpers/ai-analyze-handler.mjs";
import { AXIS, BATCH, req, savedAnswer, world } from "./helpers/els-matrix-reading-world.mjs";
import { ELS_MATRIX_READING_ACTION } from "../supabase/functions/_shared/elsMatrixReadingAction.js";

// The REAL ai-analyze handler (types erased, only its imports replaced), driven with a Raziel research turn that carries the matrix context and the reading action.
// The stream, the canonical engine, Anthropic and the token log are the shared fakes; the handler is told they are the live route (it always is), so every
// "live" flag in these results describes the route and NOT a real Fable call: nothing here reaches the network.
const FIXTURE = "https://fixture.invalid";
const context = {
  contract: "els_matrix_presentation_context_v1",
  axis: { term: AXIS.term, scope: "torah", corpusId: "0b022e8eef6f9c16", skip: AXIS.skip, dir: AXIS.dir, start: AXIS.start, hitId: `${AXIS.skip}_${AXIS.dir}_${AXIS.start}` },
  matrix: { width: AXIS.skip, rowStart: 49, colStart: 3330, rows: ["אבגדהוזחטי", "כלמנסעפצקר"] },
  trust: { axis: "client_reported_match_replay_required", matrix: "unverified_presentation", interpretation: "not_evidence" },
};
const body = (action, extra = {}) => ({
  kind: "research", persona: "raziel", subject: "קרא את המטריצה סביב המופע שבחרתי", facts: "", context: null, again: false, intelligence_level: "deep",
  research_contract: "public-number-research-run-v1", surface_semantic: { surface: "els" }, els_matrix_context: context, els_matrix_reading_action: action, ...extra,
});
const options = (w, over = {}) => ({
  bearer: USER_JWT, verifiedUid: UID, role: "admin", allowed: true, elsVerifyStatus: "match",
  envOverrides: { ELS_MATRIX_READING_ENABLED: "1", ELS_MATRIX_READING_JOB_SECRET: "route-test-secret" },
  extraRoute: async ({ url, init }) => {
    const handled = (url.origin === FIXTURE && /\/rest\/v1\/(torah_stream|api_pricing|ai_token_log|rpc\/(els_verify_occurrence_v1|els_matrix_reading_job_))/.test(url.pathname)) || url.origin === "https://api.anthropic.com";
    if (!handled) return null;
    const r = await w.fetchImpl(url.href, init);
    return new Response(await r.text(), { status: r.status });
  },
  ...over,
});
const fresh = () => world({ sb: FIXTURE });

test("bounded admin trial starts without a flag; replay and recovery never submit a second batch", async () => {
  const w = fresh();
  // The recorded fixture covers 23 rows. Synthetic padding supplies the extra
  // rows for this 33-row transport/gate test; it is not live corpus evidence.
  for (let i = -20; i < 0; i++) w.state.stream[i] = "א".repeat(41);
  const opts = options(w, { envOverrides: {} });
  const preview = await runAiAnalyze({ ...opts, body: body(req("preview", { window: { rows: 33, cols: 41 }, cap: 25 })) });
  assert.equal(preview.result.els_matrix_reading.state, "PREVIEW");
  assert.equal(w.calls.filter(c => c.url.endsWith("/messages/batches") && c.method === "POST").length, 0);
  const action = req("start", { window: { rows: 33, cols: 41 }, cap: 25, ack_upper_bound_usd: 2 });
  const first = await runAiAnalyze({ ...opts, body: body(action) });
  assert.equal(first.result.els_matrix_reading.state, "RUNNING", JSON.stringify(first.result));
  const replay = await runAiAnalyze({ ...opts, body: body(action) });
  const recovered = await runAiAnalyze({ ...opts, body: body(req("recover")) });
  assert.equal(replay.result.els_matrix_reading.job.id, first.result.els_matrix_reading.job.id);
  assert.equal(recovered.result.els_matrix_reading.job.id, first.result.els_matrix_reading.job.id);
  assert.equal(w.calls.filter(c => c.url.endsWith("/messages/batches") && c.method === "POST").length, 1);
  assert.equal(first.models.length + replay.models.length + recovered.models.length, 0);
});

test("no-config trial preserves explicit disable, admin, availability, replay and cost boundaries", async () => {
  const action = req("start", { window: { rows: 33, cols: 41 }, cap: 25, ack_upper_bound_usd: 2 });
  const cases = [
    [{ envOverrides: { ELS_MATRIX_READING_ENABLED: "off" } }, action, "not_enabled"],
    [{ envOverrides: { ELS_MATRIX_READING_ENABLED: "" } }, action, "not_enabled"],
    [{ envOverrides: { ELS_MATRIX_READING_ENABLED: "preview" } }, action, "preview_mode_only"],
    [{ role: "user" }, action, "admin_only"],
    [{ bearer: "", verifiedUid: null }, action, "admin_only"],
    [{ siteAllowed: false }, action, "availability"],
    [{ elsVerifyStatus: "mismatch" }, action, "els_matrix_axis_unverified"],
    [{}, { ...action, cap: 60 }, "not_enabled"],
    [{}, { ...action, window: { rows: 35, cols: 45 } }, "not_enabled"],
    [{}, { ...action, ack_upper_bound_usd: 10 }, "not_enabled"],
    [{}, { ...action, request_id: undefined }, "reading_request_id_required"],
  ];
  for (const [over, candidate, expected] of cases) {
    const w = fresh();
    const run = await runAiAnalyze({ ...options(w, { envOverrides: {}, ...over }), body: body(candidate) });
    assert.equal(run.result.els_matrix_reading?.error ?? run.result.error, expected);
    assert.equal(w.calls.filter(c => c.url.endsWith("/messages/batches") && c.method === "POST").length, 0);
  }
});

test("a start through the real Raziel route: no ordinary model call, the batch is created, the Raziel answer says it started, and the reading result rides next to it", async () => {
  const w = fresh();
  const run = await runAiAnalyze({ ...options(w), body: body(req("start", { ack_upper_bound_usd: 2 })) });
  assert.equal(run.status, 200, JSON.stringify(run.result).slice(0, 300));
  assert.equal(run.models.length, 0, "the ordinary Raziel model is never called on this path");
  assert.equal(run.calls.filter((c) => c.name === "research-run").length, 0);
  assert.equal(run.calls.filter((c) => c.name === "els-search-bridge").length, 1, "the axis is replayed by the bridge, as for every matrix turn");
  assert.equal(run.result.els_matrix_reading.state, "RUNNING");
  assert.equal(run.result.els_matrix_reading.job.batch_id, BATCH);
  assert.match(run.result.raziel.answer, /הקריאה התחילה/);
  assert.deepEqual([run.result.intelligence_level, run.result.engine], ["deep", "claude"]);
  assert.equal(run.result.els_matrix_reading.provider.kind, "anthropic_live", "the handler always passes the live route; a fixture or double is only ever created by tests");
  assert.equal(w.calls.filter((c) => c.url.endsWith("/messages/batches") && c.method === "POST").length, 1);
  assert.ok(run.traces.length >= 3, "a start opens an operational trace: begin, spans, finish");
  const names = run.spans.map((s) => s.p_name);
  assert.ok(names.some((n) => /batch-start/.test(n)) && names.some((n) => /window-and-axis/.test(n)));
  assert.ok(run.spans.every((s) => s.p_detail.privacy.rawPrivatePayloadLogged === false));
});

test("a poll that is still running leaves no trace; the collection logs the cost once with the batch id and tells the whole story in the Raziel answer", async () => {
  const w = fresh();
  const started = await runAiAnalyze({ ...options(w), body: body(req("start", { ack_upper_bound_usd: 2 })) });
  const jobId = started.result.els_matrix_reading.job.id;
  const running = await runAiAnalyze({ ...options(w), body: body(req("status", { job_id: jobId })) });
  assert.equal(running.result.els_matrix_reading.state, "RUNNING");
  assert.equal(running.traces.length, 0, "no begin, no span, no finish for a poll that is still running");
  assert.equal(running.calls.filter((c) => c.name === "els-search-bridge").length, 0, "polls are bound to the signed job, not re-verified through the bridge");
  w.state.batchState = "ended";
  const done = await runAiAnalyze({ ...options(w), body: body(req("status", { job_id: jobId })) });
  assert.equal(done.result.els_matrix_reading.state, "COMPLETE");
  assert.match(done.result.raziel.answer, /אומתו במנוע ה־ELS הקנוני: 25/);
  assert.deepEqual(done.result.usage, { input_tokens: savedAnswer.summary.usage.input_tokens, output_tokens: savedAnswer.summary.usage.output_tokens });
  assert.equal(w.tokenLog.length, 1);
  assert.deepEqual([w.tokenLog[0].kind, w.tokenLog[0].ref], ["raziel_els_matrix_reading", BATCH]);
  assert.ok(w.tokenLog[0].trace_id && w.tokenLog[0].span_id);
  const costSpan = done.spans.find((s) => s.p_kind === "model_call");
  assert.equal(costSpan.p_detail.cost.certainty, "estimated");
  assert.equal(costSpan.p_detail.cost.creditsCharged, 0);
  const again = await runAiAnalyze({ ...options(w), body: body(req("status", { job_id: jobId })) });
  assert.equal(again.result.els_matrix_reading.state, "COMPLETE");
  assert.deepEqual([w.tokenLog.length, again.traces.length], [1, 0]);
});

test("the gates of the route: explicit OFF, admin only, availability, canonical opt-in, matrix context required, nothing else may ride along", async () => {
  const w = fresh();
  const action = req("start", { ack_upper_bound_usd: 2 });
  const off = await runAiAnalyze({ ...options(w, { envOverrides: { ELS_MATRIX_READING_ENABLED: "off" } }), body: body(action) });
  assert.equal(off.result.els_matrix_reading.error, "not_enabled");
  assert.match(off.result.raziel.answer, /אינה פעילה/);
  const user = await runAiAnalyze({ ...options(w, { role: "user" }), body: body(action) });
  assert.equal(user.result.els_matrix_reading.error, "admin_only");
  assert.match(user.result.raziel.answer, /למנהלים בלבד/);
  const anon = await runAiAnalyze({ ...options(w, { bearer: "", verifiedUid: null }), body: body(action) });
  assert.equal(anon.result.els_matrix_reading.error, "admin_only");
  const closed = await runAiAnalyze({ ...options(w, { siteAllowed: false }), body: body(action) });
  assert.equal(closed.result.error, "availability");
  assert.equal(closed.result.els_matrix_reading, undefined, "the site availability gate applies before the reading");
  const noOptIn = await runAiAnalyze({ ...options(w), body: body(action, { research_contract: undefined }) });
  assert.equal(noOptIn.result.error, "invalid_els_matrix_context");
  for (const extra of [{ companion_action: { id: "personal_area_companion_v1" } }, { els_planning_action: { id: "els_guided_planning_v1" } }, { facts: "טקסט" }]) {
    const mixed = await runAiAnalyze({ ...options(w), body: body(action, extra) });
    assert.match(mixed.result.error, /invalid_els_matrix_(reading_action|context)/, JSON.stringify(extra));
  }
  const malformed = await runAiAnalyze({ ...options(w), body: body({ ...action, window: { rows: 99, cols: 41 } }) });
  assert.equal(malformed.result.error, "invalid_els_matrix_reading_action");
  assert.equal(malformed.status, 400);
  const noContext = await runAiAnalyze({ ...options(w), body: body(action, { els_matrix_context: undefined }) });
  assert.equal(noContext.result.error, "invalid_els_matrix_reading_action");
  assert.equal(w.calls.filter((c) => c.url.endsWith("/messages/batches") && c.method === "POST").length, 0, "none of the refusals created a batch");
  assert.equal(off.models.length + user.models.length + anon.models.length, 0);
});

test("an axis the bridge cannot confirm stops a start before any read of the stream or any provider call", async () => {
  const w = fresh();
  const run = await runAiAnalyze({ ...options(w, { elsVerifyStatus: "mismatch" }), body: body(req("start", { ack_upper_bound_usd: 2 })) });
  assert.equal(run.result.error, "els_matrix_axis_unverified");
  assert.equal(w.calls.length, 0);
});

test("a preview and a cancel go through the same door; the preview runs no model and opens no trace", async () => {
  const w = fresh();
  const preview = await runAiAnalyze({ ...options(w), body: body(req("preview")) });
  assert.equal(preview.result.els_matrix_reading.state, "PREVIEW");
  assert.match(preview.result.raziel.answer, /לא הופעל מודל/);
  assert.equal(preview.traces.length, 0);
  assert.equal(w.calls.filter((c) => c.url.endsWith("/messages/batches") && c.method === "POST").length, 0);
  const started = await runAiAnalyze({ ...options(w), body: body(req("start", { ack_upper_bound_usd: 2 })) });
  const cancel = await runAiAnalyze({ ...options(w), body: body({ id: ELS_MATRIX_READING_ACTION, op: "cancel", job_id: started.result.els_matrix_reading.job.id }) });
  assert.equal(cancel.result.els_matrix_reading.state, "CANCEL_REQUESTED");
  assert.equal(w.state.cancelled, true);
});

test("ordinary Raziel turns are untouched: no reading action, no reading", async () => {
  const w = fresh();
  const plain = await runAiAnalyze({ ...options(w), body: { ...body(undefined), els_matrix_reading_action: undefined }, elsVerifyStatus: "match", modelResult: {
    text: JSON.stringify({ v: 1, agent: "raziel", answer: "כיוון אפשרי לבדיקה", facts: [], suggested_paths: [] }), usage: { input_tokens: 10, output_tokens: 10 }, attempts: 1, degraded: false } });
  assert.equal(plain.result.els_matrix_reading, undefined);
  assert.equal(plain.result.els_matrix_status, "verified_axis_unverified_presentation_v1");
  assert.equal(plain.models.length, 1);
  assert.deepEqual(w.calls.filter((c) => !c.url.includes("/rest/v1/ai_token_log")), [], "nothing of the reading layer is touched (only the ordinary token log of the ordinary call)");
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  ELS_MATRIX_READING_START, axisFromMatrixContext, buildCreateRequest, buildPreviewRequest, buildStatusRequest, checkElsMatrixReading,
  groupReadingFindings, pollElsMatrixReading, previewElsMatrixReading, readingPhase, startElsMatrixReading,
} from "../src/lib/research/elsMatrixReadingClient.js";
import { normalizeReadingRequest } from "../supabase/functions/_shared/elsMatrixReading.js";

const context = {
  contract: "els_matrix_presentation_context_v1",
  axis: { term: "ישראל", scope: "torah", corpusId: "0b022e8eef6f9c16", skip: 4545, dir: 1, start: 100000, hitId: "4545_1_100000" },
  matrix: { width: 4545, rowStart: 20, colStart: 10, rows: ["אבגדהוזחטי"] },
  trust: { axis: "client_reported_match_replay_required", matrix: "unverified_presentation", interpretation: "not_evidence" },
};

test("the axis comes only from the verified matrix context and only for the Torah scope", () => {
  assert.deepEqual(axisFromMatrixContext(context), { term: "ישראל", scope: "torah", skip: 4545, dir: 1, start: 100000 });
  assert.equal(axisFromMatrixContext({ ...context, axis: { ...context.axis, scope: "tanakh" } }), null);
  assert.equal(axisFromMatrixContext({ ...context, contract: "other" }), null);
  assert.equal(axisFromMatrixContext({ ...context, axis: { ...context.axis, dir: 0 } }), null);
  assert.equal(axisFromMatrixContext(null), null);
  assert.deepEqual(axisFromMatrixContext({ ...context, axis: { ...context.axis, term: "מלך" } }).term, "מלכ", "final letters are folded exactly as the server does");
});

test("every request the client builds is accepted by the server's own normaliser", () => {
  const axis = axisFromMatrixContext(context);
  const preview = normalizeReadingRequest(buildPreviewRequest(axis));
  assert.equal(preview.ok, true);
  assert.deepEqual([preview.rows, preview.cols, preview.cap], [33, 41, 60]);
  const create = normalizeReadingRequest(buildCreateRequest(axis, 3.5, { rows: 21, cols: 31, cap: 25 }));
  assert.equal(create.ok, true);
  assert.deepEqual([create.rows, create.cols, create.cap, create.ackUpperBoundUsd], [21, 31, 25, 3.5]);
  assert.equal(normalizeReadingRequest(buildStatusRequest("tok")).ok, true);
  assert.equal(normalizeReadingRequest(buildCreateRequest(axis, undefined)).error, "ack_required", "no run without an acknowledged upper bound");
  assert.deepEqual(ELS_MATRIX_READING_START, { rows: 33, cols: 41, cap: 60 });
});

test("the wrappers call the existing ai-analyze body shape and surface contract errors from non-2xx answers", async () => {
  const sent = [];
  const ok = async (body) => { sent.push(body); return { data: { contract: "els_matrix_reading_v1", ok: true, state: "PREVIEW" }, error: null }; };
  const axis = axisFromMatrixContext(context);
  assert.equal((await previewElsMatrixReading(axis, {}, ok)).state, "PREVIEW");
  await startElsMatrixReading(axis, 2, {}, ok);
  await checkElsMatrixReading("tok", ok);
  assert.deepEqual(sent.map((b) => b.els_matrix_reading.op), ["preview", "create", "status"]);
  assert.ok(sent.every((b) => Object.keys(b).join() === "els_matrix_reading"), "nothing else rides along: no persona, no chat history");
  const denied = async () => ({ data: null, error: { context: { clone: () => ({ json: async () => ({ contract: "els_matrix_reading_v1", ok: false, error: "admin_only" }) }) } } });
  const result = await previewElsMatrixReading(axis, {}, denied);
  assert.deepEqual([result.ok, result.error], [false, "admin_only"]);
  const broken = async () => ({ data: null, error: new Error("boom") });
  assert.equal((await previewElsMatrixReading(axis, {}, broken)).error, "reading_unavailable");
});

test("readingPhase never upgrades a result: cut-off is incomplete, errors are errors", () => {
  const phase = (r) => readingPhase({ contract: "els_matrix_reading_v1", ...r });
  assert.equal(phase({ ok: true, state: "PREVIEW" }).phase, "preview");
  assert.deepEqual(phase({ ok: true, state: "RUNNING", job: { poll_after_seconds: 20 } }), { phase: "running", done: false, completed: false, pollAfterSeconds: 20 });
  assert.equal(phase({ ok: true, state: "COMPLETE" }).completed, true);
  const cut = phase({ ok: true, state: "INCOMPLETE", reason: "max_tokens", continuation_required: true });
  assert.deepEqual([cut.phase, cut.completed, cut.continuationRequired], ["incomplete", false, true]);
  assert.equal(phase({ ok: true, state: "FAILED_WITH_REASON", reason: "engine_unavailable", retryable: true }).retryable, true);
  assert.equal(phase({ ok: false, error: "admin_only" }).phase, "error");
  assert.equal(readingPhase({ ok: true, state: "COMPLETE" }).phase, "error", "a body without the contract is not a result");
  assert.equal(readingPhase(null).phase, "error");
});

test("findings are grouped by what the engine established and test fixtures are flagged", () => {
  const grouped = groupReadingFindings({ is_test_fixture: true, findings: [
    { id: "a", verification: { state: "ENGINE_VERIFIED" } }, { id: "b", verification: { state: "PLAIN_TEXT_ONLY" } }, { id: "c", verification: { state: "NOT_VERIFIED" } }, { id: "d" },
  ] });
  assert.deepEqual([grouped.engineVerified.length, grouped.plainTextOnly.length, grouped.notVerified.length, grouped.isTestFixture], [1, 1, 1, true]);
  assert.deepEqual(groupReadingFindings(null).engineVerified, []);
});

test("polling waits for the server's interval, stops on a terminal state, can be cancelled and is bounded", async () => {
  const answers = [
    { contract: "els_matrix_reading_v1", ok: true, state: "RUNNING", job: { poll_after_seconds: 20 } },
    { contract: "els_matrix_reading_v1", ok: true, state: "RUNNING", job: { poll_after_seconds: 20 } },
    { contract: "els_matrix_reading_v1", ok: true, state: "COMPLETE", findings: [] },
  ];
  const waits = [], updates = [];
  const done = await pollElsMatrixReading("tok", { invoker: async () => ({ data: answers.shift(), error: null }), wait: async (ms) => waits.push(ms), onUpdate: (r) => updates.push(r.state) });
  assert.deepEqual(waits, [20000, 20000]);
  assert.deepEqual(updates, ["RUNNING", "RUNNING", "COMPLETE"]);
  assert.equal(done.phase.phase, "complete");
  let calls = 0;
  const stopped = await pollElsMatrixReading("tok", { invoker: async () => { calls += 1; return { data: { contract: "els_matrix_reading_v1", ok: true, state: "RUNNING" }, error: null }; }, wait: async () => {}, shouldStop: () => calls >= 2 });
  assert.equal(stopped.stopped, true);
  const bounded = await pollElsMatrixReading("tok", { invoker: async () => ({ data: { contract: "els_matrix_reading_v1", ok: true, state: "RUNNING" }, error: null }), wait: async () => {}, maxPolls: 3 });
  assert.equal(bounded.phase.pollLimitReached, true);
});

test("the client talks to ai-analyze only: no other function, no direct provider, no search engine", () => {
  const source = readFileSync(new URL("../src/lib/research/elsMatrixReadingClient.js", import.meta.url), "utf8");
  assert.equal((source.match(/functions\.invoke\(/g) || []).length, 1);
  assert.match(source, /functions\.invoke\("ai-analyze"/);
  assert.doesNotMatch(source, /anthropic|openai|els-search-bridge|rpc\(/i);
});

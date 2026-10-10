import test from "node:test";
import assert from "node:assert/strict";
import { runAiAnalyze, toolAnswer, personalAnswer, UID, OTHER_UID, USER_JWT, PRIVATE, SERVICE_KEY } from "./helpers/ai-analyze-handler.mjs";

function assertQuota(r) {
  assert.equal(r.status, 200);
  assert.equal(r.result.error, "quota");
  assert.equal(r.result.analysis, null);
  assert.equal(r.result.used, 15);
  assert.equal(r.result.limit, 15);
  assert.equal(r.models.length, 0);
  assert.equal(r.personal.length, 0);
  assert.equal(r.calls.filter((c) => c.name === "fn_raziel_answer").length, 1);
  assert.equal(r.calls.some((c) => ["ai_token_log", "fn_raziel_remember", "fn_raziel_context", "metatron_context"].includes(c.name)), false);
}

function assertCompletedTrace(r) {
  const begin = r.traces.filter((c) => c.name === "op_trace_begin_v1");
  const finish = r.traces.filter((c) => c.name === "op_trace_finish_v1");
  assert.equal(begin.length, 1);
  assert.equal(finish.length, 1);
  assert.equal(r.result.trace_id, begin[0].payload.p_trace_id);
  assert.equal(finish[0].payload.p_trace_id, r.result.trace_id);
  assert.equal(finish[0].payload.p_root_span_id, begin[0].payload.p_root_span_id);
  assert.equal(finish[0].payload.p_outcome, "failed_with_reason");
  assert.equal(finish[0].payload.p_stop_reason, "quota");
  assert.deepEqual(r.spans.map((s) => s.p_name), ["ai-analyze:raziel:tool:gematria", "ai-analyze:raziel:tool:els"]);
  assert.equal(new Set(r.spans.map((s) => s.p_span_id)).size, 2);
  for (const s of r.spans) {
    assert.equal(s.p_trace_id, r.result.trace_id);
    assert.equal(s.p_parent_span_id, begin[0].payload.p_root_span_id);
    assert.equal(s.p_kind, "db_rpc");
    assert.equal(s.p_detail.resources.api_calls, 1);
    assert.equal(s.p_detail.privacy.redactionApplied, true);
    assert.equal(s.p_detail.privacy.rawPrivatePayloadLogged, false);
  }
  const payloads = JSON.stringify(r.traces.map((c) => c.payload));
  for (const sensitive of [PRIVATE, USER_JWT, SERVICE_KEY, UID, OTHER_UID]) assert.equal(payloads.includes(sensitive), false, sensitive);
}

test("completed tools + quota denial: trace execution success, rejected output, failed root; no model or re-execution", async () => {
  const r = await runAiAnalyze();
  assertQuota(r);
  assertCompletedTrace(r);
  for (const s of r.spans) {
    assert.equal(s.p_outcome, "success");
    assert.equal(s.p_detail.output_use, "rejected");
    assert.equal(s.p_detail.stop_reason, "quota");
  }
  assert.deepEqual(r.spans.map((s) => s.p_detail.resources.latency_ms), [7, 9]);
  assert.deepEqual(r.calls.filter((c) => c.name !== "fn_raziel_plan").map((c) => c.name), [
    "fn_raziel_answer", "ai_quota_check", "op_trace_begin_v1", "op_trace_record_span_v1", "op_trace_record_span_v1", "op_trace_finish_v1",
  ]);
});

test("partial tools + quota denial: preserve each tool outcome; failure is not replaced with quota", async () => {
  const answer = toolAnswer();
  answer.tool_research.status = "partial";
  answer.tool_research.specialists[1] = { capability: "els", status: "failed", ms: 9, error: "tool_error" };
  const r = await runAiAnalyze({ answer });
  assertQuota(r);
  assertCompletedTrace(r);
  assert.deepEqual(r.spans.map((s) => [s.p_outcome, s.p_detail.output_use, s.p_detail.stop_reason]), [
    ["success", "rejected", "quota"], ["failed_with_reason", "not_applicable", "tool_error"],
  ]);
});

for (const rpc of ["op_trace_begin_v1", "op_trace_record_span_v1", "op_trace_finish_v1"]) {
  for (const mode of ["throw", "http"]) {
    test(`trace persistence ${rpc} ${mode} failure keeps quota response and zero model calls`, async () => {
      const r = await runAiAnalyze({ traceFailure: { rpc, mode } });
      assertQuota(r);
      assert.equal(r.traces.filter((c) => c.name === rpc).length, rpc === "op_trace_record_span_v1" ? 2 : 1);
      if (rpc === "op_trace_begin_v1") {
        assert.equal(r.result.trace_id, null);
        assert.equal(r.spans.length, 0);
        assert.equal(r.traces.length, 1);
      } else {
        assert.equal(r.traces.filter((c) => c.name === "op_trace_finish_v1").length, 1);
      }
    });
  }
}

test("personal deterministic read remains quota-gated (policy unchanged)", async () => {
  const r = await runAiAnalyze({ answer: personalAnswer(), bearer: USER_JWT, verifiedUid: UID });
  assertQuota(r);
  assert.equal(r.spans.length, 0);
  const finish = r.traces.find((c) => c.name === "op_trace_finish_v1");
  assert.equal(finish?.payload.p_stop_reason, "quota");
});

test("authorized personal read keeps verified caller JWT and uid despite forged body identity; no model", async () => {
  const r = await runAiAnalyze({ answer: personalAnswer(), allowed: true, bearer: USER_JWT, verifiedUid: UID,
    body: { user_id: OTHER_UID, user_ref: OTHER_UID, uid: OTHER_UID, tier: "admin" } });
  assert.equal(r.status, 200);
  assert.equal(r.models.length, 0);
  assert.equal(r.result.raziel.basis, "PERSONAL_RESEARCH_STATE");
  assert.equal(r.result.model, "none");
  assert.equal(r.personal.length, 1);
  assert.equal(r.personal[0].headers.authorization, `Bearer ${USER_JWT}`);
  assert.deepEqual(r.personal[0].payload, { p_expected_user_id: UID });
  assert.equal(r.calls.find((c) => c.name === "ai_quota_check").payload.p_tier, "user");
  assert.equal(r.calls.find((c) => c.name === "fn_raziel_answer").payload.p_user_ref, UID);
  assert.equal(r.spans.length, 1);
  assert.equal(r.spans[0].p_outcome, "success");
  assert.equal(r.traces.at(-1).name, "op_trace_finish_v1");
  assert.equal(r.traces.at(-1).payload.p_outcome, "success");
  for (const sensitive of [PRIVATE, UID, OTHER_UID, USER_JWT, SERVICE_KEY]) {
    assert.equal(JSON.stringify(r.traces.map((c) => c.payload)).includes(sensitive), false);
  }
  assert.equal(JSON.stringify(r.result).includes(PRIVATE), false);
});

test("advanced gate still blocks allowed requests and quota denial still takes precedence", async () => {
  const denied = await runAiAnalyze({ body: { mode: "advanced" } });
  assertQuota(denied);
  const gated = await runAiAnalyze({ allowed: true, body: { mode: "advanced" } });
  assert.equal(gated.models.length, 0);
  assert.equal(gated.personal.length, 0);
  assert.equal(gated.traces.length, 0);
  assert.equal(gated.result.engine, "gated");
  assert.equal(gated.result.model, "none");
  assert.equal(gated.result.raziel.under_construction, true);
});

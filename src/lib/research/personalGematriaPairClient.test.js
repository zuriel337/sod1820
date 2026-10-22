import test from "node:test";
import assert from "node:assert/strict";

import {
  PERSONAL_GEMATRIA_PAIR_CLIENT_CONTRACT,
  runPersonalGematriaPair,
} from "./personalGematriaPairClient.js";

const UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function bundle({ findings = [], failed = 0, negative = 0, partial = false } = {}) {
  return {
    findings,
    capability_trace: [{
      key: "gematria_relations",
      status: findings.length ? "executed" : negative ? "negative_result" : failed ? "failed" : "skipped",
      cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
    }],
    coverage: { failed, negative_result: negative, partial },
    invariants: { universal_finding_only: true },
  };
}

test("pair client sends exactly the bounded four-field request once", async () => {
  const calls = [];
  const finding = { id: "uf:pair" };
  const result = await runPersonalGematriaPair({
    left: " משיח ",
    right: "מלך ישראל",
    createInteractionId: () => UUID,
    invoke: async (...args) => {
      calls.push(args);
      return { data: { status: "ok", contract: PERSONAL_GEMATRIA_PAIR_CLIENT_CONTRACT, trace_id: "trace-1", bundle: bundle({ findings: [finding] }) } };
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["research-run", { body: {
    contract: PERSONAL_GEMATRIA_PAIR_CLIENT_CONTRACT,
    expressions: ["משיח", "מלך ישראל"],
    interaction_id: UUID,
    surface: "raziel",
  } }]);
  assert.equal(result.ok, true);
  assert.equal(result.outcome, "positive");
  assert.equal(result.traceId, "trace-1");
  assert.deepEqual(result.cost, { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 });
});

test("invalid personal inputs fail locally without minting an interaction or invoking Edge", async () => {
  let interactions = 0;
  let calls = 0;
  const invoke = async () => { calls += 1; };
  const createInteractionId = () => { interactions += 1; return UUID; };

  for (const [left, right, error] of [
    ["", "מלך", "expression_required"],
    ["משיח", "מָשִיח", "expressions_must_differ"],
    ["english", "מלך", "hebrew_required"],
    ["א".repeat(161), "מלך", "expression_too_long"],
  ]) {
    const result = await runPersonalGematriaPair({ left, right, invoke, createInteractionId });
    assert.equal(result.ok, false);
    assert.equal(result.error, error);
    assert.equal(result.networkCalls, 0);
  }
  assert.equal(calls, 0);
  assert.equal(interactions, 0);
});

test("negative, engine failure and partial evidence remain distinct", async () => {
  const run = (value) => runPersonalGematriaPair({
    left: "משיח",
    right: "מלך",
    createInteractionId: () => UUID,
    invoke: async () => ({ data: { status: "ok", contract: PERSONAL_GEMATRIA_PAIR_CLIENT_CONTRACT, bundle: value } }),
  });
  assert.equal((await run(bundle({ negative: 1 }))).outcome, "negative");
  const failed = await run(bundle({ failed: 1 }));
  assert.equal(failed.ok, false);
  assert.equal(failed.outcome, "failed");
  assert.equal((await run(bundle({ findings: [{ id: "uf:x" }], failed: 1, partial: true }))).outcome, "partial");
});

test("HTTP and 200 error bodies fail closed and are never retried", async () => {
  let calls = 0;
  const http = await runPersonalGematriaPair({
    left: "משיח",
    right: "מלך",
    createInteractionId: () => UUID,
    invoke: async () => {
      calls += 1;
      return { error: { context: new Response(JSON.stringify({ error: "authenticated_user_required" })) } };
    },
  });
  assert.equal(http.error, "authenticated_user_required");
  assert.equal(calls, 1);

  const traced = await runPersonalGematriaPair({
    left: "משיח",
    right: "מלך",
    createInteractionId: () => UUID,
    invoke: async () => {
      calls += 1;
      return { data: { status: "error", error: "trace_incomplete", trace_id: "trace-2" } };
    },
  });
  assert.equal(traced.error, "trace_incomplete");
  assert.equal(traced.traceId, "trace-2");
  assert.equal(calls, 2, "one invocation per explicit action; no retry");
});

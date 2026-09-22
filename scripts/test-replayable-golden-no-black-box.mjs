import assert from "node:assert/strict";
import {
  TRACE_COST_CERTAINTY,
  TRACE_OUTCOME,
  TRACE_OUTPUT_USE,
  TRACE_SPAN_KIND,
  createTraceRoot,
  createTraceSpan,
  replayTraceSnapshot,
  summarizeMultiEngineTrace,
  summarizeTraceTopology,
  traceCostDrilldown,
  validateTraceTopology,
} from "../src/lib/operationalTraceContract.js";
import {
  GOLDEN_WORLD_JOURNEY_878,
  projectGoldenJourney878,
} from "../src/lib/research/worldJourneyProjection.js";

const root = createTraceRoot({
  traceId: "golden-trace-878-v1",
  interactionId: "golden-interaction-878-v1",
  capability: "research-context-replay",
  surface: "number-2029",
  channel: "web",
  locale: "he",
  identityClass: "fixture",
  subjectRef: "number:878",
});

function makeSpans() {
  const planRef = "golden-plan:878:v1";
  return [
    createTraceSpan({
      traceId: root.traceId,
      spanId: "00-root",
      kind: TRACE_SPAN_KIND.ROOT_INTERACTION,
      name: "golden-878",
      capability: root.capability,
      outcome: TRACE_OUTCOME.PARTIAL,
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
      replay: { idempotencyKey: "golden-878-v1", inputFingerprint: "fixture:878:v1" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "10-plan",
      parentSpanId: "00-root",
      kind: TRACE_SPAN_KIND.ROUTER_PLAN,
      name: "research-plan",
      capability: root.capability,
      owner: "research_strategy_layer_law v15",
      planRef,
      startedAt: "2026-09-23T00:00:00.000Z",
      endedAt: "2026-09-23T00:00:00.010Z",
      outcome: TRACE_OUTCOME.SUCCESS,
      outputUse: TRACE_OUTPUT_USE.USED,
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
      replay: {
        ownerRuleRefs: ["research_strategy_layer_law v15", "system_suggestions_law v3"],
        parametersRef: "golden:parallel+sequential+failure:v1",
        idempotencyKey: "golden-878-v1",
      },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "20-engine-a",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.MODEL_CALL,
      name: "engine-a",
      planRef,
      provider: "fixture-provider-a",
      model: "fixture-model-a",
      routingReason: "parallel-primary",
      startedAt: "2026-09-23T00:00:01.000Z",
      endedAt: "2026-09-23T00:00:05.000Z",
      outcome: TRACE_OUTCOME.SUCCESS,
      outputUse: TRACE_OUTPUT_USE.USED,
      resources: { input_tokens: 1000, output_tokens: 250, api_calls: 1 },
      cost: { costIls: 0.11, certainty: TRACE_COST_CERTAINTY.EXACT },
      replay: { costLogRef: "ai_token_log:golden-a", resultBundleRef: "bundle:engine-a" },
      privacy: { redactionApplied: true, payloadHash: "sha256:fixture-a" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "21-engine-b",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.MODEL_CALL,
      name: "engine-b",
      planRef,
      provider: "fixture-provider-b",
      model: "fixture-model-b",
      routingReason: "parallel-cross-check",
      startedAt: "2026-09-23T00:00:01.500Z",
      endedAt: "2026-09-23T00:00:04.000Z",
      outcome: TRACE_OUTCOME.PARTIAL,
      outputUse: TRACE_OUTPUT_USE.PARTIALLY_USED,
      cost: { costIls: 0.04, certainty: TRACE_COST_CERTAINTY.ESTIMATED },
      replay: { costLogRef: "provider:fixture-b:req-1", resultBundleRef: "bundle:engine-b" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "22-negative-tool",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.TOOL_CALL,
      name: "bounded-search",
      planRef,
      toolVersion: "fixture-tool-v1",
      startedAt: "2026-09-23T00:00:01.200Z",
      endedAt: "2026-09-23T00:00:02.000Z",
      outcome: TRACE_OUTCOME.NEGATIVE_RESULT,
      outputUse: TRACE_OUTPUT_USE.REJECTED,
      stopReason: "search_space_exhausted",
      resources: { tool_calls: 1, search_space_examined: 138 },
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
      replay: { searchBoundsRef: "prime-index:1..138", resultBundleRef: "negative:bounded-search" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "30-provider-primary",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.MODEL_CALL,
      name: "primary-provider",
      planRef,
      provider: "fixture-provider-c",
      model: "fixture-model-c",
      routingReason: "sequential-specialist",
      startedAt: "2026-09-23T00:00:05.100Z",
      endedAt: "2026-09-23T00:00:05.900Z",
      outcome: TRACE_OUTCOME.PROVIDER_ERROR,
      outputUse: TRACE_OUTPUT_USE.REJECTED,
      stopReason: "provider_503",
      requestRef: "req:fixture-c-0",
      retryOrdinal: 0,
      cost: { costIls: 0.02, certainty: TRACE_COST_CERTAINTY.ESTIMATED },
      replay: { costLogRef: "provider:fixture-c:req-0" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "31-provider-retry",
      parentSpanId: "30-provider-primary",
      kind: TRACE_SPAN_KIND.MODEL_CALL,
      name: "primary-provider-retry",
      planRef,
      provider: "fixture-provider-c",
      model: "fixture-model-c",
      routingReason: "retry-after-transient",
      escalationReason: "provider_503",
      startedAt: "2026-09-23T00:00:06.000Z",
      endedAt: "2026-09-23T00:00:07.000Z",
      outcome: TRACE_OUTCOME.CONTINUATION_REQUIRED,
      outputUse: TRACE_OUTPUT_USE.PARTIALLY_USED,
      stopReason: "max_tokens",
      requestRef: "req:fixture-c-1",
      retryOrdinal: 1,
      continuationOrdinal: 1,
      cost: { costIls: 0.03, certainty: TRACE_COST_CERTAINTY.EXACT },
      replay: {
        costLogRef: "provider:fixture-c:req-1",
        continuationRef: "continuation:golden-878:1",
        resultBundleRef: "bundle:engine-c-partial",
      },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "32-timeout",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.TOOL_CALL,
      name: "timeout-tool",
      planRef,
      outcome: TRACE_OUTCOME.TIMEOUT,
      outputUse: TRACE_OUTPUT_USE.REJECTED,
      stopReason: "deadline_exceeded",
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "33-cancelled",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.TOOL_CALL,
      name: "cancelled-tool",
      planRef,
      outcome: TRACE_OUTCOME.CANCELLED,
      outputUse: TRACE_OUTPUT_USE.REJECTED,
      stopReason: "caller_cancelled",
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "34-tool-error",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.TOOL_CALL,
      name: "failed-tool",
      planRef,
      outcome: TRACE_OUTCOME.TOOL_ERROR,
      outputUse: TRACE_OUTPUT_USE.REJECTED,
      stopReason: "tool_failure",
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "35-unpriced",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.MODEL_CALL,
      name: "unpriced-model",
      planRef,
      provider: "fixture-provider-d",
      model: "fixture-model-unpriced",
      outcome: TRACE_OUTCOME.SUCCESS,
      outputUse: TRACE_OUTPUT_USE.SUPERSEDED,
      cost: { certainty: TRACE_COST_CERTAINTY.UNKNOWN },
      replay: { costLogRef: "provider:fixture-d:req-1" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "36-dedup-shadow",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.MODEL_CALL,
      name: "linked-cost-shadow",
      planRef,
      provider: "fixture-provider-a",
      model: "fixture-model-a",
      outcome: TRACE_OUTCOME.SUCCESS,
      outputUse: TRACE_OUTPUT_USE.SUPERSEDED,
      cost: { costIls: 0.11, certainty: TRACE_COST_CERTAINTY.EXACT },
      replay: { costLogRef: "ai_token_log:golden-a" },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "40-synthesis",
      parentSpanId: "31-provider-retry",
      kind: TRACE_SPAN_KIND.SYNTHESIS,
      name: "golden-synthesis",
      planRef,
      startedAt: "2026-09-23T00:00:07.100Z",
      endedAt: "2026-09-23T00:00:07.200Z",
      outcome: TRACE_OUTCOME.PARTIAL,
      outputUse: TRACE_OUTPUT_USE.USED,
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
      replay: {
        sourceBundleRef: "bundle:engine-a+bundle:engine-b+bundle:engine-c-partial+negative:bounded-search",
        resultBundleRef: "golden:878:result:v1",
        exactReturnRef: "golden:878:result:v1",
        idempotencyKey: "golden-878-v1",
      },
      privacy: {
        redactionApplied: true,
        payloadHash: "sha256:golden-private-input-redacted",
        securePayloadRef: "secure:fixture-only",
      },
    }),
  ];
}

const spans = makeSpans();
assert.equal(validateTraceTopology(spans), true, "parent/child topology must be valid");
const topology = summarizeTraceTopology(spans);
assert.ok(topology.parallelSiblingGroups >= 1, "must prove real parallel sibling topology");
assert.ok(topology.maxDepth >= 3, "must prove sequential parent/child propagation across layers");
assert.ok(topology.sequentialEdges >= 3, "must expose sequential delegation edges");

const outcomes = new Set(spans.map((span) => span.outcome));
for (const required of [
  TRACE_OUTCOME.PARTIAL,
  TRACE_OUTCOME.CONTINUATION_REQUIRED,
  TRACE_OUTCOME.NEGATIVE_RESULT,
  TRACE_OUTCOME.CANCELLED,
  TRACE_OUTCOME.TIMEOUT,
  TRACE_OUTCOME.PROVIDER_ERROR,
  TRACE_OUTCOME.TOOL_ERROR,
]) assert.ok(outcomes.has(required), `missing Golden outcome ${required}`);

const costStates = new Set(spans.map((span) => span.cost.certainty));
for (const required of Object.values(TRACE_COST_CERTAINTY)) {
  assert.ok(costStates.has(required), `missing cost state ${required}`);
}
const drill = traceCostDrilldown(spans);
assert.equal(drill.costIlsKnown, 0.2, "known cost must roll up without duplicate linked cost");
assert.equal(drill.hasUnknownCost, true, "unpriced model must remain unknown");
assert.equal(drill.dedupedCostEntries, 1, "duplicate cost lineage must be counted once");
const shadow = drill.rows.find((row) => row.spanId === "36-dedup-shadow");
assert.equal(shadow.duplicateCostRef, true);
assert.equal(shadow.counted, false);

const multi = summarizeMultiEngineTrace(spans);
assert.ok(multi.engineCount >= 5, "must expose multiple engine/model calls under one root");
assert.equal(multi.synthesisCount, 1);
assert.ok(multi.used >= 1);
assert.ok(multi.partiallyUsed >= 1);
assert.ok(multi.rejected >= 1);
assert.ok(multi.superseded >= 1);

assert.ok(spans.some((span) => span.retryOrdinal === 1), "retry ordinal must be preserved");
assert.ok(spans.some((span) => span.continuationOrdinal === 1), "continuation ordinal must be preserved");
assert.ok(spans.every((span) => span.privacy.rawPrivatePayloadLogged === false), "raw private payload must never enter trace");
assert.ok(spans.every((span) => span.privacy.redactionApplied === true), "Golden trace must remain redaction-safe");
const synthesis = spans.find((span) => span.kind === TRACE_SPAN_KIND.SYNTHESIS);
assert.equal(synthesis.replay.exactReturnRef, "golden:878:result:v1");
assert.match(synthesis.replay.sourceBundleRef, /engine-a/);
assert.match(synthesis.replay.sourceBundleRef, /engine-b/);
assert.match(synthesis.replay.sourceBundleRef, /engine-c-partial/);
assert.match(synthesis.replay.sourceBundleRef, /negative/);

const replayA = replayTraceSnapshot(makeSpans());
const replayB = replayTraceSnapshot(makeSpans());
assert.deepEqual(replayA, replayB, "same preserved refs/versions/parameters must replay exactly");
assert.equal(JSON.stringify(replayA), JSON.stringify(replayB), "replay serialization must be deterministic");

const journeyRows = [
  { slug: "meeting-1202", title: "1202", numbers: [878, 1202], highlight_numbers: [1202] },
  { slug: "meeting-776", title: "776", numbers: [878, 776], highlight_numbers: [776] },
  { slug: "duplicate-1202", title: "duplicate", numbers: [878, 1202], highlight_numbers: [1202] },
];
const journeyA = projectGoldenJourney878({ topicRows: journeyRows });
const journeyB = projectGoldenJourney878({ topicRows: journeyRows });
assert.equal(journeyA.id, GOLDEN_WORLD_JOURNEY_878.id);
assert.equal(journeyA.rootValue, 878);
assert.deepEqual(journeyA, journeyB, "878 Research Context/Journey projector must exact-return on identical ordered input");
assert.deepEqual(journeyA.paths.map((path) => path.targetValue), [1202, 776]);

console.log("G3 Replayable Golden / No-Black-Box V1: PASS");

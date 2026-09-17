import assert from "node:assert/strict";
import {
  TRACE_COST_CERTAINTY,
  TRACE_OUTCOME,
  TRACE_OUTPUT_USE,
  TRACE_SPAN_KIND,
  createTraceRoot,
  createTraceSpan,
  summarizeMultiEngineTrace,
  validateTraceTopology,
} from "../src/lib/operationalTraceContract.js";

const root = createTraceRoot({
  traceId: "trace-demo-1",
  interactionId: "interaction-demo-1",
  capability: "deep_research",
  surface: "heichal",
  channel: "web",
  locale: "he",
  identityClass: "admin",
});
assert.equal(root.rawPrivatePayloadLogged, false);

const spans = [
  createTraceSpan({
    traceId: root.traceId,
    spanId: "root",
    kind: TRACE_SPAN_KIND.ROOT_INTERACTION,
    name: "deep-research",
    outcome: TRACE_OUTCOME.SUCCESS,
    cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
  }),
  createTraceSpan({
    traceId: root.traceId,
    spanId: "engine-a",
    parentSpanId: "root",
    kind: TRACE_SPAN_KIND.MODEL_CALL,
    name: "engine-a",
    provider: "provider-a",
    model: "model-a",
    routingReason: "independent research branch",
    outcome: TRACE_OUTCOME.SUCCESS,
    outputUse: TRACE_OUTPUT_USE.USED,
    resources: { input_tokens: 1000, output_tokens: 300 },
    cost: { costIls: 0.11, certainty: TRACE_COST_CERTAINTY.EXACT },
    privacy: { payloadHash: "hash-a" },
  }),
  createTraceSpan({
    traceId: root.traceId,
    spanId: "engine-b",
    parentSpanId: "root",
    kind: TRACE_SPAN_KIND.MODEL_CALL,
    name: "engine-b",
    provider: "provider-b",
    model: "model-b",
    routingReason: "cross-check branch",
    outcome: TRACE_OUTCOME.SUCCESS,
    outputUse: TRACE_OUTPUT_USE.PARTIALLY_USED,
    resources: { input_tokens: 800, output_tokens: 220 },
    cost: { costIls: 0.07, certainty: TRACE_COST_CERTAINTY.EXACT },
  }),
  createTraceSpan({
    traceId: root.traceId,
    spanId: "engine-c",
    parentSpanId: "root",
    kind: TRACE_SPAN_KIND.MODEL_CALL,
    name: "engine-c",
    provider: "provider-c",
    model: "model-c",
    routingReason: "specialist branch",
    outcome: TRACE_OUTCOME.PARTIAL,
    outputUse: TRACE_OUTPUT_USE.REJECTED,
    stopReason: "bounded_stop",
    resources: { input_tokens: 600, output_tokens: 100 },
    cost: { costIls: 0.05, certainty: TRACE_COST_CERTAINTY.EXACT },
  }),
  createTraceSpan({
    traceId: root.traceId,
    spanId: "synthesis",
    parentSpanId: "root",
    kind: TRACE_SPAN_KIND.SYNTHESIS,
    name: "merge-three-engines",
    outcome: TRACE_OUTCOME.SUCCESS,
    outputUse: TRACE_OUTPUT_USE.USED,
    cost: { costIls: 0.03, certainty: TRACE_COST_CERTAINTY.EXACT },
    replay: { sourceBundleRef: "engine-a+engine-b+engine-c" },
  }),
];

assert.equal(validateTraceTopology(spans), true);
const summary = summarizeMultiEngineTrace(spans);
assert.equal(summary.engineCount, 3);
assert.equal(summary.synthesisCount, 1);
assert.equal(summary.used, 1);
assert.equal(summary.partiallyUsed, 1);
assert.equal(summary.rejected, 1);
assert.equal(summary.costIlsKnown, 0.26);
assert.equal(summary.hasUnknownCost, false);
assert.equal(spans.every((span) => span.privacy.rawPrivatePayloadLogged === false), true);

const unknownCost = createTraceSpan({
  traceId: root.traceId,
  spanId: "unknown-price-engine",
  parentSpanId: "root",
  kind: TRACE_SPAN_KIND.MODEL_CALL,
  name: "future-model",
  cost: { certainty: TRACE_COST_CERTAINTY.UNKNOWN },
});
const withUnknown = summarizeMultiEngineTrace([...spans, unknownCost]);
assert.equal(withUnknown.hasUnknownCost, true);
assert.equal(withUnknown.costIlsKnown, 0.26);

console.log("Operational Trace Contract: PASS");

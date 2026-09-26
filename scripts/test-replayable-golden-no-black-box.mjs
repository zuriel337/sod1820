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
import { EXPERIENCE_SURFACE, resolveExperienceContext } from "../src/lib/experienceContext.js";
import { buildResearchPlanV2 } from "../src/lib/research/researchPlanV2.js";
import { analyzeNumberMath } from "../src/lib/research/numberMathProfile.js";
import {
  GOLDEN_WORLD_JOURNEY_878,
  projectGoldenJourney878,
} from "../src/lib/research/worldJourneyProjection.js";
import {
  buildResearchPathRepresentation,
  contextFromResearchPathSnapshot,
  resumeHrefFromResearchPath,
} from "../src/lib/research/researchPathRuntime.js";
import { normalizeResearchContext } from "../src/lib/research/researchContext.js";

const live878Snapshot = Object.freeze([
  Object.freeze({ slug: "charvot-barzel-1202", title: "חרבות ברזל = בראשית ברא אלהים = 1202 · התגלות המשיח", numbers: [1202, 776, 878], highlight_numbers: [1202] }),
  Object.freeze({ slug: "atzirut-hageula", title: "עצירות — העיכוב שהוא הריון הגאולה", numbers: [776, 254, 878, 1202, 361, 666], highlight_numbers: [776] }),
  Object.freeze({ slug: "1010-מפגש-הצירים", title: "1010 — מפגש הצירים", numbers: [1010, 878, 2588, 588, 5786], highlight_numbers: [1010] }),
]);

const experience = resolveExperienceContext({
  surface: EXPERIENCE_SURFACE.NUMBER,
  locale: "he",
  lens: "kingdom",
  reducedMotion: true,
});
const identityResolution = Object.freeze({
  identities: Object.freeze([{ type: "number", value: 878, canonical_ref: "number:878" }]),
  primary: Object.freeze({ type: "number", value: 878, canonical_ref: "number:878" }),
  text_calculation_allowed: false,
});
const researchPlan = buildResearchPlanV2({
  question: "פתח את מסע 878 וחפש את החיבורים הקיימים",
  intent: "research",
  identityResolution,
  contextType: "public_user",
  surfaceContext: Object.freeze({ experience_version: experience.version, surface: experience.surface, number: 878 }),
});
const [numberMath878, journey878] = await Promise.all([
  Promise.resolve(analyzeNumberMath(878)),
  Promise.resolve(projectGoldenJourney878({ topicRows: live878Snapshot })),
]);

assert.equal(experience.version, "experience-context-2029-v1");
assert.equal(experience.surface, EXPERIENCE_SURFACE.NUMBER);
assert.equal(researchPlan.v, 2);
assert.equal(researchPlan.strategy, "number_research");
assert.ok(researchPlan.requested_capabilities.includes("numeric"));
assert.equal(researchPlan.access.contains_identifying_fields, false);
assert.equal(numberMath878.status, "ok");
assert.equal(numberMath878.input.value, 878);
assert.equal(numberMath878.coverage.deterministic, true);
assert.equal(journey878.id, GOLDEN_WORLD_JOURNEY_878.id);
assert.deepEqual(journey878.paths.map((path) => path.targetValue), [1202, 776, 1010]);


const golden878Context = normalizeResearchContext({
  subject: { id: "1202", type: "number", label: "1202", href: "/world" },
  selection: { entityId: "1202", entityType: "number" },
  lens: "world",
  dimensions: {
    journeySource: "world-golden-878",
    journeySemanticId: GOLDEN_WORLD_JOURNEY_878.id,
    journeyRoot: 878,
    journeyVisitedValues: [878, 1202],
    journeyMeetingSlugs: ["charvot-barzel-1202"],
  },
  journey: { id: GOLDEN_WORLD_JOURNEY_878.id, kind: GOLDEN_WORLD_JOURNEY_878.kind, position: 1 },
  returnTo: { href: "/world", label: "מסע 878" },
});
const golden878PathRep = buildResearchPathRepresentation(golden878Context, {
  href: "/world",
  label: "מסע 878 · 1202",
  surface: "world",
});
const golden878PathResume = contextFromResearchPathSnapshot({
  ok: true,
  path_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  revision_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  revision_no: 2,
  steps: [{ step_index: 0 }, { step_index: 1 }],
  representation: golden878PathRep,
});
assert.equal(golden878PathResume.journey.kind, "research_path");
assert.equal(golden878PathResume.journey.id, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
assert.equal(golden878PathResume.dimensions.journeySemanticId, GOLDEN_WORLD_JOURNEY_878.id);
assert.equal(golden878PathResume.dimensions.journeyRoot, 878);
assert.equal(resumeHrefFromResearchPath({ ok: true, representation: golden878PathRep }), "/world");

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
  const planRef = `research-plan-v${researchPlan.v}:${researchPlan.strategy}:878`;
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
      spanId: "15-number-math",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.ENGINE,
      name: "number-math-profile",
      capability: numberMath878.capability,
      owner: "number_math_profile",
      planRef,
      engineVersion: numberMath878.profile_version,
      routingReason: "canonical deterministic number adapter",
      startedAt: "2026-09-23T00:00:00.200Z",
      endedAt: "2026-09-23T00:00:00.700Z",
      outcome: TRACE_OUTCOME.SUCCESS,
      outputUse: TRACE_OUTPUT_USE.USED,
      resources: { latency_ms: 500 },
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
      replay: {
        inputRef: "number:878",
        parametersRef: "number-math-profile:default-budget",
        resultBundleRef: `number-math-profile:${numberMath878.profile_version}:878`,
      },
    }),
    createTraceSpan({
      traceId: root.traceId,
      spanId: "16-journey-878",
      parentSpanId: "10-plan",
      kind: TRACE_SPAN_KIND.TOOL_CALL,
      name: "golden-world-journey-878",
      capability: "research-context-replay",
      owner: "worldJourneyProjection",
      planRef,
      toolVersion: "golden:878:v1",
      routingReason: "Roadmap replayable Research Context/Journey Golden",
      startedAt: "2026-09-23T00:00:00.200Z",
      endedAt: "2026-09-23T00:00:00.650Z",
      outcome: TRACE_OUTCOME.SUCCESS,
      outputUse: TRACE_OUTPUT_USE.USED,
      resources: { latency_ms: 450, rows_examined: live878Snapshot.length },
      cost: { certainty: TRACE_COST_CERTAINTY.NOT_BILLABLE },
      replay: {
        inputRef: "number:878",
        sourceBundleRef: "topic_cards_public:number=878:live-snapshot-2026-09-23",
        resultBundleRef: journey878.id,
        exactReturnRef: journey878.id,
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
        sourceBundleRef: `number-math-profile:${numberMath878.profile_version}:878+${journey878.id}+bundle:engine-a+bundle:engine-b+bundle:engine-c-partial+negative:bounded-search`,
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
assert.match(synthesis.replay.sourceBundleRef, /number-math-profile/);
assert.match(synthesis.replay.sourceBundleRef, /golden:878:v1/);
assert.match(synthesis.replay.sourceBundleRef, /engine-a/);
assert.match(synthesis.replay.sourceBundleRef, /engine-b/);
assert.match(synthesis.replay.sourceBundleRef, /engine-c-partial/);
assert.match(synthesis.replay.sourceBundleRef, /negative/);

const replayA = replayTraceSnapshot(makeSpans());
const replayB = replayTraceSnapshot(makeSpans());
assert.deepEqual(replayA, replayB, "same preserved refs/versions/parameters must replay exactly");
assert.equal(JSON.stringify(replayA), JSON.stringify(replayB), "replay serialization must be deterministic");

const journeyReplay = projectGoldenJourney878({ topicRows: live878Snapshot });
assert.equal(journeyReplay.id, GOLDEN_WORLD_JOURNEY_878.id);
assert.equal(journeyReplay.rootValue, 878);
assert.deepEqual(journey878, journeyReplay, "878 Research Context/Journey projector must exact-return on identical ordered input");
assert.deepEqual(journeyReplay.paths.map((path) => path.targetValue), [1202, 776, 1010]);

console.log("G3 Replayable Golden / No-Black-Box V1: PASS");

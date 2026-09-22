// SOD1820 — No Black Box / Full Execution Trace contract
// Semantic runtime contract only. This does not create a second telemetry store.
// Physical persistence must extend existing operational/cost owners and keep
// compatibility with ai_token_log, agent_token_costs and owner-native logs.

export const TRACE_SPAN_KIND = Object.freeze({
  ROOT_INTERACTION: "root_interaction",
  ROUTER_PLAN: "router_plan",
  ENGINE: "engine",
  MODEL_CALL: "model_call",
  TOOL_CALL: "tool_call",
  DB_RPC: "db_rpc",
  CACHE: "cache",
  NETWORK: "network",
  MEDIA: "media",
  STORAGE_INDEX: "storage_index",
  BACKGROUND_JOB: "background_job",
  SYNTHESIS: "synthesis",
  EXPORT: "export",
});

export const TRACE_OUTCOME = Object.freeze({
  SUCCESS: "success",
  PARTIAL: "partial",
  CONTINUATION_REQUIRED: "continuation_required",
  NEGATIVE_RESULT: "negative_result",
  ACCESS_FILTERED: "access_filtered",
  CACHE_HIT: "cache_hit",
  CACHE_MISS: "cache_miss",
  DEGRADED_FALLBACK: "degraded_fallback",
  CANCELLED: "cancelled",
  TIMEOUT: "timeout",
  PROVIDER_ERROR: "provider_error",
  TOOL_ERROR: "tool_error",
  FAILED_WITH_REASON: "failed_with_reason",
});

export const TRACE_COST_CERTAINTY = Object.freeze({
  EXACT: "exact",
  ESTIMATED: "estimated",
  UNKNOWN: "unknown",
  NOT_BILLABLE: "not_billable",
});

export const TRACE_OUTPUT_USE = Object.freeze({
  USED: "used",
  PARTIALLY_USED: "partially_used",
  REJECTED: "rejected",
  SUPERSEDED: "superseded",
  NOT_APPLICABLE: "not_applicable",
});

export const TRACE_RESOURCE = Object.freeze({
  INPUT_TOKENS: "input_tokens",
  OUTPUT_TOKENS: "output_tokens",
  CACHED_INPUT_TOKENS: "cached_input_tokens",
  REASONING_TOKENS: "reasoning_tokens",
  AUDIO_INPUT_UNITS: "audio_input_units",
  AUDIO_OUTPUT_UNITS: "audio_output_units",
  SESSION_SECONDS: "session_seconds",
  TTS_UNITS: "tts_units",
  STT_UNITS: "stt_units",
  IMAGE_GENERATION_UNITS: "image_generation_units",
  VIDEO_GENERATION_UNITS: "video_generation_units",
  TOOL_CALLS: "tool_calls",
  API_CALLS: "api_calls",
  DB_QUERIES: "db_queries",
  RPC_CALLS: "rpc_calls",
  ROWS_EXAMINED: "rows_examined",
  SEARCH_SPACE_EXAMINED: "search_space_examined",
  STORAGE_BYTES: "storage_bytes",
  INDEX_BYTES: "index_bytes",
  INGRESS_BYTES: "ingress_bytes",
  EGRESS_BYTES: "egress_bytes",
  CLIENT_GPU_MS: "client_gpu_ms",
  LATENCY_MS: "latency_ms",
  RETRIES: "retries",
  CONTINUATIONS: "continuations",
});

const zeroSafe = (n) => Number.isFinite(Number(n)) ? Number(n) : 0;

export function createTraceRoot({
  traceId,
  interactionId = null,
  capability = null,
  surface = null,
  channel = null,
  locale = null,
  identityClass = null,
  sessionRef = null,
  subjectRef = null,
  availabilityRef = null,
  entitlementRef = null,
  budgetRef = null,
} = {}) {
  if (!traceId) throw new Error("traceId is required");
  return Object.freeze({
    traceId,
    interactionId,
    capability,
    surface,
    channel,
    locale,
    identityClass,
    sessionRef,
    subjectRef,
    availabilityRef,
    entitlementRef,
    budgetRef,
    rawPrivatePayloadLogged: false,
  });
}

export function createTraceSpan({
  traceId,
  spanId,
  parentSpanId = null,
  kind,
  name,
  capability = null,
  owner = null,
  planRef = null,
  intelligenceLevel = null,
  provider = null,
  model = null,
  modelVersion = null,
  engineVersion = null,
  toolVersion = null,
  routingReason = null,
  escalationReason = null,
  fallbackReason = null,
  startedAt = null,
  endedAt = null,
  durationMs = null,
  outcome = null,
  outputUse = TRACE_OUTPUT_USE.NOT_APPLICABLE,
  stopReason = null,
  requestRef = null,
  retryOrdinal = 0,
  continuationOrdinal = 0,
  resources = {},
  cost = {},
  replay = {},
  privacy = {},
} = {}) {
  if (!traceId || !spanId || !kind || !name) {
    throw new Error("traceId, spanId, kind and name are required");
  }
  return Object.freeze({
    traceId,
    spanId,
    parentSpanId,
    kind,
    name,
    capability,
    owner,
    planRef,
    intelligenceLevel,
    provider,
    model,
    modelVersion,
    engineVersion,
    toolVersion,
    routingReason,
    escalationReason,
    fallbackReason,
    startedAt,
    endedAt,
    durationMs,
    outcome,
    outputUse,
    stopReason,
    requestRef,
    retryOrdinal,
    continuationOrdinal,
    resources: Object.freeze({ ...resources }),
    cost: Object.freeze({
      providerNativeAmount: cost.providerNativeAmount ?? null,
      providerCurrency: cost.providerCurrency ?? null,
      pricingRef: cost.pricingRef ?? null,
      pricingEffectiveAt: cost.pricingEffectiveAt ?? null,
      fxRate: cost.fxRate ?? null,
      fxEffectiveAt: cost.fxEffectiveAt ?? null,
      costIls: cost.costIls ?? null,
      certainty: cost.certainty || TRACE_COST_CERTAINTY.UNKNOWN,
      creditsCharged: cost.creditsCharged ?? null,
      customerPrice: cost.customerPrice ?? null,
    }),
    replay: Object.freeze({
      inputRef: replay.inputRef ?? null,
      sourceBundleRef: replay.sourceBundleRef ?? null,
      ownerRuleRefs: replay.ownerRuleRefs ?? [],
      promptTemplateRef: replay.promptTemplateRef ?? null,
      parametersRef: replay.parametersRef ?? null,
      searchBoundsRef: replay.searchBoundsRef ?? null,
      resultBundleRef: replay.resultBundleRef ?? null,
      artifactRef: replay.artifactRef ?? null,
      costLogRef: replay.costLogRef ?? null,
      idempotencyKey: replay.idempotencyKey ?? null,
      continuationRef: replay.continuationRef ?? null,
      exactReturnRef: replay.exactReturnRef ?? null,
      inputFingerprint: replay.inputFingerprint ?? null,
    }),
    privacy: Object.freeze({
      rawPrivatePayloadLogged: false,
      redactionApplied: privacy.redactionApplied !== false,
      payloadHash: privacy.payloadHash ?? null,
      securePayloadRef: privacy.securePayloadRef ?? null,
    }),
  });
}

export function validateTraceTopology(spans = []) {
  const ids = new Set();
  const byId = new Map();
  for (const span of spans) {
    if (!span?.spanId || ids.has(span.spanId)) return false;
    ids.add(span.spanId);
    byId.set(span.spanId, span);
  }
  for (const span of spans) {
    if (span.parentSpanId && !ids.has(span.parentSpanId)) return false;
    if (span.parentSpanId && byId.get(span.parentSpanId)?.traceId !== span.traceId) return false;
    const seen = new Set([span.spanId]);
    let current = span;
    while (current?.parentSpanId) {
      if (seen.has(current.parentSpanId)) return false;
      seen.add(current.parentSpanId);
      current = byId.get(current.parentSpanId);
    }
  }
  return true;
}

function spanCostRef(span) {
  const ref = span?.replay?.costLogRef;
  return ref == null || ref === "" ? null : String(ref);
}

export function rollupTraceCostIls(spans = []) {
  let total = 0;
  let hasUnknown = false;
  const countedCostRefs = new Set();
  let dedupedCostEntries = 0;
  for (const span of spans) {
    const certainty = span?.cost?.certainty;
    const amount = span?.cost?.costIls;
    if (certainty === TRACE_COST_CERTAINTY.UNKNOWN || amount == null) {
      if (span?.cost && certainty !== TRACE_COST_CERTAINTY.NOT_BILLABLE) hasUnknown = true;
      continue;
    }
    const costRef = spanCostRef(span);
    if (costRef && countedCostRefs.has(costRef)) {
      dedupedCostEntries += 1;
      continue;
    }
    if (costRef) countedCostRefs.add(costRef);
    total += zeroSafe(amount);
  }
  return Object.freeze({
    costIlsKnown: Number(total.toFixed(6)),
    hasUnknownCost: hasUnknown,
    dedupedCostEntries,
  });
}

export function traceCostDrilldown(spans = []) {
  const seen = new Set();
  const rows = [];
  for (const span of spans) {
    const certainty = span?.cost?.certainty || TRACE_COST_CERTAINTY.UNKNOWN;
    const amount = span?.cost?.costIls ?? null;
    const costRef = spanCostRef(span);
    const duplicate = !!costRef && seen.has(costRef);
    if (costRef && !duplicate) seen.add(costRef);
    rows.push(Object.freeze({
      spanId: span?.spanId ?? null,
      parentSpanId: span?.parentSpanId ?? null,
      kind: span?.kind ?? null,
      name: span?.name ?? null,
      certainty,
      costIls: amount,
      costLogRef: costRef,
      counted: !duplicate && amount != null && certainty !== TRACE_COST_CERTAINTY.UNKNOWN && certainty !== TRACE_COST_CERTAINTY.NOT_BILLABLE,
      duplicateCostRef: duplicate,
    }));
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    ...rollupTraceCostIls(spans),
  });
}

export function replayTraceSnapshot(spans = []) {
  const safe = spans.map((span) => ({
    traceId: span?.traceId ?? null,
    spanId: span?.spanId ?? null,
    parentSpanId: span?.parentSpanId ?? null,
    kind: span?.kind ?? null,
    name: span?.name ?? null,
    capability: span?.capability ?? null,
    owner: span?.owner ?? null,
    planRef: span?.planRef ?? null,
    intelligenceLevel: span?.intelligenceLevel ?? null,
    provider: span?.provider ?? null,
    model: span?.model ?? null,
    modelVersion: span?.modelVersion ?? null,
    engineVersion: span?.engineVersion ?? null,
    toolVersion: span?.toolVersion ?? null,
    routingReason: span?.routingReason ?? null,
    escalationReason: span?.escalationReason ?? null,
    fallbackReason: span?.fallbackReason ?? null,
    outcome: span?.outcome ?? null,
    outputUse: span?.outputUse ?? TRACE_OUTPUT_USE.NOT_APPLICABLE,
    stopReason: span?.stopReason ?? null,
    requestRef: span?.requestRef ?? null,
    retryOrdinal: span?.retryOrdinal ?? 0,
    continuationOrdinal: span?.continuationOrdinal ?? 0,
    resources: { ...(span?.resources || {}) },
    cost: { ...(span?.cost || {}) },
    replay: { ...(span?.replay || {}) },
    privacy: {
      rawPrivatePayloadLogged: false,
      redactionApplied: span?.privacy?.redactionApplied !== false,
      payloadHash: span?.privacy?.payloadHash ?? null,
      securePayloadRef: span?.privacy?.securePayloadRef ?? null,
    },
  }));
  safe.sort((a, b) => String(a.spanId).localeCompare(String(b.spanId)));
  return Object.freeze(safe.map((item) => Object.freeze(item)));
}

export function summarizeTraceTopology(spans = []) {
  const byParent = new Map();
  let sequentialEdges = 0;
  let maxDepth = 0;
  const byId = new Map(spans.map((span) => [span.spanId, span]));
  for (const span of spans) {
    if (span.parentSpanId) {
      sequentialEdges += 1;
      const arr = byParent.get(span.parentSpanId) || [];
      arr.push(span);
      byParent.set(span.parentSpanId, arr);
    }
    let depth = 0;
    let current = span;
    const seen = new Set();
    while (current?.parentSpanId && !seen.has(current.parentSpanId)) {
      seen.add(current.parentSpanId);
      depth += 1;
      current = byId.get(current.parentSpanId);
    }
    maxDepth = Math.max(maxDepth, depth);
  }
  const parallelSiblingGroups = [...byParent.values()].filter((siblings) => {
    if (siblings.length < 2) return false;
    return siblings.some((a, i) => siblings.some((b, j) => {
      if (i >= j) return false;
      const aStart = Date.parse(a.startedAt || "");
      const aEnd = Date.parse(a.endedAt || "");
      const bStart = Date.parse(b.startedAt || "");
      const bEnd = Date.parse(b.endedAt || "");
      if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false;
      return aStart < bEnd && bStart < aEnd;
    }));
  }).length;
  return Object.freeze({ sequentialEdges, maxDepth, parallelSiblingGroups });
}

export function summarizeMultiEngineTrace(spans = []) {
  const engineSpans = spans.filter((span) => [TRACE_SPAN_KIND.ENGINE, TRACE_SPAN_KIND.MODEL_CALL].includes(span.kind));
  const synthesisSpans = spans.filter((span) => span.kind === TRACE_SPAN_KIND.SYNTHESIS);
  return Object.freeze({
    engineCount: engineSpans.length,
    synthesisCount: synthesisSpans.length,
    used: engineSpans.filter((span) => span.outputUse === TRACE_OUTPUT_USE.USED).length,
    partiallyUsed: engineSpans.filter((span) => span.outputUse === TRACE_OUTPUT_USE.PARTIALLY_USED).length,
    rejected: engineSpans.filter((span) => span.outputUse === TRACE_OUTPUT_USE.REJECTED).length,
    superseded: engineSpans.filter((span) => span.outputUse === TRACE_OUTPUT_USE.SUPERSEDED).length,
    ...rollupTraceCostIls(spans),
  });
}

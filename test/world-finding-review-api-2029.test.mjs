import test from "node:test";
import assert from "node:assert/strict";
import handler, {
  enrichWorldFindingReviewRow,
  filterWorldFindingReviewRows,
  sortWorldFindingReviewRows,
} from "../api/world-finding-review.js";

const ZVI_ID = "c66f0464-0928-490e-be9b-66d8a87e7fc8";

function jsonResponse(body, { status = 200, contentRange = null } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (contentRange) headers.set("content-range", contentRange);
  return new Response(JSON.stringify(body), { status, headers });
}

function researchRow(index) {
  const linked = index === 0;
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    created_at: `2026-10-22T00:${String(index).padStart(2, "0")}:00Z`,
    kind: "observation",
    statement: `ממצא ${index}`,
    terms: [String(1800 + index)],
    value: 1800 + index,
    relates: [],
    source: "wa_channel_research",
    source_ref: `channel_updates:${index}`,
    contributor: "צבי",
    source_contributor_id: ZVI_ID,
    confidence: null,
    engine_verified: linked,
    engine_detail: linked ? { verification_state: "match" } : {},
    evidence: null,
    status: "candidate",
    privacy_scope: "private",
    promoted_node_id: null,
    parent_id: null,
    meta: {
      ext: {
        wa_channel_intake: {
          tree_matches: linked ? [{ type: "topic", key: "target", label: "יעד", match: "number" }] : [],
        },
      },
    },
  };
}

function mockResponse() {
  const headers = new Map();
  return {
    statusCode: null,
    body: null,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    headers,
  };
}

test("owner review validates admin, ranks server-side, and returns only 40 findings", async () => {
  const originalFetch = globalThis.fetch;
  const findings = Array.from({ length: 45 }, (_, index) => researchRow(index));
  const topic = {
    id: "10000000-0000-4000-8000-000000000000",
    created_at: "2026-10-22T00:00:00Z",
    approved_at: null,
    slug: "target",
    title: "יעד",
    subtitle: null,
    search_terms: [],
    image_ids: [],
    numbers: [1800],
    highlight_numbers: [1800],
    status: "candidate",
    quality: 8,
    meter_score: 91,
    created_by: "ZURIEL",
    node_id: null,
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const authorization = new Headers(init.headers).get("authorization") || "";
    if (url.pathname === "/auth/v1/user") {
      return jsonResponse({ id: authorization.includes("member-token") ? "member-user" : "admin-user" });
    }
    if (url.pathname === "/rest/v1/users") {
      return jsonResponse([{ role: authorization.includes("member-token") ? "member" : "admin" }]);
    }
    if (url.pathname === "/rest/v1/channel_updates") return jsonResponse([], { contentRange: "0-0/0" });
    if (url.pathname === "/rest/v1/topic_cards") return jsonResponse([topic], { contentRange: "0-0/1" });
    if (url.pathname === "/rest/v1/world_contributor_research_v1") return jsonResponse(findings, { contentRange: "0-44/45" });
    if (url.pathname === "/rest/v1/contributors") return jsonResponse([{
      id: ZVI_ID, display_name: "צבי (OPOC)", wa_names: ["צבי"],
    }], { contentRange: "0-0/1" });
    throw new Error(`unexpected fetch ${url.pathname}`);
  };

  try {
    const response = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer admin-token" },
      query: { offset: "0", tree: "all", meter: "all" },
    }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.page.limit, 40);
    assert.equal(response.body.page.returned, 40);
    assert.equal(response.body.page.totalFiltered, 45);
    assert.equal(response.body.page.hasMore, true);
    assert.equal(response.body.projection.rows[0].sourceId, findings[0].id);
    assert.equal(response.body.projection.rows[0].linkedTopicRating.meterScore, 91);
    assert.equal(response.body.projection.rows.every((row) => row.family === "research_object"), true);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(response.body.projection.triageSnapshot.totalCards, 10709);
    assert.equal(response.body.projection.corpusAudit.scope, "read_only_recommendations");
    assert.equal(response.body.projection.corpusAudit.workstreams.length, 7);
    assert.equal(response.body.projection.corpusAudit.workstreams.find((row) => row.key === "els").total, 135);
    assert.equal(response.body.projection.corpusAudit.workstreams.find((row) => row.key === "languages").counts.at(-1).value, 1);

    const secondPageResponse = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer admin-token" },
      query: { offset: "40", tree: "all", meter: "all" },
    }, secondPageResponse);
    assert.equal(secondPageResponse.statusCode, 200);
    assert.equal(secondPageResponse.body.page.returned, 5);
    assert.equal(secondPageResponse.body.page.hasMore, false);
    assert.equal(secondPageResponse.body.page.nextOffset, 45);

    const contributorResponse = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer admin-token" },
      query: { contributor_id: ZVI_ID, offset: "0", tree: "all", meter: "all" },
    }, contributorResponse);
    assert.equal(contributorResponse.statusCode, 200);
    assert.equal(contributorResponse.body.page.totalFiltered, 45);
    assert.equal(contributorResponse.body.projection.reviewScope.id, ZVI_ID);
    assert.equal(contributorResponse.body.projection.reviewScope.label, "צבי (OPOC)");
    assert.equal(contributorResponse.body.projection.triageSnapshot.totalCards, 45);

    const memberResponse = mockResponse();
    await handler({
      method: "GET",
      headers: { authorization: "Bearer member-token" },
      query: {},
    }, memberResponse);
    assert.equal(memberResponse.statusCode, 403);
    assert.deepEqual(memberResponse.body, { error: "admin_required" });

    const guestResponse = mockResponse();
    await handler({ method: "GET", headers: {}, query: {} }, guestResponse);
    assert.equal(guestResponse.statusCode, 401);
    assert.deepEqual(guestResponse.body, { error: "authentication_required" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function reviewRow(sourceId, extra = {}) {
  return enrichWorldFindingReviewRow({
    id: `research:${sourceId}`,
    sourceId,
    family: "research_object",
    createdAt: "2026-10-22T10:00:00Z",
    kind: "observation",
    statement: "ממצא בדיקה",
    secondary: null,
    originalStatement: "ממצא בדיקה",
    value: 204,
    values: [204],
    source: "wa_channel_research",
    sourceLabel: "הודעות מקור",
    sourceRef: "channel_updates:same-source#batch1",
    sourceRefs: ["channel_updates:same-source#batch1", "channel_updates:same-source#batch2"],
    occurrences: [
      { id: "a", sourceRef: "channel_updates:same-source#batch1" },
      { id: "b", sourceRef: "channel_updates:same-source#batch2" },
    ],
    contributor: "חוקר א",
    contributors: ["חוקר א"],
    confidence: 80,
    status: "candidate",
    access: "private",
    verification: "match",
    treeMatches: [{ type: "topic", key: "topic-a", label: "נושא א" }],
    linkedTopicRating: null,
    ...extra,
  });
}

test("report strength is default, quality/newest ties are deterministic, and missing scores stay unknown", () => {
  const first = reviewRow("01ab7adc-92f0-4c76-92fb-3ee43411d32e");
  const second = reviewRow("01fe92d4-7747-4a57-94bd-e9cbc2f16f81");
  const unranked = reviewRow("00000000-0000-4000-8000-999999999999", { confidence: null });

  assert.deepEqual(sortWorldFindingReviewRows([unranked, second, first]).map((row) => row.sourceId), [
    first.sourceId,
    second.sourceId,
    unranked.sourceId,
  ]);
  assert.deepEqual(sortWorldFindingReviewRows([second, first], "quality").map((row) => row.sourceId), [first.sourceId, second.sourceId]);
  assert.equal(unranked.evidenceQuality.score, null);
  assert.equal(unranked.evidenceQuality.label, "אין נתון");
  assert.equal(unranked.triage, null);
});

test("strength, evidence quality and publication remain separate filterable axes", () => {
  const row = reviewRow("01ab7adc-92f0-4c76-92fb-3ee43411d32e");
  assert.equal(row.triage.strength, "חזק");
  assert.equal(row.evidenceQuality.score, 80);
  assert.equal(row.status, "candidate");
  assert.equal(row.access, "private");
  assert.equal(row.independentSourceCount, 1, "repeat fragments of one source are not independent evidence");
  assert.equal(row.sourceRefs.length, 2, "dedup display must not delete source references");

  assert.deepEqual(filterWorldFindingReviewRows([row], {
    recommendation: "מתאים לעץ",
    quality: "high",
    topic: "topic-a",
    source: "channel_updates",
    query: row.sourceId,
  }), [row]);
  assert.deepEqual(filterWorldFindingReviewRows([row], { status: "published" }), []);
});

test("continuation decisions are manager-only filterable annotations and live promotion wins", () => {
  const ready = reviewRow("38ac8d16-9bee-4292-97c6-b02b0eee8cf6");
  const blocked = reviewRow("06c22b3f-9988-460b-9888-516015e20e68");
  const promoted = reviewRow("01ab7adc-92f0-4c76-92fb-3ee43411d32e", {
    promotedNodeId: "4c6bbf1f-3e0c-49df-8798-b9c41caef85c",
  });

  assert.equal(ready.triage.continuationState, "ready");
  assert.equal(ready.triage.proposedTreeTargets.length, 3);
  assert.equal(blocked.triage.continuationState, "blocked_missing_target");
  assert.equal(promoted.triage.continuationState, "already_connected");
  assert.deepEqual(filterWorldFindingReviewRows([blocked, promoted, ready], { continuation: "ready" }), [ready]);
});

test("legacy replay is a separate manager filter and never replaces verification", () => {
  const replayed = reviewRow("10000000-0000-4000-8000-000000000010", {
    verification: "legacy_signal",
    legacyReplay: { state: "deterministic_match", replayComputed: 204, mutatesLiveData: false },
  });
  const missing = reviewRow("10000000-0000-4000-8000-000000000011", {
    verification: "legacy_signal",
    legacyReplay: { state: "missing_replay_envelope", mutatesLiveData: false },
  });
  assert.deepEqual(filterWorldFindingReviewRows([missing, replayed], { replay: "deterministic_match" }), [replayed]);
  assert.equal(replayed.verification, "legacy_signal");
  assert.equal(replayed.legacyReplay.mutatesLiveData, false);
});

test("missing-engine content routing is independently filterable", () => {
  const spatial = reviewRow("10000000-0000-4000-8000-000000000012", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "spatial_or_constants", routingSubtype: "cubes", spatialResearchContext: { state: "partial" }, spatialCalculation: { state: "verified" }, spatialCuratedCoverage: { state: "represented" }, spatialReviewLane: "represented_source", spatialTextOrigin: "ocr_derived", mutatesLiveData: false },
  });
  const constants = reviewRow("10000000-0000-4000-8000-000000000014", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "constants_or_sequences", routingSubtype: "pi", mutatesLiveData: false },
  });
  const textual = reviewRow("10000000-0000-4000-8000-000000000013", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "textual_statement", mutatesLiveData: false },
  });
  const els = reviewRow("10000000-0000-4000-8000-000000000015", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "els_or_cipher", elsResearchContext: { clusterKey: "tashpaz_633" }, mutatesLiveData: false },
  });
  const language = reviewRow("10000000-0000-4000-8000-000000000016", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "language", languageResearchContext: { reviewLane: "duplicate_source_text" }, mutatesLiveData: false },
  });
  const formula = reviewRow("10000000-0000-4000-8000-000000000017", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "formula", formulaCalculation: { state: "verified" }, formulaReviewLane: "expression_review", mutatesLiveData: false },
  });
  const numeric = reviewRow("10000000-0000-4000-8000-000000000018", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "numeric_statement", numericStatementContext: { state: "structured_value_matches_literal" }, numericReviewLane: "structured_value_review", mutatesLiveData: false },
  });
  const textReview = reviewRow("10000000-0000-4000-8000-000000000019", {
    legacyReplay: { state: "missing_engine_assessment", routingQueue: "textual_statement", textualStatementContext: { state: "interpretation_hypothesis" }, textualReviewLane: "interpretation_review", mutatesLiveData: false },
  });
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replayQueue: "spatial_or_constants" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replayQueue: "constants_or_sequences" }), [constants]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySubtype: "cubes" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySubtype: "pi" }), [constants]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialMetadata: "partial" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialCalculation: "verified" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialCoverage: "represented" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialCoverage: "not_represented" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialLane: "represented_source" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialLane: "quantity_review" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial], { replaySpatialTextOrigin: "ocr_derived" }), [spatial]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial, els], { replayElsCluster: "tashpaz_633" }), [els]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, constants, spatial, els], { replayElsCluster: "plumber_skip_6" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, language, spatial], { replayLanguageLane: "duplicate_source_text" }), [language]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, language, spatial], { replayLanguageLane: "derived_relation_review" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, formula, spatial], { replayFormulaCalculation: "verified" }), [formula]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, formula, spatial], { replayFormulaCalculation: "mismatch" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, formula, spatial], { replayFormulaLane: "expression_review" }), [formula]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, numeric, spatial], { replayNumericState: "structured_value_matches_literal" }), [numeric]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, numeric, spatial], { replayNumericState: "numbers_without_structured_value" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, numeric, spatial], { replayNumericLane: "structured_value_review" }), [numeric]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, textReview, spatial], { replayTextualState: "interpretation_hypothesis" }), [textReview]);
  assert.deepEqual(filterWorldFindingReviewRows([textual, textReview, spatial], { replayTextualState: "research_question" }), []);
  assert.deepEqual(filterWorldFindingReviewRows([textual, textReview, spatial], { replayTextualLane: "interpretation_review" }), [textReview]);
});

test("technically-ready source and target axes are independently filterable", () => {
  const exactSingle = reviewRow("10000000-0000-4000-8000-000000000014", {
    legacyReplay: {
      state: "deterministic_match",
      decision: {
        sourceLocatorStateCounts: { channel_uuid_available: 1 },
        sourceRepairOccurrenceCount: 0,
        targetStateCounts: { single_structured_target: 1 },
        targetEvidenceStateCounts: { exact_row_value_match: 1 },
      },
    },
  });
  const repairMultiple = reviewRow("10000000-0000-4000-8000-000000000015", {
    legacyReplay: {
      state: "legacy_matrix_match",
      decision: {
        sourceLocatorStateCounts: { stored_ref_requires_resolution: 1 },
        sourceRepairOccurrenceCount: 1,
        targetStateCounts: { multiple_structured_targets: 1 },
        targetEvidenceStateCounts: { exact_value_among_multiple_numbers: 1 },
      },
    },
  });

  assert.deepEqual(filterWorldFindingReviewRows([repairMultiple, exactSingle], { replaySource: "exact_source" }), [exactSingle]);
  assert.deepEqual(filterWorldFindingReviewRows([repairMultiple, exactSingle], { replaySource: "source_locator_repair" }), [repairMultiple]);
  assert.deepEqual(filterWorldFindingReviewRows([repairMultiple, exactSingle], { replayTarget: "multiple_structured_targets" }), [repairMultiple]);
  assert.deepEqual(filterWorldFindingReviewRows([repairMultiple, exactSingle], { replayTargetEvidence: "exact_value_among_multiple_numbers" }), [repairMultiple]);
});

test("missing-engine target context is filterable without becoming a ready decision", () => {
  const pending = reviewRow("10000000-0000-4000-8000-000000000016", {
    legacyReplay: {
      state: "missing_engine_assessment",
      decision: null,
      pendingEngineContext: {
        targetStateCounts: { single_structured_target: 1 },
        targetEvidenceStateCounts: { exact_row_value_match: 1 },
      },
    },
  });
  const unrelated = reviewRow("10000000-0000-4000-8000-000000000017", {
    legacyReplay: { state: "missing_engine_assessment", decision: null },
  });

  assert.deepEqual(filterWorldFindingReviewRows([unrelated, pending], { pendingEngineTarget: "single_structured_target" }), [pending]);
  assert.deepEqual(filterWorldFindingReviewRows([unrelated, pending], { pendingEngineTargetEvidence: "exact_row_value_match" }), [pending]);
  assert.deepEqual(filterWorldFindingReviewRows([unrelated, pending], { replayTarget: "single_structured_target" }), []);
});

test("canonical contributor scope keeps stable identity and registered aliases without guessing", () => {
  const exact = reviewRow("10000000-0000-4000-8000-000000000001", {
    sourceContributorId: ZVI_ID,
    contributor: "שם מקור אחר",
    contributors: ["שם מקור אחר"],
  });
  const registeredAlias = reviewRow("10000000-0000-4000-8000-000000000002", {
    sourceContributorId: null,
    contributor: "צבי",
    contributors: ["צבי"],
  });
  const unrelated = reviewRow("10000000-0000-4000-8000-000000000003", {
    sourceContributorId: null,
    contributor: "אדם אחר",
    contributors: ["אדם אחר"],
  });

  assert.deepEqual(filterWorldFindingReviewRows([unrelated, registeredAlias, exact], {
    contributorId: ZVI_ID,
    contributorAliases: ["צבי (OPOC)", "צבי"],
  }), [registeredAlias, exact]);
});

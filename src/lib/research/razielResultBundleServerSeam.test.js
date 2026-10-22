import test from "node:test";
import assert from "node:assert/strict";

import { runAiAnalyze, UID, USER_JWT } from "../../../test/helpers/ai-analyze-handler.mjs";
import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";

const CONTRACT = "public-number-research-run-v1";
const PRIVATE = "RAW-PRIVATE-BUNDLE-SENTINEL";
const LEGACY_MEMORY = "LEGACY-PERSISTENT-MEMORY-SENTINEL";

function classifierResult({ action = "research", candidates = [{ type: "number", value: 776, evidence_text: "776", role: "subject" }], status = "resolved", confidence = "high", ambiguous = false } = {}) {
  return {
    text: JSON.stringify({
      version: "raziel-semantic-intent-v1",
      status,
      action,
      confidence,
      ambiguous,
      text_computation_requested: false,
      candidates,
      reason: status === "resolved" ? "numeric research subject" : "ambiguous",
    }),
    usage: { input_tokens: 41, output_tokens: 29 },
    attempts: 1,
    degraded: false,
  };
}

function numberBundle(number, sourceName = "ספר יצירה") {
  const finding = makeUniversalFinding({
    id: `uf:number:${number}`,
    kind: "number-record",
    stage: "evidence",
    subject: { type: "number", key: String(number), label: String(number), value: number, lang: "he" },
    source: {
      engine: "numeric-research",
      adapter: "number-lookup-v1",
      name: sourceName,
      sourceRef: `number-source:${number}`,
      method: "ragil",
      lang: "he",
    },
    identity: { sourceIdentity: `number:${number}`, entityRef: `number:${number}` },
    verification: {
      claimed_expression: String(number),
      claimed_method: "ragil",
      claimed_value: number,
      engine_method_tested: "fn_number_lookup",
      engine_result: { value: number, method: "ragil", raw_private: PRIVATE },
      verification_state: "match",
    },
    evidence: {
      refs: [`evidence:number:${number}`],
      facts: [{ type: "number-lookup", value: number, method: "ragil", raw_payload: PRIVATE }],
    },
    access: { tier: "public" },
    provenance: { createdBy: "ENGINE:numeric-research", inputRef: `number:${number}` },
  });
  return composeResearchResultBundle({
    query: {
      question: `מה זה ${number}?`,
      intent: "research",
      identities: [{ type: "number", value: number, label: String(number), ref: `number:${number}`, access: { tier: "public" } }],
    },
    capabilities: [capabilityResult({
      key: "numeric",
      owner: "research_strategy_layer_law v17",
      findings: [finding],
      sourceRefs: [`number:${number}`],
      versionRefs: ["numericResearch:v1"],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
      cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
    })],
  });
}

function noMatchAnswer() {
  return {
    enabled: true,
    mode: "no_match",
    needs_synthesis: true,
    availability: "no_match",
    capability_class: "general_synthesis",
    minimum_intelligence: "L2_FAST",
  };
}

function numberContextAnswer(number) {
  return {
    enabled: true,
    mode: "research",
    needs_synthesis: true,
    availability: "number_context",
    capability_class: "number_research",
    minimum_intelligence: "L2_FAST",
    number_context: {
      contract: "number_context_v1",
      anchor: "explicit",
      mode: "synthesis",
      number,
      focus: "number_research",
    },
  };
}

function conversation(numbers, requestedAction = numbers.length === 2 ? "research" : "understand") {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: requestedAction,
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: numbers.map((value) => ({ type: "number", value, identity_key: `number:${value}` })),
  };
}

function numberContext(number) {
  return {
    [number]: {
      map: { counts: { post: 1 }, neighbors: { post: [{ label: `Legacy ${number}` }] } },
      dossier: { posts: [`Legacy ${number}`], topics: [], methods: [], definitions: [] },
    },
  };
}

test("2029 guest consumes one authorized canonical Bundle and suppresses duplicate legacy number reads", async () => {
  const visitor = "vfixturevisitor123";
  const run = await runAiAnalyze({
    answer: numberContextAnswer(776),
    allowed: true,
    bearer: "synthetic-anon-key",
    modelResult: {
      text: JSON.stringify({ v: 1, agent: "raziel", answer: "Mock synthesis", facts: [], suggested_paths: [], sources: [{ original_name: "מקור מומצא" }] }),
      usage: { input_tokens: 11, output_tokens: 7 }, attempts: 1, degraded: false,
    },
    body: {
      subject: "מה זה 776?",
      visitor_id: visitor,
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([776]),
    },
    researchBundleByNumber: { 776: numberBundle(776, "Sefer Yetzirah") },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(researchCalls.length, 1);
  assert.equal(researchCalls[0].headers.authorization, "Bearer synthetic-anon-key");
  assert.equal(researchCalls[0].headers.apikey, "synthetic-anon-key");
  assert.equal(researchCalls[0].payload.contract, CONTRACT);
  assert.equal(researchCalls[0].payload.visitor_id, visitor);
  assert.deepEqual(researchCalls[0].payload.requested_capabilities, ["numeric", "numeric_operators"]);
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(run.models.length, 1, "the deterministic Bundle seam adds no model call");
  assert.match(run.models[0].user, /raziel-canonical-result-bundle-input-v1/);
  assert.match(run.models[0].user, /uf:number:776/);
  assert.match(run.models[0].user, /Sefer Yetzirah/);
  assert.doesNotMatch(run.models[0].user, new RegExp(PRIVATE));
  assert.doesNotMatch(run.models[0].user, /trace_ref/);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  assert.deepEqual(run.result.raziel.sources, [{ original_name: "Sefer Yetzirah", source_ref: "number-source:776", lang: "he" }]);
});

test("authenticated and guest 2029 users receive the same evidence quality; only caller authority differs", async () => {
  const bundle = numberBundle(1820, "כתר שם טוב");
  const base = {
    answer: numberContextAnswer(1820),
    allowed: true,
    body: {
      subject: "מה זה 1820?",
      visitor_id: "vqualityparity123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([1820]),
    },
    researchBundleByNumber: { 1820: bundle },
  };
  const guest = await runAiAnalyze({ ...base, bearer: "synthetic-anon-key" });
  const user = await runAiAnalyze({ ...base, bearer: USER_JWT, verifiedUid: UID });

  for (const run of [guest, user]) {
    assert.equal(run.models.length, 1);
    assert.match(run.models[0].user, /uf:number:1820/);
    assert.match(run.models[0].user, /כתר שם טוב/);
    assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  }
  assert.equal(guest.calls.find((call) => call.name === "research-run").headers.authorization, "Bearer synthetic-anon-key");
  assert.equal(user.calls.find((call) => call.name === "research-run").headers.authorization, `Bearer ${USER_JWT}`);
});

test("2029 canonical contract composes without legacy persistent memory read or automatic write", async () => {
  const run = await runAiAnalyze({
    answer: numberContextAnswer(1820),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    legacyContext: { user_context: { summary: LEGACY_MEMORY } },
    body: {
      subject: "מה זה 1820?",
      context: "המשך השיחה הנוכחית בלבד",
      visitor_id: "vprivacygate2029",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([1820]),
    },
    researchBundleByNumber: { 1820: numberBundle(1820) },
  });

  assert.equal(run.calls.filter((call) => call.name === "fn_raziel_context").length, 0);
  assert.equal(run.calls.filter((call) => call.name === "fn_raziel_remember").length, 0);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /המשך השיחה הנוכחית בלבד/);
  assert.doesNotMatch(run.models[0].user, new RegExp(LEGACY_MEMORY));
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 1);
});

test("unresolved 2029 wording uses one bounded semantic attempt, then the same canonical Bundle", async () => {
  const question = "בוא נביט פנימה אל 776 ונראה מה נמצא";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: question,
      visitor_id: "vsemanticfallback2029",
      intelligence_level: "fast",
      research_contract: CONTRACT,
    },
    researchBundleByNumber: { 776: numberBundle(776) },
    modelResults: [
      classifierResult(),
      {
        text: JSON.stringify({ v: 1, agent: "raziel", answer: "ממצאים מאומתים עבור 776", facts: [], suggested_paths: [] }),
        usage: { input_tokens: 18, output_tokens: 9 }, attempts: 1, degraded: false,
      },
    ],
  });

  assert.equal(run.models.length, 2);
  assert.equal(run.models[0].model, "claude-haiku-4-5");
  assert.equal(run.models[0].maxTokens, 240);
  assert.equal(run.models[0].policy.retries, 1);
  assert.match(run.models[0].user, new RegExp(question));
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 1);
  assert.equal(run.calls.find((call) => call.name === "research-run").payload.number, 776);
  assert.match(run.models[1].user, /raziel-canonical-result-bundle-input-v1/);
  assert.equal(run.result.raziel.plan_meta.semantic_intent.status, "admitted");
  const intentSpans = run.spans.filter((span) => span.p_name === "ai-analyze:raziel:semantic-intent");
  assert.equal(intentSpans.length, 1);
  assert.equal(intentSpans[0].p_detail.resources.api_calls, 1);
  assert.equal(intentSpans[0].p_detail.resources.input_tokens, 41);
  assert.equal(intentSpans[0].p_detail.resources.output_tokens, 29);
});

test("an explicit numeric research subject skips classification and reaches the canonical Bundle", async () => {
  const question = "1. תוכל לצלול לתוך 776 ולראות מה מסתתר שם";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: question,
      visitor_id: "vdeterministicintent123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
    },
    researchBundleByNumber: { 776: numberBundle(776) },
  });

  assert.equal(run.models.length, 1, "only the grounded synthesis uses a model");
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 1);
  assert.equal(run.calls.find((call) => call.name === "research-run").payload.number, 776);
  assert.equal(run.spans.filter((span) => span.p_name === "ai-analyze:raziel:semantic-intent").length, 0);
  assert.equal(run.result.raziel.plan_meta.semantic_intent.status, "deterministic_admitted");
  assert.deepEqual(run.result.raziel.plan_meta.semantic_intent.cost, { ai_calls: 0 });
});

test("invalid semantic classifier output fails closed before research or synthesis", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: "בוא נביט פנימה אל 776 ונראה מה נמצא",
      visitor_id: "vinvalidclassifier123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
    },
    modelResults: [{
      text: "{\"version\":\"raziel-semantic-intent-v1\"",
      usage: { input_tokens: 23, output_tokens: 9 },
      attempts: 1,
      degraded: false,
    }],
  });

  assert.equal(run.models.length, 1);
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  assert.equal(run.result.engine, "semantic_classifier");
  assert.equal(run.result.degraded, true);
  assert.match(run.result.raziel.answer, /לא אנסח תשובה בלי נתונים מאומתים/);
  assert.equal(run.spans.some((span) => span.p_name === "ai-analyze:raziel:model"), false);
});

test("semantic ambiguity remains honest: one classifier call, no research or synthesis", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: "בדוק אם 2024 כאן הוא שנה או מספר למחקר",
      visitor_id: "vsemanticclarify2029",
      intelligence_level: "fast",
      research_contract: CONTRACT,
    },
    modelResults: [
      classifierResult({ status: "clarify", confidence: "low", ambiguous: true, candidates: [] }),
    ],
  });

  assert.equal(run.models.length, 1);
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  assert.equal(run.result.plan_meta.semantic_intent.status, "clarify_or_invalid");
  assert.match(run.result.raziel.answer, /שנה, עמוד או כמות/);
  assert.equal(run.result.engine, "semantic_classifier");
});

test("semantic classifier never runs for Legacy or when a client envelope was rejected", async () => {
  const legacy = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    body: { subject: "תוכל לצלול לתוך 776 ולראות מה מסתתר שם", intelligence_level: "fast" },
  });
  assert.equal(legacy.models.length, 1);
  assert.equal(legacy.calls.filter((call) => call.name === "research-run").length, 0);

  const rejectedEnvelope = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    body: {
      subject: "בדוק לי את עמוד 33",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([33], "research"),
    },
  });
  assert.equal(rejectedEnvelope.models.length, 0);
  assert.equal(rejectedEnvelope.calls.filter((call) => call.name === "research-run").length, 0);
  assert.equal(rejectedEnvelope.result.engine, "conversation_resolution_guard");
  assert.match(rejectedEnvelope.result.raziel.answer, /לא אנסח תשובה בלי ראיות/);
});

test("Legacy authenticated request preserves its existing persistent-memory read and write", async () => {
  const run = await runAiAnalyze({
    answer: numberContextAnswer(776),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    legacyContext: { user_context: { summary: LEGACY_MEMORY } },
    body: {
      subject: "מה זה 776?",
      visitor_id: "vlegacymemoryparity",
      intelligence_level: "fast",
      conversation_resolution: conversation([776]),
    },
    numberContextByNumber: numberContext(776),
  });

  assert.equal(run.calls.filter((call) => call.name === "fn_raziel_context").length, 1);
  assert.equal(run.calls.filter((call) => call.name === "fn_raziel_remember").length, 1);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, new RegExp(LEGACY_MEMORY));
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
});

test("two-number 2029 research consumes two bounded Bundles without the legacy pair reads", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "חקור 776 מול 1820",
      visitor_id: "vpairvisitor123",
      intelligence_level: "deep",
      research_contract: CONTRACT,
      conversation_resolution: conversation([776, 1820]),
    },
    researchBundleByNumber: { 776: numberBundle(776), 1820: numberBundle(1820) },
  });

  assert.deepEqual(run.calls.filter((call) => call.name === "research-run").map((call) => call.payload.number).sort((a, b) => a - b), [776, 1820]);
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /uf:number:776/);
  assert.match(run.models[0].user, /uf:number:1820/);
});

test("observed natural number definition is reauthorized server-side and reaches the canonical Bundle", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: "בדוק לי מה זה 776",
      visitor_id: "vdefinitionroute123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([776], "research"),
    },
    researchBundleByNumber: { 776: numberBundle(776) },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(researchCalls.length, 1);
  assert.equal(researchCalls[0].payload.number, 776);
  assert.equal(researchCalls[0].headers.authorization, `Bearer ${USER_JWT}`);
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
});

test("a crafted single-number envelope cannot turn counts, pages or years into research anchors", async () => {
  for (const subject of [
    "בדוק לי מה זה 3 מקורות על 776",
    "בדוק לי את עמוד 33",
    "חקור את שנת 2024",
  ]) {
    const run = await runAiAnalyze({
      answer: noMatchAnswer(),
      allowed: true,
      bearer: USER_JWT,
      verifiedUid: UID,
      body: {
        subject,
        visitor_id: "vrejectnumericprose123",
        intelligence_level: "fast",
        research_contract: CONTRACT,
        conversation_resolution: conversation([776], "research"),
      },
      researchBundleByNumber: { 776: numberBundle(776) },
    });
    assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0, subject);
    assert.equal(run.result.plan_meta?.canonical_result_bundle, undefined, subject);
    assert.equal(run.models.length, 0, subject);
    assert.equal(run.result.engine, "conversation_resolution_guard", subject);
  }
});

test("canonical transport failure is honest and falls back to the existing Phase-H reads", async () => {
  const run = await runAiAnalyze({
    answer: numberContextAnswer(776),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה זה 776?",
      visitor_id: "vfallbackvisitor123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([776]),
    },
    researchRunFailure: "trace_unavailable",
    numberContextByNumber: numberContext(776),
  });

  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 1);
  assert.deepEqual(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.name), ["number_map", "number_dossier_json"]);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "fallback");
  assert.equal(run.models.length, 1);
  assert.doesNotMatch(run.models[0].user, /raziel-canonical-result-bundle-input-v1/);
});

test("Legacy/no-opt-in request never invokes research-run and retains the old projection path", async () => {
  const run = await runAiAnalyze({
    answer: numberContextAnswer(776),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה זה 776?",
      visitor_id: "vlegacyvisitor123",
      intelligence_level: "fast",
      conversation_resolution: conversation([776]),
    },
    researchBundleByNumber: { 776: numberBundle(776) },
    numberContextByNumber: numberContext(776),
  });

  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  assert.deepEqual(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).map((call) => call.name), ["number_map", "number_dossier_json"]);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle, undefined);
});

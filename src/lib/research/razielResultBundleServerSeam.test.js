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
const EXPRESSION_CONTRACT = "public-expression-crossing-run-v1";
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

function expressionCrossingBundle(expression, partner = "שלום") {
  const finding = makeUniversalFinding({
    id: `uf:crossing:${expression}:${partner}`,
    kind: "gematria-crossing",
    subject: { type: "relation", key: `crossing:${expression}:${partner}`, label: `${expression} ↔ ${partner}`, lang: "he" },
    source: {
      engine: "strongest_crossings",
      adapter: "gematria-corpus-crossing-w2-v1",
      name: "מאגר הביטויים",
      sourceRef: "rpc:strongest_crossings",
      method: "strongest_crossings",
      corpus: "gematria_words/bidim",
      lang: "he",
    },
    identity: { sourceIdentity: `crossing:${expression}:${partner}`, relationRef: `crossing:${expression}:${partner}` },
    verification: {
      engine_method_tested: "strongest_crossings",
      engine_result: {
        relation_kind: "multi_method_corpus_convergence",
        method_count: 2,
        methods: [{ method: "אתבש", value: 112 }, { method: "סידורי", value: 52 }],
        dependency_independence_claimed: false,
      },
      verification_state: "not_tested",
    },
    evidence: { refs: ["rpc:strongest_crossings"], facts: [{ type: "gematria-multi-method-corpus-crossing", expression, partner }] },
    access: { tier: "public" },
    provenance: { createdBy: "ENGINE:strongest_crossings", inputRef: "expression:fixture" },
  });
  return composeResearchResultBundle({
    query: {
      question: "חיפוש הצלבות קנוני במאגר הציבורי",
      intent: "gematria_crossing",
      identities: [{ type: "phrase", label: expression, ref: `phrase:${expression}`, access: { tier: "public" } }],
    },
    capabilities: [capabilityResult({
      key: "crossings",
      owner: "research_strategy_layer_law v17",
      findings: [finding],
      sourceRefs: ["rpc:strongest_crossings"],
      versionRefs: ["gematria-corpus-crossing-w2-v1"],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "derivation",
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

function expressionConversation(expression) {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: "connect",
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: [{ type: "phrase", label: expression, identity_key: `phrase:${expression}` }],
  };
}

test("2029 exact expression crossing consumes the same canonical Bundle without a second engine", async () => {
  const expression = "משיח";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: `מצא לי הצלבות למילה ${expression}`,
      visitor_id: "vexpressioncrossing123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: expressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(researchCalls.length, 1);
  assert.equal(researchCalls[0].payload.contract, EXPRESSION_CONTRACT);
  assert.equal(researchCalls[0].payload.expression, expression);
  assert.deepEqual(researchCalls[0].payload.requested_capabilities, ["crossings"]);
  assert.equal(researchCalls[0].payload.surface, "raziel");
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /gematria-crossing/);
  assert.match(run.models[0].user, /משיח ↔ שלום/);
  assert.match(run.models[0].user, /dependency_independence_claimed/);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.contract, EXPRESSION_CONTRACT);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  assert.deepEqual(run.result.raziel.sources, [{ original_name: "מאגר הביטויים", source_ref: "rpc:strongest_crossings", lang: "he" }]);
  assert.equal(JSON.stringify(run.traces).includes(expression), false, "expression must not enter operational trace");
});

test("expression crossing keeps a deterministic evidence fallback when synthesis degrades", async () => {
  const expression = "משיח";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    modelResult: {
      text: "",
      usage: { input_tokens: 7, output_tokens: 0 },
      attempts: 1,
      degraded: true,
      reason: "synthetic_provider_error",
    },
    body: {
      subject: `מצא לי הצלבות למילה ${expression}`,
      visitor_id: "vexpressionfallback123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: expressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
  });

  assert.equal(run.result.degraded, true);
  assert.ok(run.result.raziel, JSON.stringify(run.result));
  assert.match(run.result.raziel.answer, /משיח ↔ שלום/);
  assert.match(run.result.raziel.answer, /אתבש=112/);
  assert.match(run.result.raziel.answer, /עצמאות.*לא נטענה/);
});

test("crafted expression envelope cannot select a phrase absent from the exact question slot", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מצא לי הצלבות למילה משיח",
      visitor_id: "vexpressionguard123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: expressionConversation("שלום"),
    },
  });

  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  assert.equal(run.result.engine, "conversation_resolution_guard");
});

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

test("2029 acknowledgement is a zero-AI conversational turn and Legacy remains unchanged", async () => {
  const canonical = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: "יפה מאוד",
      visitor_id: "vacknowledgement2029",
      intelligence_level: "fast",
      research_contract: CONTRACT,
    },
  });

  assert.equal(canonical.status, 200);
  assert.equal(canonical.result.engine, "deterministic");
  assert.equal(canonical.result.model, "none");
  assert.match(canonical.result.raziel.answer, /אפשר להמשיך מאותה נקודה/);
  assert.deepEqual(canonical.result.plan_meta.conversation_act.cost, { ai_calls: 0, retry_count: 0 });
  assert.equal(canonical.models.length, 0);
  assert.equal(canonical.calls.filter((call) => call.name === "fn_raziel_answer").length, 0);
  assert.equal(canonical.calls.filter((call) => call.name === "research-run").length, 0);

  const legacy = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    body: { subject: "יפה מאוד", intelligence_level: "fast" },
  });
  assert.equal(legacy.models.length, 1, "the 2029 conversation act must not change Legacy behavior");
});

test("natural two-number crossing bypasses semantic classification and consumes both canonical Bundles", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    body: {
      subject: "תעשה לי הצלבה בין 1820 ל-776",
      visitor_id: "vnaturalpair2029",
      intelligence_level: "fast",
      research_contract: CONTRACT,
    },
    researchBundleByNumber: {
      1820: numberBundle(1820, "מקור 1820"),
      776: numberBundle(776, "מקור 776"),
    },
    modelResult: {
      text: JSON.stringify({ v: 1, agent: "raziel", answer: "השוואה המבוססת על שני הצדדים", facts: [], suggested_paths: [] }),
      usage: { input_tokens: 21, output_tokens: 11 }, attempts: 1, degraded: false,
    },
  });

  assert.equal(run.status, 200);
  assert.equal(run.models.length, 1, "only final synthesis runs; no semantic classifier call");
  assert.equal(run.spans.some((span) => span.p_name === "ai-analyze:raziel:semantic-intent"), false);
  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.deepEqual(researchCalls.map((call) => call.payload.number), [1820, 776]);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  assert.deepEqual(run.result.raziel.plan_meta.canonical_result_bundle.numbers, [1820, 776]);
  assert.deepEqual(run.result.raziel.sources.map((source) => source.original_name).sort(), ["מקור 1820", "מקור 776"].sort());
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

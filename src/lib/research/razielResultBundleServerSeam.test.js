import test from "node:test";
import assert from "node:assert/strict";

import { runAiAnalyze, UID, USER_JWT } from "../../../test/helpers/ai-analyze-handler.mjs";
import { buildRazielSessionRequest, prepareRazielSessionSubmission } from "./razielSessionRequest2029.js";
import { createInitialRazielSessionState } from "./razielSession2029.js";
import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";

const CONTRACT = "public-number-research-run-v1";
const EXPRESSION_CONTRACT = "public-expression-crossing-run-v1";
const PRIVATE = "RAW-PRIVATE-BUNDLE-SENTINEL";
const LEGACY_MEMORY = "LEGACY-PERSISTENT-MEMORY-SENTINEL";
const LEGACY_SEARCH_TERM = "LEGACY-PRIVATE-SEARCH-TERM-SENTINEL";

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

function numberPhraseFinding({ id, phrase, value, sourceClaim = false }) {
  return makeUniversalFinding({
    id,
    kind: "gematria",
    stage: "evidence",
    subject: { type: "phrase", key: phrase, label: phrase, value, lang: "he" },
    source: {
      engine: "gematria",
      adapter: "number-phrase-presentation-v1",
      name: "מאגר הגימטריה המאומת",
      sourceRef: `gematria_words:${id}`,
      method: "רגיל",
      lang: "he",
    },
    identity: { sourceIdentity: { wordId: id }, entityRef: `gematria-word:${id}` },
    // Live Number Bundles carry phrases at a value as sourced claims (lane "source_claim"), not as engine-matched findings.
    verification: sourceClaim
      ? { engine_method_tested: "רגיל", claimed_expression: phrase, engine_result: value, verification_state: "not_tested" }
      : { engine_method_tested: "רגיל", engine_result: value, verification_state: "match" },
    evidence: {
      refs: [`gematria_words:${id}`],
      facts: [{ type: "published-gematria-phrase", phrase, method: "רגיל", value, status: "verified_published" }],
    },
    access: { tier: "public" },
    provenance: { createdBy: "SOURCE:gematria_words", inputRef: `number:${value}` },
  });
}

function numberBundle(number, sourceName = "ספר יצירה", { phraseFindings = [], ranking = [] } = {}) {
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
  const findings = [finding, ...phraseFindings];
  if (number === 271) {
    findings.push(makeUniversalFinding({
      id: "uf:number:271:pregnancy",
      kind: "gematria",
      subject: { type: "phrase", key: "הריון", label: "הריון", value: 271, lang: "he" },
      source: { engine: "gematria", adapter: "number-lookup-v1", name: "מנוע הגימטריה", sourceRef: "bidim:pregnancy", method: "רגיל", lang: "he" },
      identity: { sourceIdentity: { bidId: "pregnancy" } },
      verification: { engine_method_tested: "רגיל", engine_result: 271, verification_state: "not_tested" },
      evidence: { refs: ["bidim:pregnancy"], facts: [{ type: "gematria-lookup-row", phrase: "הריון", method: "רגיל", value: 271 }] },
      access: { tier: "public" },
      provenance: { createdBy: "ENGINE:gematria", inputRef: "number:271" },
    }));
  }
  return composeResearchResultBundle({
    query: {
      question: `מה זה ${number}?`,
      intent: "research",
      identities: [{ type: "number", value: number, label: String(number), ref: `number:${number}`, access: { tier: "public" } }],
    },
    capabilities: [capabilityResult({
      key: "numeric",
      owner: "research_strategy_layer_law v17",
      findings,
      sourceRefs: [`number:${number}`],
      versionRefs: ["numericResearch:v1"],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
      cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
    })],
    ranking,
  });
}

function terminalNumberBundle(number, status) {
  return composeResearchResultBundle({
    query: {
      question: `מה זה ${number}?`,
      intent: "research",
      identities: [{ type: "number", value: number, label: String(number), ref: `number:${number}` }],
    },
    capabilities: [capabilityResult({
      key: "numeric",
      owner: "research_strategy_layer_law v17",
      status,
      reason: status === CAPABILITY_STATUS.ENTITLEMENT_GATED ? "synthetic gate" : "synthetic failure",
      findings: [],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
    })],
  });
}

function expressionCrossingBundle(expression, partner = "שלום", { richProfile = false } = {}) {
  const regularValue = expression === "צוריאל" || expression === "שאול" ? 337 : expression === "חכמה" ? 73 : 358;
  const calculation = makeUniversalFinding({
    id: `uf:gematria:${expression}:ragil`,
    kind: "gematria-method-value",
    subject: { type: "phrase", key: expression, label: expression, value: regularValue, lang: "he" },
    source: {
      engine: "gematria",
      adapter: "gematria-api-v1",
      sourceRef: null,
      method: "ragil",
      lang: "he",
    },
    identity: { sourceIdentity: { methodKey: "ragil", normalizedSubject: expression, value: regularValue } },
    verification: {
      engine_method_tested: "ragil",
      engine_result: regularValue,
      verification_state: "not_tested",
    },
    evidence: { refs: [], facts: [{
      type: "gematria-method-profile-value",
      method: "ragil",
      label: "רגיל",
      value: regularValue,
      category: "יסוד",
      mathematical_family: "regular",
      atomic_or_composite: "atomic",
      method_version: 6,
    }] },
    access: { tier: "public" },
    provenance: { createdBy: "ENGINE:gematria", inputRef: "expression:fixture" },
  });
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
  const calculations = [calculation];
  const crossingFindings = [finding];
  if (expression === "שאול") {
    // richProfile = the layers named in the acceptance example. Every value below is the canonical engine's value for שאול
    // (computed with src/lib/gematria.js when this fixture was written); גדול carries the registry's conditional-equivalence rule.
    for (const [key, label, value, family, extraFact] of [
      ["מסתתר", "מסתתר", 328, "adjacent_difference"],
      ["מסתתר גדול", "מסתתר גדול", 328, "adjacent_difference"],
      ...(richProfile ? [
        ["מילוי", "מילוי", 567, "base_additive"],
        ["אתבש", "אתבש", 502, "base_additive_substitution"],
        ["אלבם", "אלבם", 121, "base_additive"],
        ["סידורי", "סידורי", 40, "base_additive"],
        ["גדול", "גדול", 337, "base_additive", { dependency_version: 1, dependency_rules: [{ type: "conditional_equivalence", to: "רגיל", condition: "no_final_letters" }] }],
      ] : []),
    ]) {
      calculations.push(makeUniversalFinding({
        id: `uf:gematria:${expression}:${key}`,
        kind: "gematria-method-value",
        subject: { type: "phrase", key: expression, label: expression, value, lang: "he" },
        source: { engine: "gematria", adapter: "gematria-method-profile-w2-v1", sourceRef: null, method: key, lang: "he" },
        identity: { sourceIdentity: { methodKey: key, normalizedSubject: expression, value } },
        verification: { engine_method_tested: key, engine_result: value, verification_state: "not_tested" },
        evidence: { refs: [], facts: [{
          type: "gematria-method-profile-value", method: key, label, value,
          category: "יסוד", mathematical_family: family, atomic_or_composite: "atomic", method_version: 1,
          ...(extraFact || {}),
        }] },
        access: { tier: "public" },
        provenance: { createdBy: "ENGINE:gematria", inputRef: "expression:fixture" },
      }));
    }
  }
  if (expression === "חכמה") {
    for (const [key, label, value, family] of [
      ["מסתתר", "מסתתר", 67, "adjacent_difference"],
      ["קדמי", "משולש", 271, "base_additive"],
    ]) {
      calculations.push(makeUniversalFinding({
        id: `uf:gematria:${expression}:${key}`,
        kind: "gematria-method-value",
        subject: { type: "phrase", key: expression, label: expression, value, lang: "he" },
        source: { engine: "gematria", adapter: "gematria-method-profile-w2-v1", sourceRef: null, method: key, lang: "he" },
        identity: { sourceIdentity: { methodKey: key, normalizedSubject: expression, value } },
        verification: { engine_method_tested: key, engine_result: value, verification_state: "not_tested" },
        evidence: { refs: [], facts: [{
          type: "gematria-method-profile-value", method: key, label, value,
          category: "יסוד", mathematical_family: family, atomic_or_composite: "atomic", method_version: 1,
        }] },
        access: { tier: "public" },
        provenance: { createdBy: "ENGINE:gematria", inputRef: "expression:fixture" },
      }));
    }
    const relationId = "uf:relation:wisdom-understanding";
    crossingFindings.unshift(makeUniversalFinding({
      id: relationId,
      kind: "gematria-confirmed-relation",
      stage: "evidence",
      status: "confirmed",
      subject: { type: "relation", key: relationId, label: "חכמה (מסתתר) ↔ בינה (רגיל)", value: 67, lang: "he" },
      source: { engine: "relation_evidence", adapter: "gematria-corpus-crossing-w2-v2", name: "ממצאי המחקר המאושרים של SOD1820", sourceRef: "public:relation_evidence:wisdom", method: "מסתתר", lang: "he" },
      identity: { sourceIdentity: relationId, relationRef: relationId },
      verification: {
        engine_method_tested: "מסתתר↔רגיל",
        engine_result: { relation_kind: "confirmed_cross_method_relation", expression: "חכמה", partner: "בינה", value: 67, expression_method: "מסתתר", partner_method: "רגיל", engine_verified: true },
        verification_state: "match",
      },
      evidence: { refs: ["public:relation_evidence:wisdom"], facts: [{ type: "gematria-confirmed-cross-method-relation", expression: "חכמה", partner: "בינה", value: 67 }] },
      access: { tier: "public" },
      provenance: { createdBy: "SOURCE:relation_evidence", inputRef: "expression:fixture" },
    }));
    crossingFindings.splice(1, 0, makeUniversalFinding({
      id: "uf:semantic:wisdom-hidden",
      kind: "gematria-method-semantic",
      stage: "interpretation",
      status: "approved",
      subject: { type: "relation", key: "semantic:hidden", label: "מסתתר — נסתר", lang: "he" },
      source: { engine: "method_semantics", adapter: "gematria-corpus-crossing-w2-v2", name: "מודל המשמעות המאושר של SOD1820", sourceRef: "public:method_semantics:hidden", method: "מסתתר", lang: "he" },
      identity: { sourceIdentity: "semantic:hidden", relationRef: relationId },
      verification: { verification_state: "not_tested" },
      evidence: { refs: ["public:method_semantics:hidden"], facts: [{ type: "gematria-method-semantic-interpretation", method: "מסתתר", semantic_description: "הרובד הנסתר של הביטוי" }] },
      access: { tier: "public" },
      provenance: { createdBy: "SOURCE:method_semantics", inputRef: "expression:fixture", parentFindingIds: [relationId] },
    }));
  }
  return composeResearchResultBundle({
    query: {
      question: "חיפוש הצלבות קנוני במאגר הציבורי",
      intent: "gematria_crossing",
      identities: [{ type: "phrase", label: expression, ref: `phrase:${expression}`, access: { tier: "public" } }],
    },
    capabilities: [
      capabilityResult({
        key: "gematria",
        owner: "research_strategy_layer_law v17",
        findings: calculations,
        sourceRefs: [],
        versionRefs: ["gematria-api-v1"],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: "evidence",
        cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
      }),
      capabilityResult({
        key: "crossings",
        owner: "research_strategy_layer_law v17",
        findings: crossingFindings,
        sourceRefs: ["rpc:strongest_crossings"],
        versionRefs: ["gematria-corpus-crossing-w2-v1"],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: "derivation",
        cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0 },
      }),
    ],
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

function focusedExpressionConversation(expression, requestedAction = "research") {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: requestedAction,
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: [{ type: "phrase", label: expression, identity_key: `phrase:${expression}` }],
  };
}

function expressionPairConversation(left, right) {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: "connect",
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: [left, right].map((label) => ({ type: "phrase", label, identity_key: `phrase:${label}` })),
  };
}

function calculatorSurfaceConversation(expression) {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: "understand",
    referential_follow_up: true,
    referent_source: "surface_subject",
    identities: [{ type: "phrase", label: expression, identity_key: `phrase:${expression}` }],
  };
}

function calculatorSurface(expression, method = "משולש מילה + משולש הפוך", result = 365) {
  return {
    surface: "gematria",
    subject: { type: "number", id: String(result), label: expression },
    number: { expression, method, result },
  };
}

test("2029 expression crossing joins its canonical regular-value neighborhood without a second engine", async () => {
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
    researchBundleByNumber: { 358: numberBundle(358, "מאגר הגימטריה המאומת") },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  const expressionCall = researchCalls.find((call) => call.payload.contract === EXPRESSION_CONTRACT);
  const numberCall = researchCalls.find((call) => call.payload.contract === CONTRACT);
  assert.equal(researchCalls.length, 2);
  assert.equal(expressionCall.payload.expression, expression);
  assert.deepEqual(expressionCall.payload.requested_capabilities, ["gematria", "crossings"]);
  assert.equal(expressionCall.payload.surface, "raziel");
  assert.equal(numberCall.payload.number, 358);
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /gematria-crossing/);
  assert.match(run.models[0].user, /משיח ↔ שלום/);
  assert.match(run.models[0].user, /dependency_independence_claimed/);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.contract, EXPRESSION_CONTRACT);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  assert.ok(run.result.raziel.sources.some((source) => source.original_name === "מאגר הביטויים"));
  assert.equal(JSON.stringify(run.traces).includes(expression), false, "expression must not enter operational trace");
});

test("Shaul method-and-crossing command never sends its command scaffolding to the engine", async () => {
  const expression = "שאול";
  const subject = "חשב את שאול בשיטת מסתתר ומצא הצלבות";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject,
      visitor_id: "vshaulexpressionmethod123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: expressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  const expressionCalls = researchCalls.filter((call) => call.payload.contract === EXPRESSION_CONTRACT);
  const numberCalls = researchCalls.filter((call) => call.payload.contract === CONTRACT);
  assert.equal(expressionCalls.length, 1);
  assert.equal(expressionCalls[0].payload.expression, expression);
  assert.equal(numberCalls.length, 1, "the verified method value opens the existing Number Bundle once");
  assert.equal(numberCalls[0].payload.number, 328);
  assert.doesNotMatch(JSON.stringify(researchCalls), /"expression":"שאול בשיטת מסתתר/u);
  assert.equal(run.models.length, 0);
  assert.equal(run.result.model, "none");
  assert.match(run.result.raziel.answer, /שאול בשיטת מסתתר = 328/);
  assert.doesNotMatch(run.result.raziel.answer, /1868/);
});

test("plain Shaul Gematria wording researches Shaul rather than the words of the command", async () => {
  const expression = "שאול";
  const neighborhood = numberBundle(337, "מאגר הגימטריה המאומת", {
    phraseFindings: [
      numberPhraseFinding({ id: "uf:337:rise-fall", phrase: "עולה ויורד", value: 337 }),
      numberPhraseFinding({ id: "uf:337:king-hint", phrase: "מלך רמז", value: 337 }),
      numberPhraseFinding({ id: "uf:337:study-hint", phrase: "לימוד רמז", value: 337 }),
      numberPhraseFinding({ id: "uf:337:agag", phrase: "אגג מלך עמלק", value: 337 }),
    ],
  });
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "חשב את שאול בגימטריה",
      visitor_id: "vshaulplaingematria123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: focusedExpressionConversation(expression, "research"),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
    researchBundleByNumber: { 337: neighborhood },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  const expressionCalls = researchCalls.filter((call) => call.payload.contract === EXPRESSION_CONTRACT);
  const numberCalls = researchCalls.filter((call) => call.payload.contract === CONTRACT);
  assert.equal(expressionCalls.length, 1);
  assert.equal(expressionCalls[0].payload.expression, expression);
  assert.equal(numberCalls.length, 1, "a broad expression opens its canonical regular-value neighborhood once");
  assert.equal(numberCalls[0].payload.number, 337);
  assert.ok(run.models.length <= 1);
  const supplied = run.models[0]?.user || run.result.raziel?.answer || "";
  assert.match(supplied, /שאול/);
  assert.match(supplied, /337/);
  assert.match(supplied, /עולה ויורד/);
  assert.match(supplied, /אגג מלך עמלק/);
});

test("landscape and exploratory modes receive the verified Shaul Bundle instead of no-bundle fallback", async () => {
  for (const viewMode of ["landscape", "exploratory"]) {
    const run = await runAiAnalyze({
      answer: noMatchAnswer(),
      allowed: true,
      bearer: "synthetic-anon-key",
      body: {
        subject: "חשב את שאול בגימטריה",
        visitor_id: `vshaulviewmode${viewMode}123`,
        intelligence_level: "fast",
        research_contract: CONTRACT,
        view_mode: viewMode,
        conversation_resolution: focusedExpressionConversation("שאול", "research"),
      },
      researchBundleByExpression: { שאול: expressionCrossingBundle("שאול") },
    });

    const expressionCalls = run.calls.filter((call) => (
      call.name === "research-run" && call.payload.contract === EXPRESSION_CONTRACT
    ));
    assert.equal(expressionCalls.length, 1, viewMode);
    assert.equal(expressionCalls[0].payload.expression, "שאול", viewMode);
    assert.equal(run.models.length, 1, viewMode);
    assert.match(run.models[0].user, /שאול/, viewMode);
    assert.match(run.models[0].user, /337/, viewMode);
    assert.equal(run.result.raziel.plan_meta.view_mode.applied, true, viewMode);
    assert.doesNotMatch(run.result.raziel.answer, /אין כרגע חבילה|לא הופעל/u, viewMode);
  }
});

test("expression continuation reuses צוריאל through the real client and server gates", async () => {
  const state = {
    ...createInitialRazielSessionState(),
    thread: [{
      role: "user",
      text: "חשב את צוריאל ומצא הצלבות",
      identity_resolution: {
        identities: [{ type: "phrase", label: "צוריאל", identity_key: "phrase:צוריאל" }],
        explicit_text_computation: false,
      },
    }, { role: "raziel", text: "צוריאל = 337" }],
  };

  for (const question of ["תחשב את זה בכל השיטות ומצא הצלבות", "תחשב במצב רגיל"]) {
    const request = buildRazielSessionRequest({ question, state, contextSnapshot: null, viewMode: "exploratory" });
    assert.equal(request.conversationResolution?.referential_follow_up, true, question);
    assert.equal(request.conversationResolution?.identities?.[0]?.label, "צוריאל", question);

    const run = await runAiAnalyze({
      answer: noMatchAnswer(),
      allowed: true,
      bearer: "synthetic-anon-key",
      body: {
        subject: request.subject,
        visitor_id: "vexpressioncontinuation123",
        intelligence_level: request.intelligenceLevel,
        research_contract: request.researchContract,
        conversation_resolution: request.conversationResolution,
        view_mode: request.viewMode,
      },
      researchBundleByExpression: { צוריאל: expressionCrossingBundle("צוריאל") },
      researchBundleByNumber: { 337: numberBundle(337, "מאגר הגימטריה המאומת") },
    });
    const researchCalls = run.calls.filter((call) => call.name === "research-run");
    assert.equal(researchCalls.length, 2, `${question}: ${JSON.stringify({ result: run.result, calls: run.calls })}`);
    assert.equal(researchCalls.find((call) => call.payload.contract === EXPRESSION_CONTRACT).payload.expression, "צוריאל", question);
    assert.equal(researchCalls.find((call) => call.payload.contract === CONTRACT).payload.number, 337, question);
    assert.match(run.models[0].user, /צוריאל/, question);
    assert.match(run.models[0].user, /337/, question);
  }
});

test("the user's plural Shaul request and bare all-methods follow-up both reach the canonical Bundle", async () => {
  const firstState = createInitialRazielSessionState();
  const firstQuestion = 'תן לי את הגימטריות על השם "שאול"';
  const firstRequest = buildRazielSessionRequest({
    question: firstQuestion,
    state: firstState,
    contextSnapshot: null,
    viewMode: "exploratory",
  });
  assert.equal(firstRequest.conversationResolution?.identities?.[0]?.label, "שאול");

  const firstRun = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: firstRequest.subject,
      visitor_id: "vshaulpluralprofile123",
      intelligence_level: firstRequest.intelligenceLevel,
      research_contract: firstRequest.researchContract,
      conversation_resolution: firstRequest.conversationResolution,
      view_mode: firstRequest.viewMode,
    },
    researchBundleByExpression: { שאול: expressionCrossingBundle("שאול") },
    researchBundleByNumber: { 337: numberBundle(337, "מאגר הגימטריה המאומת") },
  });
  assert.equal(firstRun.result.raziel.plan_meta.view_mode.applied, true);
  // expression + its regular-value neighbourhood + the one method-layer value (מסתתר=328) the interpretive mode adds; the layer read is fail-open
  assert.equal(firstRun.calls.filter((call) => call.name === "research-run").length, 3);

  const followState = {
    ...createInitialRazielSessionState(),
    thread: [{
      role: "user",
      text: firstQuestion,
      identity_resolution: {
        identities: [{ type: "phrase", label: "שאול", identity_key: "phrase:שאול" }],
        explicit_text_computation: true,
      },
    }, { role: "raziel", text: "שאול = 337" }],
  };
  const followRequest = buildRazielSessionRequest({
    question: "בכל השיטות",
    state: followState,
    contextSnapshot: null,
    viewMode: "exploratory",
  });
  assert.equal(followRequest.conversationResolution?.referential_follow_up, true);
  assert.equal(followRequest.conversationResolution?.identities?.[0]?.label, "שאול");

  const followRun = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: followRequest.subject,
      visitor_id: "vshaulbarecontinuation123",
      intelligence_level: followRequest.intelligenceLevel,
      research_contract: followRequest.researchContract,
      conversation_resolution: followRequest.conversationResolution,
      view_mode: followRequest.viewMode,
    },
    researchBundleByExpression: { שאול: expressionCrossingBundle("שאול") },
    researchBundleByNumber: { 337: numberBundle(337, "מאגר הגימטריה המאומת") },
  });
  assert.equal(followRun.result.raziel.plan_meta.view_mode.applied, true);
  assert.equal(followRun.calls.filter((call) => call.name === "research-run").length, 3, "plus the fail-open method-layer read of the interpretive mode");
});

test("combined Gematria and crossing wording resolves any explicit Hebrew expression", async () => {
  const expression = "צוריאל";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה זה צוריאל בגימטריה ומה ההצלבות שיש",
      visitor_id: "vcombinedexpression123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: expressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
    researchBundleByNumber: { 337: numberBundle(337, "מאגר הגימטריה המאומת") },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(researchCalls.length, 2);
  const expressionCall = researchCalls.find((call) => call.payload.contract === EXPRESSION_CONTRACT);
  assert.equal(expressionCall.payload.expression, expression);
  assert.deepEqual(expressionCall.payload.requested_capabilities, ["gematria", "crossings"]);
  assert.equal(researchCalls.find((call) => call.payload.contract === CONTRACT).payload.number, 337);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /צוריאל/);
  assert.match(run.models[0].user, /337/);
  assert.match(run.models[0].user, /צוריאל ↔ שלום/);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
});

test("calculator current-surface question researches the whole expression through one canonical Bundle", async () => {
  const expression = "חכמה";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה אני רואה כאן?",
      visitor_id: "vcalculatorsurface123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: calculatorSurfaceConversation(expression),
      surface_semantic: calculatorSurface(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
    researchBundleByNumber: { 73: numberBundle(73, "מאגר הגימטריה המאומת") },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(researchCalls.length, 2);
  assert.equal(researchCalls.find((call) => call.payload.contract === EXPRESSION_CONTRACT).payload.expression, expression);
  assert.equal(researchCalls.find((call) => call.payload.contract === CONTRACT).payload.number, 73);
  assert.equal(researchCalls[0].payload.expression, expression);
  assert.deepEqual(researchCalls[0].payload.requested_capabilities, ["gematria", "crossings"]);
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /אל תצמצם את הניתוח לאריח הפעיל בלבד/);
  assert.match(run.models[0].user, /calculation_profile/);
  assert.match(run.models[0].user, /תפקיד רוחני, ביוגרפי, היסטורי או תיאולוגי/);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.subject_type, "expression");
});

test("calculator surface expression is re-authorized against the visible method result", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה אני רואה כאן?",
      visitor_id: "vcalculatorsurfaceguard123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: calculatorSurfaceConversation("צוריאל"),
      surface_semantic: calculatorSurface("חכמה"),
    },
  });

  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0);
  assert.equal(run.result.engine, "conversation_resolution_guard");
});

test("focused hidden method returns canonical 67↔67 relation with zero model calls even at AI quota", async () => {
  const expression = "חכמה";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: false,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה יש לך על המסתתר של חכמה",
      visitor_id: "vhiddenwisdom123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: focusedExpressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
    researchBundleByNumber: { 67: numberBundle(67) },
  });

  assert.equal(run.models.length, 0);
  assert.equal(run.result.engine, "deterministic");
  assert.equal(run.result.model, "none");
  assert.match(run.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(run.result.raziel.answer, /בינה בשיטת רגיל = 67/);
  assert.doesNotMatch(run.result.raziel.answer, /מסתתר = 73/);
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 2);
});

test("natural method wording reaches the same canonical 67↔67 answer without a classifier or model", async () => {
  const expression = "חכמה";
  const question = "מה אומר המסתתר של חכמה?";
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: false,
    bearer: "synthetic-anon-key",
    body: {
      subject: question,
      visitor_id: "vnaturalhiddenwisdom123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: focusedExpressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
    researchBundleByNumber: { 67: numberBundle(67) },
  });

  assert.equal(run.models.length, 0);
  assert.equal(run.spans.some((span) => span.p_name === "ai-analyze:raziel:semantic-intent"), false);
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 2);
  assert.match(run.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(run.result.raziel.answer, /בינה בשיטת רגיל = 67/);
});

test("method value follows the Number-page Human-Gate hierarchy before composing Raziel crossings", async () => {
  const expression = "חכמה";
  const first = numberPhraseFinding({ id: "uf:number:67:first", phrase: "בינה", value: 67 });
  const second = numberPhraseFinding({ id: "uf:number:67:second", phrase: "מילה משנית", value: 67 });
  const number67 = numberBundle(67, "ספר יצירה", {
    phraseFindings: [second, first],
    ranking: [
      {
        finding_id: first.id,
        rank: 1,
        axes: { authority: "public.gematria_words.lead_rank", lead_rank: 1, presentation_scope: "regular-number-phrase" },
        reasons: ["Human-Gate lead rank"],
      },
      {
        finding_id: second.id,
        rank: 2,
        axes: { authority: "public.gematria_words.lead_rank", lead_rank: 2, presentation_scope: "regular-number-phrase" },
        reasons: ["Human-Gate lead rank"],
      },
    ],
  });
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: false,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה אומר המסתתר של חכמה?",
      visitor_id: "vleadorderwisdom67",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: focusedExpressionConversation(expression),
    },
    researchBundleByExpression: { [expression]: expressionCrossingBundle(expression) },
    researchBundleByNumber: { 67: number67 },
  });

  assert.equal(run.models.length, 0);
  assert.match(run.result.raziel.answer, /בינה בשיטת רגיל = 67/);
  assert.match(run.result.raziel.answer, /מילה משנית בשיטת רגיל = 67/);
  assert.ok(
    run.result.raziel.answer.indexOf("בינה בשיטת רגיל = 67")
      < run.result.raziel.answer.indexOf("מילה משנית בשיטת רגיל = 67"),
    "Raziel must preserve the Number-page Human-Gate order after opening the method value",
  );
});

test("exact expression pair returns the confirmed relation without model synthesis", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: false,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה הקשר בין חכמה לבינה?",
      visitor_id: "vwisdombinapair123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: expressionPairConversation("חכמה", "בינה"),
    },
    researchBundleByExpression: { חכמה: expressionCrossingBundle("חכמה") },
  });

  assert.equal(run.models.length, 0);
  assert.equal(run.result.engine, "deterministic");
  assert.match(run.result.raziel.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(run.result.raziel.answer, /בינה בשיטת רגיל = 67/);
  assert.equal(run.calls.filter((call) => call.name === "research-run").length, 1);
});

test("271 triangle question keeps חכמה as subject and opens 271 only for canonical crossings", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: false,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה אתה אומר על 271 המשולש של חכמה",
      visitor_id: "vwisdomtriangle271",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: focusedExpressionConversation("חכמה"),
    },
    researchBundleByExpression: { חכמה: expressionCrossingBundle("חכמה") },
    researchBundleByNumber: { 271: numberBundle(271) },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(run.models.length, 0);
  assert.equal(run.result.engine, "deterministic");
  assert.equal(researchCalls.length, 2);
  assert.equal(researchCalls[0].payload.expression, "חכמה");
  assert.equal(researchCalls[1].payload.number, 271);
  assert.match(run.result.raziel.answer, /חכמה בשיטת משולש = 271/);
  assert.match(run.result.raziel.answer, /הריון בשיטת רגיל = 271/);
  assert.deepEqual(run.result.raziel.facts, [
    { label: "חכמה · משולש", value: "271" },
    { label: "הריון · רגיל", value: "271" },
  ]);
});

test("missing name and open capability question are deterministic and spend no AI calls", async () => {
  for (const [subject, answerPattern, kind] of [
    ["תחשב לי את השם שלי", /מה השם המדויק/, "missing_name_expression"],
    ["מה אתה יכול ללמד אותי", /מספר; מילה או ראשי תיבות; שם; מקום; מושג; ביטוי/, "research_menu"],
  ]) {
    const run = await runAiAnalyze({
      answer: noMatchAnswer(),
      allowed: true,
      bearer: "synthetic-anon-key",
      body: {
        subject,
        visitor_id: "vdeterministicguidance123",
        intelligence_level: "fast",
        research_contract: CONTRACT,
      },
    });
    assert.match(run.result.raziel.answer, answerPattern, subject);
    assert.equal(run.result.model, "none", subject);
    assert.equal(run.models.length, 0, subject);
    assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0, subject);
    assert.equal(run.result.plan_meta.deterministic_guidance.kind, kind, subject);
    assert.deepEqual(run.result.plan_meta.deterministic_guidance.cost, { ai_calls: 0, retry_count: 0 }, subject);
  }
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
  assert.match(run.models[0].user, /raziel-grounded-source-composer-v13/);
  assert.match(run.models[0].user, /אל תמציא לו שם חלופי/);
  assert.match(run.models[0].user, /לא סופק מדד נדירות מפורש/);
  assert.match(run.models[0].user, /verified_calculations/);
  assert.match(run.models[0].user, /uf:number:776/);
  assert.match(run.models[0].user, /Sefer Yetzirah/);
  assert.doesNotMatch(run.models[0].user, new RegExp(PRIVATE));
  assert.doesNotMatch(run.models[0].user, /trace_ref/);
  assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  assert.deepEqual(run.result.raziel.sources, [{ original_name: "Sefer Yetzirah", source_ref: "number-source:776", lang: "he" }]);
  assert.deepEqual(run.result.raziel.navigation, [{ kind: "number", label: "פתח את דף המספר 776", href: "/2029/number/776" }]);
});

test("776 keeps verified symbolic phrases factual and preserves the Number-page order through model fallback", async () => {
  const midpoint = numberPhraseFinding({ id: "uf:number:776:midpoint", phrase: "נקודה אמצעית", value: 776 });
  const wholeness = numberPhraseFinding({ id: "uf:number:776:wholeness", phrase: "שלמות", value: 776 });
  const debt = numberPhraseFinding({ id: "uf:number:776:debt", phrase: "פריעת חוב", value: 776 });
  const ordered = [midpoint, wholeness, debt];
  const run = await runAiAnalyze({
    answer: numberContextAnswer(776),
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
      subject: "מה זה 776?",
      visitor_id: "v776verifiedphrases123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([776]),
    },
    researchBundleByNumber: {
      776: numberBundle(776, "מאגר הגימטריה המאומת", {
        phraseFindings: [debt, midpoint, wholeness],
        ranking: ordered.map((finding, index) => ({
          finding_id: finding.id,
          rank: [8, 9, 11][index],
          axes: {
            authority: "public.gematria_words.lead_rank",
            lead_rank: [8, 9, 11][index],
            presentation_scope: "equal_regular_phrase_prominence",
          },
          reasons: ["סדר ביטויים ידני קיים בדף המספר"],
        })),
      }),
    },
  });

  assert.equal(run.result.degraded, true);
  assert.match(run.models[0].user, /אל תוריד ביטוי מאומת לדרגת פרשנות/);
  for (const phrase of ordered.map((finding) => finding.subject.label)) {
    assert.match(run.models[0].user, new RegExp(`${phrase}[^]*776`));
    assert.match(run.result.raziel.answer, new RegExp(`חישוב מאומת: ${phrase}[^]*776`));
  }
  const positions = ordered.map((finding) => run.result.raziel.answer.indexOf(finding.subject.label));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("number-page current-surface question consumes the visible canonical Number Bundle", async () => {
  const run = await runAiAnalyze({
    answer: noMatchAnswer(),
    allowed: true,
    bearer: "synthetic-anon-key",
    body: {
      subject: "מה אני רואה כאן?",
      visitor_id: "vnumbersurface123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: {
        ...conversation([776], "understand"),
        referential_follow_up: true,
        referent_source: "surface_subject",
      },
      surface_semantic: { surface: "number", subject: { type: "number", id: "776", label: "776" } },
    },
    researchBundleByNumber: { 776: numberBundle(776, "ספר יצירה") },
  });

  const researchCalls = run.calls.filter((call) => call.name === "research-run");
  assert.equal(researchCalls.length, 1);
  assert.equal(researchCalls[0].payload.number, 776);
  assert.equal(run.calls.filter((call) => ["number_map", "number_dossier_json"].includes(call.name)).length, 0);
  assert.match(run.models[0].user, /בניתוח מספר יחיד/);
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

test("canonical opt-in strips model-authored provenance and navigation even when the Bundle has no named source", async () => {
  const run = await runAiAnalyze({
    answer: numberContextAnswer(776),
    allowed: true,
    bearer: "synthetic-anon-key",
    modelResult: {
      text: JSON.stringify({
        v: 1,
        agent: "raziel",
        answer: "תשובה מן הממצא הקנוני",
        facts: [],
        suggested_paths: [],
        sources: [{ original_name: "מקור שהמודל המציא", source_ref: "private:guess" }],
        navigation: [{ kind: "post", label: "יעד שהמודל המציא", href: "https://example.invalid" }],
      }),
      usage: { input_tokens: 11, output_tokens: 7 },
      attempts: 1,
      degraded: false,
    },
    body: {
      subject: "מה זה 776?",
      visitor_id: "vgroundedprovenance123",
      intelligence_level: "fast",
      research_contract: CONTRACT,
      conversation_resolution: conversation([776]),
    },
    researchBundleByNumber: { 776: numberBundle(776, "") },
  });

  assert.deepEqual(run.result.raziel.sources, []);
  assert.deepEqual(run.result.raziel.navigation, [
    { kind: "number", label: "פתח את דף המספר 776", href: "/2029/number/776" },
  ]);
  assert.doesNotMatch(JSON.stringify(run.result), /example\.invalid|מקור שהמודל המציא|private:guess/);
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
  assert.match(run.models[0].user, /התאמה באותה שיטה/);
  assert.match(run.models[0].user, /מותר להציע מטפורה מסומנת ומוסברת/);
  assert.equal(run.models.length, 1, "wording integrity must not add a second model call");
});

test("2029 canonical contract composes without legacy persistent memory read or automatic write", async () => {
  const run = await runAiAnalyze({
    answer: numberContextAnswer(1820),
    allowed: true,
    bearer: USER_JWT,
    verifiedUid: UID,
    legacyContext: { user_context: { summary: LEGACY_MEMORY, research_threads: [LEGACY_SEARCH_TERM] } },
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
  assert.doesNotMatch(run.models[0].user, new RegExp(LEGACY_SEARCH_TERM));
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

test("all-failed and entitlement-gated Bundles never become ready canonical evidence", async () => {
  for (const fixture of [
    {
      name: "all failed",
      status: CAPABILITY_STATUS.FAILED,
      outcome: "failed_with_reason",
      reason: "research_bundle_failed",
    },
    {
      name: "entitlement gated",
      status: CAPABILITY_STATUS.ENTITLEMENT_GATED,
      outcome: "access_filtered",
      reason: "research_bundle_access_filtered",
    },
  ]) {
    const run = await runAiAnalyze({
      answer: noMatchAnswer(),
      allowed: true,
      bearer: "synthetic-anon-key",
      body: {
        subject: "מה זה 776?",
        visitor_id: "vterminalbundle123",
        intelligence_level: "fast",
        research_contract: CONTRACT,
        view_mode: "landscape",
        conversation_resolution: conversation([776]),
      },
      researchBundleByNumber: { 776: terminalNumberBundle(776, fixture.status) },
    });

    assert.equal(run.models.length, 0, fixture.name);
    assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "fallback", fixture.name);
    assert.deepEqual(run.result.raziel.plan_meta.canonical_result_bundle.reasons, [fixture.reason], fixture.name);
    const span = run.spans.find((item) => item.p_name === "ai-analyze:raziel:research-run");
    assert.equal(span?.p_outcome, fixture.outcome, fixture.name);
    assert.equal(span?.p_detail?.stop_reason, fixture.reason, fixture.name);
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

// ── Two visible modes + one-shot map + interpretive dossier: the "שאול" acceptance flow, end to end ──────────────────
// Real client builder (lazy prepare), real ai-analyze handler, real Bundle composer; the model is a canned mock (no live model).
function shaulBundles() {
  return {
    researchBundleByExpression: { שאול: expressionCrossingBundle("שאול", "שלום", { richProfile: true }) },
    researchBundleByNumber: {
      337: numberBundle(337, "מאגר הגימטריה המאומת", {
        phraseFindings: [
          numberPhraseFinding({ id: "uf:337:rise-fall", phrase: "עולה ויורד", value: 337 }),
          numberPhraseFinding({ id: "uf:337:king-hint", phrase: "מלך רמז", value: 337 }),
          numberPhraseFinding({ id: "uf:337:study-hint", phrase: "לימוד רמז", value: 337 }),
          numberPhraseFinding({ id: "uf:337:agag", phrase: "אגג מלך עמלק", value: 337 }),
          numberPhraseFinding({ id: "uf:337:anger", phrase: "ועל יהוה יזעף לבו", value: 337 }),
        ],
      }),
      // the words at the regular value equal to שאול's אתבש / מילוי / מסתתר (read only by the interpretive modes)
      502: numberBundle(502, "מאגר הגימטריה המאומת", { phraseFindings: ["מלכותו", "שבר", "תוצאה", "בשר", "שרב"].map((phrase, i) => numberPhraseFinding({ id: `uf:502:${i}`, phrase, value: 502 })) }),
      567: numberBundle(567, "מאגר הגימטריה המאומת", { phraseFindings: ["נפלאות", "דור אנוש", "בית המוקד"].map((phrase, i) => numberPhraseFinding({ id: `uf:567:${i}`, phrase, value: 567 })) }),
      328: numberBundle(328, "מאגר הגימטריה המאומת", { phraseFindings: ["חשך", "כחש", "שכח", "שובך"].map((phrase, i) => numberPhraseFinding({ id: `uf:328:${i}`, phrase, value: 328 })) }),
    },
  };
}
const SHAUL_Q = 'תן לי את הגימטריות על השם "שאול"';
const MOCK_PROSE = [
  "שאול הוא שם שנושא כבר ברובד הפשוט שני פנים: מי ש״נשאל״ ומי שנשאר שאלה, וערכו הרגיל הוא 337.",
  "באותו ערך יושבים עולה ויורד ומלך רמז, ואגג מלך עמלק לצדם — כאילו התנועה כולה מתכנסת למספר אחד, ו״ועל יהוה יזעף לבו״ סוגר את המתח.",
  "בשכבות האחרות מופיע אותו שם: במילוי 567, במסתתר 328, באתבש 502 ובאלבם 121.",
  "זו קריאה של רזיאל ולא לשון המקור; שוויון מספרי אינו מוכיח קשר סיבתי.",
].join("\n");
const mockStory = {
  text: JSON.stringify({ v: 1, agent: "raziel", facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true, answer: MOCK_PROSE }),
  usage: { input_tokens: 90, output_tokens: 120 }, attempts: 1, degraded: false,
};
const bodyOf = (prepared, visitor) => ({
  subject: prepared.request.subject, facts: prepared.request.facts, context: prepared.request.context, again: prepared.request.again,
  visitor_id: visitor, intelligence_level: prepared.request.intelligenceLevel,
  ...(prepared.request.surfaceSemantic ? { surface_semantic: prepared.request.surfaceSemantic } : {}),
  conversation_resolution: prepared.request.conversationResolution,
  research_contract: prepared.request.researchContract,
  ...(prepared.request.viewMode ? { view_mode: prepared.request.viewMode } : {}),
});
const prepare = (extra) => prepareRazielSessionSubmission({ question: SHAUL_Q, state: createInitialRazielSessionState(), researchContext: null, startedAt: "t", createTurnId: () => "turn-1", ...extra });
const shaulRun = (prepared, visitor, modelResult = mockStory) => runAiAnalyze({
  answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key", body: bodyOf(prepared, visitor), modelResult, ...shaulBundles(),
});

test("מתפרע: the user's choice sends exploratory + deep; the dossier carries the Bundle's anchors, layers and normalization caveats; one model call", async () => {
  const prepared = prepare({ intelligenceLevel: "fast", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } });
  assert.deepEqual([prepared.request.viewMode, prepared.request.intelligenceLevel], ["exploratory", "deep"]);
  const run = await shaulRun(prepared, "vshaulexploratorydeep1");
  assert.equal(run.models.length, 1, "one synthesis call");
  const span = run.spans.find((item) => item.p_name === "ai-analyze:raziel:model");
  assert.match(span.p_detail.replay.parametersRef, /level:deep/);
  assert.match(span.p_detail.replay.parametersRef, /view_mode:exploratory/);
  assert.equal(run.models[0].maxTokens, 4000, "the deep tier is the user's explicit request; the router still owns the model");
  const user = run.models[0].user;
  assert.match(user, /תיק פרשנות תחום מתוך אותה חבילת־תוצאה קנונית/);
  assert.doesNotMatch(user, /"contract":"raziel-canonical-result-bundle-input-v1"/, "the raw Bundle is never handed over in this mode");
  assert.match(user, /1\. הביטוי והערך המרכזי:\nשאול · רגיל=337/);
  for (const anchor of ["עולה ויורד", "מלך רמז", "אגג מלך עמלק", "ועל יהוה יזעף לבו"]) assert.match(user, new RegExp(anchor), anchor);
  assert.match(user, /2\. מפת השיטות המחושבת:/);
  for (const layer of ["מילוי=567", "מסתתר=328", "אתבש=502", "אלבם=121"]) assert.ok(user.includes(layer), layer);
  assert.match(user, /3\. קבוצות שקילות לאחר נרמול:/);
  assert.match(user, /שקילות מבנית מוכחת: רגיל = גדול/);
  assert.match(user, /9\. הסתייגויות:[\s\S]*עצמאות בין שיטות חישוב לא נטענה/);
  assert.match(user, /\[הוראת פלט סופית\] כתוב בתוך answer פרשנות מלאה בפרוזה זורמת, 5–9 פסקאות, בלי כותרות/);
  // compact: nowhere near the old 40-50k-token payload
  assert.ok(user.length < 14000, `compact request (${user.length} chars)`);
  assert.equal(run.result.raziel.plan_meta.view_mode.applied, true);
  assert.deepEqual(run.result.raziel.plan_meta.view_mode.structure, { paragraphs: 4, template_headings: false });
  assert.equal(run.result.raziel.answer, MOCK_PROSE, "the answer is flowing prose, never rewritten");
  assert.doesNotMatch(run.result.raziel.answer, /בקשה ותפילה/u, "no invented lexical meaning");
});

test("שאול follow-up 'בכל השיטות' continues with שאול from the same session in exploratory deep", async () => {
  const state = {
    ...createInitialRazielSessionState(), viewMode: "exploratory",
    thread: [{
      role: "user", text: SHAUL_Q,
      identity_resolution: { identities: [{ type: "phrase", label: "שאול", identity_key: "phrase:שאול" }], explicit_text_computation: true },
    }, { role: "raziel", text: "שאול = 337" }],
  };
  const prepared = prepare({ question: "בכל השיטות", state, intelligenceLevel: "fast" });
  assert.equal(prepared.request.conversationResolution?.referential_follow_up, true);
  assert.equal(prepared.request.conversationResolution?.identities?.[0]?.label, "שאול");
  assert.deepEqual([prepared.request.viewMode, prepared.request.intelligenceLevel], ["exploratory", "deep"]);
  const run = await shaulRun(prepared, "vshaulallmethods12345");
  const experts = run.calls.filter((call) => call.name === "research-run");
  assert.equal(experts.length, 5, "expression + its regular-value neighborhood + the three method-layer values (אתבש, מילוי, מסתתר)");
  assert.equal(run.models.length, 1);
  assert.match(run.models[0].user, /שאול · רגיל=337/);
  assert.match(run.models[0].user, /אגג מלך עמלק/);
});

test("🗺️ one-shot map: landscape over the SAME Bundle reads, session mode untouched, no duplicate user message", async () => {
  // the exploratory dossier run and the map run must read identical canonical Bundles
  const base = await shaulRun(prepare({ intelligenceLevel: "deep", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } }), "vshaulmapbase123456");
  const state = {
    ...createInitialRazielSessionState(),
    thread: [{ role: "user", text: SHAUL_Q }, { role: "raziel", text: "שאול = 337", question: SHAUL_Q, turnId: "turn-1", continuation: { contextSnapshot: null, facts: "", viewMode: "general" } }],
  };
  const map = prepare({ state, intelligenceLevel: "fast", again: true, continuationTurnId: "turn-1", viewModeOverride: "landscape" });
  assert.deepEqual([map.request.viewMode, map.request.again, map.request.intelligenceLevel], ["landscape", true, "fast"]);
  assert.equal(state.viewMode, "general", "the standing mode is untouched");
  const mapAnswer = { text: JSON.stringify({ v: 1, agent: "raziel", answer: "עוגן: שאול = 337.\nעובדות חישוביות מאומתות: עובדה מתמטית: שאול = 337.", facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true }), usage: { input_tokens: 70, output_tokens: 40 }, attempts: 1, degraded: false };
  const run = await shaulRun(map, "vshaulmaplandscape123", mapAnswer);
  const reads = (r) => r.calls.filter((call) => call.name === "research-run").map((call) => JSON.stringify(call.payload.contract === EXPRESSION_CONTRACT ? { c: call.payload.contract, e: call.payload.expression } : { c: call.payload.contract, n: call.payload.number })).sort();
  const layerOnly = new Set([JSON.stringify({ c: "public-number-research-run-v1", n: 328 }), JSON.stringify({ c: "public-number-research-run-v1", n: 502 }), JSON.stringify({ c: "public-number-research-run-v1", n: 567 })]);
  assert.deepEqual(reads(run), reads(base).filter((read) => !layerOnly.has(read)), "same canonical reads; only the interpretive dossier adds the method-layer values");
  assert.equal(run.result.raziel.plan_meta.view_mode.requested, "landscape");
  assert.equal(run.result.raziel.plan_meta.view_mode.applied, true);
  assert.match(run.models[0].system, /מצב «נוף»/);
  assert.match(run.models[0].user, /"contract":"raziel-canonical-result-bundle-input-v1"/, "landscape keeps the complete projection of that same Bundle");
  assert.equal(run.models.length, 1);
  assert.equal(run.calls.filter((call) => /persona|memory|research_objects|corpus/i.test(call.name) && /insert|upsert|write/i.test(call.name)).length, 0);
});

test("landscape is still accepted by the server contract for plain (old-style) requests, and without a Bundle nothing is guessed or sent to a model", async () => {
  const old = await runAiAnalyze({
    answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: { subject: "חשב את שאול בגימטריה", visitor_id: "vshaulcontractlandscape", intelligence_level: "fast", research_contract: CONTRACT, view_mode: "landscape", conversation_resolution: focusedExpressionConversation("שאול", "research") },
    ...shaulBundles(), modelResult: mockStory,
  });
  assert.equal(old.result.raziel.plan_meta.view_mode.requested, "landscape");
  assert.equal(old.result.raziel.plan_meta.view_mode.applied, true);
  for (const viewMode of ["landscape", "exploratory"]) {
    const none = await runAiAnalyze({
      answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key", researchRunFailure: "fixture_outage",
      body: { subject: "חשב את שאול בגימטריה", visitor_id: `vshaulnobundle${viewMode}1`, intelligence_level: "deep", research_contract: CONTRACT, view_mode: viewMode, conversation_resolution: focusedExpressionConversation("שאול", "research") },
      ...shaulBundles(),
    });
    assert.equal(none.models.length, 0, `${viewMode}: no model call without a valid Bundle`);
    assert.equal(none.result.raziel.plan_meta.view_mode.reason, "no_canonical_bundle");
    assert.doesNotMatch(none.result.raziel.answer, /337/);
  }
});

// ── Legacy-prose contracts + routing proof (one subject: the asked expression) ────────────────────────────────────
const SHAUL_PHRASINGS = [
  ["הכל על הגימטריה של שאול", null],
  ["הגימטריה של המילה שאול", null],
  ["מה הגימטריה של המילה שאול", null],
  ["תן לי גימטריה של המילה שאול", null],
  ["בדוק לי שאול בגימטריה", null],
  ["כמה זה שאול בגימטריה תחשב", null],
  ["שאול בגימטריה כמה זה", null],
  ["חשב בבקשה את שאול", null],
  ["בדוק לי את השם שאול", null],
  ["תן לי גימטריות של 337 שאול", 337],
  ['תן לי את הגימטריות על השם "שאול"', null],
  ["שאול 337 בכל השיטות", 337],
];
for (const [question, observed] of SHAUL_PHRASINGS) {
  test(`routing proof: «${question}» keeps שאול as the subject${observed ? " and 337 as an observed value" : ""}; the dossier carries the rich layers`, async () => {
    const prepared = prepare({ question, state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } });
    const identities = prepared.request.conversationResolution?.identities || [];
    assert.deepEqual(identities.map((identity) => identity.label), ["שאול"], "the expression is the only research subject");
    assert.equal(identities.some((identity) => identity.type === "number"), false, "337 never replaces שאול as the subject");
    const run = await shaulRun(prepared, `vroute${Buffer.from(question).toString("hex").slice(0, 14)}`);
    const expressionReads = run.calls.filter((call) => call.name === "research-run" && call.payload.contract === EXPRESSION_CONTRACT);
    assert.equal(expressionReads.length, 1);
    assert.equal(expressionReads[0].payload.expression, "שאול");
    // the typed value is checked against the supplied canonical profile (never a second subject, never recomputed)
    if (observed) assert.match(run.models[0].user, /הערך שנשאל, 337, תואם את רגיל של שאול במפת החישוב הקנונית/);
    else assert.doesNotMatch(run.models[0].user, /הערך שנשאל/);
    assert.equal(run.models.length, 1);
    const user = run.models[0].user;
    assert.match(user, /1\. הביטוי והערך המרכזי:\nשאול · רגיל=337/, "starts from שאול and the regular value");
    for (const phrase of ["עולה ויורד", "מלך רמז", "לימוד רמז", "אגג מלך עמלק", "ועל יהוה יזעף לבו"]) assert.ok(user.includes(phrase), phrase);
    for (const layer of ["מילוי=567", "מסתתר=328", "אתבש=502", "אלבם=121", "סידורי=40"]) assert.ok(user.includes(layer), layer);
    assert.match(user, /שקילות מבנית מוכחת: רגיל = גדול/);
    assert.match(user, /9\. הסתייגויות:/);
    assert.ok(user.indexOf("1. הביטוי והערך המרכזי") < user.indexOf("2. מפת השיטות המחושבת"), "שאול and the regular value first, other methods after");
  });
}

test("routing proof: 'בכל השיטות' as a follow-up continues שאול from the session (fifth phrasing)", () => {
  const state = {
    ...createInitialRazielSessionState(), viewMode: "exploratory",
    thread: [{ role: "user", text: "שאול 337", identity_resolution: { identities: [{ type: "phrase", label: "שאול", identity_key: "phrase:שאול" }], explicit_text_computation: true } }, { role: "raziel", text: "שאול = 337" }],
  };
  const prepared = prepare({ question: "בכל השיטות", state });
  assert.equal(prepared.request.conversationResolution?.referential_follow_up, true);
  assert.deepEqual(prepared.request.conversationResolution?.identities?.map((identity) => identity.label), ["שאול"]);
});

test("מתפרע vs כללי vs הפתע אותי: three separate prose contracts over the same Bundle, one model call each", async () => {
  const base = { intelligenceLevel: "fast" };
  const general = await shaulRun(prepare({ ...base }), "vproseGeneral12345");
  const wild = await shaulRun(prepare({ ...base, state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } }), "vproseWild1234567");
  const surprisePrepared = prepare({ intelligenceLevel: "deep", again: true, continuationTurnId: "turn-1", viewModeOverride: "surprise",
    state: { ...createInitialRazielSessionState(), thread: [{ role: "user", text: SHAUL_Q }, { role: "raziel", text: "שאול = 337", question: SHAUL_Q, turnId: "turn-1", continuation: { contextSnapshot: null, facts: "", viewMode: "general" } }] } });
  assert.equal(surprisePrepared.request.viewMode, "surprise");
  const surprise = await shaulRun(surprisePrepared, "vproseSurprise12345", mockStory);
  for (const run of [general, wild, surprise]) assert.equal(run.models.length, 1);

  // כללי: short flowing prose in the Legacy voice, started from the asked subject; no view layer, no template headings
  assert.equal(general.result.raziel.plan_meta.view_mode, undefined);
  assert.doesNotMatch(general.models[0].system, /מצב «/);
  assert.match(general.models[0].user, /\[סגנון תשובה\] ענה בשפה הפרשנית הזורמת של הפרשן, קצר יחסית: 2–4 פסקאות\. התחל תמיד מהמילה, מהביטוי או מהמספר שנשאלו/);
  assert.match(general.models[0].user, /בלי כותרות, בלי תבליטים ובלי שמות סעיפים/);
  // מתפרע: long prose, no headings, layered, around the subject
  assert.match(wild.models[0].system, /מצב «מתפרע»[\s\S]*5–9 פסקאות זורמות/);
  assert.match(wild.models[0].user, /5–9 פסקאות, בלי כותרות ובלי רשימות/);
  assert.doesNotMatch(wild.models[0].system, /ציר רעיוני אחד בלתי צפוי/);
  // הפתע אותי: its own contract, the only one that hunts an unexpected axis
  assert.equal(surprise.result.raziel.plan_meta.view_mode.requested, "surprise");
  assert.equal(surprise.result.raziel.plan_meta.view_mode.applied, true);
  assert.match(surprise.models[0].system, /מצב «הפתע אותי»[\s\S]*ציר רעיוני אחד בלתי צפוי[\s\S]*3–5 פסקאות/);
  assert.doesNotMatch(surprise.models[0].system, /5–9 פסקאות/);
  assert.match(surprise.models[0].user, /ציר אחד בלתי צפוי/);
  assert.doesNotMatch(wild.models[0].user, /ציר אחד בלתי צפוי/);
  assert.equal(surprise.result.raziel.plan_meta.view_mode.structure.template_headings, false);
  // length ordering of the contracts: general < surprise < wild
  const paragraphs = (text) => Number(/(\d)–(\d) פסקאות/u.exec(text)[2]);
  assert.ok(paragraphs(general.models[0].user) < paragraphs(wild.models[0].system));
  // all three read the same canonical Bundle
  const reads = (run) => run.calls.filter((call) => call.name === "research-run").map((call) => JSON.stringify(call.payload.contract === EXPRESSION_CONTRACT ? { e: call.payload.expression } : { n: call.payload.number })).sort();
  for (const run of [wild, surprise]) assert.deepEqual(reads(run).filter((read) => reads(general).includes(read)), reads(general), "every general read is present");
  assert.deepEqual(reads(surprise), reads(wild), "מתפרע and הפתע אותי read the same Bundles");
});

test("the numeric truth guard still rejects an invented number in prose, in every prose contract; without a Bundle there is no model call", async () => {
  const invented = { text: JSON.stringify({ v: 1, agent: "raziel", facts: [], suggested_paths: [], follow_up_question: null, continue_wa: true, answer: "שאול = 337, והוא מתחבר ל-98765 בדרך מפתיעה." }), usage: { input_tokens: 90, output_tokens: 40 }, attempts: 1, degraded: false };
  for (const mode of ["exploratory", "surprise"]) {
    const prepared = prepare({ intelligenceLevel: "deep", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } });
    const body = { ...bodyOf(prepared, `vguard${mode}12345678`), view_mode: mode };
    const run = await runAiAnalyze({ answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key", body, modelResults: [invented, invented], ...shaulBundles() });
    assert.equal(JSON.stringify(run.result).includes("98765"), false, mode);
    assert.equal(run.result.degraded, true, mode);
    const none = await runAiAnalyze({ answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key", researchRunFailure: "fixture_outage", body, ...shaulBundles() });
    assert.equal(none.models.length, 0, `${mode}: no Bundle ⇒ no model`);
  }
});

test("method layers: the interpretive modes read the Number Bundle of אתבש / מילוי / מסתתר (same contract), general does not; the dossier names the words per layer", async () => {
  const wild = await shaulRun(prepare({ intelligenceLevel: "fast", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } }), "vlayerwild1234567");
  const general = await shaulRun(prepare({ intelligenceLevel: "fast" }), "vlayergeneral12345");
  const numbers = (run) => run.calls.filter((call) => call.name === "research-run" && call.payload.contract !== EXPRESSION_CONTRACT).map((call) => call.payload.number).sort((a, b) => a - b);
  assert.deepEqual(numbers(general), [337], "general keeps its two canonical reads");
  assert.deepEqual(numbers(wild), [328, 337, 502, 567], "interpretive modes add only the three method-layer values, via the existing contract");
  const user = wild.models[0].user;
  assert.match(user, /אתבש \(מראה\): שאול בשיטת אתבש = 502; בשיטת רגיל באותו ערך 502 מופיעים: מלכותו · שבר · תוצאה · בשר · שרב\./);
  assert.match(user, /מילוי \(פנימיות\): שאול בשיטת מילוי = 567; בשיטת רגיל באותו ערך 567 מופיעים: נפלאות · דור אנוש · בית המוקד\./);
  assert.match(user, /מסתתר \(רובד נסתר\): שאול בשיטת מסתתר = 328; בשיטת רגיל באותו ערך 328 מופיעים: חשך · כחש · שכח · שובך\./);
  assert.match(user, /מפגשים בכמה שיטות[^\n]*\nשאול ↔ שלום: אתבש=112 · סידורי=52/, "exact methods and values per meeting phrase");
  assert.ok(user.length < 9500, `bounded dossier (${user.length} chars)`);
  assert.equal(wild.models.length, 1);
  // a failed layer read is fail-open: the dossier simply lacks that layer
  const outage = await runAiAnalyze({
    answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyOf(prepare({ intelligenceLevel: "fast", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } }), "vlayeroutage12345"),
    modelResult: mockStory, ...shaulBundles(),
    researchBundleByNumber: { 337: shaulBundles().researchBundleByNumber[337] },
  });
  assert.equal(outage.models.length, 1);
  assert.doesNotMatch(outage.models[0].user, /אתבש \(מראה\)/);
  assert.match(outage.models[0].user, /1\. הביטוי והערך המרכזי:\nשאול · רגיל=337/);
});

// ── Precedence: a server-reauthorized canonical expression beats the legacy fn_raziel_answer early return ───────────
function legacyScaffoldingAnswer() {
  // What the old deterministic path produced when it read the command scaffolding as the expression.
  return {
    enabled: true, mode: "deterministic", needs_synthesis: false, availability: "deterministic",
    answer: "לי שאול = 377 (גימטריה רגילה — עובדה מאומתת במנוע).",
    facts: [{ label: "לי שאול", value: "377" }],
    source_of_truth: "legacy:fn_raziel_answer", trace: null,
  };
}
const PRECEDENCE_PHRASINGS = [
  ["בדוק לי גימטריה של שאול", "שאול"],
  ["בדוק לי גימטריה של שאול 337", "שאול"],
  ["המילה שאול", "שאול"],
  ["תן לי את הגימטריות של השם שאול", "שאול"],
];
for (const [index, [question, expression]] of PRECEDENCE_PHRASINGS.entries()) {
  test(`precedence: «${question}» never calls the legacy fn_raziel_answer; research-run receives שאול and the answer rests on שאול = 337`, async () => {
    const prepared = prepare({ question });
    assert.deepEqual(prepared.request.conversationResolution?.identities?.map((identity) => identity.label), [expression]);
    const run = await runAiAnalyze({
      answer: legacyScaffoldingAnswer(), allowed: true, bearer: "synthetic-anon-key",
      body: bodyOf(prepared, `vprecedence${index}abcdef12`),
      modelResult: mockStory, ...shaulBundles(),
    });
    assert.equal(run.calls.filter((call) => call.name === "fn_raziel_answer").length, 0, "the legacy function is not called at all");
    assert.equal(run.calls.filter((call) => call.name === "fn_raziel_plan").length, 0, "nor its plan fallback");
    const reads = run.calls.filter((call) => call.name === "research-run" && call.payload.contract === EXPRESSION_CONTRACT);
    assert.equal(reads.length, 1, "exactly one expression read");
    assert.equal(reads[0].payload.expression, expression, "research-run receives שאול, never the scaffolding");
    assert.equal(run.models.length, 1, "synthesis runs over the Bundle");
    // Check the answer-bearing fields only: random ids/timestamps elsewhere in the envelope may contain any digits.
    const shown = JSON.stringify({ answer: run.result.raziel.answer, facts: run.result.raziel.facts, source: run.result.raziel.source_of_truth, plan: run.result.raziel.plan_meta });
    assert.notEqual(run.result.engine, "deterministic");
    assert.doesNotMatch(shown, /לי שאול|= 377|legacy:fn_raziel_answer|availability|no_match|general_synthesis|L2_FAST/);
    const prompt = `${run.models[0].system}\n${run.models[0].user}`;
    assert.match(run.models[0].user, /שאול/);
    assert.match(run.models[0].user, /337/);
    assert.doesNotMatch(prompt, /לי שאול|= 377|legacy:fn_raziel_answer/, "no legacy fact reaches the model");
    // The generic empty plan block carries only "—" placeholders: nothing from the old path's plan or capability descriptors.
    assert.doesNotMatch(run.models[0].user, /no_match|general_synthesis|L2_FAST|L3_DEEP|סוג-יכולת: [^—\s]/u, "no plan data or capability descriptors from the old path");
    assert.doesNotMatch(run.models[0].user, /זמינות: [^—\s]/u);
    assert.equal(run.result.raziel.plan_meta.canonical_result_bundle.status, "ready");
  });
}

test("precedence: a forged, mismatched or un-opted envelope cannot trigger the bypass — the legacy deterministic path runs as usual", async () => {
  const valid = prepare({ question: "בדוק לי גימטריה של שאול" });
  const legacyCases = {
    "identity does not match the exact question": { ...bodyOf(valid, "vforgedmismatch12345"), conversation_resolution: focusedExpressionConversation("אלהים", "research") },
    "subject carries no expression the grammar accepts": { ...bodyOf(valid, "vforgedsubject123456"), subject: "תן לי עצה טובה" },
    "no canonical research opt-in": (() => { const { research_contract, ...rest } = bodyOf(valid, "vforgednooptin123456"); return rest; })(),
    "wrong resolver version": { ...bodyOf(valid, "vforgedversion1234567"), conversation_resolution: { ...valid.request.conversationResolution, version: "forged" } },
    "forged follow-up referent": { ...bodyOf(valid, "vforgedreferent123456"), conversation_resolution: { ...valid.request.conversationResolution, referential_follow_up: true, referent_source: "prior_user_turn" } },
  };
  for (const [name, body] of Object.entries(legacyCases)) {
    const run = await runAiAnalyze({ answer: legacyScaffoldingAnswer(), allowed: true, bearer: "synthetic-anon-key", body, ...shaulBundles() });
    assert.equal(run.calls.filter((call) => call.name === "fn_raziel_answer").length, 1, `${name}: legacy consulted`);
    assert.equal(run.result.engine, "deterministic", `${name}: legacy deterministic answer returned`);
    assert.match(run.result.raziel.answer, /לי שאול = 377/, name);
    assert.equal(run.calls.filter((call) => call.name === "research-run").length, 0, `${name}: no Bundle read`);
  }
  // control: the same valid request really does bypass
  const real = await runAiAnalyze({ answer: legacyScaffoldingAnswer(), allowed: true, bearer: "synthetic-anon-key", body: bodyOf(valid, "vforgedcontrolvalid12"), modelResult: mockStory, ...shaulBundles() });
  assert.equal(real.calls.filter((call) => call.name === "fn_raziel_answer").length, 0);
});

test("precedence: «מספר 337» is a canonical number subject (no expression), and a legacy deterministic answer still applies when no canonical expression was re-authorized", async () => {
  const prepared = prepare({ question: "מספר 337" });
  assert.equal(prepared.request.conversationResolution?.identities?.[0]?.type, "number");
  assert.equal(prepared.request.conversationResolution?.identities?.[0]?.value ?? prepared.request.conversationResolution?.identities?.[0]?.label, prepared.request.conversationResolution?.identities?.[0]?.value ?? "337");
  const run = await runAiAnalyze({
    answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyOf(prepared, "vprecnumber1234567"), modelResult: mockStory, ...shaulBundles(),
  });
  const numberReads = run.calls.filter((call) => call.name === "research-run").map((call) => call.payload.number);
  assert.deepEqual(numberReads, [337]);
  // control: a request without a canonical expression keeps using the legacy deterministic path as before
  const control = await runAiAnalyze({
    answer: legacyScaffoldingAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: { subject: "בדוק לי גימטריה של שאול", visitor_id: "vprecontrol1234567", intelligence_level: "fast" },
    ...shaulBundles(),
  });
  assert.equal(control.calls.filter((call) => call.name === "fn_raziel_answer").length, 1);
  assert.equal(control.result.engine, "deterministic");
  assert.match(control.result.raziel.answer, /377/);
});

// ── Claude research packet: the database half reuses research-run + the same composer as Raziel ───────────────────
import { fetchClaudeNumberDossier, fetchClaudePacketDossier } from "./claudePacketDossier2029.js";

test("claude packet dossier: reads the existing research-run contracts and returns the same תיק פרשנות Raziel gets", async () => {
  const fixtures = shaulBundles();
  const calls = [];
  const invoke = async (name, { body }) => {
    calls.push({ name, body });
    const bundle = body.contract === EXPRESSION_CONTRACT ? fixtures.researchBundleByExpression[body.expression] : fixtures.researchBundleByNumber[body.number];
    return bundle ? { data: { status: "ok", contract: body.contract, bundle }, error: null } : { data: { status: "error" }, error: null };
  };
  const result = await fetchClaudePacketDossier("שאול", { invoke, visitorId: "vclaudepacket1234" });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.map((call) => call.name), Array(5).fill("research-run"));
  const numbers = calls.filter((call) => call.body.contract !== EXPRESSION_CONTRACT).map((call) => call.body.number).sort((a, b) => a - b);
  assert.deepEqual(numbers, [328, 337, 502, 567], "regular value + the three method-layer values, same contracts as the server");
  assert.equal(calls.filter((call) => call.body.contract === EXPRESSION_CONTRACT)[0].body.expression, "שאול");
  assert.deepEqual(calls[0].body.requested_capabilities, ["gematria", "crossings"]);
  // identical to what ai-analyze hands the model in מתפרע
  const prepared = prepare({ intelligenceLevel: "fast", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } });
  const server = await shaulRun(prepared, "vclaudepacketparity12");
  const serverBrief = server.models[0].user.slice(server.models[0].user.indexOf("[תיק פרשנות תחום"), server.models[0].user.indexOf("\n\nכתוב את מענה-רזיאל"));
  assert.ok(serverBrief.length > 1000);
  assert.ok(result.brief.startsWith(serverBrief.split("\n[הקשר-הגעה")[0].slice(0, 600)), "same dossier opening and sections");
  for (const line of ["שאול · רגיל=337", "אתבש (מראה)", "מילוי (פנימיות)", "מסתתר (רובד נסתר)", "מלכותו", "נפלאות", "חשך"]) assert.ok(result.brief.includes(line), line);
});

test("claude packet dossier: no Bundle ⇒ a clean failure, no throw, nothing invented", async () => {
  const failing = async () => ({ data: { status: "error" }, error: null });
  assert.deepEqual(await fetchClaudePacketDossier("שאול", { invoke: failing }), { ok: false, reason: "no_bundle" });
  assert.deepEqual(await fetchClaudePacketDossier("שאול", { invoke: async () => { throw new Error("offline"); } }), { ok: false, reason: "no_bundle" });
  assert.deepEqual(await fetchClaudePacketDossier("", { invoke: failing }), { ok: false, reason: "unavailable" });
  assert.deepEqual(await fetchClaudePacketDossier("שאול", {}), { ok: false, reason: "unavailable" });
});

test("live-shaped Bundles: phrases at the same value arrive as source claims and still form the constellation and the method-layer words", async () => {
  const claimBundles = (numbers) => Object.fromEntries(Object.entries(numbers).map(([n, phrases]) => [n, numberBundle(Number(n), "מאגר הגימטריה המאומת", {
    phraseFindings: phrases.map((phrase, i) => numberPhraseFinding({ id: `uf:${n}:${i}`, phrase, value: Number(n), sourceClaim: true })),
  })]));
  const bundles = {
    researchBundleByExpression: shaulBundles().researchBundleByExpression,
    researchBundleByNumber: claimBundles({ 337: ["עולה ויורד", "מלך רמז", "אגג מלך עמלק", "פרזים"], 502: ["תוצאה", "שרב"], 567: ["נפלאות", "דור אנוש"], 328: ["שכח", "כחש"] }),
  };
  const wild = await runAiAnalyze({
    answer: noMatchAnswer(), allowed: true, bearer: "synthetic-anon-key",
    body: bodyOf(prepare({ intelligenceLevel: "fast", state: { ...createInitialRazielSessionState(), viewMode: "exploratory" } }), "vlivesourceclaim1234"),
    modelResult: mockStory, ...bundles,
  });
  const user = wild.models[0].user;
  assert.match(user, /4\. קבוצת הביטויים באותו ערך רגיל:\nשאול בשיטת רגיל = 337[^\n]*עולה ויורד · מלך רמז · אגג מלך עמלק · פרזים/);
  assert.match(user, /אתבש \(מראה\)[^\n]*תוצאה · שרב/);
  assert.match(user, /מילוי \(פנימיות\)[^\n]*נפלאות · דור אנוש/);
  assert.match(user, /מסתתר \(רובד נסתר\)[^\n]*שכח · כחש/);
});

test("claude packet for a bare number: one Number research-run read, and the dossier lists the phrases at that value", async () => {
  const fixtures = shaulBundles();
  const calls = [];
  const invoke = async (name, { body }) => {
    calls.push(body);
    const bundle = fixtures.researchBundleByNumber[body.number];
    return bundle ? { data: { status: "ok", contract: body.contract, bundle }, error: null } : { data: { status: "error" }, error: null };
  };
  const result = await fetchClaudeNumberDossier(337, { invoke, visitorId: "vclaudenumber1234" });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.map((body) => [body.contract, body.number, body.surface]), [["public-number-research-run-v1", 337, "number"]]);
  assert.match(result.brief, /4ב\. ביטויים באותו ערך[^\n]*\nערך 337 \(שיטת רגיל\): עולה ויורד · מלך רמז · לימוד רמז · אגג מלך עמלק · ועל יהוה יזעף לבו\./);
});

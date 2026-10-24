// Fixtures for the Raziel view-mode tests. These mirror the canonical Result Bundle fixtures used by
// src/lib/research/razielResultBundleServerSeam.test.js (same builders, same composer) so that the view-mode tests
// exercise the REAL bundle composition and the REAL ai-analyze handler — no parallel bundle format.
import { makeUniversalFinding } from "../../src/lib/research/universalFinding.js";
import {
  ACCESS_CLASS,
  capabilityResult,
  composeResearchResultBundle,
} from "../../src/lib/research/researchResultBundle.js";

export const CONTRACT = "public-number-research-run-v1";
export const EXPRESSION_CONTRACT = "public-expression-crossing-run-v1";
const PRIVATE = "RAW-PRIVATE-BUNDLE-SENTINEL";

export function numberBundle(number, sourceName = "ספר יצירה") {
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
  const findings = [finding];
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
  });
}

export function expressionCrossingBundle(expression, partner = "שלום") {
  const regularValue = expression === "צוריאל" ? 337 : expression === "חכמה" ? 73 : 358;
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

export function noMatchAnswer() {
  return {
    enabled: true,
    mode: "no_match",
    needs_synthesis: true,
    availability: "no_match",
    capability_class: "general_synthesis",
    minimum_intelligence: "L2_FAST",
  };
}

export function numberContextAnswer(number) {
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

export function conversation(numbers, requestedAction = numbers.length === 2 ? "research" : "understand") {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: requestedAction,
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: numbers.map((value) => ({ type: "number", value, identity_key: `number:${value}` })),
  };
}

export function expressionConversation(expression) {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: "connect",
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: [{ type: "phrase", label: expression, identity_key: `phrase:${expression}` }],
  };
}

export function focusedExpressionConversation(expression, requestedAction = "research") {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: requestedAction,
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: [{ type: "phrase", label: expression, identity_key: `phrase:${expression}` }],
  };
}

export function expressionPairConversation(left, right) {
  return {
    version: "raziel-conversation-resolver-v1",
    requested_action: "connect",
    referential_follow_up: false,
    referent_source: "explicit_current_turn",
    identities: [left, right].map((label) => ({ type: "phrase", label, identity_key: `phrase:${label}` })),
  };
}

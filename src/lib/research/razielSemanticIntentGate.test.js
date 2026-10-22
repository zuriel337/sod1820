import test from "node:test";
import assert from "node:assert/strict";

import {
  RAZIEL_CONVERSATIONAL_ACT_VERSION,
  RAZIEL_SEMANTIC_INTENT_VERSION,
  resolveExplicitNumericPairResearchSubject,
  resolveRazielConversationalAct,
  validateRazielSemanticIntent,
} from "./razielSemanticIntentGate.js";
import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";

const semantic = (overrides = {}) => ({
  version: RAZIEL_SEMANTIC_INTENT_VERSION,
  status: "resolved",
  action: "research",
  confidence: "high",
  ambiguous: false,
  candidates: [{ type: "number", value: 776, evidence_text: "776", role: "subject" }],
  ...overrides,
});

test("short whole-turn acknowledgement is deterministic conversation control", () => {
  for (const text of ["יפה מאוד", "תודה רבה", "מעולה", "הבנתי", "מצוין!"]) {
    assert.deepEqual(resolveRazielConversationalAct(text), {
      version: RAZIEL_CONVERSATIONAL_ACT_VERSION,
      act: "acknowledgement",
    }, text);
  }
  for (const text of ["", "יפה מאוד, עכשיו השווה 776 ל-1820", "תודה על 3 המקורות", "נכון, בדוק שוב"]) {
    assert.equal(resolveRazielConversationalAct(text), null, text);
  }
});

test("natural two-number crossing language resolves structurally without a classifier", () => {
  for (const [question, numbers, action] of [
    ["תעשה לי הצלבה בין 1820 ל-776", [1820, 776], "connect"],
    ["בצעי השוואה בין המספרים 337 מול 533", [337, 533], "connect"],
    ["מה הקשר בין 776 ל-1820", [776, 1820], "connect"],
    ["בדוק לי את המספרים 776 עם 1820", [776, 1820], "research"],
  ]) {
    const out = resolveExplicitNumericPairResearchSubject(question);
    assert.deepEqual(out?.numbers, numbers, question);
    assert.equal(out?.requested_action, action, question);
  }
  for (const question of [
    "מצא 2 הצלבות למספר 776",
    "בדוק את שנת 1820 מול עמוד 776",
    "תעשה לי הצלבה בין 1820 ל-1820",
    "דבר על 776 ואחר כך אולי 1820",
  ]) assert.equal(resolveExplicitNumericPairResearchSubject(question), null, question);
});

test("high-confidence Hebrew numeric wording resolves structurally without a model candidate", () => {
  const question = "תוכל לצלול לתוך 776 ולראות מה מסתתר שם";
  const out = resolveRazielConversationTurn({ question, semanticIntent: semantic() });

  assert.deepEqual(out.identity_resolution.identities.map((identity) => identity.value), [776]);
  assert.equal(out.requested_action, "research");
  assert.equal(out.research_plan.strategy, "number_research");
  assert.equal(out.semantic_intent, null);
  assert.equal(out.guards.no_model_inference, true);
  assert.equal(out.guards.no_model_call_in_resolver, true);
});

test("a semantic pair is exact-evidence-bound and feeds the existing relation plan", () => {
  const question = "בוא נעמיד את 337 מול 533 ונראה איפה הם נפגשים";
  const out = resolveRazielConversationTurn({
    question,
    semanticIntent: semantic({
      action: "connect",
      candidates: [
        { type: "number", value: 337, evidence_text: "337", role: "subject" },
        { type: "number", value: 533, evidence_text: "533", role: "subject" },
      ],
    }),
  });

  assert.deepEqual(out.pair, [337, 533]);
  assert.equal(out.requested_action, "connect");
  assert.equal(out.research_plan.requested_capabilities.includes("numeric_relations"), true);
});

test("a free phrase never becomes Gematria unless text computation was explicitly classified", () => {
  const question = "פתח מחקר על משיח";
  const base = semantic({
    candidates: [{ type: "phrase", label: "משיח", evidence_text: "משיח", role: "subject" }],
  });
  const ordinary = resolveRazielConversationTurn({ question, semanticIntent: base });
  const calculated = resolveRazielConversationTurn({
    question,
    semanticIntent: { ...base, text_computation_requested: true },
  });

  assert.equal(ordinary.identity_resolution.text_calculation_allowed, true);
  assert.equal(ordinary.identity_resolution.explicit_text_computation, false);
  assert.equal(ordinary.research_plan.requested_capabilities.includes("gematria"), false);
  assert.equal(calculated.identity_resolution.explicit_text_computation, true);
  assert.equal(calculated.research_plan.requested_capabilities.includes("gematria"), true);
});

test("hallucinated, privileged or execution-bearing classifier output fails closed", () => {
  const question = "ספר לי משהו על משיח";
  for (const candidate of [
    semantic(),
    semantic({ candidates: [{ type: "phrase", label: "משיח", evidence_text: "דוד", role: "subject" }] }),
    { ...semantic({ candidates: [{ type: "phrase", label: "משיח", evidence_text: "משיח", role: "subject" }] }), capabilities: ["els"] },
    semantic({ candidates: [{ type: "phrase", label: "משיח", evidence_text: "משיח", role: "subject", access: { tier: "admin" } }] }),
    semantic({ candidates: [{ type: "number", value: 77, evidence_text: "77", role: "subject" }] }),
  ]) assert.equal(validateRazielSemanticIntent(candidate, question), null);
});

test("ambiguity requests clarification and contributes no identity or capability", () => {
  const question = "קיימות כמה אפשרויות שונות כאן";
  const candidate = semantic({ status: "clarify", action: "connect", confidence: "low", ambiguous: true, candidates: [] });
  const out = resolveRazielConversationTurn({ question, semanticIntent: candidate });

  assert.equal(out.semantic_intent.status, "clarify");
  assert.deepEqual(out.identity_resolution.identities, []);
  assert.deepEqual(out.research_plan.requested_capabilities, []);
});

test("deterministic resolution wins over a conflicting semantic candidate", () => {
  const out = resolveRazielConversationTurn({
    question: "מה זה 1820?",
    semanticIntent: semantic(),
  });

  assert.deepEqual(out.identity_resolution.identities.map((identity) => identity.value), [1820]);
  assert.equal(out.semantic_intent, null);
  assert.equal(out.guards.no_model_inference, true);
});

test("semantic candidate and canonical plan never cross the bounded server projection", () => {
  const out = resolveRazielConversationTurn({
    question: "תוכל לצלול לתוך 776 ולראות מה מסתתר שם",
    semanticIntent: semantic(),
  });
  const projected = projectRazielConversationResolution(out);

  assert.equal(Object.hasOwn(projected, "semantic_intent"), false);
  assert.equal(Object.hasOwn(projected, "research_plan"), false);
  assert.deepEqual(projected.identities, [{ type: "number", value: 776, identity_key: "number:776" }]);
  assert.equal(projected.guards.server_must_reauthorize, true);
});

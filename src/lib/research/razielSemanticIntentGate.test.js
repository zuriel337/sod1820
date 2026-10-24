import test from "node:test";
import assert from "node:assert/strict";

import {
  RAZIEL_CONVERSATIONAL_ACT_VERSION,
  RAZIEL_DETERMINISTIC_GUIDANCE_VERSION,
  RAZIEL_SEMANTIC_INTENT_VERSION,
  resolveExplicitHebrewExpressionPairResearchSubject,
  resolveExplicitHebrewExpressionResearchSubject,
  resolveExplicitNumericPairResearchSubject,
  resolveRazielConversationalAct,
  resolveRazielDeterministicGuidance,
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

test("missing personal input and open capability questions receive zero-model guidance", () => {
  assert.deepEqual(resolveRazielDeterministicGuidance("תחשב לי את השם שלי"), {
    version: RAZIEL_DETERMINISTIC_GUIDANCE_VERSION,
    kind: "missing_name_expression",
  });
  assert.deepEqual(resolveRazielDeterministicGuidance("מה אתה יכול ללמד אותי"), {
    version: RAZIEL_DETERMINISTIC_GUIDANCE_VERSION,
    kind: "research_menu",
  });
  for (const text of ["", "תחשב לי את צוריאל", "מה אתה יכול ללמד אותי על 776"]) {
    assert.equal(resolveRazielDeterministicGuidance(text), null, text);
  }
});

test("explicit Hebrew expression grammar is structural rather than word-specific", () => {
  for (const [question, label, action] of [
    ["מה זה צוריאל בגימטריה ומה ההצלבות שיש", "צוריאל", "connect"],
    ["מה הגימטריה של אור הגאולה ומה ההצלבות שלו", "אור הגאולה", "connect"],
    ["מצא הצלבות למילה אלהים", "אלהים", "connect"],
    ["בדוק לי קשרים עבור עולם הפוך", "עולם הפוך", "connect"],
    ["כמה זה משה בגימטריה", "משה", "research"],
    ["תן לי את הגימטריה של ראיתי דבר מתוך דבר ובדוק הצלבות", "ראיתי דבר מתוך דבר", "connect"],
    ["חשב לי את הביטוי ראיתי דבר מתוך דבר ומצא הצלבות", "ראיתי דבר מתוך דבר", "connect"],
  ]) {
    const out = resolveExplicitHebrewExpressionResearchSubject(question);
    assert.equal(out?.label, label, question);
    assert.equal(out?.requested_action, action, question);
    assert.equal(out?.explicit_text_computation, true, question);
  }
  for (const question of [
    "תחשב לי את השם שלי",
    "מה הגימטריה של השם",
    "בדוק את שנת 2024",
    "ספר לי משהו מעניין",
  ]) assert.equal(resolveExplicitHebrewExpressionResearchSubject(question), null, question);
});

test("method-focused expression grammar preserves expression, method and observed result", () => {
  for (const question of [
    "מה יש לך על המסתתר של חכמה",
    "מה אומר המסתתר של חכמה?",
    "מה המשמעות של המסתתר של חכמה",
    "מה פירוש המסתתר של חכמה",
    "איך מפרשים את המסתתר של חכמה",
    "מה מלמד המסתתר של חכמה",
  ]) {
    const hidden = resolveExplicitHebrewExpressionResearchSubject(question);
    assert.equal(hidden?.label, "חכמה", question);
    assert.equal(hidden?.requested_method, "מסתתר", question);
    assert.equal(hidden?.requested_action, "research", question);
  }

  const futureMethod = resolveExplicitHebrewExpressionResearchSubject("מה אומר אור חוזר של בראשית ברא");
  assert.equal(futureMethod?.label, "בראשית ברא");
  assert.equal(futureMethod?.requested_method, "אור חוזר");

  const triangle = resolveExplicitHebrewExpressionResearchSubject("מה אתה אומר על 271 המשולש של חכמה");
  assert.equal(triangle?.label, "חכמה");
  assert.equal(triangle?.requested_method, "משולש");
  assert.equal(triangle?.observed_value, 271);
  assert.equal(triangle?.requested_action, "research");
});

test("exact Hebrew expression pair grammar preserves both relation endpoints", () => {
  assert.deepEqual(resolveExplicitHebrewExpressionPairResearchSubject("מה הקשר בין חכמה לבינה?"), {
    expressions: ["חכמה", "בינה"],
    requested_action: "connect",
  });
  for (const question of [
    "מה הקשר בין חכמה",
    "מה הקשר בין 73 לבינה",
    "ספר לי על הקשר בין חכמה לבינה בתוך מאמר ארוך",
  ]) assert.equal(resolveExplicitHebrewExpressionPairResearchSubject(question), null, question);
});

test("combined expression request reaches the canonical crossing projection", () => {
  const question = "מה זה צוריאל בגימטריה ומה ההצלבות שיש";
  const resolved = resolveRazielConversationTurn({ question });
  const projected = projectRazielConversationResolution(resolved);

  assert.deepEqual(resolved.identity_resolution.identities.map((identity) => identity.label), ["צוריאל"]);
  assert.equal(resolved.identity_resolution.explicit_text_computation, true);
  assert.equal(resolved.requested_action, "connect");
  assert.equal(projected.identities[0].label, "צוריאל");
  assert.equal(projected.requested_action, "connect");
});

test("method result is an expression lens, not a numeric research root", () => {
  const resolved = resolveRazielConversationTurn({
    question: "מה אתה אומר על 271 המשולש של חכמה",
  });
  const projected = projectRazielConversationResolution(resolved);

  assert.deepEqual(resolved.identity_resolution.identities.map((identity) => [identity.type, identity.label]), [
    ["phrase", "חכמה"],
  ]);
  assert.equal(resolved.requested_action, "research");
  assert.deepEqual(projected.identities, [{ type: "phrase", label: "חכמה", identity_key: "phrase:חכמה" }]);
});

test("exact expression relation preserves both phrases across the bounded projection", () => {
  const resolved = resolveRazielConversationTurn({ question: "מה הקשר בין חכמה לבינה?" });
  const projected = projectRazielConversationResolution(resolved);

  assert.equal(resolved.requested_action, "connect");
  assert.deepEqual(projected.identities, [
    { type: "phrase", label: "חכמה", identity_key: "phrase:חכמה" },
    { type: "phrase", label: "בינה", identity_key: "phrase:בינה" },
  ]);
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

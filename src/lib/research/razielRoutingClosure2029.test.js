import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeRazielRequestedMethod,
  resolveRazielCanonicalRequest,
} from "./razielSemanticIntentGate.js";
import {
  projectRazielConversationResolution,
  resolveRazielConversationTurn,
} from "./razielConversationResolver.js";

const registryFixture = JSON.parse(readFileSync(
  new URL("../../../test/fixtures/spatial/canonical-number-methods-20261009.json", import.meta.url),
  "utf8",
));

const methodKeys = registryFixture.map((row) => row.method_key);

function spokenMethod(methodKey) {
  if (methodKey === "קדמי") return "משולש";
  if (methodKey === "אתבש") return "אתב״ש";
  if (methodKey === "איק בכר") return "אי״ק בכ״ר";
  return methodKey.replaceAll("+", " + ");
}

test("routing closure derives its matrix from the existing 32-method canonical fixture", () => {
  assert.equal(methodKeys.length, 32);
  assert.equal(new Set(methodKeys).size, 32);
});

test("all 32 methods preserve expression, method and action across direct and focused wording", () => {
  for (const methodKey of methodKeys) {
    const spoken = spokenMethod(methodKey);
    const expectedMethod = normalizeRazielRequestedMethod(spoken);
    for (const question of [
      `חשב את חכמה בשיטת ${spoken}`,
      `נושא המחקר המילה חכמה בשיטת ${spoken}`,
      `מה אומר ${spoken} של חכמה`,
    ]) {
      const request = resolveRazielCanonicalRequest(question);
      assert.equal(request.status, "resolved", question);
      assert.equal(request.kind, "expression", question);
      assert.equal(request.action, "research", question);
      assert.equal(request.subjects[0]?.label, "חכמה", question);
      assert.equal(request.requested_method, expectedMethod, question);
      assert.equal(request.observed_value, null, question);
      assert.doesNotMatch(request.subjects[0]?.label || "", /בשיטת|שיטה|גימטר/u, question);
    }
  }
});

test("all 32 method-only turns carry the same prior expression without crossing authority", () => {
  for (const methodKey of methodKeys) {
    const spoken = spokenMethod(methodKey);
    const expectedMethod = normalizeRazielRequestedMethod(spoken);
    const resolved = resolveRazielConversationTurn({
      question: `בשיטת ${spoken}`,
      thread: [{ role: "user", text: "חשב את חכמה" }],
    });
    const projected = projectRazielConversationResolution(resolved);
    assert.equal(resolved.canonical_request.kind, "expression_continuation", spoken);
    assert.equal(resolved.canonical_request.requested_method, expectedMethod, spoken);
    assert.deepEqual(
      resolved.identity_resolution.identities.map((identity) => identity.label),
      ["חכמה"],
      spoken,
    );
    assert.equal(projected?.identities?.[0]?.label, "חכמה", spoken);
    assert.equal(Object.hasOwn(projected || {}, "canonical_request"), false, spoken);
  }
});

test("canonical request slots keep subject, action, method and observed value separate", () => {
  const cases = [
    ["מה זה 776", "number", "understand", ["776"]],
    ["השווה בין 776 ל 1820", "number_pair", "connect", ["776", "1820"]],
    ["מה הקשר בין חכמה לבינה", "expression_pair", "connect", ["חכמה", "בינה"]],
    ["חשב את שאול ומצא קשרים", "expression", "connect", ["שאול"]],
    ["1331 במשיח מה זה התוצאה", "expression", "research", ["משיח"]],
  ];
  for (const [question, kind, action, subjects] of cases) {
    const request = resolveRazielCanonicalRequest(question);
    assert.equal(request.kind, kind, question);
    assert.equal(request.action, action, question);
    assert.deepEqual(
      request.subjects.map((subject) => String(subject.value ?? subject.label)),
      subjects,
      question,
    );
  }
  const observed = resolveRazielCanonicalRequest("1331 במשיח מה זה התוצאה");
  assert.equal(observed.observed_value, 1331);
  assert.equal(observed.identify_observed_method, true);
});

test("ambiguous calculation wording fails closed while ordinary prose and context numbers stay outside", () => {
  for (const [question, reason] of [
    ["בדוק לי גימטריה", "missing_expression"],
    ["תן לי גימטריות של 12 34 חכמה", "ambiguous_expression_value"],
  ]) {
    const request = resolveRazielCanonicalRequest(question);
    assert.equal(request.status, "clarify", question);
    assert.equal(request.reason, reason, question);
    assert.deepEqual(request.subjects, [], question);
  }
  for (const question of [
    "מה שלומך היום",
    "בדוק את שנת 2024 בגימטריה",
    "פתח את עמוד 337",
  ]) assert.equal(resolveRazielCanonicalRequest(question).status, "unresolved", question);
});

test("method normalization removes typography but never collapses distinct triangle methods", () => {
  assert.equal(normalizeRazielRequestedMethod("המשולש"), "קדמי");
  assert.equal(normalizeRazielRequestedMethod("קדמי · משולש"), "קדמי");
  assert.equal(normalizeRazielRequestedMethod("אתב״ש"), "אתבש");
  assert.equal(normalizeRazielRequestedMethod("אי״ק בכ״ר"), "איק בכר");
  assert.equal(normalizeRazielRequestedMethod("רגיל + מילוי"), "רגיל+מילוי");
  assert.equal(normalizeRazielRequestedMethod("משולש מילה"), "משולש מילה");
  assert.equal(normalizeRazielRequestedMethod("משולש הפוך"), "משולש הפוך");
  assert.equal(normalizeRazielRequestedMethod("משולש מדרגות"), "משולש מדרגות");
  assert.equal(normalizeRazielRequestedMethod("משולש גדול"), "משולש גדול");
});

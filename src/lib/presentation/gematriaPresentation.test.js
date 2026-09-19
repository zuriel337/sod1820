import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGematriaPresentationModel,
  DEFAULT_GEMATRIA_PREVIEW_LIMIT,
  GEMATRIA_PRESENTATION_CONTRACT,
} from "./gematriaPresentation.js";

const PROFILE = [
  {
    methodKey: "רגיל",
    displayLabel: "רגיל",
    category: "base",
    sortOrder: 1,
    computedValue: 520,
    definitionVersion: 1,
  },
  {
    methodKey: "מילוי",
    displayLabel: "מילוי",
    category: "base",
    sortOrder: 2,
    computedValue: 646,
    definitionVersion: 1,
  },
  {
    methodKey: "גדול",
    displayLabel: "גדול",
    category: "base",
    sortOrder: 6,
    computedValue: 520,
    definitionVersion: 1,
  },
  {
    methodKey: "מילוי בלבד",
    displayLabel: "מילוי בלבד",
    category: "composite",
    sortOrder: 13,
    executionKind: "composite_engine",
    operator: "diff",
    derivedFrom: ["מילוי", "רגיל"],
    computedValue: 126,
    definitionVersion: 2,
  },
  {
    methodKey: "משולש מילה",
    displayLabel: "משולש מילה",
    category: "depth",
    sortOrder: 21,
    computedValue: 1120,
    definitionVersion: 1,
  },
  {
    methodKey: "רגיל+מילוי",
    displayLabel: "רגיל + מילוי",
    category: "composite",
    sortOrder: 25,
    executionKind: "composite_engine",
    operator: "sum",
    derivedFrom: ["רגיל", "מילוי"],
    computedValue: 1166,
    definitionVersion: 1,
  },
  {
    methodKey: "אות רבתי",
    displayLabel: "אות רבתי · אלפים",
    category: "base",
    sortOrder: 30,
    executionKind: "context_activated",
    derivedFrom: ["רגיל", "גדול"],
    computedValue: 2520,
    definitionVersion: 1,
  },
];

const STATES = [
  {
    method_key: "רגיל",
    display_label: "רגיל",
    category: "base",
    sort_order: 1,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    execution_kind: "sql_function",
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "מילוי",
    display_label: "מילוי",
    category: "base",
    sort_order: 2,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    execution_kind: "sql_function",
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "גדול",
    display_label: "גדול",
    category: "base",
    sort_order: 6,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    execution_kind: "sql_function",
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "מילוי בלבד",
    display_label: "מילוי בלבד",
    category: "composite",
    sort_order: 13,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    execution_kind: "composite_engine",
    operator: "diff",
    derived_from: ["מילוי", "רגיל"],
    method_version: 2,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "משולש מילה",
    display_label: "משולש מילה",
    category: "depth",
    sort_order: 21,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    execution_kind: "sql_function",
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "רגיל+מילוי",
    display_label: "רגיל + מילוי",
    category: "composite",
    sort_order: 25,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    execution_kind: "composite_engine",
    operator: "sum",
    derived_from: ["רגיל", "מילוי"],
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "אות רבתי",
    display_label: "אות רבתי · אלפים",
    category: "base",
    sort_order: 30,
    registered: true,
    active: true,
    executable: true,
    engine_verified: true,
    scannable: false,
    execution_kind: "context_activated",
    derived_from: ["רגיל", "גדול"],
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
  },
  {
    method_key: "אח״ס–בט״ע",
    display_label: "אח״ס–בט״ע",
    category: "base",
    sort_order: 36,
    registered: true,
    active: false,
    executable: false,
    engine_verified: false,
    scannable: false,
    execution_kind: "unimplemented",
    method_version: 1,
    required_entitlement: "public",
    in_engine_drift: false,
    not_scannable_reason: "not_active_human_gate",
  },
];

test("builds one pure contract with expression-first focus and regular fallback", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
  });

  assert.equal(model.contract, GEMATRIA_PRESENTATION_CONTRACT);
  assert.equal(model.focusKind, "expression");
  assert.equal(model.focal.primaryType, "expression");
  assert.equal(model.focal.primary, "עמית");
  assert.equal(model.focal.secondary, 520);
  assert.equal(model.activeMethod.methodKey, "רגיל");
  assert.equal(model.activeMethod.exceptionalState, null, "ordinary verified method stays visually quiet");
});

test("uses the Research Context method first and preserves number-first focus", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    numberRoot: 646,
    focusKind: "number",
    activeMethodKey: "מילוי",
    methodProfile: PROFILE,
    methodStates: STATES,
  });

  assert.equal(model.activeMethod.methodKey, "מילוי");
  assert.equal(model.previewMethods[0].methodKey, "מילוי");
  assert.equal(model.focal.primaryType, "number");
  assert.equal(model.focal.primary, 646);
  assert.equal(model.focal.secondary, "עמית");
  assert.equal(model.continuity.methodKey, "מילוי");
  assert.equal(model.continuity.focus, "number");
});

test("does not invent evidence independence when the governed owner supplied none", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
  });

  assert.equal(model.evidence.independentMethodCount, 0);
  assert.equal(model.evidence.dependentMethodCount, 0);
  assert.equal(model.evidence.unknownMethodCount, model.methodCount);
  assert.equal(model.evidence.hasGovernedClassification, false);
});

test("carries governed evidence classification without recomputing it", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
    evidenceByMethodKey: {
      "רגיל": "independent",
      "מילוי": { independence: "independent" },
      "גדול": { evidenceClass: "dependent" },
      "מילוי בלבד": { evidence_class: "dependent" },
    },
  });

  assert.equal(model.evidence.independentMethodCount, 2);
  assert.equal(model.evidence.dependentMethodCount, 2);
  assert.equal(model.evidence.hasGovernedClassification, true);
  assert.equal(model.methods.find((m) => m.methodKey === "רגיל+מילוי").evidence.independence, "unknown");
});

test("projects governed expression-level raw versus independent evidence without recomputing it", () => {
  const model = buildGematriaPresentationModel({
    expression: "דעת",
    methodProfile: PROFILE,
    methodStates: STATES,
    expressionEvidenceSummary: {
      phrase_count: 124,
      independent_phrase_count: 120,
      dependent_expression_phrase_count: 4,
      p1_hits: 57,
      independent_p1_method_count: 6,
      signal: "CORE_AXIS_CANDIDATE",
    },
  });

  assert.deepEqual(model.expressionEvidence, {
    available: true,
    rawPhraseCount: 124,
    independentPhraseCount: 120,
    dependentExpressionPhraseCount: 4,
    rawP1Hits: 57,
    independentP1MethodCount: 6,
    signal: "CORE_AXIS_CANDIDATE",
    governed: true,
  });
});

test("never derives expression evidence counts when the governed owner did not supply them", () => {
  const model = buildGematriaPresentationModel({
    expression: "דעת",
    methodProfile: PROFILE,
    methodStates: STATES,
    expressionEvidenceSummary: {
      phrase_count: 124,
      signal: "CORE_AXIS_CANDIDATE",
    },
  });

  assert.equal(model.expressionEvidence.rawPhraseCount, 124);
  assert.equal(model.expressionEvidence.independentPhraseCount, null);
  assert.equal(model.expressionEvidence.dependentExpressionPhraseCount, null);
  assert.equal(model.expressionEvidence.available, true);
});

test("marks structural roles but keeps evidence independence as a separate axis", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
    evidenceByMethodKey: {
      "מילוי בלבד": "dependent",
    },
  });

  const composite = model.methods.find((m) => m.methodKey === "מילוי בלבד");
  assert.equal(composite.primaryRole, "composite");
  assert.deepEqual(composite.derivedFrom, ["מילוי", "רגיל"]);
  assert.equal(composite.exceptionalState, "composite");
  assert.equal(composite.evidence.independence, "dependent");
});

test("applied equivalence must be supplied by the governed caller; raw identity is preserved", () => {
  const baseline = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
  });
  assert.equal(baseline.methods.find((m) => m.methodKey === "גדול").primaryRole, "independent");

  const applied = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
    appliedEquivalences: [{
      representativeMethodKey: "רגיל",
      methodKeys: ["רגיל", "גדול"],
      reason: "resolved-upstream-no-final-letters",
    }],
  });

  const regular = applied.methods.find((m) => m.methodKey === "רגיל");
  const gadol = applied.methods.find((m) => m.methodKey === "גדול");
  assert.equal(regular.primaryRole, "equivalent");
  assert.equal(gadol.primaryRole, "equivalent");
  assert.equal(gadol.equivalence.representativeMethodKey, "רגיל");
  assert.equal(gadol.methodKey, "גדול", "equivalence never merges method identity");
});

test("groups same numeric value while retaining every method identity", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
    appliedEquivalences: [{
      representativeMethodKey: "רגיל",
      methodKeys: ["רגיל", "גדול"],
      reason: "resolved-upstream",
    }],
  });

  const group520 = model.valueGroups.find((group) => group.value === 520);
  assert.ok(group520);
  assert.deepEqual(group520.methodKeys, ["רגיל", "גדול"]);
  assert.equal(group520.hasMultipleMethods, true);
});

test("context-activated methods stay hidden until the context explicitly activates them", () => {
  const normal = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
  });
  assert.equal(normal.methods.some((m) => m.methodKey === "אות רבתי"), false);

  const contextual = buildGematriaPresentationModel({
    expression: "עמית",
    activeMethodKey: "אות רבתי",
    contextualMethodKeys: ["אות רבתי"],
    methodProfile: PROFILE,
    methodStates: STATES,
  });
  assert.equal(contextual.activeMethod.methodKey, "אות רבתי");
  assert.equal(contextual.activeMethod.primaryRole, "contextual");
  assert.equal(contextual.activeMethod.exceptionalState, "contextual");
});

test("method families use human groups while preserving Registry order inside", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
    contextualMethodKeys: ["אות רבתי"],
  });

  assert.deepEqual(model.familyGroups.map((g) => g.key), ["base", "depth", "composite", "contextual"]);
  const base = model.familyGroups.find((g) => g.key === "base");
  assert.deepEqual(base.methods.map((m) => m.methodKey), ["רגיל", "מילוי", "גדול"]);
});

test("S2 preview is bounded, active-first, and does not invent a priority array", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    activeMethodKey: "משולש מילה",
    methodProfile: PROFILE,
    methodStates: STATES,
  });

  assert.equal(model.previewMethods.length, DEFAULT_GEMATRIA_PREVIEW_LIMIT);
  assert.equal(model.previewMethods[0].methodKey, "משולש מילה");
  assert.deepEqual(
    model.previewMethods.slice(1).map((m) => m.methodKey),
    ["רגיל", "מילוי", "גדול", "מילוי בלבד", "רגיל+מילוי"],
  );
});

test("golden 474 keeps peer expressions separate from normalized evidence weight", () => {
  const model = buildGematriaPresentationModel({
    expression: "דעת",
    methodProfile: [{
      methodKey: "רגיל",
      displayLabel: "רגיל",
      category: "base",
      sortOrder: 1,
      computedValue: 474,
      definitionVersion: 1,
    }],
    methodStates: [STATES[0]],
    expressionEvidenceSummary: {
      phrase_count: 124,
      independent_phrase_count: 120,
      dependent_expression_phrase_count: 4,
      p1_hits: 57,
      independent_p1_method_count: 6,
      signal: "CORE_AXIS_CANDIDATE",
    },
    peerExpressions: [
      { expression: "עדת", value: 474, methodKey: "רגיל", verified: true },
      { expression: "תדע", value: 474, methodKey: "רגיל", verified: true },
    ],
  });

  assert.equal(model.focal.secondary, 474);
  assert.equal(model.expressionEvidence.rawPhraseCount, 124);
  assert.equal(model.expressionEvidence.independentPhraseCount, 120);
  assert.equal(model.expressionEvidence.dependentExpressionPhraseCount, 4);
  assert.deepEqual(model.peerExpressions.map((item) => item.expression), ["עדת", "תדע"]);
  assert.equal("score" in model.expressionEvidence, false, "Presentation must not create a universal reliability score");
});

test("projects supplied peer expressions without inventing discovery", () => {
  const model = buildGematriaPresentationModel({
    expression: "דעת",
    methodProfile: PROFILE,
    methodStates: STATES,
    peerExpressions: [
      { expression: "עדת", value: 474, method_key: "רגיל", verified: true },
      { expression: "תדע", value: 474, methodKey: "רגיל", verification_state: "engine_verified" },
      { expression: "", value: 474 },
    ],
  });

  assert.deepEqual(model.peerExpressions, [
    {
      expression: "עדת",
      value: 474,
      methodKey: "רגיל",
      verified: true,
      verificationState: null,
    },
    {
      expression: "תדע",
      value: 474,
      methodKey: "רגיל",
      verified: false,
      verificationState: "engine_verified",
    },
  ]);
});

test("preserves the original expression and only surfaces normalization notice when explicitly material", () => {
  const model = buildGematriaPresentationModel({
    expressionRaw: "  עמית׳  ",
    methodProfile: PROFILE,
    methodStates: STATES,
    normalization: {
      normalized: "עמית",
      changed: true,
      materiallyChanged: true,
      reasons: ["removed punctuation"],
    },
  });

  assert.equal(model.subject.expressionRaw, "עמית׳");
  assert.equal(model.subject.expressionNormalized, "עמית");
  assert.equal(model.normalization.changed, true);
  assert.equal(model.normalization.visibleNoticeNeeded, true);
  assert.deepEqual(model.normalization.reasons, ["removed punctuation"]);
});

test("redacts a restricted result instead of leaking its computed value", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    activeMethodKey: "מילוי",
    methodProfile: PROFILE,
    methodStates: STATES,
    accessByMethodKey: {
      "מילוי": { allowed: false, reason: "premium" },
    },
  });

  assert.equal(model.activeMethod.methodKey, "מילוי");
  assert.equal(model.activeMethod.value, null);
  assert.equal(model.activeMethod.available, false);
  assert.equal(model.activeMethod.exceptionalState, "unavailable");
  assert.equal(model.valueGroups.some((group) => group.value === 646), false);
});

test("can expose an unavailable registered identity without fabricating a result", () => {
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    activeMethodKey: "אח״ס–בט״ע",
    methodProfile: PROFILE,
    methodStates: STATES,
    includeUnavailableKeys: ["אח״ס–בט״ע"],
  });

  assert.equal(model.activeMethod.methodKey, "אח״ס–בט״ע");
  assert.equal(model.activeMethod.value, null);
  assert.equal(model.activeMethod.available, false);
  assert.equal(model.activeMethod.exceptionalState, "unavailable");
});

test("relation/Journey projection stays a bounded summary and Trace stays lazy", () => {
  const leadingRelation = { kind: "numeric_relation", from: 520, to: 888 };
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    methodProfile: PROFILE,
    methodStates: STATES,
    relationsSummary: {
      count: 7,
      leadingRelation,
      journeyAvailable: true,
      edges: new Array(500).fill({}),
    },
    trace: { available: true, steps: new Array(500).fill({}) },
  });

  assert.equal(model.relationsSummary.count, 7);
  assert.equal(model.relationsSummary.leadingRelation, leadingRelation);
  assert.equal(model.relationsSummary.journeyAvailable, true);
  assert.equal("edges" in model.relationsSummary, false);
  assert.deepEqual(model.trace, { available: true, lazy: true });
  assert.equal("steps" in model.trace, false);
});

test("continuity keeps only semantic reopen state, not ephemeral UI", () => {
  const contextRef = { root: "topic:amit", journeyId: "journey:1" };
  const model = buildGematriaPresentationModel({
    expression: "עמית",
    activeMethodKey: "מילוי",
    methodProfile: PROFILE,
    methodStates: STATES,
    researchContextRef: contextRef,
  });

  assert.deepEqual(model.continuity, {
    expression: "עמית",
    methodKey: "מילוי",
    focus: "expression",
    researchContextRef: contextRef,
  });
  assert.equal("expandedSections" in model.continuity, false);
});

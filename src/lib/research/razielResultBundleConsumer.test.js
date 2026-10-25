import test from "node:test";
import assert from "node:assert/strict";

import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import { buildRazielResultBundleConsumer } from "./razielResultBundleConsumer.js";

function finding({
  id,
  label,
  value = null,
  kind = "gematria",
  method = "ragil",
  accessTier = "public",
  extraFact = {},
  sourceName = "ספר יצירה",
} = {}) {
  return makeUniversalFinding({
    id,
    kind,
    stage: "evidence",
    subject: { type: typeof value === "number" ? "number" : "expression", key: label, label, lang: "he", value },
    source: { engine: "canonical-gematria", adapter: "golden-v1", name: sourceName, sourceRef: `source:${id}`, method, lang: "he" },
    identity: { sourceIdentity: `native:${id}`, entityRef: `entity:${id}` },
    verification: {
      claimed_expression: label,
      claimed_method: method,
      claimed_value: value,
      engine_method_tested: method,
      engine_result: { value, method, method_version: "v1", raw_private: "MUST_NOT_LEAK" },
      verification_state: "match",
    },
    evidence: {
      refs: [`evidence:${id}`],
      facts: [{ type: "calculation", expression: label, value, method, method_version: "v1", ...extraFact }],
    },
    access: { tier: accessTier },
    provenance: { createdBy: "ENGINE:canonical-gematria", createdAt: "2026-10-22T00:00:00.000Z" },
  });
}

function publicBundle({ findings = [], capabilities = null, outcomes = [], query = null, ranking = [] } = {}) {
  return composeResearchResultBundle({
    query: query || { question: "מה זה 776?", intent: "number_definition", identities: [{ type: "number", value: 776, label: "776" }] },
    capabilities: capabilities || [capabilityResult({
      key: "gematria",
      owner: "project_codex.gematria_engine",
      findings,
      findingOutcomes: outcomes,
      sourceRefs: ["gematria_api"],
      versionRefs: ["canonical_methods_registry_law:v6"],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
      cost: { certainty: "not_billable", ai_calls: 0, rpc_calls: 1, retry_count: 0, secret: "DROP" },
      trace: { trace_ref: "trace:776", private_prompt: "DROP" },
    })],
    ranking,
  });
}

function methodProfileFinding(index, overrides = {}) {
  const method = overrides.method_key ?? (index === 0 ? "ragil" : `method_${index + 1}`);
  const label = overrides.method_label ?? (index === 0 ? "רגיל" : `שיטה ${index + 1}`);
  const value = overrides.value ?? (index === 0 ? 73 : 100 + index);
  const family = overrides.mathematical_family ?? (index === 0 ? "regular" : `family_${index + 1}`);
  return makeUniversalFinding({
    id: `uf:method-profile:${method}`,
    kind: "gematria-method-value",
    subject: { type: "phrase", key: "חכמה", label: "חכמה", lang: "he", value },
    source: { engine: "gematria", adapter: "fn-method-profile-w2-v1", method, lang: "he" },
    identity: { sourceIdentity: { method, expression: "חכמה", value } },
    verification: { engine_method_tested: method, engine_result: value, verification_state: "not_tested" },
    evidence: { facts: [{
      type: "gematria-method-profile-value",
      method,
      label,
      value,
      category: index < 5 ? "יסוד" : "מורחב",
      mathematical_family: family,
      atomic_or_composite: index % 2 ? "composite" : "atomic",
      method_version: 6,
      derived_from: overrides.derived_from ?? [],
      dependency_rules: overrides.dependency_rules ?? [],
      dependency_version: overrides.dependency_version ?? null,
    }] },
    access: { tier: "public" },
    provenance: { createdBy: "ENGINE:fn_method_profile" },
  });
}

test("776 Golden projects one canonical Bundle without calculation, AI or raw payload", () => {
  const f = finding({ id: "uf:776", label: "776", value: 776 });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [f] }));

  assert.equal(out.contract_version, 1);
  assert.equal(out.model_input.findings.length, 1);
  assert.equal(out.model_input.findings[0].verification.engine_result.value, 776);
  assert.equal(out.human_view.cards[0].label, "776");
  assert.equal(out.human_view.cards[0].source_name, "ספר יצירה");
  assert.equal(out.human_view.cards[0].source_lang, "he");
  assert.equal(out.guards.no_calculation, true);
  assert.equal(out.guards.no_model_call, true);
  assert.equal(out.guards.no_network_or_database, true);
  const serialized = JSON.stringify(out);
  assert.doesNotMatch(serialized, /MUST_NOT_LEAK|raw_private|private_prompt|"secret"/);
});

test("phrase pair preserves derivation, convergence and independent evidence without collapsing them", () => {
  const a = finding({ id: "uf:pair:derived", label: "משיח ↔ מלך ישראל", value: 358 });
  const b = finding({ id: "uf:pair:independent", label: "משיח ↔ מלך ישראל", value: 358, method: "misratar" });
  const outcomes = [
    { findingId: a.id, evidenceRelation: EVIDENCE_RELATION.DERIVATION, dependsOn: ["uf:source"], reason: "same governed result" },
    { findingId: a.id, evidenceRelation: EVIDENCE_RELATION.CONVERGENCE, convergenceKey: "value:358", reason: "two routes meet" },
    { findingId: b.id, evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE, reason: "independent method family", expectedness: "measured", expectednessModel: "fixture-v1", baseRate: 0.2 },
  ];
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [a, b], outcomes }));

  assert.deepEqual(out.model_input.finding_outcomes.map((x) => x.evidence_relation), [
    "derivation", "convergence", "independent_evidence",
  ]);
  assert.equal(out.model_input.constraints.derivation_is_not_independent_evidence, true);
  assert.equal(out.model_input.findings[1].evidence_relations[0].expectedness_model, "fixture-v1");
});

test("crossing evidence keeps bounded methods and partner while free-form payload remains blocked", () => {
  const f = makeUniversalFinding({
    id: "uf:crossing:messiah:shalom",
    kind: "gematria-crossing",
    subject: { type: "relation", key: "crossing:messiah:shalom", label: "משיח ↔ שלום", lang: "he" },
    source: { engine: "strongest_crossings", adapter: "gematria-corpus-crossing-w2-v1", sourceRef: "rpc:strongest_crossings", lang: "he" },
    identity: { sourceIdentity: "crossing:messiah:shalom", relationRef: "crossing:messiah:shalom" },
    verification: {
      engine_method_tested: "strongest_crossings",
      engine_result: {
        method_count: 2,
        methods: [{ method: "אתבש", value: 112 }, { method: "סידורי", value: 52 }],
        dependency_independence_claimed: false,
        relation_normalization: {
          source: "rpc:fn_relation_candidate",
          relation_kind: "gematria_convergence",
          engine_signal: 4.989,
          confidence: "candidate",
          research_priority: "HIGH_ENGINE_NO_EVIDENCE_YET",
          raw_independent_group_count: 2,
          effective_independent_group_count: 2,
          effective_structure_sensitive_group_count: 1,
          expression_dependency: { same_word_multiset: false, same_letter_multiset: false },
          engine_evidence: [{ method: "אתבש", value: 112, normalized_rarity: 0.01, private: "DROP_PRIVATE" }],
          composite_evidence: [],
          independent_evidence_transport: "excluded_v1_access_boundary",
          independent_evidence_counts: { edges: 0, topic_cards: 0, research_objects: 0 },
        },
        arbitrary_commentary: "DROP",
      },
      verification_state: "not_tested",
    },
    evidence: {
      refs: ["rpc:strongest_crossings"],
      facts: [{ type: "gematria-multi-method-corpus-crossing", expression: "משיח", partner: "שלום", method_count: 2 }],
    },
    access: { tier: "public" },
    provenance: { createdBy: "ENGINE:strongest_crossings" },
  });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [f] }));
  const projected = out.model_input.findings[0];

  assert.deepEqual(projected.verification.engine_result.methods, [
    { method: "אתבש", value: 112 },
    { method: "סידורי", value: 52 },
  ]);
  assert.equal(projected.verification.engine_result.method_count, 2);
  assert.equal(projected.verification.engine_result.dependency_independence_claimed, false);
  assert.equal(projected.verification.engine_result.relation_normalization.effective_independent_group_count, 2);
  assert.equal(projected.verification.engine_result.relation_normalization.engine_signal, 4.989);
  assert.equal(projected.verification.engine_result.relation_normalization.independent_evidence_counts.edges, 0);
  assert.equal(projected.evidence.facts[0].partner, "שלום");
  assert.doesNotMatch(JSON.stringify(out), /arbitrary_commentary|DROP|DROP_PRIVATE/);
});

test("confirmed cross-method fact and SOD1820 interpretation survive as distinct projected layers", () => {
  const relation = makeUniversalFinding({
    id: "uf:relation:wisdom-understanding",
    kind: "gematria-confirmed-relation",
    stage: "evidence",
    status: "confirmed",
    subject: { type: "relation", key: "wisdom-understanding", label: "חכמה (מסתתר) ↔ בינה (רגיל)", lang: "he", value: 67 },
    source: { engine: "relation_evidence", name: "ממצאי המחקר המאושרים של SOD1820", sourceRef: "public:relation_evidence:one", method: "מסתתר", lang: "he" },
    identity: { sourceIdentity: "relation:one", relationRef: "relation:one" },
    verification: {
      claimed_expression: "חכמה (מסתתר) = בינה (רגיל)",
      claimed_method: "מסתתר",
      claimed_value: 67,
      engine_method_tested: "מסתתר↔רגיל",
      engine_result: {
        relation_kind: "confirmed_cross_method_relation",
        relation_type: "hidden",
        expression: "חכמה",
        partner: "בינה",
        value: 67,
        expression_method: "מסתתר",
        partner_method: "רגיל",
        engine_verified: true,
      },
      verification_state: "match",
    },
    evidence: { refs: ["public:relation_evidence:one"], facts: [{
      type: "gematria-confirmed-cross-method-relation",
      expression: "חכמה",
      partner: "בינה",
      value: 67,
      expression_method: "מסתתר",
      partner_method: "רגיל",
      engine_verified: true,
    }] },
    access: { tier: "public" },
    provenance: { createdBy: "SOURCE:relation_evidence" },
  });
  const semantic = makeUniversalFinding({
    id: "uf:semantic:hidden",
    kind: "gematria-method-semantic",
    stage: "interpretation",
    status: "approved",
    subject: { type: "relation", key: "semantic:hidden", label: "מסתתר — נסתר", lang: "he" },
    source: { engine: "method_semantics", name: "מודל המשמעות המאושר של SOD1820", sourceRef: "public:method_semantics:one", method: "מסתתר", lang: "he" },
    identity: { sourceIdentity: "semantic:hidden", relationRef: "relation:one" },
    verification: { verification_state: "not_tested" },
    evidence: { refs: [relation.id], facts: [{
      type: "gematria-method-semantic-interpretation",
      method: "מסתתר",
      relation_type: "hidden",
      label_he: "נסתר",
      calculation_description: "הפרשים בין אותיות סמוכות",
      semantic_description: "הרובד הנסתר של הביטוי",
      relation_note: "הבינה מסתתרת בתוך החכמה",
      confidence_source: "sod1820_model",
      review_version: "2026.07",
      profile: "sod1820",
      hidden_private_comment: "DROP",
    }] },
    access: { tier: "public" },
    provenance: { createdBy: "SOURCE:method_semantics", parentFindingIds: [relation.id] },
  });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [relation, semantic] }));
  const projectedRelation = out.model_input.findings.find(item => item.id === relation.id);
  const projectedSemantic = out.model_input.findings.find(item => item.id === semantic.id);

  assert.equal(projectedRelation.verification.state, "match");
  assert.equal(projectedRelation.verification.engine_result.expression_method, "מסתתר");
  assert.equal(projectedRelation.verification.engine_result.partner_method, "רגיל");
  assert.equal(projectedSemantic.stage, "interpretation");
  assert.equal(projectedSemantic.evidence.facts[0].semantic_description, "הרובד הנסתר של הביטוי");
  assert.equal(projectedSemantic.evidence.facts[0].relation_note, "הבינה מסתתרת בתוך החכמה");
  assert.doesNotMatch(JSON.stringify(out), /hidden_private_comment|DROP/);
});

test("negative, failed and missing capabilities remain distinct and visible", () => {
  const bundle = publicBundle({
    capabilities: [
      capabilityResult({ key: "corpus", status: CAPABILITY_STATUS.NEGATIVE_RESULT, reason: "no exact match", negativeScope: { operation: "exact", max_search_depth: 500 } }),
      capabilityResult({ key: "els", status: CAPABILITY_STATUS.FAILED, reason: "engine unavailable" }),
      capabilityResult({ key: "crossings", status: CAPABILITY_STATUS.MISSING_ADAPTER, reason: "adapter not connected" }),
    ],
  });
  const out = buildRazielResultBundleConsumer(bundle);

  assert.equal(out.model_input.coverage.negative_result, 1);
  assert.equal(out.model_input.coverage.failed, 1);
  assert.equal(out.model_input.coverage.missing_adapter, 1);
  assert.equal(out.model_input.capabilities[0].negative_result.searched, true);
  assert.deepEqual(out.human_view.gaps.capabilities.map((x) => x.status), ["failed", "missing_adapter"]);
});

test("withheld personal Finding never reaches either Raziel view and is not negative evidence", () => {
  const personal = finding({ id: "uf:personal", label: "שם פרטי", value: 777, accessTier: "personal" });
  const bundle = publicBundle({
    findings: [],
    capabilities: [capabilityResult({
      key: "personal_gematria",
      findings: [personal],
      accessClass: ACCESS_CLASS.PERSONAL,
      semanticClass: "evidence",
    })],
    query: {
      question: "חקור את השם הפרטי",
      identities: [{ type: "name", label: "שם פרטי", source: "personal_context", access: { tier: "personal" } }],
    },
  });
  const out = buildRazielResultBundleConsumer(bundle);
  const serialized = JSON.stringify(out);

  assert.equal(out.model_input.findings.length, 0);
  assert.equal(out.model_input.coverage.access_filtered, 1);
  assert.equal(out.model_input.constraints.access_filtered_is_not_negative_evidence, true);
  assert.equal(out.model_input.query.question, null);
  assert.equal(out.model_input.query.free_text_withheld, true);
  assert.doesNotMatch(serialized, /שם פרטי|777/);
});

test("bounded source remains visibly truncated and continuation payload is not copied", () => {
  const f = finding({ id: "uf:1820", label: "1820", value: 1820 });
  const bundle = publicBundle({
    capabilities: [capabilityResult({
      key: "number_context",
      findings: [f],
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "evidence",
      bounded: { total_count: 50, returned_count: 6, truncated: true, ordering: "canonical", continuation: { raw_private: "cursor-secret" } },
    })],
  });
  const out = buildRazielResultBundleConsumer(bundle);

  assert.equal(out.model_input.output_bounds.source_truncated, true);
  assert.equal(out.model_input.capabilities[0].bounded.total_count, 50);
  assert.equal(out.model_input.capabilities[0].bounded.returned_count, 6);
  assert.equal(out.model_input.capabilities[0].bounded.continuation_available, true);
  assert.doesNotMatch(JSON.stringify(out), /cursor-secret|raw_private/);
});

test("projects only the bounded confirmed-relation completion witness", () => {
  const bundle = publicBundle({
    capabilities: [capabilityResult({
      key: "crossings",
      findings: [],
      status: CAPABILITY_STATUS.EXECUTED,
      accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
      semanticClass: "derivation",
      trace: {
        confirmed_relation_source: {
          source: "public:relation_evidence",
          status: "available",
          returned_count: 0,
          semantic_status: "not_needed",
          public_endpoint_status: "not_needed",
          raw_private: "DROP",
        },
        private_prompt: "DROP",
      },
    })],
  });
  const out = buildRazielResultBundleConsumer(bundle);

  assert.deepEqual(out.model_input.capabilities[0].trace.confirmed_relation_source, {
    source: "public:relation_evidence",
    status: "available",
    returned_count: 0,
    semantic_status: "not_needed",
    public_endpoint_status: "not_needed",
  });
  assert.doesNotMatch(JSON.stringify(out), /raw_private|private_prompt|DROP/);
});

test("projection is deterministic, deeply frozen and never echoes an existing synthesis", () => {
  const f = finding({ id: "uf:stable", label: "יציב", value: 1820 });
  const bundle = { ...publicBundle({ findings: [f] }), synthesis: { message: "DO NOT FEED BACK", private_prompt: "DROP" } };
  const first = buildRazielResultBundleConsumer(bundle);
  const second = buildRazielResultBundleConsumer(bundle);

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.model_input.findings[0]), true);
  assert.doesNotMatch(JSON.stringify(first), /DO NOT FEED BACK|private_prompt/);
});

test("missing numeric fields remain null and never become an invented zero", () => {
  const f = finding({ id: "uf:no-number", label: "ללא ערך", value: null });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [f] }));
  const projected = out.model_input.findings[0];

  assert.equal(projected.subject.value, null);
  assert.equal(projected.verification.claimed_value, null);
  assert.equal(projected.evidence.score, null);
  assert.equal(projected.evidence.confidence, null);
  assert.equal(projected.ranking, null);
});

test("consumer rejects arbitrary objects that bypass the canonical Bundle invariant", () => {
  assert.throws(
    () => buildRazielResultBundleConsumer({ findings: [{ id: "raw" }] }),
    /universal_finding_only/,
  );
});

test("explicit Bundle ranking is applied before the 12-Finding bound with stable unranked fallback", () => {
  const unranked = Array.from({ length: 12 }, (_, index) => finding({
    id: `uf:source:${index + 1}`,
    label: `מקור ${index + 1}`,
    value: 776,
    method: "אותיות אחרי",
  }));
  const second = finding({ id: "uf:lead:2", label: "מחשבת יהוה", value: 776, method: "רגיל" });
  const first = finding({ id: "uf:lead:1", label: "ביאת המשיח", value: 776, method: "רגיל" });
  const bundle = publicBundle({
    findings: [...unranked, second, first],
    ranking: [
      {
        finding_id: second.id,
        rank: 2,
        axes: { authority: "public.gematria_words.lead_rank", presentation_scope: "equal_regular_phrase_prominence", lead_rank: 2 },
        reasons: ["סדר ביטויים ידני קיים בדף המספר"],
      },
      {
        finding_id: first.id,
        rank: 1,
        axes: { authority: "public.gematria_words.lead_rank", presentation_scope: "equal_regular_phrase_prominence", lead_rank: 1 },
        reasons: ["סדר ביטויים ידני קיים בדף המספר"],
      },
    ],
  });
  const out = buildRazielResultBundleConsumer(bundle);

  assert.deepEqual(out.model_input.findings.slice(0, 4).map((item) => item.subject.label), [
    "ביאת המשיח", "מחשבת יהוה", "מקור 1", "מקור 2",
  ]);
  assert.equal(out.model_input.findings.length, 12);
  assert.equal(out.model_input.output_bounds.consumer_truncated, true);
  assert.equal(out.model_input.findings[0].ranking.axes.authority, "public.gematria_words.lead_rank");
  assert.equal(out.human_view.cards[0].presentation_rank, 1);
  assert.equal(out.human_view.cards[0].presentation_authority, "public.gematria_words.lead_rank");
  assert.deepEqual(out.model_input.findings.slice(2).map((item) => item.id), unranked.slice(0, 10).map((item) => item.id));
});

test("invalid ranking IDs and null ranks never reorder canonical source findings", () => {
  const first = finding({ id: "uf:first", label: "ראשון", value: 776 });
  const second = finding({ id: "uf:second", label: "שני", value: 776 });
  const bundle = publicBundle({
    findings: [first, second],
    ranking: [
      { finding_id: "uf:not-admitted", rank: 1 },
      { finding_id: second.id, rank: null },
    ],
  });
  const out = buildRazielResultBundleConsumer(bundle);
  assert.deepEqual(out.model_input.findings.map((item) => item.id), [first.id, second.id]);
});

test("calculator expression keeps every method value in a compact profile without crowding out crossings", () => {
  const methods = Array.from({ length: 15 }, (_, index) => methodProfileFinding(index));
  const crossing = finding({
    id: "uf:crossing:wisdom:partner",
    label: "חכמה ↔ ביטוי מאומת",
    value: 365,
    kind: "gematria-crossing",
  });
  const out = buildRazielResultBundleConsumer(publicBundle({
    query: { question: "מה אני רואה כאן?", intent: "understand", identities: [{ type: "phrase", label: "חכמה" }] },
    findings: [...methods, crossing],
  }));

  assert.equal(out.model_input.calculation_profile.length, 15);
  assert.deepEqual(out.model_input.calculation_profile[0], {
    finding_id: "uf:method-profile:ragil",
    method_key: "ragil",
    method_label: "רגיל",
    value: 73,
    category: "יסוד",
    mathematical_family: "regular",
    atomic_or_composite: "atomic",
    method_version: 6,
    derived_from: [],
    dependency_rules: [],
    dependency_version: null,
  });
  assert.equal(out.model_input.findings[0].id, crossing.id);
  assert.equal(out.model_input.findings.length, 12);
  assert.equal(out.model_input.output_bounds.consumer_truncated, true);
  assert.equal(out.model_input.constraints.calculation_values_must_come_from_calculation_profile, true);
  assert.equal(out.model_input.constraints.method_count_is_not_independent_support_count, true);
  assert.deepEqual(out.human_view.calculation_profile, out.model_input.calculation_profile);
  assert.deepEqual(out.human_view.method_value_groups, out.model_input.method_value_groups);
});

test("normalizes equal method outputs into one numeric basis without erasing methods or claiming independence", () => {
  const regular = methodProfileFinding(0, {
    value: 73,
    mathematical_family: "base_additive",
    dependency_version: 1,
    dependency_rules: [{ type: "conditional_equivalence", to: "גדול", condition: "no_final_letters" }],
  });
  const large = methodProfileFinding(5, {
    method_key: "גדול",
    method_label: "גדול",
    value: 73,
    mathematical_family: "base_additive",
    dependency_version: 1,
    dependency_rules: [{ type: "conditional_equivalence", to: "רגיל", condition: "no_final_letters" }],
  });
  const hidden = methodProfileFinding(2, { value: 67, mathematical_family: "adjacent_difference" });
  const out = buildRazielResultBundleConsumer(publicBundle({ findings: [regular, large, hidden] }));

  assert.equal(out.model_input.method_value_groups.length, 2);
  const group73 = out.model_input.method_value_groups.find((group) => group.value === 73);
  assert.deepEqual(group73.methods.map((method) => method.method_label), ["רגיל", "גדול"]);
  assert.equal(group73.method_count, 2);
  assert.equal(group73.mathematical_family_count, 1);
  assert.equal(group73.same_value_collision, true);
  assert.deepEqual(group73.proven_equivalence_sets, [{
    methods: ["רגיל", "גדול"],
    basis: "canonical_registry_conditional_equivalence",
  }]);
  assert.equal(group73.effective_distinct_method_count, 1);
  assert.equal(group73.dependency_resolution, "canonical_registry_rules_applied");
  assert.equal(group73.independent_support_count, null);
  assert.equal(group73.counts_as_independent_evidence, false);
  assert.equal(out.model_input.calculation_profile.length, 3, "normalization must preserve the full method map");
});

test("does not apply a no-final-letters equivalence when the researched expression has a final letter", () => {
  const regular = methodProfileFinding(0, {
    value: 596,
    dependency_version: 1,
    dependency_rules: [{ type: "conditional_equivalence", to: "גדול", condition: "no_final_letters" }],
  });
  const large = methodProfileFinding(5, {
    method_key: "גדול",
    method_label: "גדול",
    value: 596,
    dependency_version: 1,
  });
  const rewriteSubject = (finding) => ({
    ...finding,
    subject: { ...finding.subject, key: "ירושלים", label: "ירושלים" },
  });
  const out = buildRazielResultBundleConsumer(publicBundle({
    findings: [rewriteSubject(regular), rewriteSubject(large)],
  }));
  const group = out.model_input.method_value_groups[0];
  assert.deepEqual(group.proven_equivalence_sets, []);
  assert.equal(group.effective_distinct_method_count, 2);
  assert.equal(group.independent_support_count, null);
});

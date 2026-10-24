import test from "node:test";
import assert from "node:assert/strict";

import { buildRazielGroundedSourceComposer } from "./razielGroundedSourceComposer.js";

function projection(findings, cards = null, extra = {}) {
  return Object.freeze({
    model_input: {
      findings,
      output_bounds: { source_truncated: false, consumer_truncated: false },
      ...extra,
    },
    human_view: {
      cards: cards || findings.map((finding) => ({
        source_name: finding.source?.source_name,
        source_ref: finding.source?.source_ref,
        source_lang: finding.source?.lang,
      })),
    },
    guards: { existing_result_bundle_is_authority: true },
  });
}

const verified = {
  id: "uf:verified",
  kind: "gematria",
  stage: "evidence",
  subject: { label: "ביאת המשיח", value: 776 },
  source: { source_name: "מאגר הגימטריה המאומת", source_ref: "gematria_words:one", method: "רגיל", lang: "he" },
  verification: { state: "match", engine_method_tested: "רגיל", engine_result: { value: 776 } },
  evidence: { facts: [{ type: "calculation" }] },
};

const sourceClaim = {
  id: "uf:claim",
  kind: "gematria",
  stage: null,
  subject: { label: "מחשבת יהוה", value: 776 },
  source: { source_name: "ספר יצירה", source_ref: "book:sefer-yetzirah#p1", method: "רגיל", lang: "he" },
  verification: { state: null, claimed_expression: "מחשבת יהוה", engine_result: null },
  evidence: { facts: [{ type: "published-gematria-phrase" }] },
};

test("keeps canonical presentation order and labels verified calculation separately from source claim", () => {
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: projection([sourceClaim, verified]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.equal(prompt.composer_contract, "raziel-grounded-source-composer-v7");
  assert.deepEqual(prompt.bundles[0].result.findings.map((finding) => finding.id), ["uf:claim", "uf:verified"]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.source_claims, ["uf:claim"]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.verified_calculations, ["uf:verified"]);
  assert.match(out.fallback, /טענת המאגר: מחשבת יהוה/);
  assert.match(out.fallback, /חישוב מאומת: ביאת המשיח/);
  assert.ok(out.fallback.indexOf("מחשבת יהוה") < out.fallback.indexOf("ביאת המשיח"));
  assert.deepEqual(prompt.bundles[0].source_wording, ["מחשבת יהוה", "ביאת המשיח"]);
  assert.equal(prompt.bundles[0].rarity_claim_allowed, false);
  assert.match(out.guidance, /אל תמציא לו שם חלופי/);
  assert.match(out.guidance, /לא סופק מדד נדירות מפורש/);
  assert.equal(out.guards.source_wording_integrity, true);
  assert.equal(out.guards.no_extra_model_call, true);
});

test("emits only canonical number navigation and never fabricates a source URL", () => {
  const out = buildRazielGroundedSourceComposer([
    { subject: { type: "number", value: 1820 }, projection: projection([verified]) },
    { subject: { type: "expression", value: "משיח" }, projection: projection([sourceClaim]) },
  ]);

  assert.deepEqual(out.navigation, [{ kind: "number", label: "פתח את דף המספר 1820", href: "/2029/number/1820" }]);
  assert.deepEqual(out.sources, [
    { original_name: "מאגר הגימטריה המאומת", source_ref: "gematria_words:one", lang: "he" },
    { original_name: "ספר יצירה", source_ref: "book:sefer-yetzirah#p1", lang: "he" },
  ]);
  assert.equal(out.guards.no_source_url_inference, true);
  assert.doesNotMatch(JSON.stringify(out.sources), /href|https?:/);
});

test("engine convergence is not promoted to verified or independent evidence", () => {
  const crossing = {
    id: "uf:crossing",
    kind: "gematria-crossing",
    stage: "evidence",
    subject: { label: "משיח ↔ שלום" },
    source: { source_name: "מאגר הביטויים", source_ref: "rpc:strongest_crossings", lang: "he" },
    verification: {
      state: "not_tested",
      engine_result: {
        methods: [{ method: "אתבש", value: 112 }, { method: "סידורי", value: 52 }],
        dependency_independence_claimed: false,
      },
    },
    evidence: { facts: [{ type: "gematria-multi-method-corpus-crossing" }] },
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "משיח" },
    projection: projection([crossing]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.deepEqual(prompt.bundles[0].evidence_lanes.engine_findings, ["uf:crossing"]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.verified_calculations, []);
  assert.match(out.fallback, /ממצא מנוע: משיח ↔ שלום/);
  assert.match(out.fallback, /אתבש=112/);
  assert.match(out.fallback, /עצמאות בין משפחות החישוב לא נטענה/);
  assert.match(out.guidance, /gematria-method-semantic הוא פרשנות מאושרת/);
});

test("confirmed SOD1820 relation is verified while its method meaning stays explicit interpretation", () => {
  const relation = {
    id: "uf:relation:wisdom-understanding",
    kind: "gematria-confirmed-relation",
    stage: "evidence",
    subject: { label: "חכמה (מסתתר) ↔ בינה (רגיל)", value: 67 },
    source: { source_name: "ממצאי המחקר המאושרים של SOD1820", source_ref: "public:relation_evidence:one", method: "מסתתר", lang: "he" },
    verification: { state: "match", engine_method_tested: "מסתתר↔רגיל", engine_result: { value: 67, engine_verified: true } },
    evidence: { facts: [{ type: "gematria-confirmed-cross-method-relation", expression: "חכמה", partner: "בינה" }] },
  };
  const interpretation = {
    id: "uf:semantic:hidden",
    kind: "gematria-method-semantic",
    stage: "interpretation",
    subject: { label: "מסתתר — נסתר" },
    source: { source_name: "מודל המשמעות המאושר של SOD1820", source_ref: "public:method_semantics:one", method: "מסתתר", lang: "he" },
    verification: { state: "not_tested", engine_result: null },
    evidence: { facts: [{ type: "gematria-method-semantic-interpretation", semantic_description: "הרובד הנסתר של הביטוי" }] },
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "חכמה" },
    projection: projection([relation, interpretation]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.equal(prompt.response_mode, "expression_crossing");
  assert.deepEqual(prompt.bundles[0].evidence_lanes.verified_calculations, [relation.id]);
  assert.deepEqual(prompt.bundles[0].evidence_lanes.explicit_interpretations, [interpretation.id]);
  assert.equal(prompt.presentation_contract.confirmed_relation_is_sod1820_research_evidence, true);
  assert.equal(prompt.presentation_contract.method_semantic_is_explicit_sod1820_interpretation, true);
  assert.match(out.guidance, /לא עובדה מתמטית ולא אמת מסורתית אוניברסלית/);
});

test("focused hidden-method question deterministically binds 67 to חכמה and בינה", () => {
  const profile = [
    { method_key: "רגיל", method_label: "רגיל", value: 73 },
    { method_key: "מסתתר", method_label: "מסתתר", value: 67 },
    { method_key: "קדמי", method_label: "משולש", value: 271 },
  ];
  const relation = {
    id: "uf:relation:wisdom-understanding:direct",
    kind: "gematria-confirmed-relation",
    stage: "evidence",
    source: { source_name: "ממצאי המחקר המאושרים של SOD1820", source_ref: "public:relation_evidence:wisdom", method: "מסתתר", lang: "he" },
    verification: {
      state: "match",
      engine_result: {
        expression: "חכמה",
        partner: "בינה",
        expression_method: "מסתתר",
        partner_method: "רגיל",
        value: 67,
        engine_verified: true,
      },
    },
    evidence: { facts: [] },
  };
  const interpretation = {
    id: "uf:semantic:hidden:direct",
    kind: "gematria-method-semantic",
    stage: "interpretation",
    source: { source_name: "מודל המשמעות המאושר של SOD1820", source_ref: "public:method_semantics:hidden", method: "מסתתר", lang: "he" },
    verification: { state: "not_tested", engine_result: null },
    evidence: { facts: [{ type: "gematria-method-semantic-interpretation", method: "מסתתר", semantic_description: "הרובד הנסתר של הביטוי" }] },
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "חכמה", requestedMethod: "מסתתר" },
    projection: projection([relation, interpretation], null, { calculation_profile: profile }),
  }]);

  assert.equal(out.direct_answer.kind, "exact_expression_method");
  assert.equal(out.direct_answer.anchor_value, 67);
  assert.match(out.direct_answer.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(out.direct_answer.answer, /בינה בשיטת רגיל = 67/);
  assert.match(out.direct_answer.answer, /פרשנות של SOD1820/);
  assert.doesNotMatch(out.direct_answer.answer, /מסתתר = 73/);
});

test("focused Shaul method answer uses only the canonical expression and never command scaffolding", () => {
  const profile = [
    { method_key: "רגיל", method_label: "רגיל", value: 337 },
    { method_key: "מסתתר", method_label: "מסתתר", value: 328 },
    { method_key: "מסתתר גדול", method_label: "מסתתר גדול", value: 328 },
  ];
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "שאול", requestedMethod: "מסתתר" },
    projection: projection([], null, { calculation_profile: profile }),
  }]);

  assert.equal(out.direct_answer.kind, "exact_expression_method");
  assert.equal(out.direct_answer.anchor_value, 328);
  assert.match(out.direct_answer.answer, /שאול בשיטת מסתתר = 328/);
  assert.doesNotMatch(out.direct_answer.answer, /1868|שאול בשיטת מסתתר בשיטת/u);
  assert.equal(JSON.parse(out.prompt).presentation_contract.calculation_subject_must_equal_bundle_subject, true);
  assert.equal(out.guards.calculation_subject_fidelity, true);
});

test("unknown requested method fails closed after a complete canonical profile", () => {
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "שאול", requestedMethod: "שיטה שאינה קיימת" },
    projection: projection([], null, {
      calculation_profile: [{ method_key: "רגיל", method_label: "רגיל", value: 337 }],
    }),
  }]);

  assert.equal(out.direct_answer.kind, "exact_expression_method_unavailable");
  assert.match(out.direct_answer.answer, /לא נמצאה במפת החישוב הקנונית/);
  assert.match(out.direct_answer.answer, /לא חישבתי את מילות הפקודה/);
  assert.doesNotMatch(out.direct_answer.answer, /=\s*\d/u);
});

test("focused expression pair returns only the confirmed cross-method relation", () => {
  const relation = {
    id: "uf:relation:pair",
    kind: "gematria-confirmed-relation",
    stage: "evidence",
    source: { source_name: "ממצאי המחקר המאושרים של SOD1820", source_ref: "public:relation_evidence:pair", method: "מסתתר", lang: "he" },
    verification: {
      state: "match",
      engine_result: {
        expression: "חכמה", partner: "בינה", expression_method: "מסתתר", partner_method: "רגיל",
        value: 67, engine_verified: true,
      },
    },
    evidence: { facts: [] },
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "חכמה", relatedExpression: "בינה" },
    projection: projection([relation]),
  }]);

  assert.equal(out.direct_answer.kind, "exact_expression_relation");
  assert.match(out.direct_answer.answer, /חכמה בשיטת מסתתר = 67/);
  assert.match(out.direct_answer.answer, /בינה בשיטת רגיל = 67/);
});

test("exact pair absence is negative only after an attested completed relation search", () => {
  const subject = { type: "expression", value: "חכמה", relatedExpression: "בינה" };
  const direct = (capability) => buildRazielGroundedSourceComposer([{
    subject,
    projection: projection([], null, { capabilities: [capability] }),
  }]).direct_answer;

  const explicitNegative = direct({
    key: "crossings",
    status: "negative_result",
    negative_result: { searched: true, reason: "completed bounded search" },
    access_filtered: { count: 0, reasons: [] },
  });
  assert.equal(explicitNegative.kind, "exact_expression_relation_negative");

  const completedExecutedSearch = direct({
    key: "crossings",
    status: "executed",
    negative_result: null,
    access_filtered: { count: 0, reasons: [] },
    trace: {
      confirmed_relation_source: {
        status: "available",
        semantic_status: "available",
        public_endpoint_status: "available",
      },
    },
  });
  assert.equal(completedExecutedSearch.kind, "exact_expression_relation_negative");

  for (const capability of [
    { key: "crossings", status: "failed", access_filtered: { count: 0, reasons: [] } },
    { key: "crossings", status: "entitlement_gated", access_filtered: { count: 0, reasons: [] } },
    {
      key: "crossings",
      status: "executed",
      access_filtered: { count: 1, reasons: [{ reason: "access_tier_not_permitted:private", count: 1 }] },
      trace: { confirmed_relation_source: { status: "available", semantic_status: "available", public_endpoint_status: "available" } },
    },
    {
      key: "crossings",
      status: "executed",
      access_filtered: { count: 0, reasons: [] },
      trace: { confirmed_relation_source: { status: "partial", semantic_status: "unavailable", public_endpoint_status: "available" } },
    },
  ]) {
    assert.equal(direct(capability), null);
  }
});

test("method result keeps expression identity and connects 271 to regular corpus phrases", () => {
  const profile = [{ method_key: "קדמי", method_label: "משולש", value: 271 }];
  const pregnancy = {
    id: "uf:271:pregnancy",
    kind: "gematria",
    subject: { label: "הריון", value: 271 },
    source: { source_name: "מנוע הגימטריה", source_ref: "bidim:pregnancy", method: "רגיל", lang: "he" },
    verification: { state: "not_tested", engine_method_tested: "רגיל", engine_result: 271 },
    evidence: { facts: [{ type: "gematria-lookup-row", phrase: "הריון", method: "רגיל", value: 271 }] },
  };
  const out = buildRazielGroundedSourceComposer([
    {
      subject: { type: "expression", value: "חכמה", requestedMethod: "משולש", observedValue: 271 },
      projection: projection([], null, { calculation_profile: profile }),
    },
    { subject: { type: "number", value: 271 }, projection: projection([pregnancy]) },
  ]);

  assert.equal(out.direct_answer.kind, "exact_expression_method");
  assert.equal(out.direct_answer.anchor_value, 271);
  assert.match(out.direct_answer.answer, /חכמה בשיטת משולש = 271/);
  assert.match(out.direct_answer.answer, /הריון בשיטת רגיל = 271/);
  assert.match(out.direct_answer.answer, /משמעות הקשר.*פרשנות נפרדת/);
  assert.deepEqual(out.direct_answer.facts, [
    { label: "חכמה · משולש", value: "271" },
    { label: "הריון · רגיל", value: "271" },
  ]);
});

test("preserves source terminology without hard-coding a subject-specific correction", () => {
  const finding = {
    ...sourceClaim,
    evidence: {
      facts: [
        { type: "source-language", text: "נקודה אמצעית" },
        { type: "source-language", label: "פריעת חוב" },
      ],
    },
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: projection([finding]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.deepEqual(prompt.bundles[0].source_wording, ["מחשבת יהוה", "נקודה אמצעית", "פריעת חוב"]);
  assert.equal(prompt.presentation_contract.source_terms_must_remain_verbatim_when_attributed, true);
  assert.equal(prompt.presentation_contract.source_terms_must_not_be_merged_or_autocorrected, true);
  assert.equal(prompt.presentation_contract.total_count_claim_requires_explicit_total_count, true);
  assert.equal(prompt.presentation_contract.explicit_counts_must_be_copied_as_digits, true);
  assert.equal(prompt.presentation_contract.never_coin_a_source_term, true);
  assert.equal(prompt.presentation_contract.lexical_gloss_is_not_relation_evidence, true);
  assert.equal(prompt.presentation_contract.rich_synthesis_requires_supplied_evidence, true);
  assert.equal(prompt.presentation_contract.original_interpretation_is_allowed_when_labeled_and_explained, true);
  assert.match(out.guidance, /מותר ואף רצוי לזהות דפוס משמעותי/);
  assert.match(out.guidance, /רזיאל מציע/);
  assert.match(out.guidance, /פירוש מילוני אפשרי/);
  assert.match(out.guidance, /תשובה מעמיקה אינה רשימת ערכים ארוכה/);
  assert.match(out.guidance, /השמט את הביטוי במקום לייצר נוסח משובש/);
  assert.match(out.guidance, /אל תכריז כמה ביטויים או ממצאים יש אלא אם total_count/);
  assert.doesNotMatch(out.prompt + out.guidance, /הטליה המעגלית/);
});

test("keeps metaphor-sounding 776 phrases as verified calculations and only their meaning interpretive", () => {
  const phrases = ["נקודה אמצעית", "שלמות", "פריעת חוב"];
  const findings = phrases.map((phrase, index) => ({
    id: `uf:776:${index}`,
    kind: "gematria",
    stage: "evidence",
    subject: { label: phrase, value: 776 },
    source: { source_name: "מאגר הגימטריה המאומת", source_ref: `gematria_words:${index}`, method: "רגיל", lang: "he" },
    verification: { state: "match", engine_method_tested: "רגיל", engine_result: 776 },
    evidence: { facts: [{ type: "published-gematria-phrase", expression: phrase, method: "רגיל", value: 776 }] },
  }));
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: projection(findings),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.deepEqual(prompt.bundles[0].evidence_lanes.verified_calculations, findings.map((finding) => finding.id));
  assert.equal(prompt.presentation_contract.verified_expression_must_not_be_downgraded_by_semantic_tone, true);
  assert.match(out.guidance, /אל תוריד ביטוי מאומת לדרגת פרשנות/);
  for (const phrase of phrases) assert.match(out.fallback, new RegExp(`${phrase}.*776`));
});

test("number comparison requires a structured evidence comparison before interpretation", () => {
  const out = buildRazielGroundedSourceComposer([
    { subject: { type: "number", value: 776 }, projection: projection([sourceClaim]) },
    { subject: { type: "number", value: 1820 }, projection: projection([verified]) },
  ]);
  const prompt = JSON.parse(out.prompt);

  assert.equal(prompt.response_mode, "number_comparison");
  assert.equal(prompt.presentation_contract.comparison_must_state_missing_direct_evidence, true);
  assert.match(out.guidance, /התאמה באותה שיטה/);
  assert.match(out.guidance, /מותר להציע מטפורה מסומנת ומוסברת/);
});

test("allows rarity language only when the bundle carries an explicit rarity basis", () => {
  const withRarity = {
    ...verified,
    evidence_relations: [{ base_rate: 0.01, expectedness: "low_base_rate" }],
  };
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: projection([withRarity]),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.equal(prompt.bundles[0].rarity_claim_allowed, true);
  assert.match(out.guidance, /מותר לתאר נדירות רק בצמוד למדד/);
  assert.doesNotMatch(out.guidance, /לא סופק מדד נדירות/);
});

test("calculator analysis starts from the full method profile and exposes bounded number-page continuations", () => {
  const calculationProfile = [
    { finding_id: "uf:m:ragil", method_key: "ragil", method_label: "רגיל", value: 73, mathematical_family: "regular" },
    { finding_id: "uf:m:gadol", method_key: "gadol", method_label: "גדול", value: 73, mathematical_family: "regular" },
    { finding_id: "uf:m:triangle", method_key: "triangle", method_label: "משולש מילה + משולש הפוך", value: 365, mathematical_family: "triangular" },
  ];
  const methodValueGroups = [
    {
      value: 73,
      methods: [
        { method_key: "ragil", method_label: "רגיל", mathematical_family: "regular" },
        { method_key: "gadol", method_label: "גדול", mathematical_family: "regular" },
      ],
      method_count: 2,
      proven_equivalence_sets: [{
        methods: ["רגיל", "גדול"],
        basis: "canonical_registry_conditional_equivalence",
      }],
      effective_distinct_method_count: 1,
      independent_support_count: null,
      counts_as_independent_evidence: false,
    },
    {
      value: 365,
      methods: [{ method_key: "triangle", method_label: "משולש מילה + משולש הפוך", mathematical_family: "triangular" }],
      method_count: 1,
      independent_support_count: null,
      counts_as_independent_evidence: false,
    },
  ];
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "expression", value: "חכמה" },
    projection: projection([verified], null, { calculation_profile: calculationProfile, method_value_groups: methodValueGroups }),
  }]);
  const prompt = JSON.parse(out.prompt);

  assert.deepEqual(prompt.bundles[0].result.calculation_profile, calculationProfile);
  assert.match(out.guidance, /מפת החישוב הקנונית המלאה/);
  assert.match(out.guidance, /אל תצמצם את הניתוח לאריח הפעיל בלבד/);
  assert.match(out.fallback, /רגיל=73/);
  assert.match(out.fallback, /משולש מילה \+ משולש הפוך=365/);
  assert.match(out.fallback, /קבוצות ערך מנורמלות.*73 ← רגיל, גדול/);
  assert.match(out.fallback, /שקילות מותנית מן המרשם: רגיל \+ גדול; זהויות אפקטיביות: 1/);
  assert.deepEqual(out.navigation, [
    { kind: "number", label: "פתח את דף המספר 73", href: "/2029/number/73" },
    { kind: "number", label: "פתח את דף המספר 365", href: "/2029/number/365" },
  ]);
  assert.equal(prompt.presentation_contract.calculation_profile_is_complete_bounded_method_map, true);
  assert.equal(prompt.presentation_contract.method_value_groups_are_normalized_presentation_not_new_calculation, true);
  assert.equal(prompt.presentation_contract.method_count_is_not_independent_support_count, true);
  assert.equal(prompt.presentation_contract.proven_equivalence_requires_satisfied_canonical_registry_rule, true);
  assert.equal(prompt.presentation_contract.subject_definition_requires_explicit_source_claim, true);
});

test("fails closed for a projection that did not come from the canonical consumer", () => {
  const out = buildRazielGroundedSourceComposer([{
    subject: { type: "number", value: 776 },
    projection: { model_input: { findings: [verified] }, human_view: { cards: [] }, guards: {} },
  }]);

  assert.equal(out.prompt, "");
  assert.equal(out.guidance, "");
  assert.equal(out.fallback, "");
  assert.deepEqual(out.sources, []);
  assert.deepEqual(out.navigation, []);
  assert.equal(Object.isFrozen(out), true);
});

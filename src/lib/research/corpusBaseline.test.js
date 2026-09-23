import test from "node:test";
import assert from "node:assert/strict";
import {
  SEMANTIC_EVIDENCE_CLASS,
  SEMANTIC_RESEARCH_ROLE,
  assessCorpusBaselineChange,
  buildSemanticControlPlan,
  consolidateSemanticExpansionCandidates,
  createSemanticExpansionCandidate,
  normalizeCorpusBaseline,
} from "./corpusBaseline.js";

function liveLikeBaseline(overrides = {}) {
  return normalizeCorpusBaseline({
    snapshot_ref: "synthetic:baseline:2026-09-23",
    generated_at: "2026-09-23T00:00:00.000Z",
    corpus_versions: {
      gematria: "gw:v1",
      lexicon: "maftech:v1",
      graph: "graph:v8",
      semantic_relations: "semantic:v1",
    },
    gematria_words: {
      total: 15521,
      verified: 12642,
      published: 12598,
      graph_linked: 505,
      tagged: 2000,
      hebrew_like: 14002,
      sources: 188,
      category_counts: {
        "מאגר_ערכים": 7275,
        "(null)": 2949,
        "כללי": 2533,
      },
    },
    maftech_lexicon: {
      total: 43510,
      tanach: 41523,
      core: 4529,
      tanach_and_core: 2547,
    },
    word_aliases: {
      total: 7,
      verified: 7,
      type_counts: { english: 5, translation: 2 },
    },
    graph: {
      total_edges: 7111,
      relation_type_counts: {
        mentions: 2700,
        contains: 2289,
        related: 863,
        equals: 392,
        converges_on: 174,
        cross: 65,
        opposite_of: 1,
      },
    },
    relation_evidence: {
      total: 132,
      relation_type_counts: {
        cipher_link: 37,
        complement: 11,
        mirror: 19,
        cross_method_convergence: 5,
      },
      status_counts: {
        confirmed: 118,
        candidate: 8,
        rejected: 6,
      },
    },
    ...overrides,
  });
}

test("live-like baseline exposes lexical volume and sparse graph/tag coverage without turning coverage into truth", () => {
  const baseline = liveLikeBaseline();

  assert.equal(baseline.gematria_words.total, 15521);
  assert.equal(baseline.gematria_words.coverage_percent.verified, 81.45);
  assert.equal(baseline.gematria_words.coverage_percent.published, 81.17);
  assert.equal(baseline.gematria_words.coverage_percent.graph_linked, 3.25);
  assert.equal(baseline.gematria_words.coverage_percent.tagged, 12.89);
  assert.equal(baseline.gematria_words.coverage_percent.hebrew_like, 90.21);
  assert.equal(baseline.maftech_lexicon.coverage_percent.tanach, 95.43);
  assert.equal(baseline.maftech_lexicon.coverage_percent.core, 10.41);
  assert.equal(baseline.maftech_lexicon.coverage_percent.tanach_and_core, 5.85);

  assert.equal(baseline.invariants.lexical_volume_is_not_semantic_coverage, true);
  assert.equal(baseline.invariants.aliases_are_identity_variants_not_general_synonyms, true);
  assert.equal(baseline.invariants.corpus_growth_changes_search_space, true);
});

test("baseline rejects impossible child counts instead of silently normalizing corrupt snapshots", () => {
  assert.throws(() => normalizeCorpusBaseline({
    gematria_words: { total: 10, verified: 11 },
  }), /cannot exceed parent population/);

  assert.throws(() => normalizeCorpusBaseline({
    maftech_lexicon: { total: 10, tanach: 5, core: 3, tanach_and_core: 4 },
  }), /cannot exceed parent population/);
});

test("base-rate recalibration has no hidden threshold: explicit policy is mandatory", () => {
  const previous = liveLikeBaseline();
  const current = liveLikeBaseline({
    gematria_words: {
      total: 16000,
      verified: 13000,
      published: 12900,
      graph_linked: 520,
      tagged: 2100,
      hebrew_like: 14400,
      sources: 190,
    },
  });

  assert.throws(() => assessCorpusBaselineChange(previous, current), /explicit recalibration policy required/);
  assert.throws(() => assessCorpusBaselineChange(previous, current, {
    population_delta_percent_threshold: 5,
  }), /verified_population_delta_percent_threshold/);
});

test("explicit corpus growth threshold can require base-rate recalibration", () => {
  const previous = liveLikeBaseline();
  const current = normalizeCorpusBaseline({
    ...previous,
    baseline_fingerprint: undefined,
    gematria_words: {
      ...previous.gematria_words,
      total: 17000,
      verified: 14000,
      published: 13900,
      graph_linked: 600,
      tagged: 2300,
      hebrew_like: 15200,
      sources: 200,
    },
  });

  const assessment = assessCorpusBaselineChange(previous, current, {
    policy_ref: "synthetic:policy:v1",
    population_delta_percent_threshold: 5,
    verified_population_delta_percent_threshold: 5,
    recalibrate_on_relation_inventory_change: false,
    recalibrate_on_version_change: false,
  });

  assert.equal(assessment.requires_base_rate_recalibration, true);
  assert.equal(assessment.reasons.includes("gematria_population_delta"), true);
  assert.equal(assessment.reasons.includes("verified_population_delta"), true);
  assert.equal(assessment.invariants.no_hidden_threshold, true);
});

test("semantic relation inventory change may independently invalidate expectedness when policy says so", () => {
  const previous = liveLikeBaseline();
  const current = normalizeCorpusBaseline({
    ...previous,
    baseline_fingerprint: undefined,
    graph: {
      ...previous.graph,
      relation_type_counts: {
        ...previous.graph.relation_type_counts,
        opposite_of: 25,
      },
    },
  });

  const assessment = assessCorpusBaselineChange(previous, current, {
    policy_ref: "synthetic:policy:v2",
    population_delta_percent_threshold: 100,
    verified_population_delta_percent_threshold: 100,
    recalibrate_on_relation_inventory_change: true,
    recalibrate_on_version_change: false,
  });

  assert.equal(assessment.requires_base_rate_recalibration, true);
  assert.deepEqual(assessment.reasons, ["semantic_relation_inventory_change"]);
  assert.equal(assessment.invariants.relation_inventory_change_can_change_cross_expectedness, true);
});

test("synonym candidate is a Research OS candidate, never word alias/corpus admission/graph edge by default", () => {
  const candidate = createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "זוהר",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["lexicon:synthetic:1"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "synthetic source marks the pair as near-synonymous",
  });

  assert.equal(candidate.status, "candidate");
  assert.equal(candidate.storage_route, "research_os_candidate");
  assert.equal(candidate.graph_edge_authorized, false);
  assert.equal(candidate.corpus_admission_authorized, false);
  assert.equal(candidate.word_alias_authorized, false);
  assert.equal(candidate.auto_promotion_authorized, false);
  assert.equal(candidate.invariants.semantic_similarity_is_not_identity, true);
  assert.equal(candidate.invariants.synonym_or_antonym_is_not_word_alias_by_default, true);
});

test("semantic candidate requires provenance and explicit evidence class", () => {
  assert.throws(() => createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "זוהר",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "missing provenance",
  }), /source_refs/);

  assert.throws(() => createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "זוהר",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["source:1"],
    relationBasis: "missing evidence class",
  }), /evidence_class/);
});

test("model-only semantic proposal stays explicitly model-proposed and non-promotable", () => {
  const candidate = createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "בהירות",
    semanticRole: SEMANTIC_RESEARCH_ROLE.CONCEPT_EXPRESSION_CANDIDATE,
    sourceRefs: ["model-run:synthetic:1"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.MODEL_PROPOSED],
    relationBasis: "model-proposed research hypothesis",
  });

  assert.equal(candidate.model_proposal_only, true);
  assert.equal(candidate.graph_edge_authorized, false);
  assert.equal(candidate.auto_promotion_authorized, false);
});

test("symmetric semantic roles normalize pair order while directed roles preserve direction", () => {
  const synonymAB = createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "זוהר",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["source:1"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "synthetic",
  });
  const synonymBA = createSemanticExpansionCandidate({
    sourceExpression: "זוהר",
    targetExpression: "אור",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["source:2"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.HUMAN_CURATED],
    relationBasis: "synthetic reverse",
  });

  assert.equal(synonymAB.candidate_key, synonymBA.candidate_key);
  assert.equal(synonymAB.symmetric, true);

  const derivedAB = createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "מאור",
    semanticRole: SEMANTIC_RESEARCH_ROLE.DERIVED_FROM_ROOT_CANDIDATE,
    sourceRefs: ["source:3"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "synthetic derivation",
  });
  const derivedBA = createSemanticExpansionCandidate({
    sourceExpression: "מאור",
    targetExpression: "אור",
    semanticRole: SEMANTIC_RESEARCH_ROLE.DERIVED_FROM_ROOT_CANDIDATE,
    sourceRefs: ["source:4"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "reverse direction is a different claim",
  });

  assert.notEqual(derivedAB.candidate_key, derivedBA.candidate_key);
  assert.equal(derivedAB.symmetric, false);
});

test("consolidation merges corroborating sources instead of fragmenting duplicate semantic claims", () => {
  const a = createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "זוהר",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["source:a"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "source A",
  });
  const b = createSemanticExpansionCandidate({
    sourceExpression: "זוהר",
    targetExpression: "אור",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["source:b"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.HUMAN_CURATED],
    relationBasis: "source B",
  });

  const batch = consolidateSemanticExpansionCandidates([a, b], { maxCandidates: 10 });

  assert.equal(batch.input_count, 2);
  assert.equal(batch.consolidated_count, 1);
  assert.deepEqual(batch.candidates[0].source_refs.sort(), ["source:a", "source:b"]);
  assert.equal(batch.candidates[0].corroborating_candidate_count, 2);
  assert.equal(batch.invariants.consolidate_before_fragmenting, true);
  assert.equal(batch.invariants.no_mass_graph_write, true);
});

test("semantic control plan explicitly tests unrelated, same-root and same-value alternatives", () => {
  const candidate = createSemanticExpansionCandidate({
    sourceExpression: "אור",
    targetExpression: "זוהר",
    semanticRole: SEMANTIC_RESEARCH_ROLE.SYNONYM_CANDIDATE,
    sourceRefs: ["source:a"],
    evidenceClasses: [SEMANTIC_EVIDENCE_CLASS.SOURCE_ATTESTED],
    relationBasis: "synthetic",
  });

  const control = buildSemanticControlPlan(candidate, {
    decoyCount: 20,
    requireSameLanguage: true,
    matchLengthBucket: true,
    matchFrequencyBucket: true,
    includeSameRootControl: true,
    includeSameValueControl: true,
  });

  assert.equal(control.decoy_count, 20);
  assert.equal(control.matching.corpus_frequency_bucket, true);
  assert.equal(control.negative_controls.same_root_control, true);
  assert.equal(control.negative_controls.same_numeric_value_control, true);
  assert.equal(control.invariants.same_root_is_not_synonymy, true);
  assert.equal(control.invariants.same_value_is_not_semantic_relation, true);
  assert.equal(control.invariants.holdout_required_before_claiming_learned_discrimination, true);
});

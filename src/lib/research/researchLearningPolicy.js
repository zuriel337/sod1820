// F6 — Research Learning Champion / Challenger evaluation contract.
// Challenger evaluation may propose a policy change, but never becomes runtime authority by itself.
//
// EXTEND_EXISTING only:
// - decision_ledger = Human decisions/provenance;
// - learned_patterns = proposed / approved_preference candidate ledger;
// - fn_detect_patterns + contradiction detection = existing pattern discovery;
// - admin_pattern_review/revoke = existing Human-Gate transition.
//
// This module is PURE. It does not read/write DB state and cannot activate a policy.
// It evaluates two frozen policy runs as a multi-dimensional vector under an
// explicit threshold policy. There is deliberately no universal score.

export const RESEARCH_LEARNING_POLICY_VERSION = "research-learning-policy-v1";

export const LEARNING_POLICY_DOMAIN = Object.freeze({
  SYNTHESIS_SELECTION: "synthesis_selection",
  CROSS_RANKING: "cross_ranking",
  SEMANTIC_RANKING: "semantic_ranking",
  CALIBRATION_PROTOCOL: "calibration_protocol",
});

export const CHALLENGER_DECISION = Object.freeze({
  INSUFFICIENT_EVIDENCE: "insufficient_evidence",
  BLOCK_CHALLENGER: "block_challenger",
  KEEP_CHAMPION: "keep_champion_no_material_gain",
  PROPOSE_CHALLENGER: "propose_challenger_for_human_review",
});

const VALID_DOMAINS = new Set(Object.values(LEARNING_POLICY_DOMAIN));

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function nonNegativeInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError(`researchLearning: ${label} must be a non-negative integer`);
  }
  return n;
}

function finiteNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new TypeError(`researchLearning: ${label} must be a finite number`);
  }
  return n;
}

function percent(value, label) {
  const n = finiteNumber(value, label);
  if (n < 0 || n > 100) {
    throw new TypeError(`researchLearning: ${label} must be between 0 and 100`);
  }
  return n;
}

function nonNegativePercent(value, label) {
  const n = finiteNumber(value, label);
  if (n < 0) {
    throw new TypeError(`researchLearning: ${label} must be non-negative`);
  }
  return n;
}

function uniqueText(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function domain(value) {
  const d = clean(value);
  if (d === "style" || d === "message_style" || d === "ai_style") {
    throw new TypeError("researchLearning: style policy belongs to ai_style_learning_law, not Research Champion/Challenger");
  }
  if (!VALID_DOMAINS.has(d)) {
    throw new TypeError(`researchLearning: unsupported policy domain "${d}"`);
  }
  return d;
}

function metricVector(input = {}) {
  return {
    support_band_low_percent: percent(
      input.support_band_low_percent ?? input.supportBandLowPercent,
      "metrics.support_band_low_percent"
    ),
    support_band_high_percent: percent(
      input.support_band_high_percent ?? input.supportBandHighPercent,
      "metrics.support_band_high_percent"
    ),
    decoy_lift_points: finiteNumber(
      input.decoy_lift_points ?? input.decoyLiftPoints,
      "metrics.decoy_lift_points"
    ),
    contradiction_rate_percent: percent(
      input.contradiction_rate_percent ?? input.contradictionRatePercent,
      "metrics.contradiction_rate_percent"
    ),
    genericity_rate_percent: percent(
      input.genericity_rate_percent ?? input.genericityRatePercent,
      "metrics.genericity_rate_percent"
    ),
    evaluated_coverage_percent: percent(
      input.evaluated_coverage_percent ?? input.evaluatedCoveragePercent,
      "metrics.evaluated_coverage_percent"
    ),
    p95_latency_ms: nonNegativeInt(
      input.p95_latency_ms ?? input.p95LatencyMs,
      "metrics.p95_latency_ms"
    ),
    mean_cost_ils: (() => {
      const value = finiteNumber(
        input.mean_cost_ils ?? input.meanCostIls,
        "metrics.mean_cost_ils"
      );
      if (value < 0) throw new TypeError("researchLearning: metrics.mean_cost_ils must be non-negative");
      return value;
    })(),
  };
}

function violationVector(input = {}) {
  return {
    privacy_violations: nonNegativeInt(
      input.privacy_violations ?? input.privacyViolations ?? 0,
      "violations.privacy_violations"
    ),
    truth_boundary_violations: nonNegativeInt(
      input.truth_boundary_violations ?? input.truthBoundaryViolations ?? 0,
      "violations.truth_boundary_violations"
    ),
    protected_or_sensitive_inference_violations: nonNegativeInt(
      input.protected_or_sensitive_inference_violations
      ?? input.protectedOrSensitiveInferenceViolations
      ?? 0,
      "violations.protected_or_sensitive_inference_violations"
    ),
    evidence_leakage_violations: nonNegativeInt(
      input.evidence_leakage_violations ?? input.evidenceLeakageViolations ?? 0,
      "violations.evidence_leakage_violations"
    ),
  };
}

export function normalizePolicyEvaluationRun(input = {}) {
  const policyRef = clean(input.policy_ref || input.policyRef);
  const policyVersion = clean(input.policy_version || input.policyVersion);
  const evaluationRef = clean(input.evaluation_ref || input.evaluationRef);
  const holdoutRef = clean(input.holdout_ref || input.holdoutRef);
  const holdoutFingerprint = clean(input.holdout_fingerprint || input.holdoutFingerprint);
  const corpusBaselineFingerprint = clean(
    input.corpus_baseline_fingerprint || input.corpusBaselineFingerprint
  );

  if (!policyRef || !policyVersion || !evaluationRef || !holdoutRef || !holdoutFingerprint) {
    throw new TypeError("researchLearning: policy/evaluation/holdout identity fields are required");
  }
  if (!corpusBaselineFingerprint) {
    throw new TypeError("researchLearning: corpus_baseline_fingerprint is required");
  }

  const independentPersons = nonNegativeInt(
    input.independent_persons ?? input.independentPersons,
    "independent_persons"
  );
  const holdoutCases = nonNegativeInt(
    input.holdout_cases ?? input.holdoutCases,
    "holdout_cases"
  );
  const testableClaims = nonNegativeInt(
    input.testable_claims ?? input.testableClaims,
    "testable_claims"
  );
  const decoyTrials = nonNegativeInt(
    input.decoy_trials ?? input.decoyTrials,
    "decoy_trials"
  );

  return Object.freeze({
    contract_version: 1,
    learning_policy_version: RESEARCH_LEARNING_POLICY_VERSION,
    domain: domain(input.domain),
    policy_ref: policyRef,
    policy_version: policyVersion,
    evaluation_ref: evaluationRef,
    holdout_ref: holdoutRef,
    holdout_fingerprint: holdoutFingerprint,
    corpus_baseline_fingerprint: corpusBaselineFingerprint,
    synthesis_contract_version: input.synthesis_contract_version ?? input.synthesisContractVersion ?? null,
    calibration_contract_version: input.calibration_contract_version ?? input.calibrationContractVersion ?? null,
    independent_persons: independentPersons,
    holdout_cases: holdoutCases,
    testable_claims: testableClaims,
    decoy_trials: decoyTrials,
    total_observations: nonNegativeInt(
      input.total_observations ?? input.totalObservations ?? holdoutCases,
      "total_observations"
    ),
    metrics: metricVector(input.metrics),
    violations: violationVector(input.violations),
    owner_attestation: {
      declared: input.owner_attestation?.declared === true || input.ownerAttestation?.declared === true,
      attestation_ref: clean(
        input.owner_attestation?.attestation_ref
        || input.ownerAttestation?.attestationRef
      ),
      verified_by_this_module: false,
    },
    provenance_refs: uniqueText(input.provenance_refs || input.provenanceRefs),
    invariants: {
      repeated_observations_are_not_independent_persons: true,
      owner_attestation_is_not_verified_by_pure_evaluator: true,
      evaluation_metrics_are_not_truth_scores: true,
      policy_run_is_frozen_input_not_runtime_authority: true,
    },
  });
}

function requiredPolicyNumber(policy, snake, camel) {
  if (!(snake in policy) && !(camel in policy)) {
    throw new TypeError(`researchLearning: explicit policy field ${snake} is required`);
  }
  return finiteNumber(policy[snake] ?? policy[camel], `policy.${snake}`);
}

function requiredPolicyBool(policy, snake, camel) {
  if (!(snake in policy) && !(camel in policy)) {
    throw new TypeError(`researchLearning: explicit policy field ${snake} is required`);
  }
  return policy[snake] === true || policy[camel] === true;
}

export function normalizeChampionChallengerPolicy(input = {}) {
  if (!input || typeof input !== "object") {
    throw new TypeError("researchLearning: explicit Champion/Challenger policy required");
  }

  const p = {
    policy_ref: clean(input.policy_ref || input.policyRef),
    min_independent_persons: requiredPolicyNumber(input, "min_independent_persons", "minIndependentPersons"),
    min_holdout_cases: requiredPolicyNumber(input, "min_holdout_cases", "minHoldoutCases"),
    min_testable_claims: requiredPolicyNumber(input, "min_testable_claims", "minTestableClaims"),
    min_decoy_trials: requiredPolicyNumber(input, "min_decoy_trials", "minDecoyTrials"),
    min_evaluated_coverage_percent: requiredPolicyNumber(input, "min_evaluated_coverage_percent", "minEvaluatedCoveragePercent"),
    min_support_low_improvement_points: requiredPolicyNumber(input, "min_support_low_improvement_points", "minSupportLowImprovementPoints"),
    min_decoy_lift_improvement_points: requiredPolicyNumber(input, "min_decoy_lift_improvement_points", "minDecoyLiftImprovementPoints"),
    max_contradiction_regression_points: requiredPolicyNumber(input, "max_contradiction_regression_points", "maxContradictionRegressionPoints"),
    max_genericity_regression_points: requiredPolicyNumber(input, "max_genericity_regression_points", "maxGenericityRegressionPoints"),
    max_latency_regression_percent: requiredPolicyNumber(input, "max_latency_regression_percent", "maxLatencyRegressionPercent"),
    max_cost_regression_percent: requiredPolicyNumber(input, "max_cost_regression_percent", "maxCostRegressionPercent"),
    require_same_holdout: requiredPolicyBool(input, "require_same_holdout", "requireSameHoldout"),
    require_same_corpus_baseline: requiredPolicyBool(input, "require_same_corpus_baseline", "requireSameCorpusBaseline"),
    require_owner_attestation_declared: requiredPolicyBool(input, "require_owner_attestation_declared", "requireOwnerAttestationDeclared"),
    require_zero_privacy_violations: requiredPolicyBool(input, "require_zero_privacy_violations", "requireZeroPrivacyViolations"),
    require_zero_truth_boundary_violations: requiredPolicyBool(input, "require_zero_truth_boundary_violations", "requireZeroTruthBoundaryViolations"),
    require_zero_sensitive_inference_violations: requiredPolicyBool(input, "require_zero_sensitive_inference_violations", "requireZeroSensitiveInferenceViolations"),
    require_zero_evidence_leakage_violations: requiredPolicyBool(input, "require_zero_evidence_leakage_violations", "requireZeroEvidenceLeakageViolations"),
  };

  if (!p.policy_ref) throw new TypeError("researchLearning: policy_ref is required");

  // Load-bearing project boundaries are not negotiable tuning knobs.
  for (const key of [
    "require_same_holdout",
    "require_same_corpus_baseline",
    "require_owner_attestation_declared",
    "require_zero_privacy_violations",
    "require_zero_truth_boundary_violations",
    "require_zero_sensitive_inference_violations",
    "require_zero_evidence_leakage_violations",
  ]) {
    if (p[key] !== true) {
      throw new TypeError(`researchLearning: policy.${key} must be explicitly true`);
    }
  }

  if (p.min_evaluated_coverage_percent < 0 || p.min_evaluated_coverage_percent > 100) {
    throw new TypeError("researchLearning: policy.min_evaluated_coverage_percent must be between 0 and 100");
  }

  for (const key of [
    "min_independent_persons",
    "min_holdout_cases",
    "min_testable_claims",
    "min_decoy_trials",
  ]) {
    if (!Number.isInteger(p[key]) || p[key] < 0) {
      throw new TypeError(`researchLearning: policy.${key} must be a non-negative integer`);
    }
  }
  for (const key of [
    "min_evaluated_coverage_percent",
    "min_support_low_improvement_points",
    "min_decoy_lift_improvement_points",
    "max_contradiction_regression_points",
    "max_genericity_regression_points",
    "max_latency_regression_percent",
    "max_cost_regression_percent",
  ]) {
    if (p[key] < 0) {
      throw new TypeError(`researchLearning: policy.${key} must be non-negative`);
    }
  }

  return Object.freeze(p);
}

function delta(champion, challenger) {
  return Math.round((challenger - champion) * 100) / 100;
}

function regressionPercent(champion, challenger) {
  if (challenger <= champion) return 0;
  if (champion === 0) return challenger > 0 ? 100 : 0;
  return Math.round((10000 * (challenger - champion)) / champion) / 100;
}

function sameEvaluationSpace(champion, challenger, policy) {
  const issues = [];
  if (champion.domain !== challenger.domain) issues.push("policy_domain_mismatch");
  if (
    policy.require_same_holdout
    && (
      champion.holdout_ref !== challenger.holdout_ref
      || champion.holdout_fingerprint !== challenger.holdout_fingerprint
    )
  ) issues.push("holdout_mismatch");
  if (
    policy.require_same_corpus_baseline
    && champion.corpus_baseline_fingerprint !== challenger.corpus_baseline_fingerprint
  ) issues.push("corpus_baseline_mismatch");
  return issues;
}

function sampleIssues(challenger, policy) {
  const issues = [];
  if (challenger.independent_persons < policy.min_independent_persons) issues.push("insufficient_independent_persons");
  if (challenger.holdout_cases < policy.min_holdout_cases) issues.push("insufficient_holdout_cases");
  if (challenger.testable_claims < policy.min_testable_claims) issues.push("insufficient_testable_claims");
  if (challenger.decoy_trials < policy.min_decoy_trials) issues.push("insufficient_decoy_trials");
  if (challenger.metrics.evaluated_coverage_percent < policy.min_evaluated_coverage_percent) issues.push("insufficient_evaluated_coverage");
  if (
    policy.require_owner_attestation_declared
    && !(
      challenger.owner_attestation.declared
      && challenger.owner_attestation.attestation_ref
    )
  ) issues.push("owner_attestation_not_declared");
  return issues;
}

function hardViolationIssues(run, policy) {
  const issues = [];
  if (policy.require_zero_privacy_violations && run.violations.privacy_violations > 0) issues.push("privacy_violation");
  if (policy.require_zero_truth_boundary_violations && run.violations.truth_boundary_violations > 0) issues.push("truth_boundary_violation");
  if (policy.require_zero_sensitive_inference_violations && run.violations.protected_or_sensitive_inference_violations > 0) issues.push("sensitive_inference_violation");
  if (policy.require_zero_evidence_leakage_violations && run.violations.evidence_leakage_violations > 0) issues.push("evidence_leakage_violation");
  return issues;
}

export function compareChampionChallenger({
  champion,
  challenger,
  policy,
} = {}) {
  const c = champion?.contract_version ? champion : normalizePolicyEvaluationRun(champion);
  const n = challenger?.contract_version ? challenger : normalizePolicyEvaluationRun(challenger);
  const p = policy?.policy_ref ? policy : normalizeChampionChallengerPolicy(policy);

  if (c.policy_ref === n.policy_ref && c.policy_version === n.policy_version) {
    throw new TypeError("researchLearning: champion and challenger must be distinct frozen policy versions");
  }

  const spaceIssues = sameEvaluationSpace(c, n, p);
  const championSampleIssues = sampleIssues(c, p).map(x => `champion:${x}`);
  const challengerSampleIssues = sampleIssues(n, p).map(x => `challenger:${x}`);
  const samples = [...championSampleIssues, ...challengerSampleIssues];
  const hardIssues = hardViolationIssues(n, p);

  const vector = {
    support_low_improvement_points: delta(
      c.metrics.support_band_low_percent,
      n.metrics.support_band_low_percent
    ),
    support_high_improvement_points: delta(
      c.metrics.support_band_high_percent,
      n.metrics.support_band_high_percent
    ),
    decoy_lift_improvement_points: delta(
      c.metrics.decoy_lift_points,
      n.metrics.decoy_lift_points
    ),
    contradiction_regression_points: delta(
      c.metrics.contradiction_rate_percent,
      n.metrics.contradiction_rate_percent
    ),
    genericity_regression_points: delta(
      c.metrics.genericity_rate_percent,
      n.metrics.genericity_rate_percent
    ),
    coverage_change_points: delta(
      c.metrics.evaluated_coverage_percent,
      n.metrics.evaluated_coverage_percent
    ),
    latency_regression_percent: regressionPercent(
      c.metrics.p95_latency_ms,
      n.metrics.p95_latency_ms
    ),
    cost_regression_percent: regressionPercent(
      c.metrics.mean_cost_ils,
      n.metrics.mean_cost_ils
    ),
  };

  const qualityRegressionIssues = [];
  if (vector.contradiction_regression_points > p.max_contradiction_regression_points) {
    qualityRegressionIssues.push("contradiction_regression");
  }
  if (vector.genericity_regression_points > p.max_genericity_regression_points) {
    qualityRegressionIssues.push("genericity_regression");
  }
  if (vector.latency_regression_percent > p.max_latency_regression_percent) {
    qualityRegressionIssues.push("latency_regression");
  }
  if (vector.cost_regression_percent > p.max_cost_regression_percent) {
    qualityRegressionIssues.push("cost_regression");
  }

  const improvementGates = {
    support_low:
      vector.support_low_improvement_points >= p.min_support_low_improvement_points,
    decoy_lift:
      vector.decoy_lift_improvement_points >= p.min_decoy_lift_improvement_points,
  };
  const materialImprovement = improvementGates.support_low && improvementGates.decoy_lift;

  let decision = CHALLENGER_DECISION.KEEP_CHAMPION;
  let reason = "challenger_did_not_clear_material_improvement_gates";

  if (spaceIssues.length || samples.length) {
    decision = CHALLENGER_DECISION.INSUFFICIENT_EVIDENCE;
    reason = "evaluation_space_or_sample_not_qualified";
  } else if (hardIssues.length || qualityRegressionIssues.length) {
    decision = CHALLENGER_DECISION.BLOCK_CHALLENGER;
    reason = "hard_boundary_or_regression_gate_failed";
  } else if (materialImprovement) {
    decision = CHALLENGER_DECISION.PROPOSE_CHALLENGER;
    reason = "material_improvement_within_all_declared_guardrails";
  }

  return Object.freeze({
    comparison_version: 1,
    learning_policy_version: RESEARCH_LEARNING_POLICY_VERSION,
    domain: c.domain,
    champion_ref: c.policy_ref,
    champion_version: c.policy_version,
    challenger_ref: n.policy_ref,
    challenger_version: n.policy_version,
    evaluation_policy_ref: p.policy_ref,
    decision,
    reason,
    evaluation_space_issues: spaceIssues,
    sample_issues: samples,
    hard_boundary_issues: hardIssues,
    quality_regression_issues: qualityRegressionIssues,
    improvement_gates: improvementGates,
    metric_vector: vector,
    auto_activation_authorized: false,
    runtime_effect: false,
    human_review_required: decision === CHALLENGER_DECISION.PROPOSE_CHALLENGER,
    owner_verification_required: true,
    invariants: {
      no_universal_learning_score: true,
      no_majority_vote_activation: true,
      no_auto_policy_promotion: true,
      same_holdout_required_when_policy_says_so: true,
      same_corpus_baseline_required_when_policy_says_so: true,
      safety_and_truth_boundaries_override_metric_improvement: true,
      repeated_observations_do_not_inflate_independent_person_count: true,
    },
  });
}

export function buildLearnedPatternProposal(comparison, {
  patternKey,
  feature,
  rulesEnvRefs = [],
  detectedBy = "research-learning-evaluator",
} = {}) {
  if (!comparison || comparison.decision !== CHALLENGER_DECISION.PROPOSE_CHALLENGER) {
    throw new TypeError("researchLearning: learned pattern proposal requires a PROPOSE_CHALLENGER comparison");
  }
  const key = clean(patternKey);
  if (!key) throw new TypeError("researchLearning: patternKey is required");
  if (!feature || typeof feature !== "object" || Array.isArray(feature)) {
    throw new TypeError("researchLearning: feature object is required");
  }

  return Object.freeze({
    proposal_version: 1,
    storage_route: "existing_learning_owner_requires_domain_qualified_adapter",
    target_owner: "learned_patterns + decision_ledger Human-review path",
    direct_learned_patterns_insert_authorized: false,
    persistence_blockers: [
      "learned_patterns.support is NOT NULL and its current support semantics are decision-count based",
      "current approved_preference consumers do not domain-filter preferences",
    ],
    pattern_key: key,
    polarity: "prefer_challenger",
    feature: {
      ...feature,
      champion_ref: comparison.champion_ref,
      champion_version: comparison.champion_version,
      challenger_ref: comparison.challenger_ref,
      challenger_version: comparison.challenger_version,
      evaluation_policy_ref: comparison.evaluation_policy_ref,
    },
    similarity_reason:
      "Challenger cleared explicit holdout improvement gates without crossing declared safety/quality regression limits.",
    support: {
      basis: "challenger_evaluation_sample",
      value: null,
      direct_db_column_mapping_authorized: false,
    },
    rules_env_refs: uniqueText(rulesEnvRefs),
    status: "proposed",
    detected_by: clean(detectedBy) || "research-learning-evaluator",
    human_review_required: true,
    human_review_owner: "existing learned_patterns / decision_ledger governance",
    admin_pattern_review_after_domain_qualified_persistence: true,
    direct_admin_pattern_review_ready: false,
    runtime_effect: false,
    auto_activation_authorized: false,
    current_runtime_activation_authorized: false,
    target_runtime_status_if_domain_qualified_and_human_approved: "approved_preference",
    comparison_snapshot: {
      decision: comparison.decision,
      metric_vector: comparison.metric_vector,
      improvement_gates: comparison.improvement_gates,
      hard_boundary_issues: comparison.hard_boundary_issues,
      quality_regression_issues: comparison.quality_regression_issues,
      sample_issues: comparison.sample_issues,
    },
    invariants: {
      proposal_is_not_approved_preference: true,
      proposal_is_not_runtime_policy: true,
      human_gate_is_required: true,
      existing_learned_patterns_owner_is_preserved: true,
      domain_qualified_persistence_is_required_before_runtime_use: true,
      current_global_approved_preference_projection_must_not_receive_domain_specific_policy_rows: true,
    },
  });
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  CHALLENGER_DECISION,
  LEARNING_POLICY_DOMAIN,
  buildLearnedPatternProposal,
  compareChampionChallenger,
  normalizeChampionChallengerPolicy,
  normalizePolicyEvaluationRun,
} from "./researchLearningPolicy.js";

function policy(overrides = {}) {
  return normalizeChampionChallengerPolicy({
    policyRef: "cc-policy:synthetic:v1",
    minIndependentPersons: 20,
    minHoldoutCases: 20,
    minTestableClaims: 80,
    minDecoyTrials: 20,
    minEvaluatedCoveragePercent: 70,
    minSupportLowImprovementPoints: 3,
    minDecoyLiftImprovementPoints: 2,
    maxContradictionRegressionPoints: 1,
    maxGenericityRegressionPoints: 2,
    maxLatencyRegressionPercent: 20,
    maxCostRegressionPercent: 25,
    requireSameHoldout: true,
    requireSameCorpusBaseline: true,
    requireOwnerAttestationDeclared: true,
    requireZeroPrivacyViolations: true,
    requireZeroTruthBoundaryViolations: true,
    requireZeroSensitiveInferenceViolations: true,
    requireZeroEvidenceLeakageViolations: true,
    ...overrides,
  });
}

function run({
  policyRef = "synthesis-policy",
  policyVersion = "v1",
  supportLow = 60,
  supportHigh = 75,
  decoyLift = 10,
  contradiction = 10,
  genericity = 12,
  coverage = 85,
  latency = 1000,
  cost = 0.15,
  holdoutRef = "holdout:synthetic:1",
  holdoutFingerprint = "holdout-fp:1",
  corpus = "corpus-fp:1",
  persons = 40,
  cases = 40,
  claims = 160,
  decoys = 40,
  violations = {},
  ownerAttestation = true,
  evaluationRef = null,
  domain = LEARNING_POLICY_DOMAIN.SYNTHESIS_SELECTION,
} = {}) {
  return normalizePolicyEvaluationRun({
    domain,
    policyRef,
    policyVersion,
    evaluationRef: evaluationRef || ("eval:" + policyRef + ":" + policyVersion),
    holdoutRef,
    holdoutFingerprint,
    corpusBaselineFingerprint: corpus,
    synthesisContractVersion: 1,
    calibrationContractVersion: 1,
    independentPersons: persons,
    holdoutCases: cases,
    testableClaims: claims,
    decoyTrials: decoys,
    totalObservations: 400,
    metrics: {
      supportBandLowPercent: supportLow,
      supportBandHighPercent: supportHigh,
      decoyLiftPoints: decoyLift,
      contradictionRatePercent: contradiction,
      genericityRatePercent: genericity,
      evaluatedCoveragePercent: coverage,
      p95LatencyMs: latency,
      meanCostIls: cost,
    },
    violations,
    ownerAttestation: {
      declared: ownerAttestation,
      attestationRef: ownerAttestation ? "owner-attestation:synthetic:1" : null,
    },
    provenanceRefs: ["trace:synthetic:1"],
  });
}

function champion() {
  return run({
    policyRef: "synthesis-policy",
    policyVersion: "champion-v1",
  });
}

test("policy has no hidden thresholds: every threshold and load-bearing gate is explicit", () => {
  assert.throws(() => normalizeChampionChallengerPolicy({}), /explicit policy field/);

  const p = policy();
  assert.equal(p.min_independent_persons, 20);
  assert.equal(p.min_support_low_improvement_points, 3);
  assert.equal(p.require_same_holdout, true);
  assert.equal(p.require_zero_privacy_violations, true);
});

test("privacy/truth/comparability gates cannot be disabled by a tuning policy", () => {
  for (const override of [
    { requireSameHoldout: false },
    { requireSameCorpusBaseline: false },
    { requireOwnerAttestationDeclared: false },
    { requireZeroPrivacyViolations: false },
    { requireZeroTruthBoundaryViolations: false },
    { requireZeroSensitiveInferenceViolations: false },
    { requireZeroEvidenceLeakageViolations: false },
  ]) {
    assert.throws(() => policy(override), /must be explicitly true/);
  }
});

test("style-learning domain is rejected because ai_style_learning_law remains owner", () => {
  assert.throws(() => run({ domain: "style" }), /style policy belongs to ai_style_learning_law/);
});

test("evaluation run separates independent Persons from raw observations and rejects negative cost", () => {
  const r = run({ persons: 30 });
  assert.equal(r.independent_persons, 30);
  assert.equal(r.total_observations, 400);
  assert.equal(r.invariants.repeated_observations_are_not_independent_persons, true);

  assert.throws(() => run({ cost: -0.01 }), /mean_cost_ils must be non-negative/);
});

test("coverage policy must stay inside a real percent range", () => {
  assert.throws(() => policy({ minEvaluatedCoveragePercent: 101 }), /between 0 and 100/);
});

test("different holdout is insufficient evidence, never a challenger win", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    holdoutRef: "holdout:different",
    holdoutFingerprint: "holdout-fp:different",
    supportLow: 90,
    decoyLift: 30,
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(result.decision, CHALLENGER_DECISION.INSUFFICIENT_EVIDENCE);
  assert.equal(result.evaluation_space_issues.includes("holdout_mismatch"), true);
  assert.equal(result.auto_activation_authorized, false);
});

test("different corpus baseline is insufficient evidence for direct policy replacement", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    corpus: "corpus-fp:2",
    supportLow: 90,
    decoyLift: 30,
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(result.decision, CHALLENGER_DECISION.INSUFFICIENT_EVIDENCE);
  assert.equal(result.evaluation_space_issues.includes("corpus_baseline_mismatch"), true);
});

test("both champion and challenger must satisfy minimum sample gates", () => {
  const c = run({
    policyRef: "synthesis-policy",
    policyVersion: "champion-v1",
    persons: 5,
  });
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    supportLow: 70,
    decoyLift: 15,
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(result.decision, CHALLENGER_DECISION.INSUFFICIENT_EVIDENCE);
  assert.equal(result.sample_issues.includes("champion:insufficient_independent_persons"), true);
});

test("declared owner attestation is required but pure evaluator never verifies it", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    ownerAttestation: false,
    supportLow: 70,
    decoyLift: 15,
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(result.decision, CHALLENGER_DECISION.INSUFFICIENT_EVIDENCE);
  assert.equal(result.sample_issues.includes("challenger:owner_attestation_not_declared"), true);
  assert.equal(n.owner_attestation.verified_by_this_module, false);
});

test("privacy violation blocks challenger even when research metrics improve dramatically", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    supportLow: 95,
    supportHigh: 99,
    decoyLift: 40,
    contradiction: 1,
    genericity: 1,
    violations: { privacyViolations: 1 },
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(result.decision, CHALLENGER_DECISION.BLOCK_CHALLENGER);
  assert.equal(result.hard_boundary_issues.includes("privacy_violation"), true);
  assert.equal(result.invariants.safety_and_truth_boundaries_override_metric_improvement, true);
});

test("truth, sensitive-inference and evidence-leakage violations are independent blockers", () => {
  for (const [key, expected] of [
    ["truthBoundaryViolations", "truth_boundary_violation"],
    ["protectedOrSensitiveInferenceViolations", "sensitive_inference_violation"],
    ["evidenceLeakageViolations", "evidence_leakage_violation"],
  ]) {
    const c = champion();
    const n = run({
      policyRef: "synthesis-policy",
      policyVersion: "challenger-" + key,
      supportLow: 80,
      decoyLift: 20,
      violations: { [key]: 1 },
    });
    const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
    assert.equal(result.decision, CHALLENGER_DECISION.BLOCK_CHALLENGER);
    assert.equal(result.hard_boundary_issues.includes(expected), true);
  }
});

test("contradiction or genericity regression can block a higher-support challenger", () => {
  const c = champion();
  const contradictionBad = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-contradiction",
    supportLow: 70,
    decoyLift: 15,
    contradiction: 12,
  });
  const genericBad = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-genericity",
    supportLow: 70,
    decoyLift: 15,
    genericity: 15,
  });

  const a = compareChampionChallenger({ champion: c, challenger: contradictionBad, policy: policy() });
  const b = compareChampionChallenger({ champion: c, challenger: genericBad, policy: policy() });

  assert.equal(a.decision, CHALLENGER_DECISION.BLOCK_CHALLENGER);
  assert.equal(a.quality_regression_issues.includes("contradiction_regression"), true);
  assert.equal(b.decision, CHALLENGER_DECISION.BLOCK_CHALLENGER);
  assert.equal(b.quality_regression_issues.includes("genericity_regression"), true);
});

test("cost and latency remain guardrails rather than being collapsed into quality score", () => {
  const c = champion();
  const slow = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-slow",
    supportLow: 70,
    decoyLift: 15,
    latency: 1400,
  });
  const expensive = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-expensive",
    supportLow: 70,
    decoyLift: 15,
    cost: 0.25,
  });

  const a = compareChampionChallenger({ champion: c, challenger: slow, policy: policy() });
  const b = compareChampionChallenger({ champion: c, challenger: expensive, policy: policy() });

  assert.equal(a.decision, CHALLENGER_DECISION.BLOCK_CHALLENGER);
  assert.equal(a.quality_regression_issues.includes("latency_regression"), true);
  assert.equal(b.decision, CHALLENGER_DECISION.BLOCK_CHALLENGER);
  assert.equal(b.quality_regression_issues.includes("cost_regression"), true);
});

test("small non-material improvement keeps the current Champion", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    supportLow: 62,
    decoyLift: 11,
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(result.decision, CHALLENGER_DECISION.KEEP_CHAMPION);
  assert.equal(result.improvement_gates.support_low, false);
  assert.equal(result.improvement_gates.decoy_lift, false);
});

test("material improvement within all guardrails yields proposal only, never activation", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    supportLow: 65,
    supportHigh: 80,
    decoyLift: 13,
    contradiction: 9.5,
    genericity: 11,
    coverage: 87,
    latency: 1050,
    cost: 0.16,
  });

  const result = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });

  assert.equal(result.decision, CHALLENGER_DECISION.PROPOSE_CHALLENGER);
  assert.equal(result.improvement_gates.support_low, true);
  assert.equal(result.improvement_gates.decoy_lift, true);
  assert.equal(result.auto_activation_authorized, false);
  assert.equal(result.runtime_effect, false);
  assert.equal(result.human_review_required, true);
  assert.equal(result.owner_verification_required, true);
  assert.equal(result.invariants.no_universal_learning_score, true);
  assert.equal("score" in result, false);
});

test("distinct frozen policy versions are required", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "champion-v1",
  });

  assert.throws(() => compareChampionChallenger({ champion: c, challenger: n, policy: policy() }), /must be distinct frozen policy versions/);
});

test("proposal envelope preserves existing owner but cannot insert directly into undifferentiated learned_patterns", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    supportLow: 65,
    decoyLift: 13,
    contradiction: 9,
    genericity: 11,
  });
  const comparison = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });
  assert.equal(comparison.decision, CHALLENGER_DECISION.PROPOSE_CHALLENGER);

  const proposal = buildLearnedPatternProposal(comparison, {
    patternKey: "research_learning|synthesis_selection|challenger-v2",
    feature: { domain: "synthesis_selection", reason_code: "holdout_improvement" },
    rulesEnvRefs: ["rule:research_strategy_layer_law:v15"],
  });

  assert.equal(proposal.storage_route, "existing_learning_owner_requires_domain_qualified_adapter");
  assert.equal(proposal.direct_learned_patterns_insert_authorized, false);
  assert.equal(proposal.current_runtime_activation_authorized, false);
  assert.equal(proposal.status, "proposed");
  assert.equal(proposal.human_review_required, true);
  assert.equal(proposal.direct_admin_pattern_review_ready, false);
  assert.equal(proposal.invariants.current_global_approved_preference_projection_must_not_receive_domain_specific_policy_rows, true);
});

test("proposal cannot be built from keep/block/insufficient comparison", () => {
  const c = champion();
  const n = run({
    policyRef: "synthesis-policy",
    policyVersion: "challenger-v2",
    supportLow: 61,
    decoyLift: 10.5,
  });
  const comparison = compareChampionChallenger({ champion: c, challenger: n, policy: policy() });

  assert.equal(comparison.decision, CHALLENGER_DECISION.KEEP_CHAMPION);
  assert.throws(() => buildLearnedPatternProposal(comparison, {
    patternKey: "should-not-exist",
    feature: {},
  }), /requires a PROPOSE_CHALLENGER comparison/);
});

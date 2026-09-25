// Research Synthesis / Calibration contract v1.
//
// This is a composition contract under research_strategy_layer_law.
// It owns no domain calculation, no truth score, no Person truth, no persistence,
// and no autonomous learning/promotion policy.
//
// IMPORTANT:
// - Synthesis consumes an already access-filtered Research Result Bundle.
// - Empirical Person Fit is a calibration metric, never Truth/Verification/Governance.
// - Auxiliary signals (including Tarot) are permanently excluded from empirical evidence.
// - A fit percentage is valid only for a message frozen before holdout validation.

export const RESEARCH_SYNTHESIS_CONTRACT_VERSION = 1;

export const SYNTHESIS_STATUS = Object.freeze({
  COMPOSED: "composed",
  INSUFFICIENT_EVIDENCE: "insufficient_evidence",
  FAILED: "failed",
});

export const CALIBRATION_STATE = Object.freeze({
  UNVALIDATED: "unvalidated",
  HOLDOUT_PENDING: "holdout_pending",
  CALIBRATING: "calibrating",
  CALIBRATED: "calibrated",
});

export const CLAIM_VALIDATION_STATE = Object.freeze({
  UNTESTED: "untested",
  SUPPORTED: "supported",
  PARTIALLY_SUPPORTED: "partially_supported",
  CONTRADICTED: "contradicted",
  NOT_TESTABLE: "not_testable",
  TOO_GENERIC: "too_generic",
});

const VALID_SYNTHESIS_STATUS = new Set(Object.values(SYNTHESIS_STATUS));
const VALID_CALIBRATION_STATE = new Set(Object.values(CALIBRATION_STATE));
const VALID_CLAIM_VALIDATION_STATE = new Set(Object.values(CLAIM_VALIDATION_STATE));

const FORBIDDEN_SCORE_KEYS = new Set([
  "truth_score",
  "truthScore",
  "accuracy_score",
  "accuracyScore",
  "canonical_score",
  "canonicalScore",
]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function uniqueText(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function finiteNumberOrNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function integerOrZero(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function percentOrNull(value) {
  const n = finiteNumberOrNull(value);
  if (n == null) return null;
  if (n < 0 || n > 100) throw new TypeError("researchSynthesis: percent must be between 0 and 100");
  return n;
}

function assertNoUniversalTruthScore(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_SCORE_KEYS.has(key)) {
      throw new TypeError(`researchSynthesis: ${key} is forbidden; use explainable calibration dimensions, never a truth score`);
    }
  }
}

function normalizeSupport(support = {}, allowedFindingIds = new Set()) {
  const findingIds = uniqueText(support.finding_ids || support.findingIds);
  for (const id of findingIds) {
    if (!allowedFindingIds.has(id)) {
      throw new TypeError(`researchSynthesis: support references unavailable finding ${id}`);
    }
  }
  return {
    finding_ids: findingIds,
    dependency_groups: uniqueText(support.dependency_groups || support.dependencyGroups),
    derivation_refs: uniqueText(support.derivation_refs || support.derivationRefs),
    negative_or_control_refs: uniqueText(support.negative_or_control_refs || support.negativeOrControlRefs),
  };
}

function normalizeClaimValidation(validation = {}) {
  const state = clean(validation.state) || CLAIM_VALIDATION_STATE.UNTESTED;
  if (!VALID_CLAIM_VALIDATION_STATE.has(state)) {
    throw new TypeError(`researchSynthesis: invalid claim validation state "${state}"`);
  }
  return {
    state,
    evaluator: clean(validation.evaluator),
    evidence_refs: uniqueText(validation.evidence_refs || validation.evidenceRefs),
    note: clean(validation.note),
  };
}

function normalizeClaim(claim = {}, allowedFindingIds = new Set()) {
  const id = clean(claim.id);
  const text = clean(claim.text);
  if (!id || !text) throw new TypeError("researchSynthesis: every atomic claim requires id + text");
  return {
    id,
    text,
    role: clean(claim.role) || "interpretation",
    motif_key: clean(claim.motif_key || claim.motifKey),
    support: normalizeSupport(claim.support, allowedFindingIds),
    validation: normalizeClaimValidation(claim.validation),
  };
}

function normalizeMotif(motif = {}, claimIds = new Set()) {
  const key = clean(motif.key);
  if (!key) throw new TypeError("researchSynthesis: motif key is required");
  const refs = uniqueText(motif.claim_ids || motif.claimIds);
  for (const id of refs) {
    if (!claimIds.has(id)) throw new TypeError(`researchSynthesis: motif references unknown claim ${id}`);
  }
  return {
    key,
    label: clean(motif.label) || key,
    summary: clean(motif.summary),
    claim_ids: refs,
    semantic_dimensions: uniqueText(motif.semantic_dimensions || motif.semanticDimensions),
  };
}

function normalizeIndividualCalibration(input = {}) {
  const tested = integerOrZero(input.tested_claims ?? input.testedClaims);
  const supported = integerOrZero(input.supported_claims ?? input.supportedClaims);
  const partial = integerOrZero(input.partially_supported_claims ?? input.partiallySupportedClaims);
  const contradicted = integerOrZero(input.contradicted_claims ?? input.contradictedClaims);
  const notTestable = integerOrZero(input.not_testable_claims ?? input.notTestableClaims);
  const tooGeneric = integerOrZero(input.too_generic_claims ?? input.tooGenericClaims);
  const fit = percentOrNull(input.empirical_fit_percent ?? input.empiricalFitPercent);
  if (supported + partial + contradicted > tested) {
    throw new TypeError("researchSynthesis: individual calibration counts exceed tested_claims");
  }
  return {
    tested_claims: tested,
    supported_claims: supported,
    partially_supported_claims: partial,
    contradicted_claims: contradicted,
    not_testable_claims: notTestable,
    too_generic_claims: tooGeneric,
    empirical_fit_percent: fit,
    validation_source_classes: uniqueText(input.validation_source_classes || input.validationSourceClasses),
  };
}

function normalizeCohortCalibration(input = {}) {
  return {
    independent_persons: integerOrZero(input.independent_persons ?? input.independentPersons),
    holdout_fit_percent: percentOrNull(input.holdout_fit_percent ?? input.holdoutFitPercent),
    decoy_baseline_percent: percentOrNull(input.decoy_baseline_percent ?? input.decoyBaselinePercent),
    decoy_lift_percent: percentOrNull(input.decoy_lift_percent ?? input.decoyLiftPercent),
    contradiction_rate_percent: percentOrNull(input.contradiction_rate_percent ?? input.contradictionRatePercent),
    generality_penalty_percent: percentOrNull(input.generality_penalty_percent ?? input.generalityPenaltyPercent),
    post_hoc_penalty_percent: percentOrNull(input.post_hoc_penalty_percent ?? input.postHocPenaltyPercent),
    interval: input.interval && typeof input.interval === "object" ? { ...input.interval } : null,
  };
}

function normalizeBiasControls(input = {}) {
  return {
    message_frozen_before_validation: input.message_frozen_before_validation === true || input.messageFrozenBeforeValidation === true,
    validation_data_hidden_during_synthesis: input.validation_data_hidden_during_synthesis === true || input.validationDataHiddenDuringSynthesis === true,
    decoy_control_used: input.decoy_control_used === true || input.decoyControlUsed === true,
    evaluator_blinded: input.evaluator_blinded === true || input.evaluatorBlinded === true,
    leakage_check: clean(input.leakage_check || input.leakageCheck) || "unknown",
    post_hoc_exposure: clean(input.post_hoc_exposure || input.postHocExposure) || "unknown",
  };
}

function normalizeCalibration(input = {}) {
  const state = clean(input.state) || CALIBRATION_STATE.UNVALIDATED;
  if (!VALID_CALIBRATION_STATE.has(state)) {
    throw new TypeError(`researchSynthesis: invalid calibration state "${state}"`);
  }
  const individual = normalizeIndividualCalibration(input.individual);
  const cohort = normalizeCohortCalibration(input.cohort);
  const biasControls = normalizeBiasControls(input.bias_controls || input.biasControls);

  const anyFit = individual.empirical_fit_percent != null || cohort.holdout_fit_percent != null;
  if (anyFit && !biasControls.message_frozen_before_validation) {
    throw new TypeError("researchSynthesis: empirical fit requires message_frozen_before_validation=true");
  }
  if (cohort.decoy_lift_percent != null && !biasControls.decoy_control_used) {
    throw new TypeError("researchSynthesis: decoy_lift_percent requires decoy_control_used=true");
  }

  return {
    state,
    individual,
    cohort,
    bias_controls: biasControls,
  };
}

function normalizeCrossSignature(signature = {}, allowedFindingIds = new Set()) {
  const findingId = clean(signature.finding_id || signature.findingId);
  if (!findingId || !allowedFindingIds.has(findingId)) {
    throw new TypeError("researchSynthesis: Cross Signature must reference a relation Finding available in the Result Bundle");
  }
  return {
    finding_id: findingId,
    relation_ref: clean(signature.relation_ref || signature.relationRef),
    label: clean(signature.label),
    effective_independent_group_count: integerOrZero(signature.effective_independent_group_count ?? signature.effectiveIndependentGroupCount),
    raw_group_count: integerOrZero(signature.raw_group_count ?? signature.rawGroupCount),
    structure_sensitive_group_count: integerOrZero(signature.structure_sensitive_group_count ?? signature.structureSensitiveGroupCount),
    noise_flags: uniqueText(signature.noise_flags || signature.noiseFlags),
    semantic_roles: uniqueText(signature.semantic_roles || signature.semanticRoles),
    corpus_specificity: signature.corpus_specificity && typeof signature.corpus_specificity === "object"
      ? { ...signature.corpus_specificity }
      : signature.corpusSpecificity && typeof signature.corpusSpecificity === "object"
        ? { ...signature.corpusSpecificity }
        : null,
    search_provenance: signature.search_provenance && typeof signature.search_provenance === "object"
      ? { ...signature.search_provenance }
      : signature.searchProvenance && typeof signature.searchProvenance === "object"
        ? { ...signature.searchProvenance }
        : null,
    truth_boundary: "relation candidate / convergence input; never independent evidence merely by being a Cross Signature",
  };
}

function normalizeResearchStrength(input = {}) {
  assertNoUniversalTruthScore(input);
  return {
    independent_evidence_groups: integerOrZero(input.independent_evidence_groups ?? input.independentEvidenceGroups),
    verified_engine_components: integerOrZero(input.verified_engine_components ?? input.verifiedEngineComponents),
    source_attestation_groups: integerOrZero(input.source_attestation_groups ?? input.sourceAttestationGroups),
    cross_domain_dimensions: uniqueText(input.cross_domain_dimensions || input.crossDomainDimensions),
    contradiction_count: integerOrZero(input.contradiction_count ?? input.contradictionCount),
    negative_control_count: integerOrZero(input.negative_control_count ?? input.negativeControlCount),
    specificity: input.specificity && typeof input.specificity === "object" ? { ...input.specificity } : null,
    reproducibility: clean(input.reproducibility) || "unknown",
    note: clean(input.note),
  };
}

function normalizeResonance(input = {}) {
  return {
    analyses: integerOrZero(input.analyses),
    up_votes: integerOrZero(input.up_votes ?? input.upVotes),
    down_votes: integerOrZero(input.down_votes ?? input.downVotes),
    shares: integerOrZero(input.shares),
    continue_actions: integerOrZero(input.continue_actions ?? input.continueActions),
    research_actions: integerOrZero(input.research_actions ?? input.researchActions),
    source_class: clean(input.source_class || input.sourceClass) || "interaction_signal",
    // Load-bearing separation: compelling/useful is not accurate/true.
    included_in_research_strength: false,
    included_in_empirical_fit: false,
  };
}

function normalizeModelRobustness(input = {}) {
  return {
    providers: uniqueText(input.providers),
    independent_runs: integerOrZero(input.independent_runs ?? input.independentRuns),
    shared_motifs: uniqueText(input.shared_motifs || input.sharedMotifs),
    disagreements: uniqueText(input.disagreements),
    challenge_notes: uniqueText(input.challenge_notes || input.challengeNotes),
    // Model agreement is robustness of interpretation, not independent world evidence.
    included_as_independent_evidence: false,
  };
}

function normalizeCorpusContext(input = {}) {
  return {
    corpus_ref: clean(input.corpus_ref || input.corpusRef),
    corpus_version: clean(input.corpus_version || input.corpusVersion),
    population_size: integerOrZero(input.population_size ?? input.populationSize),
    search_space_size: integerOrZero(input.search_space_size ?? input.searchSpaceSize),
    baseline_ref: clean(input.baseline_ref || input.baselineRef),
    semantic_relation_version: clean(input.semantic_relation_version || input.semanticRelationVersion),
    multiple_comparison_control: clean(input.multiple_comparison_control || input.multipleComparisonControl) || "unknown",
    selection_provenance: clean(input.selection_provenance || input.selectionProvenance) || "unknown",
  };
}

function normalizeLearningContext(input = {}) {
  return {
    policy_version: clean(input.policy_version || input.policyVersion) || "research-synthesis-policy-v1",
    champion_ref: clean(input.champion_ref || input.championRef),
    challenger_ref: clean(input.challenger_ref || input.challengerRef),
    learned_pattern_refs: uniqueText(input.learned_pattern_refs || input.learnedPatternRefs),
    evaluation_ref: clean(input.evaluation_ref || input.evaluationRef),
    human_gate_state: clean(input.human_gate_state || input.humanGateState) || "not_reviewed",
    auto_promotion: false,
  };
}

function normalizeAuxiliarySignal(signal = {}) {
  const kind = clean(signal.kind);
  if (!kind) throw new TypeError("researchSynthesis: auxiliary signal kind is required");
  return {
    kind,
    label: clean(signal.label) || kind,
    result: signal.result ?? null,
    resonance: signal.resonance && typeof signal.resonance === "object" ? { ...signal.resonance } : null,
    replay: signal.replay && typeof signal.replay === "object" ? { ...signal.replay } : null,
    // Load-bearing: auxiliary lanes may never raise empirical person-fit or Research Strength.
    evidence_weight: 0,
    included_in_empirical_fit: false,
  };
}

export function normalizeResearchSynthesis(input, {
  allowedFindingIds = [],
  frozenAt = null,
  sourceBundleContractVersion = null,
} = {}) {
  if (input == null) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("researchSynthesis: synthesis must be an object");
  }
  assertNoUniversalTruthScore(input);

  const status = clean(input.status) || SYNTHESIS_STATUS.COMPOSED;
  if (!VALID_SYNTHESIS_STATUS.has(status)) {
    throw new TypeError(`researchSynthesis: invalid status "${status}"`);
  }

  const findingIds = new Set(uniqueText(allowedFindingIds));
  const claims = (Array.isArray(input.claims) ? input.claims : []).map(x => normalizeClaim(x, findingIds));
  const claimIds = new Set(claims.map(x => x.id));
  if (claimIds.size !== claims.length) throw new TypeError("researchSynthesis: duplicate atomic claim id");

  const motifs = (Array.isArray(input.motifs) ? input.motifs : []).map(x => normalizeMotif(x, claimIds));
  const calibration = normalizeCalibration(input.calibration);
  const crossSignatures = (Array.isArray(input.cross_signatures) ? input.cross_signatures : Array.isArray(input.crossSignatures) ? input.crossSignatures : [])
    .map(signature => normalizeCrossSignature(signature, findingIds));
  const researchStrength = normalizeResearchStrength(input.research_strength || input.researchStrength);
  const resonance = normalizeResonance(input.resonance);
  const modelRobustness = normalizeModelRobustness(input.model_robustness || input.modelRobustness);
  const corpusContext = normalizeCorpusContext(input.corpus_context || input.corpusContext);
  const learning = normalizeLearningContext(input.learning);
  const auxiliarySignals = (Array.isArray(input.auxiliary_signals) ? input.auxiliary_signals : Array.isArray(input.auxiliarySignals) ? input.auxiliarySignals : [])
    .map(normalizeAuxiliarySignal);

  if (status === SYNTHESIS_STATUS.COMPOSED && !claims.length) {
    throw new TypeError("researchSynthesis: composed synthesis requires atomic claims");
  }

  const freezeInput = input.freeze && typeof input.freeze === "object" ? input.freeze : {};
  const frozen = freezeInput.frozen !== false;
  const freeze = {
    frozen,
    frozen_at: clean(freezeInput.frozen_at || freezeInput.frozenAt) || clean(frozenAt),
    policy_version: clean(freezeInput.policy_version || freezeInput.policyVersion) || "research-synthesis-policy-v1",
    source_bundle_contract_version: sourceBundleContractVersion ?? null,
    source_finding_ids: uniqueText(claims.flatMap(claim => claim.support.finding_ids)),
  };

  return {
    contract_version: RESEARCH_SYNTHESIS_CONTRACT_VERSION,
    status,
    message: clean(input.message),
    motifs,
    claims,
    cross_signatures: crossSignatures,
    research_strength: researchStrength,
    calibration,
    resonance,
    model_robustness: modelRobustness,
    corpus_context: corpusContext,
    learning,
    auxiliary_signals: auxiliarySignals,
    freeze,
    explain_why: input.explain_why && typeof input.explain_why === "object"
      ? { ...input.explain_why }
      : input.explainWhy && typeof input.explainWhy === "object"
        ? { ...input.explainWhy }
        : {},
    provenance: input.provenance && typeof input.provenance === "object" ? { ...input.provenance } : {},
    invariants: {
      synthesis_is_not_truth: true,
      empirical_person_fit_is_not_verification: true,
      calibration_does_not_promote_governance: true,
      method_semantics_are_dimensions_not_truth_weights: true,
      dependency_grouping_precedes_synthesis: true,
      message_freeze_precedes_holdout_validation: true,
      auxiliary_signals_never_count_as_empirical_evidence: true,
      tarot_is_auxiliary_only: true,
      historical_resonance_is_not_accuracy: true,
      model_agreement_is_not_independent_evidence: true,
      cross_signatures_must_be_bundle_backed: true,
      no_universal_truth_score: true,
      no_auto_learning_policy_promotion: true,
    },
  };
}

export function failedResearchSynthesis(error, {
  frozenAt = null,
  sourceBundleContractVersion = null,
} = {}) {
  return {
    contract_version: RESEARCH_SYNTHESIS_CONTRACT_VERSION,
    status: SYNTHESIS_STATUS.FAILED,
    message: null,
    motifs: [],
    claims: [],
    cross_signatures: [],
    research_strength: normalizeResearchStrength(),
    calibration: normalizeCalibration(),
    resonance: normalizeResonance(),
    model_robustness: normalizeModelRobustness(),
    corpus_context: normalizeCorpusContext(),
    learning: normalizeLearningContext(),
    auxiliary_signals: [],
    freeze: {
      frozen: true,
      frozen_at: clean(frozenAt),
      policy_version: "research-synthesis-policy-v1",
      source_bundle_contract_version: sourceBundleContractVersion ?? null,
      source_finding_ids: [],
    },
    explain_why: {
      error_class: clean(error?.name) || "Error",
      reason: clean(error?.message) || "synthesis failed",
    },
    provenance: {},
    invariants: {
      synthesis_is_not_truth: true,
      empirical_person_fit_is_not_verification: true,
      calibration_does_not_promote_governance: true,
      method_semantics_are_dimensions_not_truth_weights: true,
      dependency_grouping_precedes_synthesis: true,
      message_freeze_precedes_holdout_validation: true,
      auxiliary_signals_never_count_as_empirical_evidence: true,
      tarot_is_auxiliary_only: true,
      historical_resonance_is_not_accuracy: true,
      model_agreement_is_not_independent_evidence: true,
      cross_signatures_must_be_bundle_backed: true,
      no_universal_truth_score: true,
      no_auto_learning_policy_promotion: true,
    },
  };
}

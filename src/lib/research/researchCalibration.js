import { CLAIM_VALIDATION_STATE } from "./researchSynthesis.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

// F3 — pure Calibration Harness.
//
// No DB access. No Person identity resolution. No Truth/Verification promotion.
// The harness measures how a previously frozen Synthesis performs against
// held-out validation material and decoy controls.
//
// IMPORTANT:
// - content_fingerprint is a deterministic replay/change-detection fingerprint,
//   NOT a cryptographic signature or security boundary.
// - Person Fit is calibration, never Truth, Verification or Canonicality.
// - partial support is intentionally exposed as a BAND, not silently assigned
//   an arbitrary numeric weight.
// - blind evaluator packets never receive derivation/support/context used to
//   generate the claim.

export const RESEARCH_CALIBRATION_HARNESS_VERSION = "research-calibration-harness-v1";

export const CALIBRATION_EVALUATOR_CLASS = Object.freeze({
  SELF_REPORT: "self_report",
  VALIDATED_MEASURE: "validated_measure",
  OBSERVED_FACT: "observed_fact",
  LONGITUDINAL_FACT: "longitudinal_fact",
  FAMILIAR_PERSON: "familiar_person",
  HUMAN_REVIEW: "human_review",
  BLIND_AI: "blind_ai",
});

const VALID_EVALUATOR_CLASSES = new Set(Object.values(CALIBRATION_EVALUATOR_CLASS));
const ADJUDICATED_STATES = new Set([
  CLAIM_VALIDATION_STATE.SUPPORTED,
  CLAIM_VALIDATION_STATE.PARTIALLY_SUPPORTED,
  CLAIM_VALIDATION_STATE.CONTRADICTED,
  CLAIM_VALIDATION_STATE.NOT_TESTABLE,
  CLAIM_VALIDATION_STATE.TOO_GENERIC,
]);

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function uniqueText(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function finiteDate(value, label) {
  const text = clean(value);
  if (!text) throw new TypeError(`researchCalibration: ${label} is required`);
  const ms = Date.parse(text);
  if (!Number.isFinite(ms)) throw new TypeError(`researchCalibration: invalid ${label}`);
  return { text, ms };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function percent(numerator, denominator) {
  if (!denominator) return null;
  return round2((100 * numerator) / denominator);
}

function canonicalValue(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    if (item === undefined) continue;
    out[key] = canonicalValue(item);
  }
  return out;
}

export function canonicalCalibrationJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function calibrationContentFingerprint(value) {
  return `f1:${stableIdentityDigest(canonicalCalibrationJson(value))}`;
}

function frozenClaimShape(claim = {}) {
  const id = clean(claim.id);
  const text = clean(claim.text);
  if (!id || !text) throw new TypeError("researchCalibration: frozen claim requires id + text");
  return {
    id,
    text,
    role: clean(claim.role) || "interpretation",
    motif_key: clean(claim.motif_key || claim.motifKey),
    support: {
      finding_ids: uniqueText(claim.support?.finding_ids || claim.support?.findingIds),
      dependency_groups: uniqueText(claim.support?.dependency_groups || claim.support?.dependencyGroups),
      derivation_refs: uniqueText(claim.support?.derivation_refs || claim.support?.derivationRefs),
      negative_or_control_refs: uniqueText(claim.support?.negative_or_control_refs || claim.support?.negativeOrControlRefs),
    },
  };
}

function frozenSynthesisPayload(synthesis = {}) {
  const claims = (Array.isArray(synthesis.claims) ? synthesis.claims : []).map(frozenClaimShape);
  if (!claims.length) throw new TypeError("researchCalibration: cannot freeze a synthesis without atomic claims");
  const ids = new Set(claims.map(x => x.id));
  if (ids.size !== claims.length) throw new TypeError("researchCalibration: duplicate claim id in freeze");

  return {
    message: clean(synthesis.message),
    claims,
    motifs: (Array.isArray(synthesis.motifs) ? synthesis.motifs : []).map(motif => ({
      key: clean(motif?.key),
      label: clean(motif?.label),
      claim_ids: uniqueText(motif?.claim_ids || motif?.claimIds),
      semantic_dimensions: uniqueText(motif?.semantic_dimensions || motif?.semanticDimensions),
    })),
    cross_signature_refs: (Array.isArray(synthesis.cross_signatures) ? synthesis.cross_signatures : [])
      .map(x => clean(x?.finding_id))
      .filter(Boolean),
    policy_version: clean(synthesis.freeze?.policy_version) || "research-synthesis-policy-v1",
    source_bundle_contract_version: synthesis.freeze?.source_bundle_contract_version ?? null,
    source_finding_ids: uniqueText(synthesis.freeze?.source_finding_ids),
  };
}

export function freezeSynthesisForCalibration(synthesis, {
  frozenAt,
  runRef = null,
} = {}) {
  const time = finiteDate(frozenAt, "frozenAt");
  const payload = frozenSynthesisPayload(synthesis);
  const claimSetFingerprint = calibrationContentFingerprint(payload.claims);
  const synthesisFingerprint = calibrationContentFingerprint(payload);

  return deepFreeze({
    contract_version: 1,
    harness_version: RESEARCH_CALIBRATION_HARNESS_VERSION,
    frozen: true,
    frozen_at: time.text,
    run_ref: clean(runRef),
    policy_version: payload.policy_version,
    source_bundle_contract_version: payload.source_bundle_contract_version,
    source_finding_ids: payload.source_finding_ids,
    claim_count: payload.claims.length,
    claims: payload.claims,
    motifs: payload.motifs,
    message: payload.message,
    cross_signature_refs: payload.cross_signature_refs,
    claim_set_fingerprint: claimSetFingerprint,
    synthesis_fingerprint: synthesisFingerprint,
    fingerprint_kind: "deterministic_change_detection_not_cryptographic_signature",
    invariants: {
      frozen_before_validation_required: true,
      frozen_claim_text_is_immutable_for_this_run: true,
      later_rewording_requires_new_freeze: true,
      person_fit_is_calibration_not_truth: true,
    },
  });
}

export function verifyCalibrationFreeze(freeze, synthesis) {
  if (!freeze?.frozen) return { ok: false, reason: "not_frozen" };
  try {
    const payload = frozenSynthesisPayload(synthesis);
    const claimSetFingerprint = calibrationContentFingerprint(payload.claims);
    const synthesisFingerprint = calibrationContentFingerprint(payload);
    return {
      ok:
        claimSetFingerprint === freeze.claim_set_fingerprint
        && synthesisFingerprint === freeze.synthesis_fingerprint,
      claim_set_match: claimSetFingerprint === freeze.claim_set_fingerprint,
      synthesis_match: synthesisFingerprint === freeze.synthesis_fingerprint,
      expected_claim_set_fingerprint: freeze.claim_set_fingerprint || null,
      actual_claim_set_fingerprint: claimSetFingerprint,
      expected_synthesis_fingerprint: freeze.synthesis_fingerprint || null,
      actual_synthesis_fingerprint: synthesisFingerprint,
    };
  } catch (error) {
    return { ok: false, reason: error?.message || String(error) };
  }
}

export function openCalibrationValidationSession(freeze, {
  openedAt,
  validationDataHiddenDuringSynthesis,
  evaluatorBlinded = false,
  leakageCheck = "unknown",
  sessionRef = null,
} = {}) {
  if (!freeze?.frozen) throw new TypeError("researchCalibration: validation requires a frozen synthesis");
  const frozen = finiteDate(freeze.frozen_at, "freeze.frozen_at");
  const opened = finiteDate(openedAt, "openedAt");
  if (opened.ms < frozen.ms) {
    throw new TypeError("researchCalibration: validation cannot open before the synthesis freeze");
  }
  if (validationDataHiddenDuringSynthesis !== true) {
    throw new TypeError("researchCalibration: validation_data_hidden_during_synthesis must be explicitly true");
  }

  return deepFreeze({
    contract_version: 1,
    harness_version: RESEARCH_CALIBRATION_HARNESS_VERSION,
    session_ref: clean(sessionRef),
    synthesis_fingerprint: freeze.synthesis_fingerprint,
    claim_set_fingerprint: freeze.claim_set_fingerprint,
    frozen_at: freeze.frozen_at,
    opened_at: opened.text,
    bias_controls: {
      message_frozen_before_validation: true,
      validation_data_hidden_during_synthesis: true,
      evaluator_blinded: evaluatorBlinded === true,
      leakage_check: clean(leakageCheck) || "unknown",
    },
  });
}

export function buildBlindClaimPackets(freeze, validationSession) {
  if (!freeze?.frozen || !validationSession) {
    throw new TypeError("researchCalibration: blind packets require freeze + validation session");
  }
  if (validationSession.synthesis_fingerprint !== freeze.synthesis_fingerprint) {
    throw new TypeError("researchCalibration: validation session belongs to a different synthesis freeze");
  }

  return freeze.claims.map((claim, index) => deepFreeze({
    packet_version: 1,
    packet_id: `blind:${stableIdentityDigest(`${validationSession.session_ref || validationSession.opened_at}|${claim.id}`)}`,
    ordinal: index + 1,
    claim_id: claim.id,
    claim_text: claim.text,
    allowed_outcomes: [...ADJUDICATED_STATES],
    hidden_from_evaluator: [
      "subject_identity",
      "support_findings",
      "dependency_groups",
      "motifs",
      "cross_signatures",
      "research_strength",
      "provider_reasoning",
    ],
  }));
}

export function makeClaimValidationOutcome({
  claimId,
  state,
  evaluatorClass,
  evidenceRefs = [],
  observedAt,
  note = null,
  evaluatorRef = null,
} = {}) {
  const claim = clean(claimId);
  if (!claim) throw new TypeError("researchCalibration: claimId is required");
  if (!ADJUDICATED_STATES.has(state)) {
    throw new TypeError(`researchCalibration: invalid adjudicated state "${state}"`);
  }
  if (!VALID_EVALUATOR_CLASSES.has(evaluatorClass)) {
    throw new TypeError(`researchCalibration: invalid evaluatorClass "${evaluatorClass}"`);
  }
  const observed = finiteDate(observedAt, "observedAt");
  return deepFreeze({
    outcome_version: 1,
    claim_id: claim,
    state,
    evaluator_class: evaluatorClass,
    evaluator_ref: clean(evaluatorRef),
    evidence_refs: uniqueText(evidenceRefs),
    observed_at: observed.text,
    note: clean(note),
  });
}

export function summarizeClaimValidations(freeze, validationSession, outcomes = []) {
  if (!freeze?.frozen) throw new TypeError("researchCalibration: summary requires a freeze");
  if (!validationSession || validationSession.synthesis_fingerprint !== freeze.synthesis_fingerprint) {
    throw new TypeError("researchCalibration: summary requires the matching validation session");
  }

  const claimIds = new Set(freeze.claims.map(x => x.id));
  const byClaim = new Map();
  for (const raw of Array.isArray(outcomes) ? outcomes : []) {
    const claimId = clean(raw?.claim_id || raw?.claimId);
    if (!claimIds.has(claimId)) {
      throw new TypeError(`researchCalibration: validation references unknown frozen claim "${claimId}"`);
    }
    if (byClaim.has(claimId)) {
      throw new TypeError(`researchCalibration: duplicate adjudicated outcome for claim "${claimId}"`);
    }
    const normalized = makeClaimValidationOutcome({
      claimId,
      state: raw.state,
      evaluatorClass: raw.evaluator_class || raw.evaluatorClass,
      evidenceRefs: raw.evidence_refs || raw.evidenceRefs,
      observedAt: raw.observed_at || raw.observedAt,
      note: raw.note,
      evaluatorRef: raw.evaluator_ref || raw.evaluatorRef,
    });
    const opened = Date.parse(validationSession.opened_at);
    if (Date.parse(normalized.observed_at) < opened) {
      throw new TypeError("researchCalibration: claim outcome predates the validation session");
    }
    byClaim.set(claimId, normalized);
  }

  const counts = {
    supported: 0,
    partially_supported: 0,
    contradicted: 0,
    not_testable: 0,
    too_generic: 0,
    untested: 0,
  };
  const normalizedOutcomes = [];

  for (const claim of freeze.claims) {
    const outcome = byClaim.get(claim.id);
    if (!outcome) {
      counts.untested += 1;
      continue;
    }
    counts[outcome.state] += 1;
    normalizedOutcomes.push(outcome);
  }

  const tested =
    counts.supported
    + counts.partially_supported
    + counts.contradicted;
  const evaluated = freeze.claim_count - counts.untested;

  return deepFreeze({
    contract_version: 1,
    harness_version: RESEARCH_CALIBRATION_HARNESS_VERSION,
    synthesis_fingerprint: freeze.synthesis_fingerprint,
    claim_set_fingerprint: freeze.claim_set_fingerprint,
    claim_count: freeze.claim_count,
    evaluated_claims: evaluated,
    tested_claims: tested,
    supported_claims: counts.supported,
    partially_supported_claims: counts.partially_supported,
    contradicted_claims: counts.contradicted,
    not_testable_claims: counts.not_testable,
    too_generic_claims: counts.too_generic,
    untested_claims: counts.untested,
    coverage_percent: percent(evaluated, freeze.claim_count),
    testable_coverage_percent: percent(tested, freeze.claim_count),
    support_band_percent: {
      // Lower bound counts only full support.
      low: percent(counts.supported, tested),
      // Upper bound treats partial support as support, without pretending we know its weight.
      high: percent(counts.supported + counts.partially_supported, tested),
      policy: "partial_support_exposed_as_band_not_hidden_weight",
    },
    contradiction_rate_percent: percent(counts.contradicted, tested),
    genericity_rate_percent: percent(counts.too_generic, evaluated),
    non_testable_rate_percent: percent(counts.not_testable, evaluated),
    outcomes: normalizedOutcomes,
    validation_source_classes: uniqueText(normalizedOutcomes.map(x => x.evaluator_class)),
    bias_controls: { ...validationSession.bias_controls },
    invariants: {
      no_truth_score: true,
      no_canonical_score: true,
      no_hidden_partial_credit_weight: true,
      person_fit_is_calibration_not_verification: true,
      contradictions_are_preserved: true,
      generic_claims_are_penalized_by_visibility_not_silently_counted_as_support: true,
    },
  });
}

function decoySource(item, index) {
  const id = clean(item?.id) || `decoy:${index + 1}`;
  const message = clean(item?.message);
  if (!message) throw new TypeError("researchCalibration: each decoy requires message text");
  return { id, message };
}

export function buildBlindDecoyTrial(freeze, decoys = [], {
  seed,
  trialRef = null,
} = {}) {
  if (!freeze?.frozen) throw new TypeError("researchCalibration: decoy trial requires a frozen synthesis");
  const stableSeed = clean(seed);
  if (!stableSeed) throw new TypeError("researchCalibration: replayable decoy trial requires seed");
  const correctMessage = clean(freeze.message);
  if (!correctMessage) throw new TypeError("researchCalibration: decoy trial requires a frozen message");

  const sources = [
    { id: `correct:${freeze.synthesis_fingerprint}`, message: correctMessage, correct: true },
    ...decoys.map((item, index) => ({ ...decoySource(item, index), correct: false })),
  ];
  if (sources.length < 2) throw new TypeError("researchCalibration: at least one decoy is required");

  const ids = new Set();
  const messages = new Set();
  for (const source of sources) {
    if (ids.has(source.id)) throw new TypeError(`researchCalibration: duplicate decoy source id "${source.id}"`);
    ids.add(source.id);
    if (messages.has(source.message)) {
      throw new TypeError("researchCalibration: correct/decoy messages must be distinct");
    }
    messages.add(source.message);
  }

  const ordered = sources
    .map(source => ({
      ...source,
      order_key: stableIdentityDigest(`${stableSeed}|${source.id}`),
    }))
    .sort((a, b) => a.order_key.localeCompare(b.order_key) || a.id.localeCompare(b.id));

  const publicOptions = ordered.map((source, index) => ({
    option_id: `opt:${stableIdentityDigest(`${stableSeed}|${index}|${source.id}`)}`,
    message: source.message,
  }));
  const correctIndex = ordered.findIndex(x => x.correct);
  const trialId = clean(trialRef) || `decoy:${stableIdentityDigest(`${stableSeed}|${freeze.synthesis_fingerprint}`)}`;

  return deepFreeze({
    public_trial: {
      trial_version: 1,
      trial_id: trialId,
      option_count: publicOptions.length,
      options: publicOptions,
      // This is safe to show: it does not reveal which option is correct.
      random_baseline_percent: round2(100 / publicOptions.length),
    },
    answer_key: {
      trial_id: trialId,
      correct_option_id: publicOptions[correctIndex].option_id,
      synthesis_fingerprint: freeze.synthesis_fingerprint,
      seed_fingerprint: calibrationContentFingerprint(stableSeed),
      // Keep server-side / evaluator-hidden.
      visibility: "hidden_from_subject_and_blind_evaluator",
    },
  });
}

export function scoreBlindDecoyTrial(publicTrial, answerKey, {
  selectedOptionId,
  observedAt,
} = {}) {
  if (!publicTrial || !answerKey || publicTrial.trial_id !== answerKey.trial_id) {
    throw new TypeError("researchCalibration: trial and answer key do not match");
  }
  const selected = clean(selectedOptionId);
  if (!publicTrial.options?.some(x => x.option_id === answerKey.correct_option_id)) {
    throw new TypeError("researchCalibration: answer key does not identify an option in the trial");
  }
  if (!publicTrial.options?.some(x => x.option_id === selected)) {
    throw new TypeError("researchCalibration: selected option is not in the trial");
  }
  const observed = finiteDate(observedAt, "observedAt");
  return deepFreeze({
    trial_id: publicTrial.trial_id,
    option_count: publicTrial.option_count,
    selected_option_id: selected,
    correct: selected === answerKey.correct_option_id,
    random_baseline_percent: publicTrial.random_baseline_percent,
    observed_at: observed.text,
  });
}

export function summarizeDecoyTrials(results = []) {
  const list = Array.isArray(results) ? results : [];
  if (!list.length) {
    return {
      trials: 0,
      correct_trials: 0,
      observed_identification_percent: null,
      random_baseline_percent: null,
      lift_points: null,
    };
  }

  let correct = 0;
  let baselineSum = 0;
  for (const result of list) {
    if (!Number.isInteger(result?.option_count) || result.option_count < 2) {
      throw new TypeError("researchCalibration: invalid decoy trial result");
    }
    if (result.correct === true) correct += 1;
    baselineSum += 100 / result.option_count;
  }

  const observed = percent(correct, list.length);
  const baseline = round2(baselineSum / list.length);
  return deepFreeze({
    trials: list.length,
    correct_trials: correct,
    observed_identification_percent: observed,
    random_baseline_percent: baseline,
    lift_points: round2(observed - baseline),
    interpretation: "decoy_discrimination_not_truth_score",
  });
}

export function buildCalibrationResearchMeta({
  freeze,
  validationSession = null,
  claimSummary = null,
  decoySummary = null,
} = {}) {
  if (!freeze?.frozen) throw new TypeError("researchCalibration: research meta requires a freeze");
  return {
    ext: {
      research_synthesis_calibration: {
        contract_version: 1,
        harness_version: RESEARCH_CALIBRATION_HARNESS_VERSION,
        synthesis_fingerprint: freeze.synthesis_fingerprint,
        claim_set_fingerprint: freeze.claim_set_fingerprint,
        frozen_at: freeze.frozen_at,
        policy_version: freeze.policy_version,
        claim_count: freeze.claim_count,
        validation_session: validationSession
          ? {
              session_ref: validationSession.session_ref,
              opened_at: validationSession.opened_at,
              bias_controls: validationSession.bias_controls,
            }
          : null,
        claim_summary: claimSummary
          ? {
              evaluated_claims: claimSummary.evaluated_claims,
              tested_claims: claimSummary.tested_claims,
              support_band_percent: claimSummary.support_band_percent,
              contradiction_rate_percent: claimSummary.contradiction_rate_percent,
              genericity_rate_percent: claimSummary.genericity_rate_percent,
            }
          : null,
        decoy_summary: decoySummary ? { ...decoySummary } : null,
        truth_boundary: "CALIBRATION != TRUTH != VERIFICATION != CANONICAL != PUBLISHED",
        storage_boundary: "storage-neutral shape; persistence must route through existing private Research OS/Person owners",
      },
    },
  };
}

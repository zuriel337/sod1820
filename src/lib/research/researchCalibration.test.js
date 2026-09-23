import test from "node:test";
import assert from "node:assert/strict";
import {
  CALIBRATION_EVALUATOR_CLASS,
  buildBlindClaimPackets,
  buildBlindDecoyTrial,
  buildCalibrationResearchMeta,
  calibrationContentFingerprint,
  freezeSynthesisForCalibration,
  makeClaimValidationOutcome,
  openCalibrationValidationSession,
  scoreBlindDecoyTrial,
  summarizeClaimValidations,
  summarizeDecoyTrials,
  verifyCalibrationFreeze,
} from "./researchCalibration.js";

function syntheticSynthesis() {
  return {
    message: "שני רכיבים מתחברים למבנה, והאתגר הוא ויסות ההגברה.",
    claims: [
      {
        id: "claim:integration",
        text: "קיימת נטייה חוזרת לחבר בין שני תחומים או רכיבים.",
        role: "interpretation",
        motif_key: "integration",
        support: {
          finding_ids: ["uf:synthetic:1"],
          dependency_groups: ["group:a"],
        },
      },
      {
        id: "claim:structure",
        text: "החיבור נוטה להפוך למבנה או מערכת.",
        role: "interpretation",
        motif_key: "structure",
        support: {
          finding_ids: ["uf:synthetic:2"],
          dependency_groups: ["group:b"],
        },
      },
      {
        id: "claim:amplification",
        text: "הגברה היא תמה חוזרת אך דורשת ויסות.",
        role: "interpretation",
        motif_key: "amplification",
        support: {
          finding_ids: ["uf:synthetic:3"],
          dependency_groups: ["group:c"],
        },
      },
      {
        id: "claim:generic",
        text: "לפעמים יש אתגרים.",
        role: "interpretation",
        motif_key: "shadow",
        support: {
          finding_ids: ["uf:synthetic:4"],
        },
      },
      {
        id: "claim:untestable",
        text: "יש רובד סמלי שאינו ניתן לבדיקה ישירה.",
        role: "interpretation",
        motif_key: "symbolic",
        support: {
          finding_ids: ["uf:synthetic:5"],
        },
      },
      {
        id: "claim:open",
        text: "טענה שעדיין לא נבדקה.",
        role: "interpretation",
        motif_key: "open",
        support: {
          finding_ids: ["uf:synthetic:6"],
        },
      },
    ],
    motifs: [
      { key: "integration", label: "Integration", claim_ids: ["claim:integration"] },
      { key: "structure", label: "Structure", claim_ids: ["claim:structure"] },
      { key: "amplification", label: "Amplification", claim_ids: ["claim:amplification"] },
    ],
    cross_signatures: [
      { finding_id: "uf:synthetic:cross:1" },
    ],
    freeze: {
      frozen: true,
      policy_version: "research-synthesis-policy-v1",
      source_bundle_contract_version: 1,
      source_finding_ids: [
        "uf:synthetic:1",
        "uf:synthetic:2",
        "uf:synthetic:3",
        "uf:synthetic:4",
        "uf:synthetic:5",
        "uf:synthetic:6",
      ],
    },
  };
}

function frozen() {
  return freezeSynthesisForCalibration(syntheticSynthesis(), {
    frozenAt: "2026-09-23T00:00:00.000Z",
    runRef: "synthetic:run:1",
  });
}

function session(freeze = frozen()) {
  return openCalibrationValidationSession(freeze, {
    openedAt: "2026-09-23T00:10:00.000Z",
    validationDataHiddenDuringSynthesis: true,
    evaluatorBlinded: true,
    leakageCheck: "passed",
    sessionRef: "synthetic:validation:1",
  });
}

test("freeze is deterministic and records change-detection fingerprints without claiming cryptographic security", () => {
  const a = frozen();
  const b = frozen();

  assert.equal(a.synthesis_fingerprint, b.synthesis_fingerprint);
  assert.equal(a.claim_set_fingerprint, b.claim_set_fingerprint);
  assert.equal(a.claim_count, 6);
  assert.equal(a.fingerprint_kind, "deterministic_change_detection_not_cryptographic_signature");
  assert.equal(a.invariants.person_fit_is_calibration_not_truth, true);
});

test("canonical calibration fingerprint ignores object key order but preserves array order", () => {
  const a = calibrationContentFingerprint({ b: 2, a: 1, c: ["x", "y"] });
  const b = calibrationContentFingerprint({ c: ["x", "y"], a: 1, b: 2 });
  const reordered = calibrationContentFingerprint({ c: ["y", "x"], a: 1, b: 2 });

  assert.equal(a, b);
  assert.notEqual(a, reordered);
});

test("freeze integrity fails when a frozen claim is reworded after the fact", () => {
  const freeze = frozen();
  const original = syntheticSynthesis();
  assert.equal(verifyCalibrationFreeze(freeze, original).ok, true);

  const mutated = syntheticSynthesis();
  mutated.claims[0] = { ...mutated.claims[0], text: "טענה ששונתה אחרי הפתיחה." };
  const verification = verifyCalibrationFreeze(freeze, mutated);

  assert.equal(verification.ok, false);
  assert.equal(verification.claim_set_match, false);
});

test("validation cannot begin before freeze and requires held-out data separation", () => {
  const freeze = frozen();

  assert.throws(() => openCalibrationValidationSession(freeze, {
    openedAt: "2026-09-22T23:59:59.000Z",
    validationDataHiddenDuringSynthesis: true,
  }), /cannot open before/);

  assert.throws(() => openCalibrationValidationSession(freeze, {
    openedAt: "2026-09-23T00:10:00.000Z",
    validationDataHiddenDuringSynthesis: false,
  }), /must be explicitly true/);
});

test("blind evaluator packets reveal claim text but not derivation/support/motif context", () => {
  const freeze = frozen();
  const packets = buildBlindClaimPackets(freeze, session(freeze));

  assert.equal(packets.length, 6);
  assert.equal(packets[0].claim_text.includes("לחבר"), true);
  assert.equal("support" in packets[0], false);
  assert.equal("motif_key" in packets[0], false);
  assert.equal("subject_identity" in packets[0], false);
  assert.equal(packets[0].hidden_from_evaluator.includes("support_findings"), true);
  assert.equal(packets[0].hidden_from_evaluator.includes("provider_reasoning"), true);
});

test("claim validation uses bounded states and provenance refs only", () => {
  const outcome = makeClaimValidationOutcome({
    claimId: "claim:integration",
    state: "supported",
    evaluatorClass: CALIBRATION_EVALUATOR_CLASS.SELF_REPORT,
    evidenceRefs: ["private-research:evidence:1"],
    observedAt: "2026-09-23T00:11:00.000Z",
    note: "synthetic test",
  });

  assert.equal(outcome.state, "supported");
  assert.deepEqual(outcome.evidence_refs, ["private-research:evidence:1"]);
  assert.throws(() => makeClaimValidationOutcome({
    claimId: "claim:integration",
    state: "true",
    evaluatorClass: CALIBRATION_EVALUATOR_CLASS.SELF_REPORT,
    observedAt: "2026-09-23T00:11:00.000Z",
  }), /invalid adjudicated state/);
});

test("Person Fit is a support band, not one hidden-weight accuracy score", () => {
  const freeze = frozen();
  const validationSession = session(freeze);
  const outcomes = [
    {
      claimId: "claim:integration",
      state: "supported",
      evaluatorClass: "self_report",
      observedAt: "2026-09-23T00:11:00.000Z",
    },
    {
      claimId: "claim:structure",
      state: "partially_supported",
      evaluatorClass: "observed_fact",
      observedAt: "2026-09-23T00:12:00.000Z",
    },
    {
      claimId: "claim:amplification",
      state: "contradicted",
      evaluatorClass: "self_report",
      observedAt: "2026-09-23T00:13:00.000Z",
    },
    {
      claimId: "claim:generic",
      state: "too_generic",
      evaluatorClass: "blind_ai",
      observedAt: "2026-09-23T00:14:00.000Z",
    },
    {
      claimId: "claim:untestable",
      state: "not_testable",
      evaluatorClass: "human_review",
      observedAt: "2026-09-23T00:15:00.000Z",
    },
  ];

  const summary = summarizeClaimValidations(freeze, validationSession, outcomes);

  assert.equal(summary.claim_count, 6);
  assert.equal(summary.evaluated_claims, 5);
  assert.equal(summary.tested_claims, 3);
  assert.equal(summary.untested_claims, 1);
  assert.equal(summary.support_band_percent.low, 33.33);
  assert.equal(summary.support_band_percent.high, 66.67);
  assert.equal(summary.contradiction_rate_percent, 33.33);
  assert.equal(summary.genericity_rate_percent, 20);
  assert.equal(summary.invariants.no_hidden_partial_credit_weight, true);
  assert.equal("truth_score" in summary, false);
  assert.equal("accuracy_score" in summary, false);
});

test("unknown or duplicate claim outcomes fail closed instead of inflating the calibration sample", () => {
  const freeze = frozen();
  const validationSession = session(freeze);

  assert.throws(() => summarizeClaimValidations(freeze, validationSession, [{
    claimId: "claim:not-frozen",
    state: "supported",
    evaluatorClass: "self_report",
    observedAt: "2026-09-23T00:11:00.000Z",
  }]), /unknown frozen claim/);

  const duplicate = {
    claimId: "claim:integration",
    state: "supported",
    evaluatorClass: "self_report",
    observedAt: "2026-09-23T00:11:00.000Z",
  };
  assert.throws(() => summarizeClaimValidations(freeze, validationSession, [duplicate, duplicate]), /duplicate adjudicated outcome/);
});

test("outcome chronology cannot predate the validation session", () => {
  const freeze = frozen();
  const validationSession = session(freeze);

  assert.throws(() => summarizeClaimValidations(freeze, validationSession, [{
    claimId: "claim:integration",
    state: "supported",
    evaluatorClass: "self_report",
    observedAt: "2026-09-23T00:09:59.000Z",
  }]), /predates the validation session/);
});

test("decoy trial is replayable by seed and keeps answer key out of public trial", () => {
  const freeze = frozen();
  const decoys = [
    { id: "d1", message: "מסר חלופי א." },
    { id: "d2", message: "מסר חלופי ב." },
    { id: "d3", message: "מסר חלופי ג." },
  ];

  const a = buildBlindDecoyTrial(freeze, decoys, { seed: "seed-001", trialRef: "trial:1" });
  const b = buildBlindDecoyTrial(freeze, decoys, { seed: "seed-001", trialRef: "trial:1" });

  assert.deepEqual(a.public_trial, b.public_trial);
  assert.deepEqual(a.answer_key, b.answer_key);
  assert.equal(a.public_trial.option_count, 4);
  assert.equal(a.public_trial.random_baseline_percent, 25);
  assert.equal(JSON.stringify(a.public_trial).includes("correct_option_id"), false);
  assert.equal(a.answer_key.visibility, "hidden_from_subject_and_blind_evaluator");
});

test("decoy scorer reports discrimination versus random baseline, never truth", () => {
  const freeze = frozen();
  const trial = buildBlindDecoyTrial(freeze, [
    { id: "d1", message: "מסר חלופי א." },
    { id: "d2", message: "מסר חלופי ב." },
    { id: "d3", message: "מסר חלופי ג." },
  ], { seed: "seed-002", trialRef: "trial:2" });

  const correct = scoreBlindDecoyTrial(trial.public_trial, trial.answer_key, {
    selectedOptionId: trial.answer_key.correct_option_id,
    observedAt: "2026-09-23T00:20:00.000Z",
  });
  assert.equal(correct.correct, true);

  const otherOption = trial.public_trial.options.find(x => x.option_id !== trial.answer_key.correct_option_id);
  const incorrect = scoreBlindDecoyTrial(trial.public_trial, trial.answer_key, {
    selectedOptionId: otherOption.option_id,
    observedAt: "2026-09-23T00:21:00.000Z",
  });
  assert.equal(incorrect.correct, false);

  const aggregate = summarizeDecoyTrials([correct, incorrect]);
  assert.equal(aggregate.observed_identification_percent, 50);
  assert.equal(aggregate.random_baseline_percent, 25);
  assert.equal(aggregate.lift_points, 25);
  assert.equal(aggregate.interpretation, "decoy_discrimination_not_truth_score");
});

test("calibration storage shape is private-Research-OS metadata, not a new authority", () => {
  const freeze = frozen();
  const validationSession = session(freeze);
  const summary = summarizeClaimValidations(freeze, validationSession, [{
    claimId: "claim:integration",
    state: "supported",
    evaluatorClass: "self_report",
    observedAt: "2026-09-23T00:11:00.000Z",
  }]);
  const meta = buildCalibrationResearchMeta({
    freeze,
    validationSession,
    claimSummary: summary,
    decoySummary: {
      trials: 4,
      observed_identification_percent: 50,
      random_baseline_percent: 25,
      lift_points: 25,
    },
  });

  const ext = meta.ext.research_synthesis_calibration;
  assert.equal(ext.synthesis_fingerprint, freeze.synthesis_fingerprint);
  assert.equal(ext.truth_boundary, "CALIBRATION != TRUTH != VERIFICATION != CANONICAL != PUBLISHED");
  assert.match(ext.storage_boundary, /existing private Research OS/);
});

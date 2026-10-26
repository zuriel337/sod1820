import test from "node:test";
import assert from "node:assert/strict";
import {
  attachWorldLegacyReplay,
  buildWorldLegacyReplayIndex,
  classifyWorldLegacyReplayDecision,
  classifyWorldMissingEngineContext,
  classifyWorldMissingEngineStatement,
  projectWorldLegacyReplayOccurrence,
  replayWorldArithmeticExpression,
  replayWorldCompoundEnvelope,
  replayWorldLegacyMethodMatrix,
  verifyWorldConstantStatement,
} from "../src/lib/research/worldLegacyReplayProjection.js";

const id = (digit) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;

function row(overrides = {}) {
  return {
    id: id("1"),
    engine_verified: true,
    engine_detail: { verification: { method: "רגיל", phrase: "חיים", claimed: 68, computed: 68 } },
    source_ref: `channel_updates:${id("a")}`,
    ...overrides,
  };
}

test("canonical regular replay separates a technical match from live verification", () => {
  const replay = projectWorldLegacyReplayOccurrence(row());
  assert.equal(replay.state, "deterministic_match");
  assert.equal(replay.replayComputed, 68);
  assert.equal(replay.sourceLocatorState, "channel_uuid");
  assert.equal(replay.verificationState, undefined);

  const mismatch = projectWorldLegacyReplayOccurrence(row({
    id: id("2"),
    engine_detail: { verification: { method: "רגיל", phrase: "חיים", claimed: 69, computed: 69 } },
  }));
  assert.equal(mismatch.state, "deterministic_mismatch");
  assert.equal(mismatch.replayComputed, 68);
});

test("mixed input and incomplete envelopes fail into separate review queues", () => {
  assert.equal(projectWorldLegacyReplayOccurrence(row({
    engine_detail: { verification: { method: "רגיל", phrase: "חיים 68", claimed: 68, computed: 68 } },
  })).state, "mixed_input_match");
  assert.equal(projectWorldLegacyReplayOccurrence(row({
    engine_detail: { verification: { kind: "arithmetic", text: "37 × 73 = 2701", ok: true } },
  })).state, "arithmetic_unsupported");
  assert.equal(projectWorldLegacyReplayOccurrence(row({ engine_detail: { compound: { status: "ENGINE_VERIFIED_COMPOSITE" } } })).state, "compound_unsupported");
  assert.equal(projectWorldLegacyReplayOccurrence(row({ engine_detail: { "חיים": 68 } })).state, "legacy_matrix_unsupported");
});

test("addition replay verifies both arithmetic and explicit Hebrew operands", () => {
  const numeric = replayWorldArithmeticExpression("119 + 119 = 238", true);
  assert.equal(numeric.state, "arithmetic_match");
  assert.equal(numeric.replayComputed, 238);
  assert.equal(numeric.operandCount, 2);

  const phrases = replayWorldArithmeticExpression("רזא(208) + שבת(702) = 910", true);
  assert.equal(phrases.state, "arithmetic_match");
  assert.deepEqual(phrases.operandChecks.map((operand) => operand.replayComputed), [208, 702]);

  assert.equal(replayWorldArithmeticExpression("רזא(209) + שבת(702) = 911", true).state, "arithmetic_envelope_mismatch");
  assert.equal(replayWorldArithmeticExpression("37 × 73 = 2701", true).state, "arithmetic_unsupported");
});

test("compound replay covers canonical product and sum families", () => {
  const samples = [
    {
      raw: "6 ×טוב(17) =102", kind: "quantity-product", text: "6 ×טוב(17) =102",
      quantity: 6, operand: { phrase: "טוב", value: 17, method: "רגיל", ok: true, status: "verified" },
      result: 102, computedTotal: 102, status: "ENGINE_VERIFIED_COMPOSITE",
    },
    {
      raw: "א-הי-ה(21) × א-הי-ה(21)=441", kind: "two-phrase-product", text: "א-הי-ה(21) × א-הי-ה(21)=441",
      operands: [
        { phrase: "א-הי-ה", value: 21, method: "רגיל", ok: true, status: "verified" },
        { phrase: "א-הי-ה", value: 21, method: "רגיל", ok: true, status: "verified" },
      ], result: 441, computedTotal: 441, status: "ENGINE_VERIFIED_COMPOSITE",
    },
    {
      raw: "21×21 =אמת", kind: "number-product-equals-phrase", text: "21×21 =אמת", a: 21, b: 21,
      operand: { phrase: "אמת", value: 441, method: "רגיל", ok: true, status: "verified" },
      computedTotal: 441, status: "ENGINE_VERIFIED_COMPOSITE",
    },
    {
      raw: "עין+עין+ציצת=130+130+590=850", kind: "phrase-sum-chain", text: "עין+עין+ציצת=130+130+590=850",
      operands: [
        { phrase: "עין", value: 130, method: "רגיל", ok: true, status: "verified" },
        { phrase: "עין", value: 130, method: "רגיל", ok: true, status: "verified" },
        { phrase: "ציצת", value: 590, method: "רגיל", ok: true, status: "verified" },
      ], numbers: [130, 130, 590], sum: 850, result: 850, status: "ENGINE_VERIFIED_COMPOSITE",
    },
  ];
  for (const sample of samples) {
    const replay = replayWorldCompoundEnvelope(sample);
    assert.equal(replay.state, "compound_match", sample.kind);
    assert.equal(replay.envelopeMatches, true, sample.kind);
  }
});

test("general chains replay through the canonical extractor and unresolved methods remain blocked", () => {
  const general = replayWorldCompoundEnvelope({
    raw: "10 × 102 = 1020", kind: "general-chain", text: "10 × 102 = 1020", result: 1020,
    operands: [], linkCount: 2, linkValues: [1020, 1020], computedTotal: 1020,
    status: "ENGINE_VERIFIED_COMPOSITE",
  });
  assert.equal(general.state, "compound_match");
  assert.equal(general.replayComputed, 1020);

  const unresolved = replayWorldCompoundEnvelope({
    raw: "א+יב\"ק=1000+112=1112", kind: "phrase-sum-chain", text: "א+יב\"ק=1000+112=1112",
    operands: [
      { phrase: "א", value: 1000, method: null, ok: false, status: "METHOD_UNRESOLVED" },
      { phrase: "יבק", value: 112, method: "רגיל", ok: true, status: "verified" },
    ], numbers: [1000, 112], sum: 1112, result: 1112, status: "METHOD_UNRESOLVED",
  });
  assert.equal(unresolved.state, "compound_method_unresolved");
  assert.equal(unresolved.envelopeMatches, true);
  assert.equal(replayWorldCompoundEnvelope({ kind: "general-chain", text: "טקסט לא נתמך" }).state, "compound_unsupported");
});

test("explicit verification envelopes stay separate from replay and expose internal conflicts", () => {
  const exact = projectWorldLegacyReplayOccurrence(row({
    engine_detail: { verification_state: "match", claimed_expression: "חיים", claimed_value: 68 },
  }));
  assert.equal(exact.state, "explicit_match");
  assert.equal(exact.explicitVerificationState, "match");
  assert.equal(exact.replayComputed, null);

  const numeric = projectWorldLegacyReplayOccurrence(row({
    engine_detail: { verification_state: "match_numeric_only" },
  }));
  assert.equal(numeric.state, "explicit_numeric_match");

  const review = projectWorldLegacyReplayOccurrence(row({
    engine_verified: false,
    engine_detail: { verification_state: "partial_match_with_mismatch" },
  }));
  assert.equal(review.state, "explicit_review_required");

  const conflict = projectWorldLegacyReplayOccurrence(row({
    engine_detail: { verification_state: "mismatch" },
  }));
  assert.equal(conflict.state, "explicit_state_conflict");
});

test("explicit verification attaches outside the legacy-signal queue without changing live truth", () => {
  const explicit = row({ engine_detail: { verification_state: "match" } });
  const projected = attachWorldLegacyReplay({
    id: `research:${explicit.id}`,
    sourceId: explicit.id,
    verification: "match",
    occurrences: [{ id: `research:${explicit.id}`, sourceId: explicit.id }],
  }, buildWorldLegacyReplayIndex([explicit]));
  assert.equal(projected.legacyReplay.state, "explicit_match");
  assert.equal(projected.legacyReplay.mutatesLiveData, false);
});

test("legacy method matrices replay canonical methods without treating parity as claim truth", () => {
  const matrix = {
    "חיים": {
      "רגיל": 68,
      "מילוי": 538,
      "מסתתר": 32,
      "קדמי": 291,
      "אלבם": 702,
      "מהמאגר": true,
      "כל_הערכים": [32, 68, 291, 538, 702],
    },
  };
  const matched = replayWorldLegacyMethodMatrix(matrix, true);
  assert.equal(matched.state, "legacy_matrix_match");
  assert.equal(matched.phraseCount, 1);
  assert.equal(matched.checkedMethodCount, 5);
  assert.equal(matched.mismatchCount, 0);

  const unmatchedClaim = replayWorldLegacyMethodMatrix(matrix, false);
  assert.equal(unmatchedClaim.state, "legacy_matrix_claim_unmatched");
  assert.equal(unmatchedClaim.engineVerified, false);
  assert.equal(projectWorldLegacyReplayOccurrence(row({ engine_verified: false, engine_detail: matrix })).state, "legacy_matrix_claim_unmatched");

  const mismatch = replayWorldLegacyMethodMatrix({ "חיים": { "רגיל": 69 } }, true);
  assert.equal(mismatch.state, "legacy_matrix_mismatch");
  assert.equal(mismatch.mismatchCount, 1);
  assert.equal(mismatch.mismatches[0].replayComputed, 68);

  const fullMatrix = replayWorldLegacyMethodMatrix({
    "מקל": {
      "אלבם": 11, "אתבש": 34, "גדול": 170, "קדמי": 845, "רגיל": 170,
      "הכפלה": 12500, "מילוי": 340, "מסתתר": 130, "ריבוע": 350, "סידורי": 44,
      "קדמי_גדול": 845, "הכפלה_גדול": 12500, "ריבוע_גדול": 350,
      "אותיות_אחרי": 290, "אותיות_לפני": 140, "מילוי_דמילוי": 1037,
      "מהמאגר": true,
    },
  }, true);
  assert.equal(fullMatrix.state, "legacy_matrix_match");
  assert.equal(fullMatrix.checkedMethodCount, 16);
});

test("legacy non-matrix payloads remain blocked by their precise reason", () => {
  assert.equal(replayWorldLegacyMethodMatrix({ method: "רגיל", computed: 1020 }, true).state, "legacy_incomplete_method_envelope");
  assert.equal(replayWorldLegacyMethodMatrix({ channel: "source", saved_from: "pipeline" }, false).state, "legacy_source_metadata_only");
  assert.equal(replayWorldLegacyMethodMatrix({ note: "unknown" }, false).state, "legacy_matrix_unsupported");
});

test("missing engine detail separates an explicit negative from no assessment", () => {
  const unverified = projectWorldLegacyReplayOccurrence(row({ engine_verified: false, engine_detail: null, statement: "קובייה תלת ממדית 1820" }));
  assert.equal(unverified.state, "missing_engine_detail_unverified");
  assert.equal(unverified.sourceLocatorState, "channel_uuid");
  assert.equal(unverified.routingQueue, "spatial_or_constants");

  const unassessed = projectWorldLegacyReplayOccurrence(row({ engine_verified: null, engine_detail: {}, statement: "170 + 650 = 820" }));
  assert.equal(unassessed.state, "missing_engine_assessment");
  assert.equal(unassessed.engineVerified, false);
  assert.equal(unassessed.routingQueue, "formula");
});

test("missing-engine routing uses explicit text markers without claiming verification", () => {
  assert.equal(classifyWorldMissingEngineStatement("קובייה תלת ממדית 1820").queue, "spatial_or_constants");
  assert.equal(classifyWorldMissingEngineStatement("קובייה תלת ממדית 1820").subtype, "cubes");
  assert.equal(classifyWorldMissingEngineStatement("הערך e בחזקת e מתקרב ל־15.15").queue, "constants_or_sequences");
  assert.equal(classifyWorldMissingEngineStatement("הערך e בחזקת e מתקרב ל־15.15").subtype, "euler_e");
  assert.equal(classifyWorldMissingEngineStatement("רצף המספרים 1-2-3-4").queue, "constants_or_sequences");
  assert.equal(classifyWorldMissingEngineStatement("π קרוב ל־3.14").subtype, "pi");
  assert.equal(classifyWorldMissingEngineStatement("עשרימון בעל עשרים פאות").subtype, "polyhedra_and_pyramids");
  assert.equal(classifyWorldMissingEngineStatement("מעגל סביב המספר").subtype, "circles_and_spheres");
  assert.equal(classifyWorldMissingEngineStatement("ציר במרחב תלת ממדי").subtype, "space_and_axes");
  assert.equal(classifyWorldMissingEngineStatement("שלוש מילים מופיעות ברצף").queue, "textual_statement");
  assert.equal(classifyWorldMissingEngineStatement("שלוש מילים מופיעות ברצף").subtype, null);
  assert.equal(classifyWorldMissingEngineStatement("צופן בדילוג 1820").queue, "els_or_cipher");
  assert.equal(classifyWorldMissingEngineStatement("תרגום לאנגלית").queue, "language");
  assert.equal(classifyWorldMissingEngineStatement("המספר 1820 מופיע כאן").queue, "numeric_statement");
  assert.equal(classifyWorldMissingEngineStatement("הקשר מתואר במקור").queue, "textual_statement");
});

test("spatial routing exposes only stored spatial identity fields and marks incomplete metadata", () => {
  const complete = projectWorldLegacyReplayOccurrence(row({
    engine_verified: null,
    engine_detail: null,
    statement: "קובייה תלת ממדית",
    meta: { ext: { spatial_research: {
      classification: "spatial_gematria",
      cluster: "cube-1",
      role: "STRUCTURAL_3D",
      research_focus_key: "zvi:spatial:cube-1",
      source_ref: "channel_updates:10000000-0000-4000-8000-000000000001",
    } } },
  }));
  assert.equal(complete.spatialResearchContext.state, "complete");
  assert.equal(complete.spatialResearchContext.inferred, false);

  const missing = projectWorldLegacyReplayOccurrence(row({
    engine_verified: null,
    engine_detail: null,
    statement: "קובייה תלת ממדית",
    meta: {},
  }));
  assert.equal(missing.spatialResearchContext.state, "missing");
  assert.equal(missing.spatialResearchContext.cluster, null);
});

test("constant replay distinguishes exact sums, rounded constants and unsupported source claims", () => {
  const ePower = verifyWorldConstantStatement("הערך המספרי e בחזקת e מתקרב ל־15.15");
  assert.equal(ePower.state, "rounded_match");
  assert.equal(ePower.expression, "e^e");
  assert.equal(ePower.roundedComputed, 15.15);
  assert.equal(ePower.isApproximation, true);

  const ePi = verifyWorldConstantStatement("נטען כי e^π ≈ 23.14");
  assert.equal(ePi.state, "rounded_match");
  assert.equal(ePi.roundedComputed, 23.14);

  const piPower = verifyWorldConstantStatement("הערך המספרי π בחזקת π מתקרב ל-36.46");
  assert.equal(piPower.state, "rounded_match");
  assert.equal(piPower.roundedComputed, 36.46);

  const sequence = verifyWorldConstantStatement("רצף המספרים 1-2-3-4 (שסכומם 10)");
  assert.equal(sequence.state, "exact_match");
  assert.equal(sequence.computed, 10);
  assert.equal(sequence.isApproximation, false);

  const unsupported = verifyWorldConstantStatement("משוואה של e ו-π שואפת לערך 20");
  assert.equal(unsupported.state, "unsupported_expression");
  assert.equal(unsupported.computed, null);
  assert.equal(unsupported.mutatesLiveData, false);
});

test("missing-engine source and target context stays separate from technical readiness", () => {
  const missing = row({
    engine_verified: null,
    engine_detail: null,
    statement: "טענה מספרית לבדיקה",
    value: 68,
    meta: { ext: { wa_channel_intake: { tree_matches: [{ type: "number", key: "68" }] } } },
  });
  const projected = attachWorldLegacyReplay({
    id: `research:${missing.id}`, sourceId: missing.id, verification: "not_tested",
  }, buildWorldLegacyReplayIndex([missing]));

  assert.equal(projected.legacyReplay.decision, null);
  assert.equal(projected.legacyReplay.pendingEngineContext.stage, "pending_engine");
  assert.equal(projected.legacyReplay.pendingEngineContext.pendingOccurrenceCount, 1);
  assert.equal(projected.legacyReplay.pendingEngineContext.targetEvidenceStateCounts.exact_row_value_match, 1);
  assert.match(projected.legacyReplay.pendingEngineContext.reason, /חסרה הכרעת מנוע/u);
  assert.equal(classifyWorldMissingEngineContext([{ state: "deterministic_match" }]), null);
});

test("cluster attachment preserves every occurrence and never mutates live truth", () => {
  const first = row();
  const second = row({ id: id("2") });
  const index = buildWorldLegacyReplayIndex([first, second]);
  const projected = attachWorldLegacyReplay({
    id: `research:${first.id}`,
    sourceId: first.id,
    verification: "legacy_signal",
    occurrences: [
      { id: `research:${first.id}`, sourceId: first.id },
      { id: `research:${second.id}`, sourceId: second.id },
    ],
  }, index);
  assert.equal(projected.legacyReplay.state, "deterministic_match");
  assert.equal(projected.legacyReplay.occurrenceCount, 2);
  assert.equal(projected.legacyReplay.stateCounts.deterministic_match, 2);
  assert.equal(projected.legacyReplay.mutatesLiveData, false);
});

test("technically-ready replay keeps source and target decisions separate", () => {
  const singleTarget = row({
    value: 68,
    meta: { ext: { wa_channel_intake: { tree_matches: [{ type: "number", key: "68", label: "68" }] } } },
  });
  const projected = attachWorldLegacyReplay({
    id: `research:${singleTarget.id}`,
    sourceId: singleTarget.id,
    verification: "legacy_signal",
    occurrences: [{ id: `research:${singleTarget.id}`, sourceId: singleTarget.id }],
  }, buildWorldLegacyReplayIndex([singleTarget]));

  assert.equal(projected.legacyReplay.decision.sourceReadiness, "exact_source");
  assert.equal(projected.legacyReplay.decision.targetReadiness, "single_structured_target");
  assert.equal(projected.legacyReplay.decision.readyOccurrenceCount, 1);
  assert.equal(projected.legacyReplay.decision.targetEvidenceStateCounts.exact_row_value_match, 1);
  assert.deepEqual(projected.legacyReplay.decision.targets.map((target) => target.key), ["68"]);
  assert.equal(projected.legacyReplay.decision.mutatesLiveData, false);
});

test("multiple targets preserve an exact primary number separately from contextual and numeric candidates", () => {
  const contextual = row({
    value: 68,
    meta: { ext: { wa_channel_intake: { tree_matches: [
      { type: "number", key: "68" },
      { type: "topic", key: "life" },
    ] } } },
  });
  const additionalNumber = row({
    id: id("2"),
    value: 68,
    meta: { ext: { wa_channel_intake: { tree_matches: [
      { type: "number", key: "68" },
      { type: "number", key: "7" },
    ] } } },
  });
  const index = buildWorldLegacyReplayIndex([contextual, additionalNumber]);
  const contextualDecision = attachWorldLegacyReplay({
    id: `research:${contextual.id}`, sourceId: contextual.id, verification: "legacy_signal",
  }, index).legacyReplay.decision;
  const additionalNumberDecision = attachWorldLegacyReplay({
    id: `research:${additionalNumber.id}`, sourceId: additionalNumber.id, verification: "legacy_signal",
  }, index).legacyReplay.decision;

  assert.equal(contextualDecision.targetEvidenceStateCounts.exact_value_primary_with_context, 1);
  assert.equal(additionalNumberDecision.targetEvidenceStateCounts.exact_value_among_multiple_numbers, 1);
  assert.equal(contextualDecision.targetReadiness, "multiple_structured_targets");
  assert.equal(additionalNumberDecision.targetReadiness, "multiple_structured_targets");
});

test("a structured value can propose a number target without inventing a live tree connection", () => {
  const withValue = row({ value: 68 });
  const withoutValue = row({ id: id("2"), value: null });
  const index = buildWorldLegacyReplayIndex([withValue, withoutValue]);
  const withValueDecision = attachWorldLegacyReplay({
    id: `research:${withValue.id}`, sourceId: withValue.id, verification: "legacy_signal",
  }, index).legacyReplay.decision;
  const withoutValueDecision = attachWorldLegacyReplay({
    id: `research:${withoutValue.id}`, sourceId: withoutValue.id, verification: "legacy_signal",
  }, index).legacyReplay.decision;

  assert.deepEqual(withValueDecision.proposedNumberTargets, [68]);
  assert.equal(withValueDecision.targetEvidenceStateCounts.structured_value_without_target, 1);
  assert.equal(withValueDecision.targetReadiness, "missing_structured_target");
  assert.equal(withValueDecision.mutatesLiveData, false);
  assert.equal(withoutValueDecision.targetEvidenceStateCounts.missing_value_and_target, 1);
  assert.deepEqual(withoutValueDecision.proposedNumberTargets, []);
});

test("an exact channel source in source_refs resolves a legacy primary locator without rewriting it", () => {
  const channelRef = `channel_updates:${id("a")}`;
  const raw = row({
    source_ref: "gallery_images:legacy-image",
    meta: { source_refs: ["gallery_images:legacy-image", channelRef] },
  });
  const projected = attachWorldLegacyReplay({
    id: `research:${raw.id}`, sourceId: raw.id, verification: "legacy_signal",
  }, buildWorldLegacyReplayIndex([raw]));

  assert.equal(projected.legacyReplay.sourceLocatorState, "channel_uuid_available");
  assert.equal(projected.legacyReplay.canonicalSourceRef, channelRef);
  assert.equal(projected.legacyReplay.decision.sourceReadiness, "exact_source");
  assert.equal(projected.legacyReplay.decision.sourceRepairOccurrenceCount, 0);
});

test("source repair blocks automatic target handling and target counts preserve every occurrence", () => {
  const decision = classifyWorldLegacyReplayDecision([
    {
      state: "explicit_match",
      sourceLocatorState: "stored_ref_requires_resolution",
      targetReview: { state: "already_connected", targets: [] },
    },
    {
      state: "legacy_matrix_match",
      sourceLocatorState: "channel_uuid",
      targetReview: {
        state: "multiple_structured_targets",
        targets: [{ type: "topic", key: "a" }, { type: "topic", key: "b" }],
      },
    },
  ]);

  assert.equal(decision.decisionState, "source_locator_repair");
  assert.equal(decision.sourceRepairOccurrenceCount, 1);
  assert.equal(decision.targetReadiness, "mixed_target_states");
  assert.deepEqual(decision.targetStateCounts, { already_connected: 1, multiple_structured_targets: 1 });
  assert.equal(decision.targetCount, 2);
});

test("source-target adjudication is absent when any clustered occurrence is not technically ready", () => {
  assert.equal(classifyWorldLegacyReplayDecision([
    { state: "deterministic_match", sourceLocatorState: "channel_uuid" },
    { state: "mixed_input_match", sourceLocatorState: "channel_uuid" },
  ]), null);
});

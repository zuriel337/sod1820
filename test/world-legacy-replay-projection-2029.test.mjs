import test from "node:test";
import assert from "node:assert/strict";
import {
  attachWorldLegacyReplay,
  buildWorldLegacyReplayIndex,
  projectWorldLegacyReplayOccurrence,
  replayWorldArithmeticExpression,
  replayWorldCompoundEnvelope,
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
  assert.equal(projectWorldLegacyReplayOccurrence(row({ engine_detail: { "חיים": 68 } })).state, "missing_replay_envelope");
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

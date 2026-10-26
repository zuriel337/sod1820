import test from "node:test";
import assert from "node:assert/strict";
import {
  attachWorldLegacyReplay,
  buildWorldLegacyReplayIndex,
  projectWorldLegacyReplayOccurrence,
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
  })).state, "arithmetic_executor_required");
  assert.equal(projectWorldLegacyReplayOccurrence(row({ engine_detail: { compound: { status: "ENGINE_VERIFIED_COMPOSITE" } } })).state, "compound_mapping_required");
  assert.equal(projectWorldLegacyReplayOccurrence(row({ engine_detail: { "חיים": 68 } })).state, "missing_replay_envelope");
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

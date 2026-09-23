import test from "node:test";
import assert from "node:assert/strict";
import {
  CURRENT_RERESEARCH_STATUS,
  HISTORICAL_INPUT_REPLAY_STATUS,
  HISTORICAL_OUTPUT_SNAPSHOT_STATUS,
  RESONANCE_BUCKET,
  buildHistoricalAiBenchmarkManifest,
  classifyCurrentReresearchComparison,
  classifyHistoricalResonance,
  historicalAnalysisToBenchmarkRecord,
  summarizeHistoricalAiBenchmark,
} from "./historicalAiBenchmark.js";

function row(overrides = {}) {
  return {
    id: 1001,
    created_at: "2026-08-01T12:00:00.000Z",
    kind: "number",
    subject: "שם פרטי סינתטי לבדיקה",
    style_key: "balanced_v1",
    engine: "claude",
    model: "claude-sonnet-5",
    visitor: "visitor-secret-123",
    user_id: "11111111-2222-4333-8444-555555555555",
    content: "טקסט ניתוח היסטורי סינתטי שלא אמור לצאת אל המניפסט.",
    up_votes: 1,
    down_votes: 0,
    continue_ct: 0,
    research_ct: 2,
    share_ct: 0,
    admin_reason: "private free text",
    ...overrides,
  };
}

test("historical row projection excludes raw subject/content/user/visitor and admin free text", () => {
  const source = row();
  const record = historicalAnalysisToBenchmarkRecord(source);
  const serialized = JSON.stringify(record);

  assert.equal(record.analysis_ref, "ai_analysis_log:1001");
  assert.equal(record.privacy.user_linked, true);
  assert.equal(record.privacy.visitor_linked, true);
  assert.equal(record.privacy.subject_present, true);
  assert.equal(record.privacy.content_present, true);

  assert.equal(serialized.includes(source.subject), false);
  assert.equal(serialized.includes(source.content), false);
  assert.equal(serialized.includes(source.user_id), false);
  assert.equal(serialized.includes(source.visitor), false);
  assert.equal(serialized.includes(source.admin_reason), false);
});

test("historical input replay stays unavailable when ai_analysis_log has no direct lineage", () => {
  const record = historicalAnalysisToBenchmarkRecord(row());

  assert.equal(record.historical_input_replay.status, HISTORICAL_INPUT_REPLAY_STATUS.NOT_LOGGED);
  assert.equal(record.historical_input_replay.exact_historical_input_replay_ready, false);
  assert.equal(record.invariants.timestamp_proximity_is_not_trace_linkage, true);
  assert.equal(record.invariants.exact_replay_requires_owner_verified_direct_lineage, true);
});

test("declared external trace/input refs still require owner verification and never self-certify replay", () => {
  const record = historicalAnalysisToBenchmarkRecord(row(), {
    externalLinkage: {
      trace_ref: "trace:synthetic:1",
      input_pack_ref: "private-bundle:synthetic:1",
    },
  });

  assert.equal(record.historical_input_replay.status, HISTORICAL_INPUT_REPLAY_STATUS.EXTERNAL_LINKAGE_DECLARED);
  assert.equal(record.historical_input_replay.trace_ref_declared, true);
  assert.equal(record.historical_input_replay.input_pack_ref_declared, true);
  assert.equal(record.historical_input_replay.owner_verification_required, true);
  assert.equal(record.historical_input_replay.exact_historical_input_replay_ready, false);
});

test("stored output is a bounded snapshot and exact 4000-char rows are flagged as possibly truncated", () => {
  const short = historicalAnalysisToBenchmarkRecord(row({ content: "x".repeat(3999) }));
  const capped = historicalAnalysisToBenchmarkRecord(row({ id: 1002, content: "x".repeat(4000) }));

  assert.equal(short.stored_output.status, HISTORICAL_OUTPUT_SNAPSHOT_STATUS.STORED_BOUNDED_SNAPSHOT);
  assert.equal(short.stored_output.completeness, "unknown");
  assert.equal(capped.stored_output.status, HISTORICAL_OUTPUT_SNAPSHOT_STATUS.POSSIBLY_TRUNCATED_AT_LOG_LIMIT);
  assert.equal(capped.stored_output.completeness, "unknown");
  assert.equal(capped.stored_output.log_limit, 4000);
});

test("resonance has explicit usefulness-only boundary and deterministic priority buckets", () => {
  const negative = classifyHistoricalResonance({ down_votes: 1, up_votes: 20, research_ct: 10 });
  const deep = classifyHistoricalResonance({ research_ct: 1, up_votes: 4 });
  const continued = classifyHistoricalResonance({ continue_ct: 1, up_votes: 4 });
  const liked = classifyHistoricalResonance({ up_votes: 1 });
  const passive = classifyHistoricalResonance({});

  assert.equal(negative.bucket, RESONANCE_BUCKET.NEGATIVE);
  assert.equal(deep.bucket, RESONANCE_BUCKET.DEEP_ACTION);
  assert.equal(continued.bucket, RESONANCE_BUCKET.CONTINUED);
  assert.equal(liked.bucket, RESONANCE_BUCKET.LIKED);
  assert.equal(passive.bucket, RESONANCE_BUCKET.PASSIVE);

  for (const r of [negative, deep, continued, liked, passive]) {
    assert.equal(r.included_in_research_strength, false);
    assert.equal(r.included_in_person_fit, false);
    assert.equal(r.included_in_verification, false);
  }
});

test("current subject re-research is eligible but never classified as historical input replay", () => {
  const record = historicalAnalysisToBenchmarkRecord(row());
  const noSubject = historicalAnalysisToBenchmarkRecord(row({ id: 1002, subject: "" }));

  assert.equal(record.current_reresearch.status, CURRENT_RERESEARCH_STATUS.ELIGIBLE);
  assert.equal(record.current_reresearch.eligible, true);
  assert.equal(record.current_reresearch.is_historical_input_replay, false);
  assert.equal(record.current_reresearch.subject_lookup_ref, "ai_analysis_log:1001:subject");

  assert.equal(noSubject.current_reresearch.status, CURRENT_RERESEARCH_STATUS.NO_SUBJECT);
  assert.equal(noSubject.current_reresearch.eligible, false);
});

test("benchmark manifest is deterministic, stratified and contains no raw private text", () => {
  const rows = [
    row({ id: 1, kind: "number", content: "private-content-1", subject: "private-subject-1", up_votes: 1, research_ct: 0 }),
    row({ id: 2, kind: "number", content: "private-content-2", subject: "private-subject-2", up_votes: 2, research_ct: 0 }),
    row({ id: 3, kind: "number", content: "private-content-3", subject: "private-subject-3", up_votes: 0, research_ct: 2 }),
    row({ id: 4, kind: "research", content: "private-content-4", subject: "private-subject-4", engine: "gemini", model: "gemini-2.5-flash", up_votes: 0 }),
    row({ id: 5, kind: "research", content: "private-content-5", subject: "private-subject-5", engine: "gemini", model: "gemini-2.5-flash", up_votes: 0 }),
  ];

  const a = buildHistoricalAiBenchmarkManifest(rows, { seed: "sample-seed-v1", perStratum: 1 });
  const b = buildHistoricalAiBenchmarkManifest(rows, { seed: "sample-seed-v1", perStratum: 1 });

  assert.deepEqual(a, b);
  assert.equal(a.generated_from_rows, 5);
  assert.equal(a.privacy_boundary.contains_raw_subjects, false);
  assert.equal(a.privacy_boundary.contains_raw_outputs, false);
  assert.equal(a.privacy_boundary.contains_user_ids, false);
  assert.equal(a.replay_boundary.timestamp_join_forbidden, true);
  assert.equal(a.learning_boundary.resonance_may_inform_truth, false);

  const serialized = JSON.stringify(a);
  for (let i = 1; i <= 5; i += 1) {
    assert.equal(serialized.includes(`private-content-${i}`), false);
    assert.equal(serialized.includes(`private-subject-${i}`), false);
  }
});

test("sampling rejects duplicate analysis ids and invalid unbounded caps", () => {
  assert.throws(() => buildHistoricalAiBenchmarkManifest([
    row({ id: 1 }),
    row({ id: 1 }),
  ], { seed: "x" }), /duplicate analysis id/);

  assert.throws(() => buildHistoricalAiBenchmarkManifest([row({ id: 1 })], {
    seed: "x",
    perStratum: 0,
  }), /1\.\.100/);

  assert.throws(() => buildHistoricalAiBenchmarkManifest([row({ id: 1 })], {
    perStratum: 1,
  }), /seed required/);
});

test("benchmark summary aggregates resonance but exposes no accuracy/person-fit conclusion", () => {
  const records = [
    historicalAnalysisToBenchmarkRecord(row({ id: 1, up_votes: 1, research_ct: 0 })),
    historicalAnalysisToBenchmarkRecord(row({ id: 2, up_votes: 0, research_ct: 2 })),
    historicalAnalysisToBenchmarkRecord(row({ id: 3, user_id: null, content: "x".repeat(4000), down_votes: 1 })),
  ];
  const summary = summarizeHistoricalAiBenchmark(records);

  assert.equal(summary.rows, 3);
  assert.equal(summary.user_linked_rows, 2);
  assert.equal(summary.possibly_truncated_output_rows, 1);
  assert.equal(summary.exact_historical_input_replay_ready_rows, 0);
  assert.equal(summary.conclusions_allowed.includes("historical resonance/usefulness distribution"), true);
  assert.equal(summary.conclusions_forbidden.includes("historical factual accuracy from engagement"), true);
  assert.equal(JSON.stringify(summary).includes("truth_score"), false);
  assert.equal(JSON.stringify(summary).includes("accuracy_score"), false);
});

test("current re-research comparison carries explicit time/version asymmetry and forbids historical reconstruction claims", () => {
  const historicalRecord = historicalAnalysisToBenchmarkRecord(row());
  const comparison = classifyCurrentReresearchComparison({
    historicalRecord,
    currentRunRef: "research-run:synthetic:2026",
    currentBundleVersion: 1,
    currentEngineVersions: ["gematria:v2", "relation:v1", "gematria:v2"],
    currentCorpusVersion: "corpus:2026-09-23",
  });

  assert.equal(comparison.comparison_class, "current_reresearch_vs_historical_output");
  assert.equal(comparison.historical_input_reconstructed, false);
  assert.deepEqual(comparison.current_engine_versions, ["gematria:v2", "relation:v1"]);
  assert.equal(comparison.may_not_claim.includes("the historical output is replayed from original inputs"), true);
});

test("external linkage declarations do not change manifest-level exact replay readiness", () => {
  const manifest = buildHistoricalAiBenchmarkManifest([
    row({ id: 7 }),
  ], {
    seed: "external-linkage",
    externalLinkages: {
      7: {
        trace_id: "00000000-0000-4000-8000-000000000007",
        source_bundle_ref: "private:bundle:7",
      },
    },
  });

  assert.equal(manifest.selected_records[0].historical_input_replay.status, HISTORICAL_INPUT_REPLAY_STATUS.EXTERNAL_LINKAGE_DECLARED);
  assert.equal(manifest.selected_records[0].historical_input_replay.exact_historical_input_replay_ready, false);
  assert.equal(manifest.replay_boundary.historical_input_pack_available_from_ai_analysis_log, false);
});

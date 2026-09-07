import { test } from "node:test";
import assert from "node:assert/strict";
import { topicRankMeta, neutralRankMeta } from "./explorerRanking.js";

// The ranked-topic QUERY itself (order/bounds) is tested where the reader actually lives —
// topicConvergence.test.js's buildTopicListQuery suite, including its rankByMeterScore:true
// cases — since Slice 5's correction (audit AFTER 6050377d) removed the duplicate reader that
// used to live in this file. Only the pure, network-free projection helpers are tested here.

test("topicRankMeta: meter_score is evidence/quality display signal, never activity", () => {
  const rank = topicRankMeta({ meter_score: 56 });
  assert.equal(rank.score, 56);
  assert.equal(rank.neutral, false);
  assert.equal(rank.evidenceQuality, 56);
  assert.equal(rank.activityRelevance, null);
  assert.deepEqual(rank.signals, [{
    axis: "evidence_quality",
    source: "topic_cards_public.meter_score",
    value: 56,
    label: "מד התכנסות",
  }]);
});

test("topicRankMeta: missing meter_score stays neutral instead of fabricating a signal", () => {
  const rank = topicRankMeta({ meter_score: null });
  assert.equal(rank.score, 0);
  assert.equal(rank.neutral, true);
  assert.equal(rank.evidenceQuality, null);
  assert.deepEqual(rank.signals, []);
});

// Correction per dispatch 764b3b9b item (2): this exact codebase has hit the "0 is falsy in JS"
// bug three separate times this session in other functions (limit clamps, offset clamps) — a
// genuine meter_score of 0 must be treated as a REAL, non-neutral score, never silently folded
// into "missing". topicRankMeta's own hasSignal check already uses explicit
// null/undefined/""/Number.isFinite comparisons (no `||`), so this was already correct — this
// test closes the coverage gap so a future edit cannot silently reintroduce the bug.
test("topicRankMeta: meter_score=0 is a real non-neutral score, never treated as missing/falsy", () => {
  const rank = topicRankMeta({ meter_score: 0 });
  assert.equal(rank.score, 0);
  assert.equal(rank.neutral, false, "0 is a legitimate score, not a missing signal");
  assert.equal(rank.evidenceQuality, 0);
  assert.deepEqual(rank.signals, [{
    axis: "evidence_quality",
    source: "topic_cards_public.meter_score",
    value: 0,
    label: "מד התכנסות",
  }]);
});

test("topicRankMeta: undefined, empty-string, and non-numeric meter_score all stay neutral (never NaN as a score)", () => {
  assert.equal(topicRankMeta({ meter_score: undefined }).neutral, true);
  assert.equal(topicRankMeta({}).neutral, true, "no meter_score key at all");
  assert.equal(topicRankMeta({ meter_score: "" }).neutral, true);
  assert.equal(topicRankMeta({ meter_score: "not-a-number" }).neutral, true);
  assert.equal(topicRankMeta(null).neutral, true, "null row never throws");
});

test("neutralRankMeta: no truth/evidence/activity signal is invented", () => {
  const rank = neutralRankMeta("nodes:number:reader_default");
  assert.equal(rank.score, 0);
  assert.equal(rank.neutral, true);
  assert.equal(rank.evidenceQuality, null);
  assert.equal(rank.activityRelevance, null);
  assert.deepEqual(rank.signals, []);
  assert.equal(rank.source, "nodes:number:reader_default");
});

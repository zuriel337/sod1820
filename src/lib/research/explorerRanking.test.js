import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildExplorerRankedTopicQuery,
  topicRankMeta,
  neutralRankMeta,
} from "./explorerRanking.js";

test("ranked topic query: globally orders by meter_score, then approved_at, then id", () => {
  const q = buildExplorerRankedTopicQuery({ limit: 24, offset: 48 });
  assert.deepEqual(q.order, [["meter_score", false], ["approved_at", false], ["id", true]]);
  assert.equal(q.rangeStart, 48);
  assert.equal(q.rangeEnd, 72);
  assert.equal(q.limit, 24);
});

test("ranked topic query: bounds remain finite and bounded", () => {
  assert.equal(buildExplorerRankedTopicQuery({ limit: 0 }).limit, 1);
  assert.equal(buildExplorerRankedTopicQuery({ limit: 9999 }).limit, 100);
  assert.equal(buildExplorerRankedTopicQuery({ limit: Infinity }).limit, 24);
  assert.equal(buildExplorerRankedTopicQuery({ offset: -5 }).rangeStart, 0);
  assert.equal(buildExplorerRankedTopicQuery({ offset: 12.9 }).rangeStart, 12);
});

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

test("neutralRankMeta: no truth/evidence/activity signal is invented", () => {
  const rank = neutralRankMeta("nodes:number:reader_default");
  assert.equal(rank.score, 0);
  assert.equal(rank.neutral, true);
  assert.equal(rank.evidenceQuality, null);
  assert.equal(rank.activityRelevance, null);
  assert.deepEqual(rank.signals, []);
  assert.equal(rank.source, "nodes:number:reader_default");
});

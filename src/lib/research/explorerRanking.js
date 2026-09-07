// UNIVERSAL_EXPLORER_V1_SLICE5_RANKING_V1
// Projection-only ranking helpers. Rank changes DISPLAY ORDER only; it never changes truth,
// verification, publication, canonical state, or access. Missing signals stay neutral.
//
// PURE, NETWORK-FREE by design: this file takes a row a canonical reader already fetched and
// returns display metadata — it owns no query, no reader, no store. The topic facet's actual
// ranked query lives in the ONE canonical topic-list reader (topicConvergence.js's
// buildTopicListQuery/fetchTopicCardList, called with rankByMeterScore:true) — an earlier version
// of this file forked a second, duplicate topic-list reader here (a byte-identical field list and
// a re-implemented limit/offset clamp next to the existing one). That fork was removed per
// independent audit AFTER 6050377d (work_log dispatch correction 764b3b9b) — "coordinate readers,
// don't fork them" is the same discipline every prior Explorer slice maintained.

export function topicRankMeta(row) {
  const value = row?.meter_score;
  const raw = Number(value);
  const hasSignal = value !== null && value !== undefined && value !== "" && Number.isFinite(raw);
  const score = hasSignal ? raw : 0;
  return {
    score,
    neutral: !hasSignal,
    evidenceQuality: hasSignal ? score : null,
    activityRelevance: null,
    signals: hasSignal ? [{
      axis: "evidence_quality",
      source: "topic_cards_public.meter_score",
      value: score,
      label: "מד התכנסות",
    }] : [],
  };
}

export function neutralRankMeta(source = "reader_default") {
  return {
    score: 0,
    neutral: true,
    evidenceQuality: null,
    activityRelevance: null,
    signals: [],
    source,
  };
}

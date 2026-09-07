import { supabase } from "../supabase.js";

// UNIVERSAL_EXPLORER_V1_SLICE5_RANKING_V1
// Projection-only ranking helpers. Rank changes DISPLAY ORDER only; it never changes truth,
// verification, publication, canonical state, or access. Missing signals stay neutral.

const TOPIC_RANK_FIELDS = "id,slug,title,subtitle,numbers,highlight_numbers,quality,meter_score,approved_at,occurred_at";
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function finiteInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function normalizeLimit(value) {
  return Math.max(1, Math.min(MAX_LIMIT, finiteInt(value, DEFAULT_LIMIT)));
}

function normalizeOffset(value) {
  return Math.max(0, finiteInt(value, 0));
}

export function buildExplorerRankedTopicQuery({ limit = DEFAULT_LIMIT, offset = 0 } = {}) {
  const safeLimit = normalizeLimit(limit);
  const safeOffset = normalizeOffset(offset);
  return {
    limit: safeLimit,
    rangeStart: safeOffset,
    rangeEnd: safeOffset + safeLimit,
    // Evidence/quality first, then deterministic recency + id tiebreak.
    order: [["meter_score", false], ["approved_at", false], ["id", true]],
  };
}

export async function fetchExplorerRankedTopicPage(params = {}) {
  const q = buildExplorerRankedTopicQuery(params);
  let query = supabase.from("topic_cards_public").select(TOPIC_RANK_FIELDS);
  for (const [column, ascending] of q.order) {
    query = query.order(column, { ascending, nullsFirst: false });
  }
  const { data, error } = await query.range(q.rangeStart, q.rangeEnd);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return { rows: rows.slice(0, q.limit), hasMore: rows.length > q.limit };
}

export function topicRankMeta(row) {
  const raw = Number(row?.meter_score);
  const hasSignal = Number.isFinite(raw);
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

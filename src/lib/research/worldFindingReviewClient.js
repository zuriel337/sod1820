import { supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();

export async function fetchWorldFindingReviewPage({ filters = {}, offset = 0, signal } = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error("authentication_required");

  const params = new URLSearchParams({
    offset: String(Math.max(0, Number(offset) || 0)),
    query: clean(filters.query),
    kind: clean(filters.kind) || "all",
    access: clean(filters.access) || "all",
    status: clean(filters.status) || "all",
    verification: clean(filters.verification) || "all",
    contributor: clean(filters.contributor) || "all",
    contributor_id: clean(filters.contributorId),
    tree: clean(filters.tree) || "all",
    meter: clean(filters.meter) || "all",
    sort: clean(filters.sort) || "strength",
    strength: clean(filters.strength) || "all",
    recommendation: clean(filters.recommendation) || "all",
    continuation: clean(filters.continuation) || "all",
    quality: clean(filters.quality) || "all",
    topic: clean(filters.topic) || "all",
    source: clean(filters.source) || "all",
    replay: clean(filters.replay) || "all",
    replay_queue: clean(filters.replayQueue) || "all",
    replay_subtype: clean(filters.replaySubtype) || "all",
    replay_spatial_metadata: clean(filters.replaySpatialMetadata) || "all",
    replay_spatial_calculation: clean(filters.replaySpatialCalculation) || "all",
    replay_spatial_coverage: clean(filters.replaySpatialCoverage) || "all",
    replay_spatial_lane: clean(filters.replaySpatialLane) || "all",
    replay_els_cluster: clean(filters.replayElsCluster) || "all",
    replay_spatial_text_origin: clean(filters.replaySpatialTextOrigin) || "all",
    replay_source: clean(filters.replaySource) || "all",
    replay_target: clean(filters.replayTarget) || "all",
    replay_target_evidence: clean(filters.replayTargetEvidence) || "all",
    pending_engine_target: clean(filters.pendingEngineTarget) || "all",
    pending_engine_target_evidence: clean(filters.pendingEngineTargetEvidence) || "all",
    finding: clean(filters.finding),
  });
  const response = await fetch(`/api/world-finding-review?${params}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(clean(body?.error) || "review_temporarily_unavailable");
  return body;
}

export async function fetchWorldGematriaReviewPage({ offset = 0, signal } = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error("authentication_required");
  const params = new URLSearchParams({ mode: "gematria", offset: String(Math.max(0, Number(offset) || 0)) });
  const response = await fetch(`/api/world-finding-review?${params}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(clean(body?.error) || "review_temporarily_unavailable");
  return body;
}

export async function fetchWorldInsightReviewPage({ offset = 0, signal } = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error("authentication_required");
  const params = new URLSearchParams({ mode: "insights", offset: String(Math.max(0, Number(offset) || 0)) });
  const response = await fetch(`/api/world-finding-review?${params}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(clean(body?.error) || "review_temporarily_unavailable");
  return body;
}

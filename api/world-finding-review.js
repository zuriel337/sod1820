// Owner-only, read-only World findings review.
//
// The browser must not download the entire private research corpus just to show the
// first review cards. This endpoint validates the caller with the existing Supabase
// session, reads through that same JWT/RLS boundary, ranks on the server, and returns
// only one bounded page. It does not use service_role and cannot write or publish.

import {
  buildWorldAllResearchProjection,
  filterWorldAllResearchRows,
} from "../src/lib/research/worldAllResearchProjection.js";
import { scopeWorldPreviewMaterial } from "../src/lib/research/worldPreviewMaterialScope.js";
import {
  WORLD_FINDING_TRIAGE_META,
  getWorldFindingTriageSnapshot,
} from "./world-finding-triage-snapshot.js";

const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
const SOURCE_PAGE = 500;
const MAX_SOURCE_ROWS = 20000;
const REVIEW_PAGE = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const config = { maxDuration: 60 };

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function baseSourceRef(value) {
  return clean(value).replace(/#.*$/u, "");
}

function reviewSourceKey(row) {
  const ref = baseSourceRef(row?.sourceRef);
  if (ref.includes(":")) return ref.split(":", 1)[0].toLowerCase();
  return clean(row?.source).toLowerCase() || "לא צוין";
}

function reviewSourceHref(row) {
  const candidates = [row?.sourceRef, ...(row?.sourceRefs || []), row?.source];
  return candidates.map(clean).find((value) => /^https?:\/\//i.test(value)) || null;
}

function independentSourceCount(row) {
  const refs = [
    row?.sourceRef,
    ...(row?.sourceRefs || []),
    ...(row?.occurrences || []).flatMap((occurrence) => [occurrence?.sourceRef, ...(occurrence?.sourceRefs || [])]),
  ].map(baseSourceRef).filter(Boolean);
  if (refs.length) return new Set(refs).size;
  return clean(row?.source) ? 1 : 0;
}

function evidenceQuality(row) {
  const score = finite(row?.confidence);
  if (score == null) return Object.freeze({ score: null, band: "unrated", label: "אין נתון" });
  const band = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  return Object.freeze({ score, band, label: `${score}/100` });
}

function directFindingHref(sourceId) {
  const id = encodeURIComponent(clean(sourceId));
  return `/world?admin=1&finding=${id}#finding-${id}`;
}

export function enrichWorldFindingReviewRow(row) {
  const triage = getWorldFindingTriageSnapshot(row?.sourceId || row?.id);
  const quality = evidenceQuality(row);
  return {
    ...row,
    triage,
    evidenceQuality: quality,
    independentSourceCount: independentSourceCount(row),
    sourceFilterKey: reviewSourceKey(row),
    sourceHref: reviewSourceHref(row),
    canonicalFindingHref: directFindingHref(row?.sourceId || row?.id),
  };
}

function deterministicReviewTie(left, right) {
  const leftRank = finite(left?.triage?.rank);
  const rightRank = finite(right?.triage?.rank);
  if (leftRank != null || rightRank != null) {
    if (leftRank == null) return 1;
    if (rightRank == null) return -1;
    if (leftRank !== rightRank) return leftRank - rightRank;
  }
  return clean(left?.sourceId || left?.id).localeCompare(clean(right?.sourceId || right?.id));
}

export function sortWorldFindingReviewRows(rows = [], sort = "strength") {
  const mode = ["strength", "quality", "newest"].includes(clean(sort)) ? clean(sort) : "strength";
  return [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
    if (mode === "quality") {
      const byQuality = (right?.evidenceQuality?.score ?? -Infinity) - (left?.evidenceQuality?.score ?? -Infinity);
      if (byQuality) return byQuality;
    }
    if (mode === "newest") {
      const byDate = clean(right?.createdAt).localeCompare(clean(left?.createdAt));
      if (byDate) return byDate;
    }
    return deterministicReviewTie(left, right);
  });
}

function rowTopicKeys(row) {
  const keys = [];
  for (const match of row?.treeMatches || []) {
    if (match?.type === "topic" && clean(match.key)) keys.push(clean(match.key));
  }
  if (clean(row?.linkedTopicRating?.slug)) keys.push(clean(row.linkedTopicRating.slug));
  if (clean(row?.linkedTopicRating?.topicId)) keys.push(clean(row.linkedTopicRating.topicId));
  return [...new Set(keys)];
}

function reviewSearchHaystack(row) {
  return [
    row?.id,
    row?.sourceId,
    row?.statement,
    row?.secondary,
    row?.originalStatement,
    row?.sourceLabel,
    row?.source,
    row?.sourceRef,
    ...(row?.sourceRefs || []),
    row?.contributor,
    ...(row?.contributors || []),
    row?.value,
    ...(row?.values || []),
    ...(row?.terms || []),
    row?.triage?.strength,
    row?.triage?.recommendation,
    row?.triage?.evidenceReason,
    row?.triage?.proposedTreeTarget,
    row?.triage?.recommendedKeepId,
    ...(row?.treeMatches || []).flatMap((match) => [match?.key, match?.label, match?.type]),
  ].filter((value) => value != null).join(" ").toLowerCase();
}

export function filterWorldFindingReviewRows(rows = [], filters = {}) {
  const base = filterWorldAllResearchRows(rows, { ...filters, query: "" });
  const query = clean(filters.query).toLowerCase();
  const finding = clean(filters.finding).replace(/^research:/, "");
  const strength = clean(filters.strength) || "all";
  const recommendation = clean(filters.recommendation) || "all";
  const quality = clean(filters.quality) || "all";
  const topic = clean(filters.topic) || "all";
  const source = clean(filters.source) || "all";
  return base.filter((row) => {
    if (finding && clean(row.sourceId) !== finding) return false;
    if (strength !== "all" && row?.triage?.strength !== strength) return false;
    if (recommendation !== "all" && row?.triage?.recommendation !== recommendation) return false;
    if (quality !== "all" && row?.evidenceQuality?.band !== quality) {
      if (!(quality === "rated" && row?.evidenceQuality?.score != null)) return false;
    }
    if (topic !== "all" && !rowTopicKeys(row).includes(topic)) return false;
    if (source !== "all" && row?.sourceFilterKey !== source) return false;
    return !query || reviewSearchHaystack(row).includes(query);
  });
}

function reviewOptions(rows, valuesForRow, labelForValue) {
  const counts = new Map();
  for (const row of rows) {
    for (const value of new Set(valuesForRow(row).filter(Boolean))) {
      const previous = counts.get(value) || { value, label: labelForValue(value, row), count: 0 };
      previous.count += 1;
      counts.set(value, previous);
    }
  }
  return [...counts.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function topicLabel(value, row) {
  const match = (row?.treeMatches || []).find((entry) => entry?.type === "topic" && clean(entry.key) === value);
  return clean(match?.label || row?.linkedTopicRating?.title) || value;
}

function bearerToken(req) {
  const value = String(req.headers?.authorization || "");
  const match = value.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || null;
}

function supabaseHeaders(token, extra = {}) {
  return {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

async function responseJson(response, fallback) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

async function verifyAdmin(token) {
  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: supabaseHeaders(token),
    signal: AbortSignal.timeout(15_000),
  });
  if (!userResponse.ok) return null;
  const user = await responseJson(userResponse, null);
  if (!user?.id) return null;

  const profileUrl = new URL(`${SUPABASE_URL}/rest/v1/users`);
  profileUrl.searchParams.set("id", `eq.${user.id}`);
  profileUrl.searchParams.set("select", "role");
  profileUrl.searchParams.set("limit", "1");
  const profileResponse = await fetch(profileUrl, {
    headers: supabaseHeaders(token),
    signal: AbortSignal.timeout(15_000),
  });
  if (!profileResponse.ok) return null;
  const profiles = await responseJson(profileResponse, []);
  return profiles?.[0]?.role === "admin" ? user : null;
}

function contentRangeTotal(value, fallback) {
  const match = String(value || "").match(/\/(\d+)$/);
  const total = match ? Number(match[1]) : Number(fallback);
  return Number.isFinite(total) ? total : fallback;
}

async function fetchRange({ table, select, token, start, end, filters = [], count = false }) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  url.searchParams.set("order", "created_at.desc");
  for (const [key, value] of filters) url.searchParams.append(key, value);
  const response = await fetch(url, {
    headers: supabaseHeaders(token, {
      Range: `${start}-${end}`,
      "Range-Unit": "items",
      ...(count ? { Prefer: "count=exact" } : {}),
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    const body = await responseJson(response, {});
    const error = new Error("supabase_read_failed");
    error.code = String(body?.code || response.status || "read_failed");
    throw error;
  }
  const rows = await responseJson(response, []);
  return {
    rows: Array.isArray(rows) ? rows : [],
    total: contentRangeTotal(response.headers.get("content-range"), rows?.length || 0),
  };
}

async function fetchAllAuthorizedRows({ table, select, token, filters = [] }) {
  const first = await fetchRange({
    table,
    select,
    token,
    filters,
    start: 0,
    end: SOURCE_PAGE - 1,
    count: true,
  });
  const boundedTotal = Math.min(first.total, MAX_SOURCE_ROWS);
  const ranges = [];
  for (let start = SOURCE_PAGE; start < boundedTotal; start += SOURCE_PAGE) {
    ranges.push([start, Math.min(start + SOURCE_PAGE - 1, boundedTotal - 1)]);
  }

  const rows = [...first.rows];
  // Five concurrent reads keep latency bounded without creating an unbounded request burst.
  for (let index = 0; index < ranges.length; index += 5) {
    const batch = await Promise.all(ranges.slice(index, index + 5).map(([start, end]) => fetchRange({
      table,
      select,
      token,
      filters,
      start,
      end,
    })));
    for (const page of batch) rows.push(...page.rows);
  }
  return { rows, total: first.total, truncated: first.total > rows.length };
}

async function resolveContributorScope(token, contributorId) {
  const id = clean(contributorId);
  if (!id) return null;
  if (!UUID_RE.test(id)) throw Object.assign(new Error("invalid_contributor_scope"), { code: "invalid_contributor_scope" });
  const result = await fetchRange({
    table: "contributors",
    select: "id,display_name,wa_names",
    token,
    filters: [["id", `eq.${id}`]],
    start: 0,
    end: 0,
  });
  const row = result.rows[0];
  if (!row?.id) throw Object.assign(new Error("contributor_scope_not_found"), { code: "contributor_scope_not_found" });
  return Object.freeze({
    id: String(row.id),
    label: clean(row.display_name) || "תורם נבחר",
    aliases: [...new Set([row.display_name, ...(Array.isArray(row.wa_names) ? row.wa_names : [])]
      .map(clean).filter(Boolean))],
  });
}

function countBy(rows, field) {
  const result = {};
  for (const row of rows) {
    const value = String(row?.[field] || "לא צוין");
    result[value] = (result[value] || 0) + 1;
  }
  return result;
}

function countContributors(rows) {
  const result = {};
  for (const row of rows) {
    const values = Array.isArray(row?.contributors) && row.contributors.length
      ? row.contributors
      : [row?.contributor || "לא צוין"];
    for (const value of new Set(values)) result[value] = (result[value] || 0) + 1;
  }
  return result;
}

async function buildAuthorizedProjection(token) {
  const [excludedChannelRows, research, topics] = await Promise.all([
    fetchAllAuthorizedRows({
      table: "channel_updates",
      select: "id,created_at",
      token,
      filters: [["channel", "eq.or-geula"]],
    }),
    fetchAllAuthorizedRows({
      table: "world_contributor_research_v1",
      select: "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,privacy_scope,promoted_node_id,parent_id,meta,source_contributor_id",
      token,
    }),
    fetchAllAuthorizedRows({
      table: "topic_cards",
      select: "id,created_at,approved_at,slug,title,subtitle,search_terms,image_ids,numbers,highlight_numbers,status,quality,meter_score,created_by,node_id",
      token,
    }),
  ]);
  const excludedChannelSourceRefs = excludedChannelRows.rows.map((row) => `channel_updates:${row.id}`);
  const scoped = scopeWorldPreviewMaterial({
    researchObjects: research.rows,
    excludedChannelSourceRefs,
  });
  const projection = buildWorldAllResearchProjection({
    researchObjects: research.rows,
    contributions: [],
    sourceMessages: [],
    topics: topics.rows,
    convergenceCandidates: [],
    excludedChannelSourceRefs,
  }, {
    researchObjects: scoped.researchObjects.length,
    contributions: 0,
    sourceMessages: 0,
    topics: topics.total,
    truncated: research.truncated || topics.truncated,
  });
  // This endpoint is a findings queue. Topic rows are lookup material for meters,
  // not a second family in the response.
  const findings = projection.rows
    .filter((row) => row.family === "research_object")
    .map(enrichWorldFindingReviewRow);
  const orderedFindings = sortWorldFindingReviewRows(findings, "strength");
  const matchedSnapshotCards = orderedFindings.filter((row) => row.triage).length;
  return {
    ...projection,
    rows: orderedFindings,
    total: scoped.researchObjects.length,
    loaded: orderedFindings.length,
    sourceTotals: { research_object: scoped.researchObjects.length },
    byFamily: { research_object: orderedFindings.length },
    byKind: countBy(orderedFindings, "kind"),
    byAccess: countBy(orderedFindings, "access"),
    byStatus: countBy(orderedFindings, "status"),
    byVerification: countBy(orderedFindings, "verification"),
    byContributor: countContributors(orderedFindings),
    byTriageStrength: countBy(
      orderedFindings.filter((row) => row.triage).map((row) => ({ strength: row.triage.strength })),
      "strength",
    ),
    byTriageRecommendation: WORLD_FINDING_TRIAGE_META.recommendationCounts,
    byEvidenceQuality: countBy(
      orderedFindings.map((row) => ({ evidenceQualityBand: row.evidenceQuality?.band || "unrated" })),
      "evidenceQualityBand",
    ),
    topicOptions: reviewOptions(orderedFindings, rowTopicKeys, topicLabel),
    sourceOptions: reviewOptions(
      orderedFindings,
      (row) => [row.sourceFilterKey],
      (_value, row) => clean(row.sourceLabel) || clean(row.sourceFilterKey) || "מקור מחקר",
    ),
    triageSnapshot: {
      ...WORLD_FINDING_TRIAGE_META,
      matchedCards: matchedSnapshotCards,
      untriagedLiveCards: orderedFindings.length - matchedSnapshotCards,
    },
  };
}

function queryValue(req, name, fallback = "all") {
  const value = Array.isArray(req.query?.[name]) ? req.query[name][0] : req.query?.[name];
  return String(value == null ? fallback : value).slice(0, name === "query" ? 200 : 80);
}

function pageResponse(projection, req, contributorScope = null) {
  const offset = Math.max(0, Math.min(Number(req.query?.offset) || 0, MAX_SOURCE_ROWS));
  const filters = {
    query: queryValue(req, "query", ""),
    finding: queryValue(req, "finding", ""),
    family: "research_object",
    kind: queryValue(req, "kind"),
    access: queryValue(req, "access"),
    status: queryValue(req, "status"),
    verification: queryValue(req, "verification"),
    contributor: queryValue(req, "contributor"),
    contributorId: contributorScope?.id || "all",
    contributorAliases: contributorScope?.aliases || [],
    tree: queryValue(req, "tree"),
    meter: queryValue(req, "meter"),
    strength: queryValue(req, "strength"),
    recommendation: queryValue(req, "recommendation"),
    quality: queryValue(req, "quality"),
    topic: queryValue(req, "topic"),
    source: queryValue(req, "source"),
  };
  const filtered = filterWorldFindingReviewRows(projection.rows, filters);
  const ordered = sortWorldFindingReviewRows(filtered, queryValue(req, "sort", "strength"));
  const rows = ordered.slice(offset, offset + REVIEW_PAGE);
  const { rows: _allRows, convergenceCandidates: _candidates, ...summary } = projection;
  if (contributorScope) {
    const triaged = filtered.filter((row) => row.triage);
    summary.corpusTriageSnapshot = summary.triageSnapshot;
    summary.triageSnapshot = {
      snapshotDate: WORLD_FINDING_TRIAGE_META.snapshotDate,
      cutoff: WORLD_FINDING_TRIAGE_META.cutoff,
      totalCards: filtered.length,
      matchedCards: triaged.length,
      untriagedLiveCards: filtered.length - triaged.length,
      strengthCounts: countBy(triaged.map((row) => ({ strength: row.triage.strength })), "strength"),
      recommendationCounts: countBy(triaged.map((row) => ({ recommendation: row.triage.recommendation })), "recommendation"),
    };
    summary.treeMatchedResearchOccurrences = filtered
      .filter((row) => row.treeMatches?.length)
      .reduce((sum, row) => sum + Number(row.occurrenceCount || 1), 0);
    summary.meteredResearchOccurrences = filtered
      .filter((row) => row.linkedTopicRating?.meterScore != null)
      .reduce((sum, row) => sum + Number(row.occurrenceCount || 1), 0);
    summary.duplicateProjection = {
      ...summary.duplicateProjection,
      groups: filtered.filter((row) => Number(row.duplicateOccurrenceCount || 0) > 0).length,
      occurrencesCombined: filtered.reduce((sum, row) => sum + Number(row.duplicateOccurrenceCount || 0), 0),
      clusteredResearchRows: filtered.length,
    };
    summary.reviewScope = contributorScope;
  }
  return {
    projection: { ...summary, rows },
    page: {
      offset,
      limit: REVIEW_PAGE,
      returned: rows.length,
      totalFiltered: ordered.length,
      hasMore: offset + rows.length < ordered.length,
      nextOffset: offset + rows.length,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "Authorization, Cookie");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "authentication_required" });

  try {
    const user = await verifyAdmin(token);
    if (!user) return res.status(403).json({ error: "admin_required" });
    const contributorId = queryValue(req, "contributor_id", "");
    const contributorScope = contributorId ? await resolveContributorScope(token, contributorId) : null;
    const projection = await buildAuthorizedProjection(token);
    return res.status(200).json(pageResponse(projection, req, contributorScope));
  } catch (error) {
    console.error("world_finding_review_failed", error?.code || error?.name || "unknown");
    return res.status(503).json({ error: "review_temporarily_unavailable" });
  }
}

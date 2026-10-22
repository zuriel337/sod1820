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

const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
const SOURCE_PAGE = 500;
const MAX_SOURCE_ROWS = 20000;
const REVIEW_PAGE = 40;

export const config = { maxDuration: 60 };

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
      table: "research_objects",
      select: "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,privacy_scope,promoted_node_id,parent_id,meta",
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
  const findings = projection.rows.filter((row) => row.family === "research_object");
  return {
    ...projection,
    rows: findings,
    total: scoped.researchObjects.length,
    loaded: findings.length,
    sourceTotals: { research_object: scoped.researchObjects.length },
    byFamily: { research_object: findings.length },
    byKind: countBy(findings, "kind"),
    byAccess: countBy(findings, "access"),
    byStatus: countBy(findings, "status"),
    byVerification: countBy(findings, "verification"),
    byContributor: countContributors(findings),
  };
}

function queryValue(req, name, fallback = "all") {
  const value = Array.isArray(req.query?.[name]) ? req.query[name][0] : req.query?.[name];
  return String(value == null ? fallback : value).slice(0, name === "query" ? 200 : 80);
}

function pageResponse(projection, req) {
  const offset = Math.max(0, Math.min(Number(req.query?.offset) || 0, MAX_SOURCE_ROWS));
  const filters = {
    query: queryValue(req, "query", ""),
    family: "research_object",
    kind: queryValue(req, "kind"),
    access: queryValue(req, "access"),
    status: queryValue(req, "status"),
    verification: queryValue(req, "verification"),
    contributor: queryValue(req, "contributor"),
    tree: queryValue(req, "tree"),
    meter: queryValue(req, "meter"),
  };
  const filtered = filterWorldAllResearchRows(projection.rows, filters);
  const rows = filtered.slice(offset, offset + REVIEW_PAGE);
  const { rows: _allRows, convergenceCandidates: _candidates, ...summary } = projection;
  return {
    projection: { ...summary, rows },
    page: {
      offset,
      limit: REVIEW_PAGE,
      returned: rows.length,
      totalFiltered: filtered.length,
      hasMore: offset + rows.length < filtered.length,
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
    const projection = await buildAuthorizedProjection(token);
    return res.status(200).json(pageResponse(projection, req));
  } catch (error) {
    console.error("world_finding_review_failed", error?.code || error?.name || "unknown");
    return res.status(503).json({ error: "review_temporarily_unavailable" });
  }
}

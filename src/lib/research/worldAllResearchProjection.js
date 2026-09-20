import { supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE_SIZE = 500;
const MAX_ROWS = 10000;

function verificationState(row) {
  const explicit = clean(row?.engine_detail?.verification_state);
  if (explicit) return explicit;
  return row?.engine_verified === true ? "match" : "not_tested";
}

export function normalizeWorldAllResearchRow(row) {
  if (!row?.id) return null;
  const value = Number(row?.value);
  return {
    id: String(row.id),
    createdAt: row.created_at || null,
    kind: clean(row.kind) || "observation",
    statement: clean(row.statement) || "ממצא ללא ניסוח",
    terms: Array.isArray(row.terms) ? row.terms.map(String) : [],
    value: Number.isFinite(value) ? value : null,
    relates: Array.isArray(row.relates) ? row.relates.map(String) : [],
    source: clean(row.source) || null,
    sourceRef: clean(row.source_ref) || null,
    contributor: clean(row.contributor) || null,
    confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : null,
    status: clean(row.status) || "לא צוין",
    access: clean(row.privacy_scope) || "לא צוין",
    engineVerified: row.engine_verified === true,
    verification: verificationState(row),
    mediaClass: clean(row?.meta?.ext?.source_media_profile?.class) || null,
    spatialCluster: clean(row?.meta?.ext?.spatial_research?.cluster) || null,
  };
}

function countBy(rows, key) {
  const out = {};
  for (const row of rows) {
    const value = clean(row?.[key]) || "לא צוין";
    out[value] = (out[value] || 0) + 1;
  }
  return out;
}

export function buildWorldAllResearchProjection(rows = [], { total = null, truncated = false } = {}) {
  const normalized = (Array.isArray(rows) ? rows : []).map(normalizeWorldAllResearchRow).filter(Boolean);
  return {
    rows: normalized,
    total: Number.isFinite(Number(total)) ? Number(total) : normalized.length,
    loaded: normalized.length,
    truncated: Boolean(truncated),
    byKind: countBy(normalized, "kind"),
    byAccess: countBy(normalized, "access"),
    byStatus: countBy(normalized, "status"),
    byVerification: countBy(normalized, "verification"),
    byContributor: countBy(normalized, "contributor"),
    truthBoundary: "Human-Gate visibility does not change access, governance, verification, canonicality or publication.",
  };
}

export function filterWorldAllResearchRows(rows = [], filters = {}) {
  const query = clean(filters.query).toLowerCase();
  const kind = clean(filters.kind) || "all";
  const access = clean(filters.access) || "all";
  const status = clean(filters.status) || "all";
  const verification = clean(filters.verification) || "all";
  const contributor = clean(filters.contributor) || "all";

  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (kind !== "all" && row.kind !== kind) return false;
    if (access !== "all" && row.access !== access) return false;
    if (status !== "all" && row.status !== status) return false;
    if (verification !== "all" && row.verification !== verification) return false;
    if (contributor !== "all" && (row.contributor || "לא צוין") !== contributor) return false;
    if (!query) return true;
    const haystack = [
      row.statement,
      row.contributor,
      row.source,
      row.sourceRef,
      row.value,
      row.kind,
      row.status,
      row.access,
      row.mediaClass,
      row.spatialCluster,
      ...(row.terms || []),
      ...(row.relates || []),
    ].filter((value) => value != null).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export async function fetchWorldAllResearchProjection() {
  const fields = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,meta";
  const rows = [];
  let total = null;
  let offset = 0;

  while (offset < MAX_ROWS) {
    const end = Math.min(offset + PAGE_SIZE - 1, MAX_ROWS - 1);
    const query = supabase
      .from("research_objects")
      .select(fields, offset === 0 ? { count: "exact" } : undefined)
      .order("created_at", { ascending: false })
      .range(offset, end);
    const { data, error, count } = await query;
    if (error) throw error;
    if (offset === 0 && count != null) total = Number(count);
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const knownTotal = Number.isFinite(total) ? total : rows.length;
  return buildWorldAllResearchProjection(rows, {
    total: knownTotal,
    truncated: knownTotal > rows.length,
  });
}

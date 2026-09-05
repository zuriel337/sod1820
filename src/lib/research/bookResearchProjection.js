import { supabase } from "../supabase.js";
import { researchObjectsToUniversalFindings } from "./researchObjectFinding.js";

// Must stay aligned to the existing column-scoped authenticated GRANT from
// 20260825143000_research_intake_step1b_research_objects_admin_read_grant.sql.
// Do not widen ACL merely for this projection.
const RESEARCH_FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id";
const BOOK_FIELDS = "id,type,label,description,identity_key,metadata,is_active,created_at";

function clean(v) { return v == null ? "" : String(v).trim(); }

export function pageFromSourceRef(sourceRef) {
  const ref = clean(sourceRef);
  const direct = ref.match(/#p(\d+)/i);
  if (direct) return Number(direct[1]);
  // Peli'ah historical Research Objects often use #pdf:24 / #pdf:15,31,... locators.
  // Preserve those rows; adapt the projection instead of rewriting provenance.
  const pdf = ref.match(/#pdf:(\d+)/i);
  return pdf ? Number(pdf[1]) : null;
}

export async function fetchBookEntities() {
  const { data, error } = await supabase
    .from("nodes")
    .select(BOOK_FIELDS)
    .eq("type", "book")
    .eq("is_active", true)
    .order("label", { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchBookEntityBySlug(slug) {
  const safe = clean(slug);
  if (!safe) return null;
  const { data, error } = await supabase
    .from("nodes")
    .select(BOOK_FIELDS)
    .eq("type", "book")
    .eq("is_active", true)
    .eq("metadata->>slug", safe)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function permissionLike(error) {
  const msg = clean(error?.message).toLowerCase();
  const code = clean(error?.code);
  return code === "42501" || code === "PGRST301" || msg.includes("permission") || msg.includes("row-level security");
}

export async function fetchBookResearch(book, { limit = 500 } = {}) {
  const prefixes = Array.isArray(book?.metadata?.source_ref_prefixes)
    ? book.metadata.source_ref_prefixes.map(clean).filter(Boolean)
    : [];
  if (!prefixes.length) return { rows: [], findings: [], restricted: false, summary: summarizeBookResearch([]) };

  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 1000));
  const attempts = await Promise.all(prefixes.map(async prefix => {
    const { data, error } = await supabase
      .from("research_objects")
      .select(RESEARCH_FIELDS)
      .like("source_ref", `${prefix}%`)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    return { data, error };
  }));

  const errors = attempts.map(x => x.error).filter(Boolean);
  const readable = attempts.filter(x => !x.error);
  if (!readable.length && errors.length && errors.every(permissionLike)) {
    return { rows: [], findings: [], restricted: true, summary: summarizeBookResearch([]) };
  }
  const fatal = errors.find(e => !permissionLike(e));
  if (fatal) throw fatal;

  const byId = new Map();
  readable.forEach(({ data }) => (data || []).forEach(row => byId.set(row.id, row)));
  const rows = [...byId.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return {
    rows,
    findings: researchObjectsToUniversalFindings(rows),
    restricted: false,
    summary: summarizeBookResearch(rows),
  };
}

export function summarizeBookResearch(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKind = {};
  const byStatus = {};
  const pages = new Set();
  let engineVerified = 0;
  let contradictions = 0;
  let unresolved = 0;
  list.forEach(row => {
    const kind = clean(row?.kind) || "unknown";
    const status = clean(row?.status) || "unknown";
    byKind[kind] = (byKind[kind] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    const p = pageFromSourceRef(row?.source_ref);
    if (p) pages.add(p);
    if (row?.engine_verified === true) engineVerified++;
    const text = `${row?.kind || ""} ${row?.statement || ""}`.toLowerCase();
    if (text.includes("contradiction") || text.includes("סתיר")) contradictions++;
    if (text.includes("unresolved") || text.includes("ambiguous") || text.includes("לא פתור")) unresolved++;
  });
  return { total: list.length, byKind, byStatus, pages: [...pages].sort((a,b) => a-b), engineVerified, contradictions, unresolved };
}

export function bookToWorkspaceItem(book) {
  if (!book) return null;
  const slug = clean(book?.metadata?.slug);
  return {
    id: book.identity_key || `book:${book.id}`,
    type: "book",
    title: book.label,
    label: book.label,
    link: slug ? `/book/${slug}` : "/book",
    metadata: {
      nodeId: book.id,
      identityKey: book.identity_key,
      sourceRefPrefixes: book?.metadata?.source_ref_prefixes || [],
      witness: book?.metadata?.identity_tiers?.witness || null,
      digitalObject: book?.metadata?.identity_tiers?.digital_object || null,
    },
  };
}

export function researchRowToWorkspaceItem(row, book) {
  const p = pageFromSourceRef(row?.source_ref);
  return {
    id: `research-object:${row.id}`,
    type: "research",
    title: row.statement || `${book?.label || "ספר"} · ממצא מחקר`,
    label: row.statement || "ממצא מחקר",
    link: `${book?.metadata?.route || "/book"}${p ? `?page=${p}` : ""}#research`,
    metadata: {
      researchObjectId: row.id,
      bookIdentity: book?.identity_key || null,
      page: p,
      sourceRef: row.source_ref,
      status: row.status,
      kind: row.kind,
      engineVerified: row.engine_verified === true,
    },
  };
}

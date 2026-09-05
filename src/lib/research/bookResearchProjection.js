import { supabase } from "../supabase.js";
import { researchObjectsToUniversalFindings } from "./researchObjectFinding.js";

// Must stay aligned to the existing column-scoped authenticated GRANT from
// 20260825143000_research_intake_step1b_research_objects_admin_read_grant.sql.
// Do not widen ACL merely for this projection. `meta` is already SELECT-granted;
// RLS remains the authority for whether a row is readable at all.
const RESEARCH_FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id,meta";
const BOOK_FIELDS = "id,type,label,description,identity_key,metadata,is_active,created_at";

// Scale guardrail: Book Hub is a projection, not a client-side research dump.
// The default view is intentionally bounded; a future explorer can paginate/rank
// server-side without changing Book identity or the research_object contract.
export const DEFAULT_BOOK_RESEARCH_LIMIT = 24;
export const MAX_BOOK_RESEARCH_LIMIT = 100;

function clean(v) { return v == null ? "" : String(v).trim(); }
function triBool(v) { return v === true ? true : v === false ? false : null; }
function firstArray(...values) { return values.find(Array.isArray) || []; }

export function pageFromSourceRef(sourceRef) {
  const ref = clean(sourceRef);
  const direct = ref.match(/#p(\d+)/i);
  if (direct) return Number(direct[1]);
  // Historical source locators may use #pdf:24 / #pdf:15,31,... . Preserve provenance;
  // adapt the projection instead of rewriting stored source_ref values.
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

// Targeted authorized fetch-by-id: resolves ONE specific research_object row for exact
// deep-link reopen (?research=<id>) even when it has aged outside the default bounded
// batch. This is a single-row lookup under the same RLS as the bulk reader — never a
// corpus dump, never a pagination/offset scan, and never a widened grant.
export async function fetchBookResearchById(id) {
  const safeId = clean(id);
  if (!safeId) return null;
  const { data, error } = await supabase
    .from("research_objects")
    .select(RESEARCH_FIELDS)
    .eq("id", safeId)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (permissionLike(error)) return null;
    throw error;
  }
  return data || null;
}

// Pure merge step for exact-reopen, factored out of the network fetch so the privacy
// boundary (a focus id may only fold in if it belongs to THIS Book's witness prefixes)
// is unit-testable without a live Supabase call. `focusRow` is whatever
// fetchBookResearchById(focusId) already returned (or null if not found/authorized).
export function applyFocusRow(rows, byId, focusId, prefixes, focusRow) {
  const list = Array.isArray(rows) ? rows : [];
  const safeFocusId = clean(focusId);
  if (!safeFocusId) return { rows: list, focusIncluded: false };

  const already = byId?.get?.(safeFocusId) || list.find(r => String(r.id) === safeFocusId);
  if (already) {
    const nextRows = list.some(r => String(r.id) === safeFocusId) ? list : [already, ...list];
    return { rows: nextRows, focusIncluded: true };
  }
  const safePrefixes = Array.isArray(prefixes) ? prefixes : [];
  if (focusRow && safePrefixes.some(p => clean(focusRow.source_ref).startsWith(p))) {
    return { rows: [focusRow, ...list], focusIncluded: true };
  }
  return { rows: list, focusIncluded: false };
}

export async function fetchBookResearch(book, { limit = DEFAULT_BOOK_RESEARCH_LIMIT, focusId } = {}) {
  const prefixes = Array.isArray(book?.metadata?.source_ref_prefixes)
    ? book.metadata.source_ref_prefixes.map(clean).filter(Boolean)
    : [];
  if (!prefixes.length) return { rows: [], findings: [], restricted: false, truncated: false, focusIncluded: false, summary: summarizeBookResearch([]) };

  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_BOOK_RESEARCH_LIMIT, MAX_BOOK_RESEARCH_LIMIT));
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
    return { rows: [], findings: [], restricted: true, truncated: false, focusIncluded: false, summary: summarizeBookResearch([]) };
  }
  const fatal = errors.find(e => !permissionLike(e));
  if (fatal) throw fatal;

  const byId = new Map();
  readable.forEach(({ data }) => (data || []).forEach(row => byId.set(row.id, row)));
  const allRows = [...byId.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  let rows = allRows.slice(0, safeLimit);
  const truncated = allRows.length > rows.length || readable.some(({ data }) => (data || []).length >= safeLimit);

  // Exact-reopen: if the URL points at a row outside the current bounded batch, fetch
  // that one row by id and fold it in — the row still has to belong to this Book's
  // witness prefixes, so this can never surface a foreign/unrelated private row.
  const safeFocusId = clean(focusId);
  const needsFocusFetch = safeFocusId && !byId.has(safeFocusId) && !rows.some(r => String(r.id) === safeFocusId);
  const focusRow = needsFocusFetch ? await fetchBookResearchById(safeFocusId) : null;
  const folded = applyFocusRow(rows, byId, safeFocusId, prefixes, focusRow);
  rows = folded.rows;
  const focusIncluded = folded.focusIncluded;

  return {
    rows,
    findings: researchObjectsToUniversalFindings(rows),
    restricted: false,
    truncated,
    focusIncluded,
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

// Generic renderer adapter over the SAME Book/research_object contract.
// A live structural-only audit of the second book showed reusable shape keys such as
// steps/procedure_chain, row arrays, groups/generator_candidate and dimensions. We adapt
// those shapes without copying private values into source control and without turning a
// source-local procedure into a new engine/entity/schema.
export function researchRowToBookRepresentation(row) {
  const procedure = row?.meta?.ext?.procedure && typeof row.meta.ext.procedure === "object"
    ? row.meta.ext.procedure
    : {};

  let matrix = firstArray(
    row?.matrix,
    procedure?.matrix,
    procedure?.rows,
    procedure?.summary_rows,
    procedure?.chapter_164_summary_rows,
  );
  if (!matrix.length && Array.isArray(procedure?.comparative_standard_row)) {
    matrix = [procedure.comparative_standard_row];
  }

  const steps = firstArray(
    row?.steps,
    procedure?.steps,
    procedure?.procedure_chain,
    procedure?.concrete_procedure,
  );
  const generated = firstArray(row?.generated, procedure?.generated, procedure?.outputs);
  const composition = firstArray(row?.composition, procedure?.composition, procedure?.groups);
  const dimensions = firstArray(row?.dimensions, procedure?.dimensions);
  const grammar = procedure?.grammar_mapping ?? procedure?.grammar ?? null;
  const generatorCandidate = procedure?.generator_candidate ?? null;

  const explicitShape = clean(row?.representation_shape || procedure?.representation_shape || procedure?.shape).toLowerCase();
  const shape = matrix.length ? "matrix"
    : steps.length ? "procedure"
      : (generated.length || composition.length || generatorCandidate) ? "composition"
        : dimensions.length ? "spatial"
          : grammar ? "grammar"
            : explicitShape || (Array.isArray(row?.terms) && row.terms.length ? "terms" : "narrative");

  const procedureWitness = procedure?.pdf_exact_witness_status
    ?? procedure?.witness_state
    ?? (typeof procedure?.witness === "string" ? procedure.witness : procedure?.witness?.status)
    ?? procedure?.pdf_adjudication?.status
    ?? null;

  return {
    shape,
    title: clean(row?.title || row?.statement || row?.kind) || "Research Object",
    sourceRef: row?.source_ref ?? null,
    kind: row?.kind ?? null,
    status: row?.status ?? null,
    privacyScope: row?.privacy_scope ?? null,
    engineVerified: triBool(row?.engine_verified),
    engineVerificationState: row?.engine_detail?.verification_state ?? null,
    witnessState: row?.witness_state ?? row?.exact_witness_state ?? procedureWitness,
    terms: Array.isArray(row?.terms) ? row.terms : [],
    matrix,
    steps,
    generated,
    composition,
    dimensions,
    grammar,
    generatorCandidate,
  };
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

// Connection projection — NO GRAPH EDGES. Both live Book nodes currently have 0 edges;
// this reads only the Book's own already-curated `seeds` (number-family entries editorially
// placed in SNAPSHOTS), and resolves each to the existing universal /number/:n route — the
// same route every number on the site already has. It never claims a canonical relation and
// never invents an entity: an unresolved/non-numeric seed is simply omitted, not linked.
export function deriveBookConnections(snap) {
  const seeds = Array.isArray(snap?.seeds) ? snap.seeds : [];
  const seen = new Set();
  const out = [];
  for (const seed of seeds) {
    if (seed?.family !== "number-family") continue;
    const value = clean(seed?.key);
    if (!value || !/^\d+$/.test(value) || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: clean(seed?.label) || value, href: `/number/${value}` });
  }
  return out;
}

// Honest-state signal for the connection panel: does this Book have internal exploration
// seeds (procedure/representation/operator/... families) that simply haven't resolved to
// an external canonical entity yet? This is NOT "no connections exist" — it's "connections
// beyond this Book are pending canonical/Human-Gate resolution", which must be said plainly
// instead of silently rendering nothing (and never by inventing a graph edge to fill the gap).
export function hasUnresolvedBookSeeds(snap) {
  const seeds = Array.isArray(snap?.seeds) ? snap.seeds : [];
  return seeds.some(seed => clean(seed?.family) && seed.family !== "number-family");
}

// Research Context bridge — pure decision, no side effects. Encodes the three Golden Cases:
// (A) fresh entry with no active root: establish the Book as subject+selection.
// (B/C) a root already exists (Number/Entity/whatever the visitor was already researching):
// the root is sticky and must never be silently replaced by entering a Book — only the
// current selection/lens move to reflect "the visitor is now looking at this Book/row".
// `focusSelection` is a generic { sourceRef, locator } pair — the caller derives it from
// whichever exact thing is in view (a live research_object row, a dossier/source
// selection, ...); this function does not care which, so adding a third focus kind later
// never requires touching this contract.
export function bookContextPatch({ book, slug, hasRoot, focusSelection }) {
  if (!book) return null;
  const bookSubject = { id: book.identity_key, type: "book", label: book.label, href: `/book/${slug}` };
  const bookSelection = focusSelection
    ? { entityId: book.identity_key, entityType: "book", sourceRef: focusSelection.sourceRef ?? null, locator: focusSelection.locator ?? null }
    : { entityId: book.identity_key, entityType: "book" };
  return hasRoot
    ? { selection: bookSelection, lens: "book" }
    : { subject: bookSubject, selection: bookSelection, lens: "book" };
}

export function researchRowToWorkspaceItem(row, book) {
  const p = pageFromSourceRef(row?.source_ref);
  const route = clean(book?.metadata?.route) || "/book";
  const params = new URLSearchParams();
  if (p) params.set("page", String(p));
  params.set("tab", "research");
  if (row?.id) params.set("research", String(row.id));
  const query = params.toString();
  return {
    id: `research-object:${row.id}`,
    type: "research",
    title: row.statement || `${book?.label || "ספר"} · ממצא מחקר`,
    label: row.statement || "ממצא מחקר",
    link: `${route}${query ? `?${query}` : ""}#research-selection`,
    metadata: {
      researchObjectId: row.id,
      bookIdentity: book?.identity_key || null,
      page: p,
      sourceRef: row.source_ref,
      status: row.status ?? null,
      kind: row.kind ?? null,
      engineVerified: triBool(row?.engine_verified),
      engineVerificationState: row?.engine_detail?.verification_state ?? null,
      privacyScope: row?.privacy_scope ?? null,
    },
  };
}

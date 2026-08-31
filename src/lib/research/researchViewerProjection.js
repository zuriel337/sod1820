import { supabase } from "../supabase.js";
import { researchObjectsToUniversalFindings } from "./researchObjectFinding.js";
import { fetchCanonicalGematriaFindings } from "./canonicalGematria.js";
import { fetchCanonicalTopicConvergenceFinding } from "./topicConvergence.js";
import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";

const DEFAULT_LIMIT = 200;
const DEFAULT_TOPIC_LIMIT = 12;
const FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id";
const GRAPH_SEARCH_FIELDS = "id,type,label,identity_key,is_active,created_at";
const JUDGMENT_DECISIONS = new Set(["approve", "reject", "canonicalize"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * Read-mostly Discovery projection for Research Viewer.
 *
 * This module owns NO truth and NO storage. Every source remains source-native and is
 * immediately projected through its canonical Universal Finding adapter. It never
 * creates research_objects, graph nodes, publication state, or a parallel workspace.
 */
export async function fetchResearchViewerFindings({ limit = DEFAULT_LIMIT, sourceRef = null, status = null } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_LIMIT, 1000));
  let q = supabase
    .from("research_objects")
    .select(FIELDS)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (sourceRef) q = q.eq("source_ref", sourceRef);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return {
    rows,
    findings: researchObjectsToUniversalFindings(rows),
  };
}

/**
 * Recent approved Topic/Convergence sources. The list query discovers source-native
 * slugs only; each item is then fetched through the canonical Topic/Convergence adapter
 * so the Viewer never reconstructs graph truth itself.
 */
export async function fetchResearchViewerConvergences({ limit = DEFAULT_TOPIC_LIMIT } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_TOPIC_LIMIT, 50));
  const { data, error } = await supabase
    .from("topic_cards")
    .select("slug,approved_at,created_at")
    .eq("status", "approved")
    .not("slug", "is", null)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(safeLimit);

  if (error) throw error;

  const slugs = [...new Set((data || []).map(row => String(row?.slug || "").trim()).filter(Boolean))];
  const findings = await Promise.all(slugs.map(slug => fetchCanonicalTopicConvergenceFinding(slug)));
  return findings.filter(Boolean);
}

/**
 * One heterogeneous read-only Discovery load. Research Objects and Convergences keep
 * their distinct source identities while sharing the Universal Finding envelope.
 */
export async function fetchResearchViewerDiscovery({ researchLimit = 300, topicLimit = DEFAULT_TOPIC_LIMIT } = {}) {
  const [research, convergences] = await Promise.all([
    fetchResearchViewerFindings({ limit: researchLimit }),
    fetchResearchViewerConvergences({ limit: topicLimit }),
  ]);

  return {
    findings: [...research.findings, ...convergences],
    sources: {
      researchObjects: research.findings.length,
      convergences: convergences.length,
    },
  };
}

/**
 * Gematria is request-scoped rather than a passive feed. Explicit researcher input is
 * sent only to the canonical gematria_api path via its existing adapter. Returned values
 * are calculations; verification remains `not_tested` unless a real claim was supplied.
 */
export async function fetchResearchViewerGematria(text) {
  return fetchCanonicalGematriaFindings(text);
}

/**
 * Entity/Graph Lens discovery. This only resolves existing graph node identities; it does
 * not reconstruct relations or truth locally. UUID input is exact. Text input is a bounded
 * label search, with exact label hits sorted before partial matches in-memory.
 */
export async function searchResearchViewerGraphEntities(query, { limit = 12 } = {}) {
  const term = clean(query);
  if (!term) return [];
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 30));

  if (UUID_RE.test(term)) {
    const { data, error } = await supabase
      .from("nodes")
      .select(GRAPH_SEARCH_FIELDS)
      .eq("id", term)
      .limit(1);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  const { data, error } = await supabase
    .from("nodes")
    .select(GRAPH_SEARCH_FIELDS)
    .ilike("label", `%${term.replace(/[%_]/g, "")}%`)
    .order("weight", { ascending: false, nullsFirst: false })
    .limit(safeLimit);
  if (error) throw error;

  return (Array.isArray(data) ? data : []).sort((a, b) => {
    const ax = clean(a?.label) === term ? 0 : 1;
    const bx = clean(b?.label) === term ? 0 : 1;
    return ax - bx;
  });
}

/**
 * Exact Entity/Graph investigation path. All node+edge projection semantics are delegated
 * to the canonical adapter merged in PR #275; the Viewer never reads or interprets edges itself.
 */
export async function fetchResearchViewerGraphEntity(nodeId, { relationLimit = 50 } = {}) {
  return fetchCanonicalGraphEntityFindings(nodeId, { relationLimit });
}

/**
 * Human-Gated Judgment bridge for durable research_objects only.
 *
 * This does not implement Judgment semantics locally. It delegates exclusively to the
 * existing canonical `admin_research_review` RPC, whose live contract owns the legal
 * transitions candidate -> approved/rejected and approved -> canonical. Canonicalization
 * remains distinct from publication; the RPC returns `published:false` and never treats
 * Workspace membership as approval.
 */
export async function reviewResearchObjectFinding(
  finding,
  { decision, verificationState = null, acknowledgeExtractionIncomplete = false } = {},
) {
  if (finding?.kind !== "research-object") throw new Error("Judgment is available only for research-object findings");
  const researchObjectId = String(finding?.identity?.sourceIdentity?.researchObjectId || "").trim();
  if (!researchObjectId) throw new Error("Missing research_object source identity");
  if (!JUDGMENT_DECISIONS.has(decision)) throw new Error("Invalid Judgment decision");

  const { data, error } = await supabase.rpc("admin_research_review", {
    p_id: researchObjectId,
    p_decision: decision,
    p_verification_state: verificationState || null,
    p_ack_extraction_incomplete: Boolean(acknowledgeExtractionIncomplete),
  });
  if (error) throw error;
  return data || null;
}

export default fetchResearchViewerDiscovery;

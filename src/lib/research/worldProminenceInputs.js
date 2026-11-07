import { supabase } from "../supabase.js";

const RESEARCH_PROMINENCE_FIELDS =
  "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id,parent_id,evidence,owner_person_id,meta";

// public.cross_method_strength is granted to service_role only (migrations 20260829151530 and
// 20260919204530; live role_table_grants: postgres + service_role, no anon, no authenticated).
// No browser session can ever read it, so a client query could only return 42501 -- which the
// edge logs showed as ~1,100 failing PostgREST requests per day against that view. The browser
// therefore does not issue that query at all. Consumers keep the exact shape they already handle
// on denial (available:false + this reason); this is not a claim that the row does not exist.
export const CROSS_METHOD_STRENGTH_ACCESS_FILTERED = "cross_method_strength_access_filtered";

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isAccessDenied(error) {
  return error?.code === "42501" || /permission denied/i.test(String(error?.message || ""));
}

// `meta` is by far the heaviest research_objects column (avg 2.8 KB of a ~4 KB row; 41 KB for the 15 public rows of
// number 1820). The Hub rows (RESEARCH_FIELDS) already carry it and researchCandidates() merges { ...row, ...supplement },
// so re-reading it for the same ids only repeats bytes. It is requested only when some Hub row arrived without the key.
async function fetchResearchSupplements(data) {
  const baseRows = asArray(data?.research?.rows);
  const ids = [...new Set(baseRows.map((row) => clean(row?.id)).filter(Boolean))];
  if (!ids.length) return { available: true, rows: [] };
  const baseCarriesMeta = baseRows.every((row) => !row?.id || Object.hasOwn(row, "meta"));
  const { data: rows, error } = await supabase
    .from("research_objects")
    .select(baseCarriesMeta ? "id,parent_id,evidence,owner_person_id" : "id,parent_id,evidence,owner_person_id,meta")
    .in("id", ids);
  if (error) {
    if (isAccessDenied(error)) return { available: false, rows: [], reason: "research_supplements_access_filtered" };
    throw error;
  }
  return { available: true, rows: asArray(rows) };
}

// Deliberately makes NO network request (see CROSS_METHOD_STRENGTH_ACCESS_FILTERED above).
function fetchCrossMethodStrength(data) {
  if (data?.identity?.type !== "number") return { available: true, row: null };
  const value = Number(data?.identity?.label);
  if (!Number.isSafeInteger(value)) return { available: true, row: null };
  return { available: false, row: null, reason: CROSS_METHOD_STRENGTH_ACCESS_FILTERED };
}

async function fetchEventContext(data, { researchLimit = 20 } = {}) {
  if (data?.identity?.type !== "event" || !data?.identity?.nodeId) return { available: true, context: null };
  const nodeId = String(data.identity.nodeId);
  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select("id,type,label,identity_key,metadata")
    .eq("id", nodeId)
    .maybeSingle();
  if (nodeError) {
    if (isAccessDenied(nodeError)) return { available: false, context: null, reason: "event_node_access_filtered" };
    throw nodeError;
  }
  if (!node) return { available: true, context: null };

  const metadata = node.metadata && typeof node.metadata === "object" ? node.metadata : {};
  const postWpId = Number(metadata.post_wp_id);
  const occurredAt = clean(metadata.occurred_at);
  if (!Number.isSafeInteger(postWpId)) {
    return {
      available: true,
      context: { nodeId, occurredAt, post: null, researchRows: [] },
    };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,wp_id,title,date,modified,source")
    .eq("wp_id", postWpId)
    .maybeSingle();
  if (postError) {
    if (isAccessDenied(postError)) {
      return { available: false, context: { nodeId, occurredAt, post: null, researchRows: [] }, reason: "event_post_access_filtered" };
    }
    throw postError;
  }
  if (!post?.id) return { available: true, context: { nodeId, occurredAt, post: null, researchRows: [] } };

  const cap = Math.max(1, Math.min(Math.trunc(Number(researchLimit) || 20), 40));
  const sourcePrefix = `posts:${post.id}`;
  const { data: researchRows, error: researchError } = await supabase
    .from("research_objects")
    .select(RESEARCH_PROMINENCE_FIELDS)
    .like("source_ref", `${sourcePrefix}%`)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (researchError) {
    if (isAccessDenied(researchError)) {
      return {
        available: false,
        context: { nodeId, occurredAt, post, researchRows: [] },
        reason: "event_research_access_filtered",
      };
    }
    throw researchError;
  }

  return {
    available: true,
    context: {
      nodeId,
      occurredAt,
      post,
      researchRows: asArray(researchRows),
    },
  };
}

/**
 * Bounded read adapter for prominence dimensions already live but not carried by the base Hub
 * projection. Access/publication/privacy authority remains the CURRENT SESSION's canonical RLS.
 * This adapter never reconstructs public/private eligibility from privacy_scope and never uses a
 * service-role bypass. Raw reads exist only for dimensions with no shared adapter yet; source
 * identity, truth state and access are preserved rather than inferred.
 */
export async function fetchWorldProminenceInputs(data, { eventResearchLimit = 20 } = {}) {
  if (!data?.identity) {
    return {
      researchSupplements: [],
      crossMethodStrength: null,
      eventContext: null,
      access: {
        boundary: "current_session_rls",
        researchSupplements: true,
        crossMethodStrength: true,
        eventContext: true,
      },
    };
  }

  const [supplements, crossMethod, event] = await Promise.all([
    fetchResearchSupplements(data),
    fetchCrossMethodStrength(data),
    fetchEventContext(data, { researchLimit: eventResearchLimit }),
  ]);

  return {
    researchSupplements: supplements.rows,
    crossMethodStrength: crossMethod.row,
    eventContext: event.context,
    access: {
      boundary: "current_session_rls",
      researchSupplements: supplements.available,
      crossMethodStrength: crossMethod.available,
      eventContext: event.available,
    },
    missing: [supplements.reason, crossMethod.reason, event.reason].filter(Boolean),
  };
}

export default fetchWorldProminenceInputs;

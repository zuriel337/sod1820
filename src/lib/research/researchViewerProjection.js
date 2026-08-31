import { supabase } from "../supabase.js";
import { researchObjectsToUniversalFindings } from "./researchObjectFinding.js";

const DEFAULT_LIMIT = 200;
const FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id";

/**
 * Read-mostly Discovery projection for Research Viewer.
 *
 * This function owns NO truth and NO storage. It only reads durable research_objects
 * and projects them through the canonical researchObject -> Universal Finding adapter.
 * It deliberately does not use calibration source refs, does not promote anything,
 * and does not infer stage/verification/publication state.
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

export default fetchResearchViewerFindings;

// Editorial approval of a reviewed unit's year link, read from the EXISTING research_objects owner.
// An approval is a research_object of kind `relation`, status approved/canonical, that relates to the unit's container
// (`post:5112`, later `video:…`, `gallery_image:…`, a research unit) AND names the unit's layers in its terms. Numeric
// equality is not enough. Publication is the existing rule: only privacy_scope === 'public' is published; a
// `public_candidate` approval is an editorial approval that is NOT yet visible to the public. Private / family rows are
// ignored altogether. Nothing from the row (its text, terms or author) leaves this module: only a state and an id.
import { isPublishedScope } from "./researchViewMode.js";
import { guardKey } from "./topicSourceContext.js";
import { supabase } from "../supabase.js";

export const APPROVAL = Object.freeze({ NONE: "none", APPROVED_UNPUBLISHED: "approved_unpublished", PUBLISHED: "published" });
const APPROVED_STATUS = new Set(["approved", "canonical"]);

export function matchUnitApproval(rows, hint) {
  const containerRef = hint?.unit?.containerRef;
  const terms = (hint?.approvalTerms || []).map(guardKey);
  if (!containerRef || !terms.length) return { state: APPROVAL.NONE, rowId: null };
  let found = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.kind !== "relation" || !APPROVED_STATUS.has(row.status)) continue;
    if (!Array.isArray(row.relates) || !row.relates.includes(containerRef)) continue;
    const have = new Set((Array.isArray(row.terms) ? row.terms : []).map(guardKey));
    if (!terms.every((t) => have.has(t))) continue;
    if (isPublishedScope(row.privacy_scope)) return { state: APPROVAL.PUBLISHED, rowId: String(row.id) };
    if (row.privacy_scope === "public_candidate" && !found) found = { state: APPROVAL.APPROVED_UNPUBLISHED, rowId: String(row.id) };
  }
  return found || { state: APPROVAL.NONE, rowId: null };
}

/** Bounded read through the session's own RLS (admin only sees unpublished candidates); any error fails closed to no approval. */
export async function fetchUnitApprovalRows(containerRef, { client = supabase } = {}) {
  if (!containerRef) return [];
  try {
    const { data, error } = await client.from("research_objects").select("id,kind,status,privacy_scope,relates,terms")
      .contains("relates", [containerRef]).eq("kind", "relation").in("status", [...APPROVED_STATUS])
      .in("privacy_scope", ["public", "public_candidate"]).limit(40);
    return error ? [] : data || [];
  } catch { return []; }
}

export async function resolveUnitApprovals(hints, options) {
  const out = {};
  for (const hint of hints) out[hint.id] = matchUnitApproval(await fetchUnitApprovalRows(hint.unit?.containerRef, options), hint);
  return out;
}

// Editorial approval of a reviewed unit's year link, read from the EXISTING research_objects owner — admin session only.
//
// Live facts (read-only checks 20.10.2026): research_objects has RLS and column-level SELECT only; the sole public policy
// (`ro_dossier_read`) matches no row today; no publication RPC exists live; no public projection of research_objects exists
// (the hardening migration 20260923213000 deliberately fails the public reader closed). So the PUBLIC year marker has no
// authorised publication path yet: `PUBLIC_YEAR_HINT_PROJECTION.available` is false and nothing here can make it true.
//
// An approval covers a UNIT only when the row (a) is an approved/canonical `relation`, (b) relates to the unit's container,
// (c) carries the unit's own `source_ref` (container + locator, e.g. posts:5112#block:plane-787-year-joy) and (d) names
// EVERY layer of the unit in its terms. A broad synthesis of the container (the real db28c232…) satisfies only (a)+(b): it is
// reported as `container_level_only`, never as approval of the unit, and it is never published or copied by this module.
import { isPublishedScope } from "./researchViewMode.js";
import { guardKey } from "./topicSourceContext.js";
import { canonicalResearchSourceRef } from "./sourceBundleProjection.js";
import { supabase } from "../supabase.js";

export const APPROVAL = Object.freeze({ NONE: "none", CONTAINER_LEVEL_ONLY: "container_level_only", APPROVED_UNPUBLISHED: "approved_unpublished", PUBLISHED: "published" });
export const PUBLIC_YEAR_HINT_PROJECTION = Object.freeze({ available: false, owner: null,
  reason: "no authorised public projection of an approval decision exists (research_objects is not publicly readable and has no live publication path)" });
export const CHANNEL = Object.freeze({ RESEARCH_OBJECTS: "research_objects", PUBLIC_PROJECTION: "public_projection", WITNESS_SPEC: "witness_spec" });
const APPROVED_STATUS = new Set(["approved", "canonical"]);
const COLUMNS = "id,kind,status,privacy_scope,relates,terms,source_ref";   // explicit columns: never `*`, never the row text, author or meta

export function matchUnitApproval(rows, hint, { channel = CHANNEL.RESEARCH_OBJECTS } = {}) {
  const containerRef = hint?.unit?.containerRef, unitRef = canonicalResearchSourceRef(hint?.unit?.sourceRef);
  const terms = (hint?.approvalTerms || []).map(guardKey);
  const none = { state: APPROVAL.NONE, rowId: null, channel };
  if (!containerRef || !unitRef || !terms.length) return none;
  let best = none;
  const rank = [APPROVAL.NONE, APPROVAL.CONTAINER_LEVEL_ONLY, APPROVAL.APPROVED_UNPUBLISHED, APPROVAL.PUBLISHED];
  const take = (state, row) => { if (rank.indexOf(state) > rank.indexOf(best.state)) best = { state, rowId: String(row.id), channel }; };
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.kind !== "relation" || !APPROVED_STATUS.has(row.status)) continue;
    if (!Array.isArray(row.relates) || !row.relates.includes(containerRef)) continue;
    const have = new Set((Array.isArray(row.terms) ? row.terms : []).map(guardKey));
    const coversUnit = canonicalResearchSourceRef(row.source_ref) === unitRef && terms.every((t) => have.has(t));
    if (!coversUnit) { take(APPROVAL.CONTAINER_LEVEL_ONLY, row); continue; }
    // `public` scope alone is not a public path: only a public projection channel can publish.
    if (isPublishedScope(row.privacy_scope) && channel === CHANNEL.PUBLIC_PROJECTION && PUBLIC_YEAR_HINT_PROJECTION.available) take(APPROVAL.PUBLISHED, row);
    else if (row.privacy_scope === "public_candidate" || isPublishedScope(row.privacy_scope)) take(APPROVAL.APPROVED_UNPUBLISHED, row);
  }
  return best;
}

/**
 * Decision recorded on the reviewed unit itself (the existing witness spec). It is an approved-UNPUBLISHED decision for the admin
 * preview: its channel is never `public_projection`, so it can not publish anything. It must cover the unit: a stable unit
 * source_ref, a locator id equal to that ref's block, and every layer expression listed among the approval terms.
 */
export function witnessSpecApproval(hint) {
  const none = { state: APPROVAL.NONE, rowId: null, channel: CHANNEL.WITNESS_SPEC };
  const review = hint?.review, ref = canonicalResearchSourceRef(hint?.unit?.sourceRef);
  if (review?.status !== "reviewed_in_witness_spec" || review.publication !== "blocked" || !ref || !hint.unit.containerRef) return none;
  if (!ref.endsWith(`#block:${hint.unit.locatorId}`)) return none;
  const terms = new Set((hint.approvalTerms || []).map(guardKey));
  const layers = hint.layers || [];
  if (!layers.length || !layers.every((l) => terms.has(guardKey(l.expression)))) return none;
  return { state: APPROVAL.APPROVED_UNPUBLISHED, rowId: null, channel: CHANNEL.WITNESS_SPEC, decidedBy: review.decidedBy };
}

/** The strongest unit-level answer across the database owner and the reviewed witness spec; neither can publish. */
export function resolveHintApproval(rows, hint) {
  const db = matchUnitApproval(rows, hint), spec = witnessSpecApproval(hint);
  const rank = [APPROVAL.NONE, APPROVAL.CONTAINER_LEVEL_ONLY, APPROVAL.APPROVED_UNPUBLISHED, APPROVAL.PUBLISHED];
  return rank.indexOf(spec.state) > rank.indexOf(db.state) ? spec : db;
}

/** Admin session only. Public and signed-in users never query research_objects for this; any error fails closed to no rows. */
export async function fetchUnitApprovalRows(containerRef, { audience = "public", client = supabase } = {}) {
  if (audience !== "admin" || !containerRef) return [];
  try {
    const { data, error } = await client.from("research_objects").select(COLUMNS)
      .contains("relates", [containerRef]).eq("kind", "relation").in("status", [...APPROVED_STATUS]).limit(60);
    return error ? [] : data || [];
  } catch { return []; }
}

export async function resolveUnitApprovals(hints, options = {}) {
  const out = {};
  for (const hint of hints) out[hint.id] = resolveHintApproval(await fetchUnitApprovalRows(hint.unit?.containerRef, options), hint);
  return out;
}

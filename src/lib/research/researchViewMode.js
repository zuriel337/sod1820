// Shared admin/public view-mode + publication helper (RESEARCH_2029_ADMIN_PUBLIC_CONTROL_V1).
// ONE semantic owner for World 2029 and the Golden Projector: both import the SAME mode resolution,
// storage key, public reader and publication action. Presentation only — access is decided by RLS.
//
//   PUBLIC != CANONICAL      : privacy_scope='public' says who may READ a row. It says nothing about
//                              governance status, verification or canonicality.
//   PUBLICATION != GOVERNANCE: the publication RPC is separate from admin_research_review and never
//                              changes status / verification / graph / source / contributor identity.
//   public_candidate is NOT published; only the exact value 'public' is.

import { createClient } from "@supabase/supabase-js";
import { supabase, SUPABASE_URL, SUPABASE_ANON } from "../supabase.js";

export const PROJECTOR_MODE = Object.freeze({ ADMIN_ALL: "admin_all", PUBLIC_VIEW: "public_view" });
export const PUBLIC_SCOPE = "public";
export const PUBLICATION_RPC = "admin_research_set_publication_v1";
export const VIEW_MODE_STORAGE_KEY = "sod29.goldenProjector.mode";

/** Admin is the default for an authorized admin; anything else is PUBLIC_VIEW (fail closed). */
export function resolveProjectorMode({ isAdmin = false, requested = null } = {}) {
  if (!isAdmin) return PROJECTOR_MODE.PUBLIC_VIEW;
  return requested === PROJECTOR_MODE.PUBLIC_VIEW ? PROJECTOR_MODE.PUBLIC_VIEW : PROJECTOR_MODE.ADMIN_ALL;
}

export function readStoredViewMode() {
  try { return window.sessionStorage.getItem(VIEW_MODE_STORAGE_KEY); } catch { return null; }
}
export function storeViewMode(mode) {
  try { window.sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, mode); } catch { /* per-viewer convenience only */ }
}

/** Published means exactly privacy_scope === 'public'. public_candidate / family_shared / private are not. */
export function isPublishedScope(scope) {
  return String(scope ?? "").trim().toLowerCase() === PUBLIC_SCOPE;
}

/** person_only rows can never be published (the RPC fails closed too). */
export function isPersonOnly(row) {
  return String(row?.meta?.ext?.personal_scope?.scope ?? "") === "person_only";
}

/**
 * The single compact publication control state for a research-object row.
 * public => "החזר לפרטי"; anything else => "פרסם לציבור". Governance / verification are never inputs.
 */
export function publicationControlFor(row) {
  const published = isPublishedScope(row?.privacy_scope ?? row?.access?.tier);
  const blocked = !published && isPersonOnly(row);
  return {
    published,
    publish: !published,
    label: published ? "החזר לפרטי" : "פרסם לציבור",
    disabled: blocked,
    reason: blocked ? "מחקר אישי בלבד — לא ניתן לפרסם" : null,
  };
}

/** Anonymous reader: exactly what a public visitor's RLS allows, even when an admin is signed in. */
let publicClient = null;
export function getPublicResearchClient() {
  if (!publicClient) {
    publicClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return publicClient;
}

/**
 * Which client reads research for a mode. ADMIN_ALL uses the viewer's session (RLS: ro_admin_read).
 * PUBLIC_VIEW always uses the anonymous client, so no admin/private payload can be fetched.
 */
export function researchReaderForMode(mode, { sessionClient = supabase, anonClient = getPublicResearchClient } = {}) {
  return mode === PROJECTOR_MODE.ADMIN_ALL ? sessionClient : anonClient();
}

/** Human-Gate publish/unpublish. Server enforces admin-only, person_only and access-axis-only change. */
export async function setResearchObjectPublication(id, publish, { note = null, client = supabase } = {}) {
  const { data, error } = await client.rpc(PUBLICATION_RPC, { p_id: id, p_publish: publish === true, p_note: note });
  if (error) return { ok: false, error: error.message || "publication_failed" };
  return data && typeof data === "object" ? data : { ok: false, error: "publication_failed" };
}

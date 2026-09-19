// 2029 analytics projection — consumer only.
// Canonical owners remain traffic_intelligence_law + identity/person foundation.
// This does not create a second collector/store and does not change Legacy analytics.
import { supabase } from "./supabase.js";

export const AUDIENCE_KIND_2029 = Object.freeze({
  INTERNAL_ADMIN: "internal_admin",
  KNOWN_USER: "known_user",
  ANONYMOUS: "anonymous",
});

export async function get2029Analytics({ hours = 24, pathPrefix = null } = {}) {
  if (!supabase) return null;
  const safeHours = Math.max(1, Math.min(Number(hours) || 24, 24 * 90));
  const { data, error } = await supabase.rpc("admin_2029_analytics", {
    p_hours: safeHours,
    p_path_prefix: pathPrefix || null,
  });
  if (error) throw error;
  return data || null;
}

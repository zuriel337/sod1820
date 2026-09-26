import { supabase } from "./supabase.js";

// World/System Frame contract: pass semantic subject identity, never a localized label URL.
// This module is only a client adapter to the existing DB resolver/watch engine.
export async function getFollowSubjectState({ entityType, stableId, visitorId = null } = {}) {
  if (!supabase) return { following: false, topic: null };
  if (!entityType || stableId === undefined || stableId === null || String(stableId).trim() === "") {
    throw new Error("follow subject requires entityType + stableId");
  }
  const { data, error } = await supabase.rpc("follow_subject_state", {
    p_entity_type: String(entityType),
    p_stable_id: String(stableId),
    p_visitor: visitorId || null,
  });
  if (error) throw error;
  return data || { following: false, topic: null };
}

export async function toggleFollowSubject({ entityType, stableId, source = "unknown", on = true, visitorId = null } = {}) {
  if (!supabase) throw new Error("Supabase unavailable");
  if (!entityType || stableId === undefined || stableId === null || String(stableId).trim() === "") {
    throw new Error("follow subject requires entityType + stableId");
  }
  const { data, error } = await supabase.rpc("follow_subject_toggle", {
    p_entity_type: String(entityType),
    p_stable_id: String(stableId),
    p_source: source,
    p_on: !!on,
    p_visitor: visitorId || null,
  });
  if (error) throw error;
  return data;
}

// G3 Community Core 2029 Phase 2 — client-side read wrappers for the hidden runtime RPCs
// defined in supabase/migrations/20260923200000_g3_community_core_2029_phase2_shadow.sql.
// Read-only. These RPCs do not exist live yet (branch-only migration, not applied) — every
// call here is expected to fail with a "function does not exist" PostgREST error until a
// future Phase 3 session applies that migration live; callers must treat that failure as
// "not live yet", not as a bug, and degrade gracefully (see CommunityShadowPreview2029Page).
import { supabase } from '../supabase.js';

export async function fetchCommunityStream({ rootTargetType = null, rootTargetId = null, since = null, limit = 50 } = {}) {
  const { data, error } = await supabase.rpc('community_stream_projection', {
    p_root_target_type: rootTargetType,
    p_root_target_id: rootTargetId,
    p_since: since,
    p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function searchCommunityFacts(query, limit = 5) {
  const { data, error } = await supabase.rpc('community_search_facts', { p_query: query, p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function fetchRazielCommunityIntel({ rootTargetType = null, rootTargetId = null, since = null, limit = 8 } = {}) {
  const { data, error } = await supabase.rpc('fn_raziel_community_intel_scoped', {
    p_root_target_type: rootTargetType,
    p_root_target_id: rootTargetId,
    p_since: since,
    p_limit: limit,
  });
  if (error) throw error;
  return data || null;
}

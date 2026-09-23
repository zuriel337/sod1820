-- ============================================================================
-- Public candidate relation reader — privacy hardening v1
-- (task_key=PUBLIC_CANDIDATE_RELATION_READER_PRIVACY_HARDENING_V1)
--
-- Live drift found: fn_relation_independent_evidence (SECURITY DEFINER,
-- introduced 25.8.2026 in 20260825_relation_engine_anon_access_fix.sql) reads
-- research_objects rows with privacy_scope='public_candidate' and returns
-- ro.statement verbatim to any anon/authenticated caller reachable through
-- fn_relation_candidate. privacy_scope='public_candidate' is a research
-- classification (R1 privacy layer, Change Log #23) that only says a row is
-- NOT owner-scoped private research — it is not a publication/canonicalization
-- flag. research_objects carries no published/public projection (no
-- research_objects_public table, no 'published' status value; status is one
-- of candidate/approved/canonical, all pre-publication review states). Per
-- person_foundation_contract_law / zuriel_surname_privacy_law /
-- graph_privacy_foundation_law / truth_axes_foundation_law, only ZURIEL's
-- Human Gate canonicalizes and publishes — so absent a live, provable
-- publication owner for research_objects, the public reader must fail closed.
--
-- Fix (smallest EXTEND_EXISTING change, no new flag/table/registry/reader):
--   1. fn_relation_independent_evidence no longer queries research_objects at
--      all; it always returns research_objects: [] (the key/shape callers
--      depend on is unchanged, only the content is removed).
--   2. SECURITY DEFINER is dropped — the function reverts to its original
--      SECURITY INVOKER default.
--   3. topic_cards evidence is now read through the existing anon-readable
--      topic_cards_public view (already live, already scoped to
--      status='approved' and not _do_not_publish) instead of the base
--      topic_cards table. anon has no SELECT grant on topic_cards itself
--      (only ai_reader/authenticated/service_role do) — reading it directly
--      once SECURITY DEFINER is dropped would break the public reader for
--      anon callers. topic_cards_public is the existing sanctioned public
--      projection; no new view/grant is created.
--
-- Untouched: fn_relation_candidate, fn_relation_dependency_groups,
-- fn_relation_noise_flags, fn_relation_composite_evidence, research_objects
-- schema/grants, gematria methods/formulas, ranking, Heichal UI/hooks,
-- publication/canonicalization paths. Internal/server research over
-- research_objects (RLS-governed, service-role/owner paths) is unaffected —
-- only this one public/anon-reachable read path is hardened.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_relation_independent_evidence(p_a text, p_b text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  na uuid; nb uuid;
  edge_rows jsonb; tc_rows jsonb;
BEGIN
  SELECT node_id INTO na FROM gematria_words WHERE phrase = p_a AND node_id IS NOT NULL LIMIT 1;
  SELECT node_id INTO nb FROM gematria_words WHERE phrase = p_b AND node_id IS NOT NULL LIMIT 1;

  SELECT coalesce(jsonb_agg(jsonb_build_object('relation_type', e.relation_type, 'weight', e.weight)), '[]'::jsonb)
  INTO edge_rows
  FROM edges e
  WHERE na IS NOT NULL AND nb IS NOT NULL
    AND ((e.from_node = na AND e.to_node = nb) OR (e.from_node = nb AND e.to_node = na));

  SELECT coalesce(jsonb_agg(jsonb_build_object('slug', tc.slug, 'title', tc.title, 'quality', tc.quality, 'status', tc.status)), '[]'::jsonb)
  INTO tc_rows
  FROM topic_cards_public tc
  WHERE (tc.title ILIKE '%' || p_a || '%' OR tc.subtitle ILIKE '%' || p_a || '%' OR p_a = ANY(tc.search_terms))
    AND (tc.title ILIKE '%' || p_b || '%' OR tc.subtitle ILIKE '%' || p_b || '%' OR p_b = ANY(tc.search_terms));

  -- research_objects is never read here: privacy_scope='public_candidate' is a
  -- research classification, not a publication/access authorization. No live
  -- published/public projection owner exists for research_objects, so this
  -- public/anon-reachable reader fails closed and always returns [].
  RETURN jsonb_build_object('edges', edge_rows, 'topic_cards', tc_rows, 'research_objects', '[]'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.fn_relation_independent_evidence(text, text) IS
  'Relation Engine v1 — independent evidence (edges/topic_cards_public), read-only, SECURITY INVOKER. research_objects is never surfaced here (hardened 23.9.2026, PUBLIC_CANDIDATE_RELATION_READER_PRIVACY_HARDENING_V1): privacy_scope=''public_candidate'' is a research classification, not publication authorization, and research_objects has no live published/public projection to read from instead. The key is kept in the return shape as an always-empty array for caller compatibility (fn_relation_candidate). topic_cards evidence is read through the existing anon-readable topic_cards_public view (not the base table, which anon cannot select). Internal/server research over research_objects continues through existing RLS-governed/service-role paths, untouched by this function.';

-- ============================================================================
-- Self-check (read-only, run manually after apply):
--   select prosecdef from pg_proc where proname = 'fn_relation_independent_evidence';           -- must be false
--   set role anon; select fn_relation_candidate('ירושלים','שומרים'); reset role;                  -- must NOT error
--   set role anon; select fn_relation_independent_evidence('ירושלים','שומרים'); reset role;        -- must NOT error (topic_cards_public is anon-readable)
--   select fn_relation_independent_evidence('ירושלים','שומרים') -> 'research_objects';            -- must be []
--   select ro.privacy_scope, count(*) from research_objects ro group by 1;                        -- unchanged row counts
-- ============================================================================

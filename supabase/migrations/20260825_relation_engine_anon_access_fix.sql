-- ============================================================================
-- Relation Engine v1 — anon/client access fix (Number Page Integration v1).
-- Discovered while wiring fn_relation_candidate into the live Number Page:
-- fn_relation_independent_evidence queries research_objects unconditionally
-- (no privacy_scope filter) and, like every Relation Engine v1 function, is
-- SECURITY INVOKER (default) — so it runs with the CALLING role's privileges.
-- anon/authenticated have (correctly, by design — R1 privacy layer, Change
-- Log #23) no SELECT grant on research_objects (68 'private' rows / 119
-- 'public_candidate' rows) -> every anon call to fn_relation_candidate fails
-- with "permission denied for table research_objects" (42501).
--
-- Fix: (1) filter the research_objects branch to privacy_scope='public_candidate'
-- only — private rows must never surface through this read-only candidate
-- layer; (2) make ONLY this one function SECURITY DEFINER (locked search_path)
-- so it can read across the public_candidate subset regardless of caller.
-- fn_relation_candidate/fn_relation_dependency_groups/fn_relation_noise_flags/
-- fn_relation_composite_evidence are untouched — they only touch tables anon
-- already has SELECT on (bidim/gematria_methods/gematria_words/edges/topic_cards).
-- Still 0 writes to edges/nodes, status always 'candidate' — unchanged.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_relation_independent_evidence(p_a text, p_b text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  na uuid; nb uuid;
  edge_rows jsonb; tc_rows jsonb; ro_rows jsonb;
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
  FROM topic_cards tc
  WHERE (tc.title ILIKE '%' || p_a || '%' OR tc.subtitle ILIKE '%' || p_a || '%' OR p_a = ANY(tc.search_terms))
    AND (tc.title ILIKE '%' || p_b || '%' OR tc.subtitle ILIKE '%' || p_b || '%' OR p_b = ANY(tc.search_terms));

  -- privacy_scope='public_candidate' only (R1 privacy layer, Change Log #23) — 'private' rows
  -- (owner-scoped Family/Life/Hints research) must never surface through this public read path.
  SELECT coalesce(jsonb_agg(jsonb_build_object('kind', ro.kind, 'statement', ro.statement, 'status', ro.status, 'confidence', ro.confidence)), '[]'::jsonb)
  INTO ro_rows
  FROM research_objects ro
  WHERE ro.privacy_scope = 'public_candidate'
    AND ((p_a = ANY(ro.terms) AND p_b = ANY(ro.terms))
     OR (ro.statement ILIKE '%' || p_a || '%' AND ro.statement ILIKE '%' || p_b || '%'));

  RETURN jsonb_build_object('edges', edge_rows, 'topic_cards', tc_rows, 'research_objects', ro_rows);
END;
$function$;

COMMENT ON FUNCTION public.fn_relation_independent_evidence(text, text) IS
  'Relation Engine v1 — independent evidence (edges/topic_cards/research_objects), read-only. SECURITY DEFINER (fixed 25.8.2026, Number Page Integration v1) so anon/authenticated callers of fn_relation_candidate do not hit a permission error on research_objects — the research_objects branch is filtered to privacy_scope=''public_candidate'' only; private/owner-scoped rows (R1 privacy layer) are never exposed here.';

-- ============================================================================
-- Self-check (read-only, run manually after apply):
--   set role anon; select fn_relation_candidate('ירושלים','שומרים'); reset role;  -- must NOT error
--   select ro.privacy_scope, count(*) from research_objects ro group by 1;        -- unchanged: private=68, public_candidate=119
-- ============================================================================

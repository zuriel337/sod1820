-- PHASE 2 · F1 · superseded in the same session by 20260910100331 (adds engine_verified to the manifest).
-- Kept for provenance: first application of registry-active membership + canonical dispatch + manifest.
-- See 20260910100331 for the live body of fn_all_methods_full.
-- fn_method_profile (live body, unchanged since this migration):
CREATE OR REPLACE FUNCTION public.fn_method_profile(p_phrase text, p_depth text DEFAULT 'value'::text)
 RETURNS TABLE(method_key text, display_label text, category text, mathematical_family text, lifecycle_active boolean, required_entitlement text, atomic_or_composite text, computed_value bigint, definition_version integer)
 LANGUAGE plpgsql STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT gm.method_key, gm.display_label, gm.category, gm.mathematical_family,
         gm.active, gm.required_entitlement,
         CASE WHEN gm.category = 'composite' THEN 'composite' ELSE 'atomic' END,
         CASE WHEN p_depth = 'value' AND gm.active
                   AND gm.execution_kind IN ('sql_function','composite_engine')
              THEN public.fn_method_value(gm.method_key, p_phrase) ELSE NULL END,
         gm.version
  FROM public.gematria_methods gm
  WHERE gm.active = true
  ORDER BY gm.sort_order;
END;
$function$;

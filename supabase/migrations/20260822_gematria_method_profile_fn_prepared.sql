-- ============================================================================
-- GEMATRIA_METHODS_UNIFICATION — prepared, additive-only, NOT applied this pass
-- ============================================================================
-- Status: PREPARED ON BRANCH ONLY (see companion file's header for the safety rationale —
-- identical here). This file adds ONE new function. It does not replace, wrap, or change
-- the behavior of public.fn_all_methods_full in any way — that function is untouched and
-- keeps serving its existing callers exactly as before.
--
-- Purpose (task section 11 — "Method Profile for Research DNA"): a single RPC that a number
-- page / Cross Engine / Raziel can call to get, per method, not just the computed value but
-- its full state: method_key, display_label, category, lifecycle state, computed value (only
-- if the caller's entitlement allows dispatch — same rank logic as fn_all_methods_full),
-- verification source, whether the registry claims it is stored physically vs. derived on
-- demand, access tier, atomic-vs-composite, and provenance (which SQL function produced it).
--
-- Composites (section 8) are NOT included here — they live client-side only in
-- src/lib/research/compositeMethods.js this pass (never wired into any page). A server-side
-- composite profile is a follow-up, not built in this pass (see PLAN.md §7).
--
-- ⚠️ Known, deliberately-surfaced limitation (do not silently "fix" this by guessing):
-- `stored` below reflects what public.gematria_methods.db_column CLAIMS, not live proof that
-- gw_enforce_engine actually populates that column for every approved word — this pass found
-- a real drift between the two (4 methods are actually computed+stored via the hardcoded
-- gw_enforce_engine/bidim_sync trigger today even though gematria_methods.active=false for
-- them: הכפלה, מילוי דמילוי, הכפלה גדולה, ריבוע גדול — see LIVE_STATUS.csv DRIFT column and
-- PLAN.md §5). This function surfaces the registry's claim honestly, labeled as a claim, so a
-- future caller does not mistake it for verified ground truth.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_method_profile(p_subject text, p_entitlement text DEFAULT 'public'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_res numeric;
  v_has_result boolean;
  out_arr jsonb := '[]'::jsonb;
  urank int := CASE lower(coalesce(p_entitlement, 'public'))
                 WHEN 'admin' THEN 3 WHEN 'premium' THEN 2 WHEN 'subscriber' THEN 1 ELSE 0 END;
  mrank int;
  v_state text;
  v_can_dispatch boolean;
BEGIN
  FOR r IN
    SELECT method_key, display_label, category, db_column, in_engine, function, active,
           deterministic, source_of_truth, required_entitlement, version
    FROM public.gematria_methods
    ORDER BY sort_order
  LOOP
    mrank := CASE lower(coalesce(r.required_entitlement, 'public'))
               WHEN 'admin' THEN 3 WHEN 'premium' THEN 2 WHEN 'subscriber' THEN 1 ELSE 0 END;
    v_can_dispatch := r.active AND r.function IS NOT NULL AND r.function ~ '^[a-z_][a-z0-9_]*$';

    v_state := CASE
      WHEN r.active AND r.function IS NOT NULL THEN 'dispatchable'
      WHEN r.function IS NOT NULL THEN 'built_not_registered'  -- SQL fn exists, registry not wired to it
      ELSE 'candidate'
    END;

    v_res := NULL; v_has_result := false;
    IF v_can_dispatch AND mrank >= (
      CASE lower(coalesce(r.required_entitlement, 'public'))
        WHEN 'admin' THEN 3 WHEN 'premium' THEN 2 WHEN 'subscriber' THEN 1 ELSE 0 END
    ) AND urank >= mrank THEN
      BEGIN
        EXECUTE format('select %I($1)', r.function) INTO v_res USING p_subject;
        v_has_result := true;
      EXCEPTION WHEN others THEN
        v_has_result := false;
      END;
    END IF;

    out_arr := out_arr || jsonb_build_object(
      'method_key', r.method_key,
      'display_label', r.display_label,
      'category', r.category,
      'atomic_or_composite', 'atomic',
      'state', v_state,
      'computed_value', CASE WHEN v_has_result THEN to_jsonb(v_res) ELSE NULL END,
      'entitlement_gated', v_can_dispatch AND NOT v_has_result AND mrank > urank,
      'verification_source', r.source_of_truth,
      'stored_column_claim', r.db_column,           -- registry's claim, NOT independently re-verified here
      'derived_on_demand', r.db_column IS NULL,
      'access_tier', coalesce(r.required_entitlement, 'public'),
      'deterministic', r.deterministic,
      'provenance', jsonb_build_object('function', r.function, 'version', r.version, 'in_engine_flag', r.in_engine)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'subject', p_subject,
    'entitlement', lower(coalesce(p_entitlement, 'public')),
    'source', 'registry-driven (gematria_methods) — fn_method_profile, additive alongside fn_all_methods_full',
    'methods', out_arr
  );
END;
$function$;

COMMENT ON FUNCTION public.fn_method_profile(text, text) IS
  'Section 11 Method Profile — additive, NOT called by any existing page/RPC yet. Read-only, registry-driven. Does not replace fn_all_methods_full.';

-- ============================================================================
-- Self-check (run manually, read-only, after applying):
--   select jsonb_pretty(fn_method_profile('רגיל', 'public'));
-- Expect the 13 currently-dispatchable methods (state='dispatchable') to carry a
-- computed_value, and the rest to show state='built_not_registered' or 'candidate' with
-- computed_value=null — matching LIVE_STATUS.csv exactly.
-- ============================================================================

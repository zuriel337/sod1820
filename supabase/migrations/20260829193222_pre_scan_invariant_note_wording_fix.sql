-- PASS 2 of "Pre-Scan Closure Pass — Invariant Fix + Governed Re-Certification".
-- Changes ONLY the pre_scan_invariant_note literal string inside fn_method_scan_report().
-- Every other field/line of the function is byte-identical to the live definition.
--
-- Why: the old wording said a Full Canonical Method Scan may only run when bidim
-- holds rows ONLY for currently-scannable methods — i.e. it read as requiring
-- deletion/removal of legacy rows for non-scannable methods. That contradicts the
-- ratified engine_governance_registry_authority_law (HG-E1/E2/E3, 2026-08-29),
-- which requires legacy/non-scannable bidim rows to be PRESERVED, never deleted.
-- The new wording distinguishes governed coverage (must exactly match the current
-- scannable universe) from legacy preservation (allowed to remain, but must not be
-- counted as governed scan coverage or canonical evidence).

CREATE OR REPLACE FUNCTION public.fn_method_scan_report()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'generated_at',            now(),
    'corpus_size_verified',    (select count(*) from public.gematria_words where is_verified),
    'n_registered',            (select count(*) from public.v_method_states),
    'n_active',                (select count(*) from public.v_method_states where active),
    'n_in_engine_declared',    (select count(*) from public.v_method_states where in_engine_declared),
    'n_in_engine_drift',       (select count(*) from public.v_method_states where in_engine_drift),
    'n_executable',            (select count(*) from public.v_method_states where executable),
    'n_engine_verified',       (select count(*) from public.v_method_states where engine_verified),
    'n_scannable',             (select count(*) from public.v_method_states where scannable),
    'n_scannable_base',        (select count(*) from public.v_method_states where scannable and category = 'base'),
    'n_scannable_depth',       (select count(*) from public.v_method_states where scannable and category = 'depth'),
    'n_scannable_composite',   (select count(*) from public.v_method_states where scannable and category = 'composite'),
    'n_registered_composites', (select count(*) from public.v_method_states where category = 'composite'),
    'n_active_composites',     (select count(*) from public.v_method_states where category = 'composite' and active),
    'scannable_methods',       (select coalesce(jsonb_agg(method_key order by sort_order), '[]'::jsonb)
                                  from public.v_method_states where scannable),
    'excluded_with_reason',    (select coalesce(jsonb_agg(jsonb_build_object(
                                      'method_key', method_key, 'category', category,
                                      'reason', not_scannable_reason) order by sort_order), '[]'::jsonb)
                                  from public.v_method_states where not scannable),
    'bidim_coverage',          (select coalesce(jsonb_agg(jsonb_build_object(
                                      'method', method, 'rows', n,
                                      'governed', governed_n, 'legacy_unknown', legacy_n,
                                      'currently_scannable', public.fn_method_is_scannable(method)) order by method), '[]'::jsonb)
                                  from (select method, count(*) n,
                                               count(*) filter (where provenance_state = 'governed') governed_n,
                                               count(*) filter (where provenance_state = 'legacy_unknown') legacy_n
                                        from public.bidim group by method) c),
    'pre_scan_invariant_note', 'A Full Canonical Method Scan may run only when governed/current coverage contains exactly the currently-scannable methods, at the current verified corpus size and current method versions. Legacy/non-scannable rows may remain preserved in bidim but must not count as governed scan coverage or canonical evidence.'
  );
$function$;

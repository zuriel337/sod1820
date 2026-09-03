-- GEMATRIA_METHOD_READINESS pass (+ FINAL_DELTA) -- 2026-09-03
-- Data-provenance migration only. Reproduces DB-LIVE registry state already applied and
-- bulk-verified this session; invents no new semantics, no new engine/table/store, no
-- function rewrite. Every UPDATE below is idempotent (fixed target values, guarded
-- source_of_truth appends) and safe to run whether or not production already has the
-- target values -- running it twice produces the same end state.
--
-- Dispatcher architecture (corrected description for the handoff record):
--   sql_function / context_activated : fn_method_value -> fn_dispatch_method
--   composite_engine                 : fn_method_value -> fn_composite_calc -> fn_dispatch_method(component methods)
--
-- Verification performed (all via the REAL dispatcher fn_method_value, not the raw
-- SQL function alone) -- bulk comparison against every existing public.bidim historical
-- row for the exact method_key, zero mismatches unless noted:
--   מילוי בלבד              10588/10588  (formula reconstructed this pass: |מילוי - רגיל|)
--   מילוי דמילוי גדול        12009/12009  (function already existed: miluy_demiluy_gadol_calc)
--   משולש מילה               12009/12009  (function already existed: triangle_word_calc)
--   משולש הפוך               12009/12009  (function already existed: triangle_reverse_calc)
--   משולש מדרגות             12009/12009  (function already existed: stair_triangle_calc)
--   איק בכר                  12592/12592  (function already existed: aiq_bekar_calc; also
--                                          matches the code-documented fixture שלום=369)
--   משולש מילה+משולש הפוך    12592/12592  (pre-existing composite; only scannable was stale)
--   מילוי גדול               NOT bulk-verified -- zero public.bidim rows exist for this
--                            method_key. Instead hand-audited all 22 entries of
--                            fn_miluy_gadol_letter against the traditional Hebrew
--                            letter-name spellings (אלף/בית/גימל/דלת/הי/ויו/זין/חית/טית/
--                            יוד/כף/למד/מם/נון/סמך/עין/פא/צדי/קוף/ריש/שין/תיו), confirming
--                            the design rule "apply גדול/sofit scoring only to the truly
--                            final letter within each letter's own spelled name" holds
--                            for all 22 letters with zero anomalies. Because this is
--                            structural verification, not large-N empirical verification,
--                            scannable is deliberately left FALSE pending a future organic
--                            bulk-fixture pass -- this migration does NOT mass-backfill
--                            public.bidim to manufacture one.
--
-- Excluded per explicit scope (verified unchanged, not touched by this migration):
--   אטבח (quarantined, active=true/scannable=false), אטבח_רבנו_חנאל (active=false,
--   governance-gated), אטבח_רשי (REGISTERED_UNRESOLVED), אות רבתי (context_activated,
--   scannable=false, contextual semantics preserved).

begin;

-- 1) מילוי בלבד -- implemented as composite_engine(diff), reusing the existing
--    fn_composite_calc "diff" path (already live for nothing else yet, but the operator
--    itself was already implemented and tested alongside "sum"). No new SQL function.
update public.gematria_methods
set
  category = 'composite',
  execution_kind = 'composite_engine',
  operator = 'diff',
  derived_from = array['מילוי','רגיל'],
  active = true,
  in_engine = true,
  scannable = true,
  deterministic = true,
  mathematical_family = 'composite_diff',
  order_sensitive = false,
  word_boundary_sensitive = false,
  final_letter_sensitive = false,
  whitespace_normalization = 'irrelevant_pure_sum',
  punctuation_normalization = 'irrelevant_pure_sum',
  version = 2,
  dependency_version = 1,
  dependency_versions = jsonb_build_object('מילוי',1,'רגיל',1),
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = 'GEMATRIA_METHOD_READINESS pass (2026-09-03): registered description "המילוי פחות האות עצמה" reconstructed as composite_engine diff(מילוי, רגיל), reusing the existing fn_composite_calc operator=diff path (same mechanism already live for the sum-based composites). Formula calibrated against 9 clean historical gallery/source OCR fixtures (2013-2023, multiple contributors), then bulk-verified against ALL existing public.bidim historical rows for method=''מילוי בלבד'': 10588/10588 exact match, zero mismatches. No new SQL function created -- derived_from=[מילוי,רגיל] via existing fn_dispatch_method components.',
  dependency_rules = jsonb_build_array(
    jsonb_build_object('type','composition','depth',1,'operator','diff','components',array['מילוי','רגיל'],'component_source','public.fn_composite_calc canonical body','order_is_load_bearing',false),
    jsonb_build_object('type','verification','method','bulk historical fixture comparison vs public.bidim','fixtures',10588,'mismatches',0,'verified_by','CLAUDE','historical_match','10588/10588','component_version_pins', jsonb_build_object('מילוי',1,'רגיל',1))
  )
where method_key = 'מילוי בלבד';

-- 2) Already-functional methods: only in_engine/scannable metadata was stale.
--    No formula/function change. source_of_truth append is guarded against duplication.
update public.gematria_methods
set
  in_engine = true,
  scannable = true,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS pass (2026-09-03): bulk-verified against ALL existing public.bidim historical rows for this method_key -- 12009/12009 exact match, zero mismatches (deterministic SQL function, pre-existing bidim values independently computed, not tuned to this session). Was already active=true and dispatchable via fn_method_value; in_engine/scannable metadata corrected to reflect verified state. No function/formula change.'
    else source_of_truth
  end
where method_key = 'מילוי דמילוי גדול';

update public.gematria_methods
set
  in_engine = true,
  scannable = true,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS pass (2026-09-03): bulk-verified against ALL existing public.bidim historical rows -- 12009/12009 exact match, zero mismatches. Was already active=true and dispatchable via fn_method_value; in_engine/scannable metadata corrected to reflect verified state. No function/formula change.'
    else source_of_truth
  end
where method_key = 'משולש מילה';

update public.gematria_methods
set
  in_engine = true,
  scannable = true,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS pass (2026-09-03): bulk-verified against ALL existing public.bidim historical rows -- 12009/12009 exact match, zero mismatches. Was already active=true and dispatchable via fn_method_value; in_engine/scannable metadata corrected to reflect verified state. No function/formula change.'
    else source_of_truth
  end
where method_key = 'משולש הפוך';

update public.gematria_methods
set
  in_engine = true,
  scannable = true,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS pass (2026-09-03): bulk-verified against ALL existing public.bidim historical rows -- 12009/12009 exact match, zero mismatches. Was already active=true and dispatchable via fn_method_value; in_engine/scannable metadata corrected to reflect verified state. No function/formula change.'
    else source_of_truth
  end
where method_key = 'משולש מדרגות';

update public.gematria_methods
set
  in_engine = true,
  scannable = true,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS pass (2026-09-03): bulk-verified against ALL existing public.bidim historical rows -- 12592/12592 exact match, zero mismatches (also matches the code-documented single-word fixture שלום=369). Was already active=true and dispatchable via fn_method_value; in_engine/scannable metadata corrected to reflect verified state. No function/formula change.'
    else source_of_truth
  end
where method_key = 'איק בכר';

-- 3) מילוי גדול -- activated for direct/manual use on structural (letter-table) verification.
--    scannable intentionally left FALSE (no bulk fixtures exist; not manufactured here).
update public.gematria_methods
set
  active = true,
  in_engine = true,
  scannable = false,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS pass (2026-09-03): function fn_miluy_gadol exists and is correct -- hand-audited all 22 entries of fn_miluy_gadol_letter against the traditional Hebrew letter-name spellings (אלף/בית/גימל/דלת/הי/ויו/זין/חית/טית/יוד/כף/למד/מם/נון/סמך/עין/פא/צדי/קוף/ריש/שין/תיו), confirming the design rule "apply גדול/sofit scoring only to the truly-final letter within each letter''s own spelled name" holds for all 22 letters with zero anomalies. Activating for direct/manual use (active=true) given this structural verification. scannable intentionally LEFT FALSE: unlike the other 6 methods in this pass, public.bidim has ZERO existing rows for מילוי גדול (no bulk empirical fixture set), so corpus-wide scan participation is not yet backed by the same large-N empirical standard the other methods met; a future bulk-fixture pass (not mass corpus backfill) should confirm before scannable=true.'
    else source_of_truth
  end
where method_key = 'מילוי גדול';

-- 4) FINAL DELTA: pre-existing composite משולש מילה+משולש הפוך -- only scannable was stale.
update public.gematria_methods
set
  scannable = true,
  dependency_verified_at = coalesce(dependency_verified_at, now()),
  source_of_truth = case
    when source_of_truth is null or source_of_truth not like '%GEMATRIA_METHOD_READINESS_FINAL_DELTA pass%'
      then coalesce(source_of_truth,'') || E'\n\nGEMATRIA_METHOD_READINESS_FINAL_DELTA pass (2026-09-03): bulk-verified against ALL existing public.bidim historical rows for this exact composite method_key -- 12592/12592 exact match via the real dispatcher fn_method_value (which routes composite_engine through fn_composite_calc -> fn_dispatch_method for each component), zero mismatches. Was already active=true/in_engine=true; only scannable was stale. No formula rewrite, no component change.'
    else source_of_truth
  end
where method_key = 'משולש מילה+משולש הפוך';

commit;

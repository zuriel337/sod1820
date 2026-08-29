-- COMPOSITE ACTIVATION — step 1/2: ZURIEL Human-Gate activation of composites #1-#3 ONLY
-- Approval: ZURIEL Human Gate. Plan: work_log a0ce889b-3aba-4f79-9395-0b0296d0aae8 §I.
-- BEFORE row: work_log caa74c5c-1186-471b-9436-6d4ba43b9e78.
-- Prerequisites already closed and re-verified live immediately before this migration:
--   CA-1 identity migration (12,592 rows per composite re-keyed to canonical fn_bidim_id,
--        provenance_state='legacy_verified', 0 still legacy-keyed)
--   CA-2 dependency verification (dependency_verified_at set from 732/732 fixture evidence;
--        engine_verified DERIVED true via the unchanged fn_method_is_engine_verified)
--
-- engine_verified is NOT set, NOT forced and NOT bypassed here. Only the two Human-Gate
-- switches (active, scannable) are flipped. fn_method_is_scannable() then derives true on its
-- own because active AND executable AND engine_verified already hold. No predicate is weakened.
--
-- EXCLUDED BY EXPLICIT HUMAN-GATE SCOPE: משולש מילה+משולש הפוך (#4) stays active=false /
-- scannable=false / engine_verified=false — its two components are non-governed
-- ('historical_public', 12,009 stale rows each), so activating it would invert the governance
-- ladder. רגיל+אתבש remains UNREGISTERED.
update public.gematria_methods
   set active    = true,
       scannable = true
 where category = 'composite'
   and method_key in ('רגיל+מילוי', 'רגיל+מסתתר', 'רגיל+משולש')
   and dependency_verified_at is not null;   -- refuses to activate an unverified composite

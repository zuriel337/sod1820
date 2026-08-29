-- COMPOSITE FOUNDATION PATCH — part 3/3: CA-2 dependency verification for composites #1-#3
-- Evidence: the completed read-only fixture pass (work_log b80f9e6a-05a8-4a9a-94cf-16fda377b4a0):
-- 183 fixtures x 4 strata (single_word / multi_word / final_letters / non_hebrew_chars) per
-- composite = 732 total; SUM law (composite = sum of independently dispatched components via
-- fn_dispatch_method) held 183/183 per composite; agreement with the stored historical bidim
-- values 183/183 per composite; zero mismatches, zero engine nulls.
--
-- engine_verified is NOT set directly and NO predicate is weakened: setting
-- dependency_verified_at lets the UNCHANGED canonical predicate
-- public.fn_method_is_engine_verified() derive TRUE on its own
-- (dependency_verified_at IS NOT NULL AND dependency_version = version AND every component
-- still at its pinned dependency_versions).
--
-- active and scannable REMAIN false, so fn_method_is_scannable() still returns false and
-- bidim_sync() still cannot write these methods. THIS IS NOT AN ACTIVATION.
-- משולש מילה+משולש הפוך is deliberately EXCLUDED (its components are non-governed
-- 'historical_public' — activating/verifying it would invert the governance ladder).
update public.gematria_methods gm
   set dependency_verified_at = now(),
       dependency_rules = gm.dependency_rules || jsonb_build_array(jsonb_build_object(
         'type',                'verification',
         'verified_at',         now(),
         'verified_by',         'CLAUDE',
         'method',              'read-only fixture pass: composite result vs independent component dispatch, and vs stored historical bidim values',
         'fixtures',            183,
         'strata',              jsonb_build_array('single_word','multi_word','final_letters','non_hebrew_chars'),
         'sum_law_pass',        '183/183',
         'historical_match',    '183/183',
         'mismatches',          0,
         'component_version_pins', gm.dependency_versions,
         'evidence_work_log',   'b80f9e6a-05a8-4a9a-94cf-16fda377b4a0',
         'note',               'Verification of the composition contract only. NOT an activation: active and scannable remain false.'
       ))
 where gm.category = 'composite'
   and gm.method_key in ('רגיל+מילוי','רגיל+מסתתר','רגיל+משולש')
   and gm.dependency_verified_at is null;

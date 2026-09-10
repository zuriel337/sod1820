-- PHASE 3 · F2 · ZURIEL Human Gate (work_log befe06ce).
-- Evidence: re-execution of ALL 10,588 historical fixtures vs the CURRENT v2 composite definition
-- => 10,588/10,588, 0 mismatch, 0 null. Appends a SELF-VERSION-STAMPED attestation (the 2026-09-03
-- entry pinned components but never stamped the method's OWN version) and reconciles the scalar
-- dependency_version 1 -> 2. FORMULA, active, scannable and version are NOT touched.
update public.gematria_methods
   set dependency_rules = coalesce(dependency_rules,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
         'type','verification',
         'method','full historical fixture re-execution vs public.bidim through canonical fn_method_value',
         'method_version', 2,
         'component_version_pins', jsonb_build_object('רגיל',1,'מילוי',1),
         'fixtures', 10588, 'mismatches', 0, 'historical_match','10588/10588',
         'verified_by','CLAUDE', 'verified_at', now(), 'human_gate','ZURIEL 2026-09-10',
         'evidence_work_log','befe06ce (gate) · 1bed2e14 (phase0) · c592aa11 (sequence)',
         'note','Self-version-stamped. Reconciles scalar dependency_version 1->2. No formula/active/scannable/version change.'
       )),
       dependency_version = 2,
       dependency_verified_at = now()
 where method_key = 'מילוי בלבד' and version = 2 and dependency_version = 1;

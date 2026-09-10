-- PHASE 4 · legacy recertification (applied as data statements, recorded here for provenance).
-- PRECONDITION PROVEN FIRST: full read-only re-execution census of every legacy_unknown row through
-- fn_method_value => 83,802 / 83,802 match, 0 mismatch, 0 null (per method:
-- איק בכר 12,591 · משולש הפוך 12,008 · משולש מדרגות 12,008 · משולש מילה 12,008 ·
-- מילוי דמילוי גדול 12,008 · מילוי בלבד 10,588 · משולש מילה+משולש הפוך 12,591).
-- Stamps matches as legacy_verified + verified_* evidence. value / bid_id / computed_at /
-- engine_run_id / method_version are NEVER altered. A mismatch would stay legacy_unknown with
-- verified_mismatch_value set, preserved and unresolved (none occurred).
-- Run per method (the two composites were chunked by md5(phrase) prefix to bound statement time):
update public.bidim b
   set provenance_state = 'legacy_verified',
       verified_at = now(),
       verified_run_id = '22222222-3333-4444-8555-666666666666'::uuid,
       verified_method_version = (select gm.version from public.gematria_methods gm where gm.method_key = b.method)
 where b.provenance_state = 'legacy_unknown'
   and b.method = ANY (ARRAY['איק בכר','משולש הפוך','משולש מדרגות','משולש מילה',
                             'מילוי דמילוי גדול','מילוי בלבד','משולש מילה+משולש הפוך'])
   and public.fn_method_value(b.method, b.phrase) = b.value;

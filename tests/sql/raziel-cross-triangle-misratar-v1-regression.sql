-- #1142 regression for candidate-only v1; run on isolated database after migration.
BEGIN;
SELECT count(*) AS matches_for_mashiach,
       bool_and(equal_value=1088) AS all_values_equal_1088
FROM public.raziel_cross_triangle_misratar_v1('משיח',12);
SELECT count(*) <= 3 AS limit_respected
FROM public.raziel_cross_triangle_misratar_v1('משיח',3);
SELECT count(*) AS should_be_zero
FROM public.raziel_cross_triangle_misratar_v1('English only',12);
SELECT count(*) AS should_be_zero
FROM public.raziel_cross_triangle_misratar_v1('  ',12);
-- Assert eligible rows and exact deterministic identity rather than count alone.
DO $verify$
DECLARE bad_rows int;
BEGIN
 SELECT count(*) INTO bad_rows
 FROM public.raziel_cross_triangle_misratar_v1('משיח',25) r
 LEFT JOIN public.gematria_words g ON g.id=r.source_id
 WHERE g.id IS NULL OR g.is_published IS DISTINCT FROM TRUE
   OR g.is_verified IS DISTINCT FROM TRUE
   OR coalesce(g.is_encrypted,FALSE) IS TRUE
   OR coalesce(g.visibility_tier,0) < 1
   OR public.fn_misratar(g.phrase)::bigint <> r.equal_value;
 IF bad_rows <> 0 THEN RAISE EXCEPTION 'Cross-method provenance mismatch: %',bad_rows; END IF;
END $verify$;
ROLLBACK;
-- Confirm access with actual anon/authenticated request + private fixtures separately.
-- Do not execute only with privileged postgres; SECURITY INVOKER must be exercised under RLS.

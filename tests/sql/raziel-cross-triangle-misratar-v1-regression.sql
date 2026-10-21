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
ROLLBACK;
-- Confirm access with actual anon/authenticated request + private fixtures separately.
-- Do not execute only with privileged postgres; SECURITY INVOKER must be exercised under RLS.

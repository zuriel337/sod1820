-- ============================================================================
-- GEMATRIA_METHODS_UNIFICATION — prepared, additive-only, NOT applied this pass
-- ============================================================================
-- Status: PREPARED ON BRANCH ONLY. Not run via apply_migration / supabase CLI in this
-- session (orchestrator safety rail: zero live DDL except the one closing work_log memo).
-- Safe-to-apply-anytime property: every statement below is a pure `CREATE OR REPLACE
-- FUNCTION`. Nothing here is called by any existing trigger, RPC, or registry row, so
-- applying this file — on its own — changes ZERO existing behavior and computes ZERO new
-- value for any existing word. It only makes two already-JS-implemented, already-verified
-- methods (משולש מילה / משולש הפוך, added to src/lib/gematria.js DEPTH_METHODS on
-- 25.7.2026, see work_log 189a892b-93bc-4dd9-bda0-8005157c6ee1) computable in SQL too, so
-- they COULD later become dispatchable via fn_all_methods_full — but only once a human
-- (Zuriel) separately registers them in public.gematria_methods (see the companion
-- HUMAN_GATE draft file — do not apply that one without explicit approval either).
--
-- Mirrors exactly: triangleWord() / triangleReverse() / stairTriangle() in
-- src/lib/gematria.js (regression-tested in scripts/test_gematria_methods.mjs).
-- Uses regular (non-final) letter values throughout, matching the JS `GEM` map, which
-- already folds sofiot to their base value (method_hierarchy_ragil_foundation:
-- "סופיות ברגיל = כמו הרגילה").
-- ============================================================================

-- משולש מילה (triangleWord): builds the WHOLE phrase letter-by-letter across word
-- boundaries (unlike ribua_calc, which restarts the running sum at every space) and sums
-- the running total at every step. Verified: צוריאל=1432, צוריאל פולייס=4194.
CREATE OR REPLACE FUNCTION public.triangle_word_calc(p text)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
AS $function$
  WITH letters AS (
    SELECT ch, ord
    FROM regexp_split_to_table(regexp_replace(coalesce(p, ''), '[^א-ת]', '', 'g'), '') WITH ORDINALITY AS t(ch, ord)
  ),
  running AS (
    SELECT ord, sum(fn_ragil(ch)) OVER (ORDER BY ord) AS run
    FROM letters
  )
  SELECT coalesce(sum(run), 0)::bigint FROM running;
$function$;

COMMENT ON FUNCTION public.triangle_word_calc(text) IS
  'משולש מילה (candidate, gematria_methods sort_order=21, active=false). Mirrors src/lib/gematria.js triangleWord(). NOT called by gw_enforce_engine / bidim_sync / fn_all_methods_full until a human registers it in gematria_methods.function (see HUMAN_GATE draft).';

-- משולש הפוך (triangleReverse): same construction, walking from the end of the phrase
-- backwards. Verified: צוריאל=927.
CREATE OR REPLACE FUNCTION public.triangle_reverse_calc(p text)
 RETURNS bigint
 LANGUAGE sql
 IMMUTABLE
AS $function$
  WITH letters AS (
    SELECT ch, ord
    FROM regexp_split_to_table(regexp_replace(coalesce(p, ''), '[^א-ת]', '', 'g'), '') WITH ORDINALITY AS t(ch, ord)
  ),
  running AS (
    SELECT ord, sum(fn_ragil(ch)) OVER (ORDER BY ord DESC) AS run
    FROM letters
  )
  SELECT coalesce(sum(run), 0)::bigint FROM running;
$function$;

COMMENT ON FUNCTION public.triangle_reverse_calc(text) IS
  'משולש הפוך (candidate, gematria_methods sort_order=22, active=false). Mirrors src/lib/gematria.js triangleReverse(). NOT called by gw_enforce_engine / bidim_sync / fn_all_methods_full until a human registers it in gematria_methods.function (see HUMAN_GATE draft).';

-- משולש מדרגות (stairTriangle): each letter × its 1-based position within its own word
-- (position resets per word), summed with fn_ragil-tier values. Verified: משיח בן דויד=866.
-- Bonus — not explicitly named in task section 6, included for completeness since it was
-- built in the same prior session (work_log b4ccb3d5) and is equally already JS-verified.
CREATE OR REPLACE FUNCTION public.stair_triangle_calc(p text)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  w text; ch text; i int; total bigint := 0;
BEGIN
  FOREACH w IN ARRAY regexp_split_to_array(coalesce(p, ''), '\s+') LOOP
    i := 0;
    FOR ch IN SELECT regexp_split_to_table(regexp_replace(w, '[^א-ת]', '', 'g'), '') LOOP
      i := i + 1;
      total := total + fn_ragil(ch) * i;
    END LOOP;
  END LOOP;
  RETURN total;
END;
$function$;

COMMENT ON FUNCTION public.stair_triangle_calc(text) IS
  'משולש מדרגות (candidate, gematria_methods sort_order=23, active=false). Mirrors src/lib/gematria.js stairTriangle(). Bonus function, same discipline as triangle_word_calc/triangle_reverse_calc — not registered/activated.';

-- ============================================================================
-- Self-check (run manually, read-only, after applying — NOT part of the DDL above):
--   select triangle_word_calc('צוריאל');           -- expect 1432
--   select triangle_reverse_calc('צוריאל');        -- expect 927
--   select triangle_word_calc('צוריאל פולייס');    -- expect 4194
--   select stair_triangle_calc('משיח בן דויד');    -- expect 866
-- ============================================================================

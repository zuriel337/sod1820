-- RAZIEL #1142 — bounded, deterministic cross-method lookup (candidate only).
-- Intentionally single direction: triangular(INPUT) = concealed(CORPUS).
-- SECURITY INVOKER + explicit publication filters; no private research, LLM or new indexes.
CREATE OR REPLACE FUNCTION public.raziel_cross_triangle_misratar_v1(
  p_phrase text,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(
  source_id uuid,
  source_phrase text,
  input_normalized text,
  input_method text,
  candidate_method text,
  equal_value bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $fn$
  WITH norm AS MATERIALIZED (
    SELECT public.fn_normalize_for_calc(p_phrase) AS phrase
  ), anchor AS MATERIALIZED (
    SELECT phrase, public.triangle_word_calc(phrase) AS val
    FROM norm
    WHERE phrase ~ '[א-ת]'
      AND char_length(phrase) BETWEEN 1 AND 80
  )
  SELECT w.id, w.phrase, a.phrase, 'משולש מילה'::text, 'מסתתר'::text, a.val
  FROM anchor a
  JOIN public.gematria_words w ON w.misratar = a.val
  WHERE w.is_verified IS TRUE
    AND w.is_published IS TRUE
    AND coalesce(w.is_encrypted,false) IS FALSE
    AND coalesce(w.visibility_tier,0) >= 1
    AND w.phrase IS NOT NULL
    AND public.fn_normalize_for_calc(w.phrase) <> a.phrase
  ORDER BY w.lead_rank NULLS LAST, w.id
  LIMIT least(greatest(coalesce(p_limit,12),1),25);
$fn$;
-- Explicit execution boundary (invoker still obeys RLS).
REVOKE ALL ON FUNCTION public.raziel_cross_triangle_misratar_v1(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.raziel_cross_triangle_misratar_v1(text,integer) TO anon,authenticated;

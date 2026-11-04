-- WORLD_GEMATRIA_LEXICAL_LOOKUP_V1
--
-- Read-only batched lexical enrichment for the World contributor projection.
-- Replaces dozens of URL-sized `IN (...)` requests with one RLS-invoker RPC.

CREATE OR REPLACE FUNCTION public.world_gematria_lexical_lookup_v1(
  p_phrases text[]
)
RETURNS TABLE (
  phrase text,
  world text,
  tags text[],
  is_verified boolean,
  is_published boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT
    gw.phrase,
    gw.world,
    gw.tags,
    gw.is_verified,
    gw.is_published
  FROM public.gematria_words AS gw
  WHERE gw.is_verified = true
    AND gw.phrase = ANY (coalesce(p_phrases, ARRAY[]::text[]));
$function$;

REVOKE ALL ON FUNCTION public.world_gematria_lexical_lookup_v1(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.world_gematria_lexical_lookup_v1(text[]) TO anon, authenticated;

COMMENT ON FUNCTION public.world_gematria_lexical_lookup_v1(text[]) IS
  'Read-only RLS-invoker lexical enrichment for World; returns verified rows only and changes no research or truth state.';


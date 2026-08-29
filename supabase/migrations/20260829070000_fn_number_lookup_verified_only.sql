-- Verified-Only Public Gematria Projection: harden fn_number_lookup.
-- Confirmed single consumer chain (getNumberLookup -> getValueFamilies -> EntityPage/NumberFamilies,
-- both public number-page surfaces), so filtering to is_verified=true here is safe and does not
-- touch any admin/research/triage surface. bidim.is_verified is kept in sync with
-- gematria_words.is_verified (verified live: 0 mismatched rows).
CREATE OR REPLACE FUNCTION public.fn_number_lookup(p_value bigint)
 RETURNS TABLE(method text, phrase text, value bigint, source text, vip_source text, is_verified boolean, dna_status text, node_id uuid, category text, tags text[], mathematical_family text, order_sensitive boolean, word_boundary_sensitive boolean, final_letter_sensitive boolean, atomic_or_composite text, component_methods text[], component_values bigint[], operator text, provenance text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT b.method, b.phrase, b.value, gw.source, gw.vip_source,
         gw.is_verified, gw.dna_status, gw.node_id, gw.category, gw.tags,
         gm.mathematical_family, gm.order_sensitive, gm.word_boundary_sensitive,
         gm.final_letter_sensitive,
         CASE WHEN gm.category = 'composite' THEN 'composite' ELSE 'atomic' END,
         CASE WHEN gm.category = 'composite' THEN (SELECT c.component_methods FROM public.fn_composite_calc(b.method, b.phrase) c) ELSE NULL END,
         CASE WHEN gm.category = 'composite' THEN (SELECT c.component_values FROM public.fn_composite_calc(b.method, b.phrase) c) ELSE NULL END,
         CASE WHEN gm.category = 'composite' THEN 'sum' ELSE NULL END,
         format('bidim(method=%s,value=%s) joined gematria_words(id=%s) joined gematria_methods registry', b.method, b.value, gw.id)
  FROM bidim b
  JOIN gematria_words gw ON gw.id = b.word_id
  LEFT JOIN gematria_methods gm ON gm.method_key = b.method
  WHERE b.value = p_value
    AND gw.is_verified = true
  ORDER BY (gm.category = 'composite'), b.method, b.phrase;
END;
$function$

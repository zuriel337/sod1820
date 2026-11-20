CREATE OR REPLACE FUNCTION public.fn_miluy_engine(p_parts text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  select jsonb_build_object('parts', coalesce((select jsonb_agg(jsonb_build_object(
    'part', p, 'ragil', fn_ragil(p), 'milui', fn_miluy(p),
    'match_count', (select count(*) from gematria_words where ragil=fn_miluy(p) and phrase<>p and public.gematria_public_word_eligible(gematria_words.id)),
    'matches', (select coalesce(jsonb_agg(jsonb_build_object('phrase',phrase,'source',coalesce(source,'—'),'len',char_length(phrase))
                  order by char_length(phrase), phrase),'[]'::jsonb)
                from (select phrase, source from gematria_words where ragil=fn_miluy(p) and phrase<>p and public.gematria_public_word_eligible(gematria_words.id) order by char_length(phrase), phrase limit 8) z),
    'evidence','value_match'
  )) from unnest(p_parts) p where p<>''),'[]'::jsonb));
$function$

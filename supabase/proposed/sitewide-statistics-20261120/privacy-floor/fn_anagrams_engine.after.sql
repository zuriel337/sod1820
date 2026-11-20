CREATE OR REPLACE FUNCTION public.fn_anagrams_engine(p_parts text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with base as (
    select p, translate(regexp_replace(p,'[^א-ת]','','g'),'ךםןףץ','כמנפצ') b,
      (select string_agg(c,'' order by c) from regexp_split_to_table(translate(regexp_replace(p,'[^א-ת]','','g'),'ךםןףץ','כמנפצ'),'') c) sig
    from unnest(p_parts) p where p<>''
  )
  select jsonb_build_object('parts', coalesce((select jsonb_agg(jsonb_build_object(
    'part', base.p, 'evidence','direct',
    'anagrams', (select coalesce(jsonb_agg(distinct jsonb_build_object(
        'word', gw.phrase,
        'type', case when exists(select 1 from tanach_verses tv where tv.words @> array[gw.phrase]) then 'מקרא' else 'מילון' end)),'[]'::jsonb)
      from gematria_words gw
      where gw.phrase <> base.b and ((select public.rd_is_admin()) or public.gematria_public_word_eligible(gw.id)) and char_length(gw.phrase)=char_length(base.b)
        and (select string_agg(c,'' order by c) from regexp_split_to_table(translate(regexp_replace(gw.phrase,'[^א-ת]','','g'),'ךםןףץ','כמנפצ'),'') c)=base.sig)
  )) from base),'[]'::jsonb));
$function$

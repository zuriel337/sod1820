CREATE OR REPLACE FUNCTION public.fn_en_search(p_word text, p_max_matches integer DEFAULT 8)
 RETURNS TABLE(input_hebrew text, method text, value bigint, rarity integer, signal text, matches text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_heb text;
begin
  if p_word ~ '[א-ת]' then
     v_heb := p_word;
  else
     select gw.phrase into v_heb
     from word_aliases a join gematria_words gw on gw.id = a.word_id
     where lower(a.alias) = lower(p_word) and a.lang = 'en'
     order by a.verified desc nulls last, a.confidence desc nulls last
     limit 1;
  end if;
  if v_heb is null then return; end if;

  return query
  with vals as (
    select 'רגיל'::text m, fn_ragil(v_heb)::bigint v
    union all select 'מסתתר', fn_misratar(v_heb)
    union all select 'גדול',  fn_gadol(v_heb)
    union all select 'קדמי',  fn_kadmi(v_heb)
    union all select 'אתבש',  fn_atbash(v_heb)
    union all select 'אלבם',  fn_albam(v_heb)
    union all select 'מילוי', fn_miluy(v_heb)
    union all select 'ריבוע', fn_ribua(v_heb)
  )
  select v_heb, vals.m, vals.v, cnt.sharers,
    case when cnt.sharers <= 6 then 'gold'
         when cnt.sharers <= 20 then 'strong'
         else 'weak' end,
    mt.matches
  from vals
  cross join lateral (
    select count(distinct b.phrase)::int sharers
    from bidim b join gematria_words gw on gw.id = b.word_id and gw.is_verified = true and gw.is_published = true
    where b.method = vals.m and b.value = vals.v
  ) cnt
  cross join lateral (
    select array_agg(p order by p) matches
    from (select distinct b.phrase p from bidim b
          join gematria_words gw on gw.id = b.word_id and gw.is_verified = true and gw.is_published = true
          where b.method = vals.m and b.value = vals.v and b.phrase <> v_heb
          limit p_max_matches) s
  ) mt
  where mt.matches is not null and cnt.sharers <= 40
  order by cnt.sharers asc, vals.v;
end $function$

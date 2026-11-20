CREATE OR REPLACE FUNCTION public.number_cross_resonance(p_self text, p_pairs jsonb, p_limit integer DEFAULT 90)
 RETURNS TABLE(self_method text, self_value integer, match_phrase text, match_method text, lead_rank integer, is_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with legible as (select unnest(array['רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר']) m),
  ours as (
    select (e->>'method')::text self_method, (e->>'value')::int self_value
    from jsonb_array_elements(p_pairs) e
    where (e->>'method')::text in (select m from legible)
      and (e->>'value')::int between 10 and 100000
  )
  select o.self_method, o.self_value, b.phrase, b.method, gw.lead_rank, coalesce(gw.is_verified,false)
  from ours o
  join bidim b on b.value = o.self_value and b.method in (select m from legible)
  left join lateral (
    select lead_rank, is_verified from gematria_words g
    where g.phrase = b.phrase order by lead_rank asc nulls last limit 1
  ) gw on true
  where b.phrase <> p_self
    and (b.method = 'רגיל' or o.self_method = 'רגיל')
    and b.phrase !~ '[A-Za-z0-9]'
    and not exists (select 1 from gematria_blocklist bl where position(bl.pattern in b.phrase) > 0)
    -- #1461 review: bidim mirrors every gematria_words phrase, including unpublished,
    -- encrypted, tier<0 and private-wall phrases (live 20.11.2026: 120 hidden + 23 private).
    -- Only a phrase with at least one publicly eligible corpus row may be returned.
    and exists (select 1 from gematria_words g2 where g2.phrase = b.phrase and public.gematria_public_word_eligible(g2.id))
  order by o.self_method,
           (b.method = 'רגיל') desc,
           coalesce(gw.is_verified,false) desc,
           coalesce(gw.lead_rank, 999999),
           char_length(b.phrase),
           b.phrase
  limit p_limit;
$function$

CREATE OR REPLACE FUNCTION public.verified_bridges(p_limit integer DEFAULT 60)
 RETURNS TABLE(alias text, lang text, hebrew text, value integer, method text, note text, evidence text, human_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  with ll as (
    select l.foreign_word as alias, l.lang, l.hebrew, l.gematria_he as value,
           l.method, l.note, coalesce(l.evidence_level,'medium') as evidence,
           coalesce(l.human_verified,false) as human_verified, l.created_at
    from language_links l
    where l.status = 'approved' and exists(select 1 from gematria_words g2 where g2.phrase = l.hebrew and public.gematria_public_word_eligible(g2.id))
  ),
  wa as (
    select wa.alias, wa.lang, g.phrase as hebrew, g.ragil as value,
           wa.method, null::text as note, 'medium'::text as evidence,
           true as human_verified, wa.created_at
    from word_aliases wa
    join gematria_words g on g.id = wa.word_id
    where wa.verified
      and g.is_verified = true and g.is_published = true and public.gematria_public_word_eligible(g.id)
      and coalesce(wa.lang,'he') not in ('he','heb','עברית')
      and coalesce(g.is_encrypted,false) = false
      and not exists (select 1 from gematria_blocklist bl where position(bl.pattern in g.phrase) > 0)
      and not exists (select 1 from ll where lower(ll.alias) = lower(wa.alias) and ll.hebrew = g.phrase)
  )
  select alias, lang, hebrew, value, method, note, evidence, human_verified
  from (select * from ll union all select * from wa) u
  order by (evidence='strong') desc, created_at desc
  limit p_limit;
$function$

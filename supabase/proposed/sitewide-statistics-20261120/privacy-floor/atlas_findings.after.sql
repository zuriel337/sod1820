CREATE OR REPLACE FUNCTION public.atlas_findings(p_relation text DEFAULT NULL::text, p_limit integer DEFAULT 80)
 RETURNS TABLE(relation_type text, method text, a_phrase text, b_phrase text, value integer, note text, engine_verified boolean, updated_at timestamp with time zone, multi_method boolean, family_supported boolean, bridge_supported boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 privacy floor
  select re.relation_type, re.method, re.a_phrase, re.b_phrase, re.value, re.note,
         re.engine_verified, re.updated_at,
         (select count(*) > 1 from relation_evidence x where x.status='confirmed'
            and ((x.a_phrase=re.a_phrase and x.b_phrase=re.b_phrase) or (x.a_phrase=re.b_phrase and x.b_phrase=re.a_phrase))),
         exists(select 1 from anchor_families f where f.status in ('approved_anchor','featured')
            and f.root = zero_root(coalesce(re.value,0))),
         exists(select 1 from word_aliases wa join gematria_words g on g.id=wa.word_id
            where wa.verified and g.phrase in (re.a_phrase, re.b_phrase))
  from relation_evidence re
  where re.status = 'confirmed' and (p_relation is null or re.relation_type = p_relation) and exists(select 1 from gematria_words ga where ga.phrase = re.a_phrase and public.gematria_public_word_eligible(ga.id)) and exists(select 1 from gematria_words gb where gb.phrase = re.b_phrase and public.gematria_public_word_eligible(gb.id))
  order by re.updated_at desc limit p_limit;
$function$

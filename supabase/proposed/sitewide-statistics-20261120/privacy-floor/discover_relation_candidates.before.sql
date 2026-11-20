CREATE OR REPLACE FUNCTION public.discover_relation_candidates(p_method text DEFAULT NULL::text, p_limit integer DEFAULT 40)
 RETURNS TABLE(method text, relation_type text, a_phrase text, b_phrase text, value integer, already_logged boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with weighty as (   -- מילים בעלות-משקל: מובילות / תמטיות / בגרף (לא סתם כל מילת-ציר)
    select distinct phrase from gematria_words
    where lead_rank is not null or world is not null or node_id is not null
  ),
  hits as (
    select a.method, a.phrase a_phrase, b.phrase b_phrase, a.value
    from bidim a
    join bidim b on b.value = a.value and b.method = 'רגיל' and b.phrase <> a.phrase
    where a.method in ('אתבש','אלבם','מסתתר','מילוי','קדמי')
      and (p_method is null or a.method = p_method)
      and a.value between 10 and 100000
      and a.phrase in (select phrase from weighty)
      and b.phrase in (select phrase from weighty)
      and a.phrase !~ '[A-Za-z0-9]' and b.phrase !~ '[A-Za-z0-9]'
  )
  select h.method, coalesce(ms.relation_type,'unknown'), h.a_phrase, h.b_phrase, h.value,
         exists(select 1 from relation_evidence re where re.method=h.method and re.a_phrase=h.a_phrase and re.b_phrase=h.b_phrase)
  from hits h
  left join method_semantics ms on ms.method = h.method
  order by h.method, char_length(h.a_phrase) + char_length(h.b_phrase), h.value
  limit p_limit;
$function$

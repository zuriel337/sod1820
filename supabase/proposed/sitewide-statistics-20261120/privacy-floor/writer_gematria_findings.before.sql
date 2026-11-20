CREATE OR REPLACE FUNCTION public.writer_gematria_findings(p_name text, p_uid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, claim text, phrase text, value integer, method text, in_core boolean, pinned boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select rc.id, rc.gematria_claim->>'claim' as claim_raw, rc.pinned_at, rc.created_at,
      coalesce(nullif(rc.gematria_claim->>'phrase',''),
               btrim(split_part(split_part(rc.gematria_claim->>'claim', chr(10), 1), '=', 1))) as phrase,
      coalesce(nullif(rc.gematria_claim->>'value','')::int,
               nullif((regexp_match(rc.gematria_claim->>'claim', '=[^0-9]*([0-9]{2,5})'))[1], '')::int) as value,
      nullif(btrim(rc.gematria_claim->>'method'),'') as method_x
    from public.research_contributions rc
    where (p_uid is not null and rc.author_user_id = p_uid or rc.author_name = p_name)
      and rc.status = 'published' and rc.gematria_claim ? 'claim'
  )
  select b.id, b.claim_raw as claim, b.phrase, b.value,
    case
      when b.phrase is null or b.value is null then null
      when b.method_x is not null then (case when b.method_x in ('רגיל','ragil') then null else b.method_x end)
      when b.phrase !~ '^[א-ת]+( [א-ת]+)*$' then null
      when b.value = ragil_calc(b.phrase) then null
      when b.value = mistater_calc(b.phrase) then 'מסתתר'
      when b.value = miluy_calc(b.phrase) then 'מילוי'
      when b.value = atbash_calc(b.phrase) then 'את־בש'
      when b.value = gadol_calc(b.phrase) then 'גדול'
      when b.value = siduri_calc(b.phrase) then 'סידורי'
      when b.value = kadmi_calc(b.phrase) then 'קדמי'
      when b.value = albam_calc(b.phrase) then 'אלב״ם'
      else null
    end as method,
    exists(select 1 from public.gematria_words gw where gw.phrase = b.phrase) as in_core,
    (b.pinned_at is not null) as pinned, b.created_at
  from base b
  order by b.pinned_at desc nulls last, b.created_at desc
  limit 300;
$function$

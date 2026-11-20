CREATE OR REPLACE FUNCTION public.entity_collective_count(p_type text, p_ref text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with v as (select case when p_type='number'
              then nullif(regexp_replace(coalesce(p_ref,''),'\D','','g'),'')::int else null end as num)
  select count(distinct ident)::int from (
    -- צומת מדויק: שומרים
    select user_id::text ident from public.research_items
      where entity_type=p_type and entity_ref=p_ref and user_id is not null
    union
    -- צומת מדויק: תורמים מאושרים (רשומים + אנונימיים)
    select author_user_id::text from public.research_contributions
      where target_type=p_type and target_id=p_ref and status='approved' and author_user_id is not null
    union
    select 'name:'||author_name from public.research_contributions
      where target_type=p_type and target_id=p_ref and status='approved' and author_user_id is null and coalesce(author_name,'')<>''
    -- 🌳 צומת-מספר בלבד: גם ביטויים שהגימטריה שלהם = המספר (איחוד הצלבה בזמן-קריאה)
    union
    select ri.user_id::text from public.research_items ri, v
      where p_type='number' and v.num is not null and ri.entity_type='phrase' and ri.user_id is not null
        and public.fn_ragil(ri.entity_ref)=v.num
    union
    select rc.author_user_id::text from public.research_contributions rc, v
      where p_type='number' and v.num is not null and rc.target_type='phrase' and rc.status='approved'
        and rc.author_user_id is not null and public.fn_ragil(rc.target_id)=v.num
    union
    select 'name:'||rc.author_name from public.research_contributions rc, v
      where p_type='number' and v.num is not null and rc.target_type='phrase' and rc.status='approved'
        and rc.author_user_id is null and coalesce(rc.author_name,'')<>'' and public.fn_ragil(rc.target_id)=v.num
    -- 🔠 צומת-מספר: מחברי-צפנים שהצופן שלהם מצביע על המספר (primary_number / anchor_numbers)
    union
    select e.owner_user_id::text from public.els_records e, v
      where p_type='number' and v.num is not null and e.status='published' and e.owner_user_id is not null
        and (e.primary_number=v.num or v.num = any(e.anchor_numbers))
    union
    select 'name:'||e.author_name from public.els_records e, v
      where p_type='number' and v.num is not null and e.status='published' and e.owner_user_id is null
        and coalesce(e.author_name,'')<>'' and (e.primary_number=v.num or v.num = any(e.anchor_numbers))
  ) s;
$function$

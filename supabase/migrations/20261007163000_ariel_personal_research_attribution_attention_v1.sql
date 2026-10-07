-- ARIEL_PERSONAL_RESEARCH_ISOLATION_V1
-- Extend the existing Admin Attention owner; no new alert system.
-- Goals:
-- 1) Owner-scoped research remains visible to Human Gate/admin.
-- 2) If a research_object has owner_person_id but the displayed contributor does not resolve to that owner,
--    surface a first-class attribution gap without exposing owner_person_id to the client.
-- 3) Include gaps regardless of governance status, not only candidate rows already emitted by v1.

create or replace function public.admin_attention_feed_v2(
  p_include_handled boolean default false,
  p_limit integer default 1600
)
returns table(
  attention_key text,
  source_type text,
  source_ref text,
  source_group text,
  actor_name text,
  title text,
  body text,
  context_label text,
  context_ref text,
  created_at timestamptz,
  status text,
  handled boolean,
  available_actions jsonb,
  metadata jsonb
)
language sql
stable
security definer
set search_path='public'
as $function$
with admin_ok as (
  select exists(
    select 1 from public.users u
    where u.id=auth.uid() and u.role='admin'
  ) ok
),
owner_rows as (
  select
    r.id,
    r.created_at,
    r.status,
    r.source,
    r.source_ref,
    r.kind,
    r.statement,
    r.value,
    r.terms,
    r.relates,
    r.confidence,
    r.engine_verified,
    r.privacy_scope,
    r.contributor,
    c.display_name as owner_name,
    c.slug as owner_slug,
    c.wa_names,
    case
      when r.owner_person_id is null then false
      when c.display_name is null then true
      when lower(btrim(coalesce(r.contributor,''))) = lower(btrim(c.display_name)) then false
      when exists (
        select 1
        from unnest(coalesce(c.wa_names,'{}'::text[])) alias_name
        where lower(btrim(alias_name)) = lower(btrim(coalesce(r.contributor,'')))
      ) then false
      else true
    end as attribution_gap
  from public.research_objects r
  left join public.persons p on p.person_id=r.owner_person_id
  left join lateral (
    select c1.display_name,c1.slug,c1.wa_names
    from public.contributors c1
    where c1.user_id=p.account_user_id
      and coalesce(c1.active,true)
    order by c1.trusted desc nulls last,c1.created_at asc
    limit 1
  ) c on true
  cross join admin_ok a
  where a.ok
    and r.owner_person_id is not null
    and (
      c.display_name is null
      or lower(btrim(c.display_name)) not in ('sod1820','מערכת','המערכת','רזיאל','רזיאל · ai')
    )
),
v1_rows as (
  select
    f.attention_key,f.source_type,f.source_ref,f.source_group,f.actor_name,f.title,f.body,
    f.context_label,f.context_ref,f.created_at,f.status,f.available_actions,f.metadata
  from public.admin_attention_feed_v1(true,2000) f
),
gap_only_missing_from_v1 as (
  select
    'research:'||o.id::text as attention_key,
    'research_object'::text as source_type,
    o.id::text as source_ref,
    'פערי ייחוס'::text as source_group,
    coalesce(o.owner_name,'בעל מחקר מזוהה') as actor_name,
    'פער ייחוס למחקר אישי · '||coalesce(o.owner_name,'ללא שם תצוגה') as title,
    o.statement as body,
    coalesce(o.source_ref,o.source,'מחקר אישי') as context_label,
    o.source_ref as context_ref,
    o.created_at,
    coalesce(o.status,'לא צוין') as status,
    jsonb_build_array('handled','raziel','research_review','open') as available_actions,
    jsonb_build_object(
      'value',o.value,
      'terms',o.terms,
      'relates',o.relates,
      'confidence',o.confidence,
      'engine_verified',o.engine_verified,
      'privacy_scope',o.privacy_scope,
      'owner_scoped',true,
      'attribution_gap',true,
      'owner_name',o.owner_name,
      'owner_slug',o.owner_slug,
      'displayed_contributor',o.contributor
    ) as metadata
  from owner_rows o
  where o.attribution_gap
    and not exists (
      select 1
      from v1_rows f
      where f.source_type='research_object' and f.source_ref=o.id::text
    )
),
raw as (
  select * from v1_rows
  union all
  select * from gap_only_missing_from_v1
),
enriched as (
  select
    r.attention_key,
    r.source_type,
    r.source_ref,
    case when coalesce(o.attribution_gap,false) then 'פערי ייחוס' else r.source_group end as source_group,
    case when coalesce(o.attribution_gap,false)
      then coalesce(o.owner_name,'בעל מחקר מזוהה')
      else r.actor_name end as actor_name,
    case when coalesce(o.attribution_gap,false)
      then 'פער ייחוס למחקר אישי · '||coalesce(o.owner_name,'ללא שם תצוגה')
      else r.title end as title,
    r.body,
    r.context_label,
    r.context_ref,
    r.created_at,
    r.status,
    r.available_actions,
    coalesce(r.metadata,'{}'::jsonb) ||
      case when o.id is not null then jsonb_build_object(
        'owner_scoped',true,
        'attribution_gap',coalesce(o.attribution_gap,false),
        'owner_name',o.owner_name,
        'owner_slug',o.owner_slug,
        'displayed_contributor',o.contributor
      ) else '{}'::jsonb end as metadata
  from raw r
  left join owner_rows o
    on r.source_type='research_object' and r.source_ref=o.id::text
),
ranked as (
  select e.*,
    row_number() over(partition by e.source_type order by e.created_at desc,e.source_ref desc) as source_rank,
    case e.source_type
      when 'channel' then 'ch:'||e.source_ref
      when 'research_object' then 'r:'||e.source_ref
      when 'comment' then 'c:'||e.source_ref
      when 'whatsapp' then 'w:'||e.source_ref
      else null
    end as legacy_ref
  from enriched e
),
marked as (
  select b.*,
    (
      exists(
        select 1 from public.research_items i
        where i.user_id=auth.uid()
          and i.bucket='handled'
          and i.entity_type=b.source_type
          and i.entity_ref=b.source_ref
      )
      or (
        b.legacy_ref is not null
        and exists(
          select 1 from public.research_items i
          where i.user_id=auth.uid()
            and i.bucket='handled'
            and i.entity_type='cc_handled'
            and i.entity_ref=b.legacy_ref
        )
      )
    ) as handled_v2,
    case
      when coalesce((b.metadata->>'attribution_gap')::boolean,false) then true
      when b.source_type in ('comment','community_hint','els','research_contribution') then true
      when b.source_type in ('contact','direct_message') and b.status in ('new','pending') then true
      when b.source_type='research_object' and b.source_rank <= 200 then true
      when b.source_type='channel' and b.source_rank <= 60 then true
      when b.source_type='whatsapp' and b.source_rank <= 20 and coalesce(b.metadata->>'reply_out','')='' then true
      else false
    end as needs_human
  from ranked b
)
select
  attention_key,source_type,source_ref,source_group,actor_name,title,body,context_label,context_ref,
  created_at,status,handled_v2,available_actions,
  coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
    'needs_human',needs_human,
    'source_rank',source_rank,
    'legacy_handled_compatible',legacy_ref is not null
  ) as metadata
from marked
where p_include_handled or not handled_v2
order by
  coalesce((metadata->>'attribution_gap')::boolean,false) desc,
  created_at desc
limit greatest(1,least(coalesce(p_limit,1600),2000));
$function$;

revoke all on function public.admin_attention_feed_v2(boolean,integer) from public;
grant execute on function public.admin_attention_feed_v2(boolean,integer) to authenticated;

-- G3_2029_ANALYTICS_ONE_TREE_V1
-- Projection only: reuse canonical events -> person -> account identity and clean-traffic classification.
-- No new analytics store. No mutation of Legacy analytics RPCs/UI/tables.

create or replace function public.admin_2029_analytics(
  p_hours integer default 24,
  p_path_prefix text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_hours integer := greatest(1, least(coalesce(p_hours, 24), 24 * 90));
  v_to timestamptz := now();
  v_from timestamptz := v_to - make_interval(hours => v_hours);
  v_payload jsonb;
begin
  if not public.rd_is_admin() then
    raise exception 'not authorized';
  end if;

  with clean as (
    select *
    from public.fn_ti_clean_classification(
      (v_from at time zone 'Asia/Jerusalem')::date,
      (v_to at time zone 'Asia/Jerusalem')::date
    )
  ),
  base as (
    select
      e.event_id,
      e.ts,
      e.sod_id,
      e.person_id,
      e.session_id,
      e.surface,
      e.event_type,
      e.path,
      e.device,
      e.via,
      e.app_context,
      e.props,
      pe.account_user_id,
      u.role,
      coalesce(nullif(u.display_name,''), nullif(u.username,'')) as account_name,
      case
        when u.role = 'admin' then 'internal_admin'
        when pe.account_user_id is not null then 'known_user'
        else 'anonymous'
      end as audience_kind,
      coalesce(e.person_id::text, 'sod:' || e.sod_id) as audience_key,
      coalesce(c.clean_classification, 'unknown') as clean_classification,
      coalesce(c.clean_eligible, false) as clean_eligible
    from public.events e
    left join public.persons pe on pe.person_id = e.person_id
    left join public.users u on u.id = pe.account_user_id
    left join clean c on c.session_id = e.session_id
    where e.ts >= v_from
      and e.ts < v_to
      and (
        p_path_prefix is null
        or e.path = p_path_prefix
        or e.path like rtrim(p_path_prefix, '/') || '/%'
      )
  ),
  page_views as (
    select *
    from base
    where surface = 'page' and event_type = 'view'
  ),
  session_rollup as (
    select
      session_id,
      max(audience_kind) as audience_kind,
      max(clean_classification) as clean_classification,
      bool_or(clean_eligible) as clean_eligible
    from base
    where session_id is not null
    group by session_id
  ),
  visitor_rollup as (
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id) as person_id,
      max(b.account_user_id) as account_user_id,
      max(b.account_name) as account_name,
      max(b.role) as role,
      count(*) filter (where b.surface='page' and b.event_type='view')::bigint as page_views,
      count(distinct b.session_id) filter (where b.session_id is not null)::bigint as sessions,
      coalesce(sum(
        case
          when b.event_type='engagement'
            and (b.props->>'engaged_ms') ~ '^[0-9]+$'
          then (b.props->>'engaged_ms')::bigint
          else 0
        end
      ),0)::bigint as engaged_ms,
      min(b.ts) as first_seen,
      max(b.ts) as last_seen,
      array_remove(array_agg(distinct b.device), null) as devices,
      array_agg(distinct b.clean_classification) as clean_classifications
    from base b
    where exists (
      select 1 from page_views p where p.audience_key = b.audience_key
    )
    group by b.audience_key
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'hours', v_hours,
      'from', v_from,
      'to', v_to,
      'path_prefix', p_path_prefix,
      'owner', 'traffic_intelligence_law',
      'identity_resolution', 'events.person_id -> persons.account_user_id -> users.role',
      'human_classification', 'fn_ti_clean_classification',
      'engagement_source', 'events.engagement.props.engaged_ms',
      'telemetry_identity', 'semantic_shared_not_renderer_specific',
      'legacy_analytics_changed', false
    ),
    'summary', jsonb_build_object(
      'page_views', (select count(*) from page_views),
      'people', (select count(*) from visitor_rollup),
      'sessions', (select count(*) from session_rollup),
      'identified_people', (select count(*) from visitor_rollup where account_user_id is not null),
      'anonymous_people', (select count(*) from visitor_rollup where audience_kind='anonymous'),
      'internal_admin_people', (select count(*) from visitor_rollup where audience_kind='internal_admin'),
      'external_people', (select count(*) from visitor_rollup where audience_kind <> 'internal_admin'),
      'internal_admin_page_views', (select count(*) from page_views where audience_kind='internal_admin'),
      'external_page_views', (select count(*) from page_views where audience_kind <> 'internal_admin'),
      'engaged_ms', (
        select coalesce(sum(
          case when event_type='engagement' and (props->>'engaged_ms') ~ '^[0-9]+$'
            then (props->>'engaged_ms')::bigint else 0 end
        ),0) from base
      ),
      'internal_admin_engaged_ms', (
        select coalesce(sum(
          case when event_type='engagement' and audience_kind='internal_admin'
                    and (props->>'engaged_ms') ~ '^[0-9]+$'
            then (props->>'engaged_ms')::bigint else 0 end
        ),0) from base
      ),
      'external_engaged_ms', (
        select coalesce(sum(
          case when event_type='engagement' and audience_kind <> 'internal_admin'
                    and (props->>'engaged_ms') ~ '^[0-9]+$'
            then (props->>'engaged_ms')::bigint else 0 end
        ),0) from base
      ),
      'clean_human_sessions', (select count(*) from session_rollup where clean_classification='human'),
      'clean_unknown_sessions', (select count(*) from session_rollup where clean_classification='unknown'),
      'clean_bot_sessions', (select count(*) from session_rollup where clean_classification='bot')
    ),
    'visitors', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'audience_kind', v.audience_kind,
          'person_id', v.person_id,
          'account_user_id', v.account_user_id,
          'account_name', v.account_name,
          'role', v.role,
          'page_views', v.page_views,
          'sessions', v.sessions,
          'engaged_ms', v.engaged_ms,
          'first_seen', v.first_seen,
          'last_seen', v.last_seen,
          'devices', to_jsonb(v.devices),
          'clean_classifications', to_jsonb(v.clean_classifications),
          'paths', (
            select coalesce(jsonb_agg(
              jsonb_build_object('path', x.path, 'views', x.views)
              order by x.views desc, x.path
            ), '[]'::jsonb)
            from (
              select p.path, count(*)::bigint as views
              from page_views p
              where p.audience_key = v.audience_key
              group by p.path
              order by views desc, p.path
              limit 8
            ) x
          )
        )
        order by v.last_seen desc
      )
      from (
        select * from visitor_rollup order by last_seen desc limit 100
      ) v
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$function$;

revoke all on function public.admin_2029_analytics(integer,text) from public;
revoke all on function public.admin_2029_analytics(integer,text) from anon;
grant execute on function public.admin_2029_analytics(integer,text) to authenticated;

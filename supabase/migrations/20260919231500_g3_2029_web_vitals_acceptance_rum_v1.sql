-- G3_2029_WEB_VITALS_ACCEPTANCE_RUM_V1
-- EXTEND_EXISTING: adds a Web Vitals projection to the existing 2029 admin analytics RPC.
-- No table/store/collector is created in SQL. RUM rows arrive through the existing
-- public.ingest_event -> public.events pipeline as surface='performance', event_type='web_vital'.
-- Legacy analytics semantics and RPCs remain unchanged.

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
  vital_raw as (
    select *
    from base
    where surface = 'performance'
      and event_type = 'web_vital'
      and audience_kind <> 'internal_admin'
      and coalesce(props->>'vitals_version','') = '1'
      and nullif(props->>'sample_id','') is not null
  ),
  vital_samples as (
    -- The browser may emit one 15s checkpoint plus one final event.
    -- One sample_id = one document navigation; latest phase wins.
    select distinct on (props->>'sample_id')
      props->>'sample_id' as sample_id,
      path,
      ts,
      device,
      clean_classification,
      props->>'phase' as phase,
      props->>'nav_type' as nav_type,
      props->'cls_shift_sources' as cls_shift_sources,
      case when (props->>'cls') ~ '^[0-9]+(\\.[0-9]+)?
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
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
      'web_vitals_source', 'events.performance.web_vital',
      'web_vitals_scope', 'document_navigation_rum_not_crux',
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
    'web_vitals', jsonb_build_object(
      'samples', (select count(*) from vital_samples),
      'p75', jsonb_build_object(
        'cls', (select percentile_cont(0.75) within group (order by cls) from vital_samples where cls is not null),
        'lcp_ms', (select percentile_cont(0.75) within group (order by lcp_ms) from vital_samples where lcp_ms is not null),
        'inp_ms', (select percentile_cont(0.75) within group (order by inp_ms) from vital_samples where inp_ms is not null),
        'fcp_ms', (select percentile_cont(0.75) within group (order by fcp_ms) from vital_samples where fcp_ms is not null),
        'ttfb_ms', (select percentile_cont(0.75) within group (order by ttfb_ms) from vital_samples where ttfb_ms is not null)
      ),
      'good_rate_pct', jsonb_build_object(
        'cls', (select round((100.0 * count(*) filter (where cls is not null and cls <= 0.1) / nullif(count(cls),0))::numeric, 1) from vital_samples),
        'lcp', (select round((100.0 * count(*) filter (where lcp_ms is not null and lcp_ms <= 2500) / nullif(count(lcp_ms),0))::numeric, 1) from vital_samples),
        'inp', (select round((100.0 * count(*) filter (where inp_ms is not null and inp_ms <= 200) / nullif(count(inp_ms),0))::numeric, 1) from vital_samples)
      ),
      'thresholds', jsonb_build_object(
        'cls_good_max', 0.1,
        'cls_poor_above', 0.25,
        'lcp_good_max_ms', 2500,
        'lcp_poor_above_ms', 4000,
        'inp_good_max_ms', 200,
        'inp_poor_above_ms', 500
      ),
      'routes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'path', r.path,
          'samples', r.samples,
          'cls_p75', r.cls_p75,
          'lcp_p75_ms', r.lcp_p75,
          'inp_p75_ms', r.inp_p75,
          'fcp_p75_ms', r.fcp_p75,
          'ttfb_p75_ms', r.ttfb_p75,
          'cls_not_good', r.cls_not_good,
          'cls_poor', r.cls_poor
        ) order by coalesce(r.cls_p75,0) desc, r.samples desc, r.path)
        from (
          select *
          from vital_route_rollup
          order by coalesce(cls_p75,0) desc, samples desc, path
          limit 20
        ) r
      ), '[]'::jsonb),
      'latest_cls_issue', (
        select jsonb_build_object(
          'path', v.path,
          'cls', v.cls,
          'phase', v.phase,
          'at', v.ts,
          'sources', coalesce(v.cls_shift_sources, '[]'::jsonb)
        )
        from vital_samples v
        where v.cls > 0.1
        order by v.ts desc
        limit 1
      )
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

        then (props->>'cls')::double precision end as cls,
      case when (props->>'lcp_ms') ~ '^[0-9]+(\\.[0-9]+)?
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
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

        then (props->>'lcp_ms')::double precision end as lcp_ms,
      case when (props->>'inp_ms') ~ '^[0-9]+(\\.[0-9]+)?
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
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

        then (props->>'inp_ms')::double precision end as inp_ms,
      case when (props->>'fcp_ms') ~ '^[0-9]+(\\.[0-9]+)?
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
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

        then (props->>'fcp_ms')::double precision end as fcp_ms,
      case when (props->>'ttfb_ms') ~ '^[0-9]+(\\.[0-9]+)?
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
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

        then (props->>'ttfb_ms')::double precision end as ttfb_ms
    from vital_raw
    order by props->>'sample_id', ts desc
  ),
  vital_route_rollup as (
    select
      coalesce(path,'(unknown)') as path,
      count(*)::bigint as samples,
      percentile_cont(0.75) within group (order by cls) filter (where cls is not null) as cls_p75,
      percentile_cont(0.75) within group (order by lcp_ms) filter (where lcp_ms is not null) as lcp_p75,
      percentile_cont(0.75) within group (order by inp_ms) filter (where inp_ms is not null) as inp_p75,
      percentile_cont(0.75) within group (order by fcp_ms) filter (where fcp_ms is not null) as fcp_p75,
      percentile_cont(0.75) within group (order by ttfb_ms) filter (where ttfb_ms is not null) as ttfb_p75,
      count(*) filter (where cls > 0.1)::bigint as cls_not_good,
      count(*) filter (where cls > 0.25)::bigint as cls_poor
    from vital_samples
    group by coalesce(path,'(unknown)')
  ),
  visitor_rollup as (
    select
      b.audience_key,
      max(b.audience_kind) as audience_kind,
      max(b.person_id::text)::uuid as person_id,
      max(b.account_user_id::text)::uuid as account_user_id,
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

CREATE OR REPLACE FUNCTION public.admin_2029_analytics(p_hours integer DEFAULT 24, p_path_prefix text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- One document navigation may emit one 15s checkpoint and one final row.
    -- sample_id is the document identity; the latest row wins.
    select distinct on (props->>'sample_id')
      props->>'sample_id' as sample_id,
      path,
      ts,
      device,
      clean_classification,
      props->>'phase' as phase,
      props->>'nav_type' as nav_type,
      props->>'build' as build,
      props->>'device_class' as device_class,
      props->>'article_first' as article_first,
      props->'nav_timing' as nav_timing,
      props->'cls_shift_sources' as cls_shift_sources,
      case when (props->>'cls') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'cls')::double precision end as cls,
      case when (props->>'lcp_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'lcp_ms')::double precision end as lcp_ms,
      case when (props->>'inp_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'inp_ms')::double precision end as inp_ms,
      case when (props->>'fcp_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'fcp_ms')::double precision end as fcp_ms,
      case when (props->>'ttfb_ms') ~ '^[0-9]+([.][0-9]+)?$'
        then (props->>'ttfb_ms')::double precision end as ttfb_ms
    from vital_raw
    order by
      props->>'sample_id',
      ts desc,
      case when props->>'phase' = 'final' then 1 else 0 end desc
  ),
  vital_ctx as (
    -- Speed centre (ZURIEL 17.11.2026): the field context each sample already carries (webVitals2029 fieldContext). A sample
    -- without it stays "unknown"; nothing is guessed.
    select v.*,
      public.fn_web_vital_surface_group(v.path, v.article_first) as surface_group,
      coalesce(nullif(v.device_class, ''), 'unknown') as device_group,
      coalesce(nullif(v.build, ''), 'unknown') as build_group,
      coalesce(nullif(v.article_first, ''), 'unknown') as article_first_group,
      case when (v.nav_timing->>'redirect_ms') ~ '^[0-9]+$' then (v.nav_timing->>'redirect_ms')::double precision end as redirect_ms,
      case when (v.nav_timing->>'worker_ms') ~ '^[0-9]+$' then (v.nav_timing->>'worker_ms')::double precision end as worker_ms,
      case when (v.nav_timing->>'dns_ms') ~ '^[0-9]+$' then (v.nav_timing->>'dns_ms')::double precision end as dns_ms,
      case when (v.nav_timing->>'connect_ms') ~ '^[0-9]+$' then (v.nav_timing->>'connect_ms')::double precision end as connect_ms,
      case when (v.nav_timing->>'wait_ms') ~ '^[0-9]+$' then (v.nav_timing->>'wait_ms')::double precision end as wait_ms,
      case when (v.nav_timing->>'download_ms') ~ '^[0-9]+$' then (v.nav_timing->>'download_ms')::double precision end as download_ms
    from vital_samples v
  ),
  vital_route_rollup as (
    select
      coalesce(path,'(unknown)') as path,
      count(*)::bigint as samples,
      percentile_cont(0.75) within group (order by cls)
        filter (where cls is not null) as cls_p75,
      percentile_cont(0.75) within group (order by lcp_ms)
        filter (where lcp_ms is not null) as lcp_p75,
      percentile_cont(0.75) within group (order by inp_ms)
        filter (where inp_ms is not null) as inp_p75,
      percentile_cont(0.75) within group (order by fcp_ms)
        filter (where fcp_ms is not null) as fcp_p75,
      percentile_cont(0.75) within group (order by ttfb_ms)
        filter (where ttfb_ms is not null) as ttfb_p75,
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
      'web_vitals_source', 'events.performance.web_vital',
      'web_vitals_scope', 'document_navigation_hard_load_rum_not_crux',
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
      'first_sample_at', (select min(ts) from vital_samples),
      'latest_sample_at', (select max(ts) from vital_samples),
      'sample_counts', jsonb_build_object(
        'cls', (select count(cls) from vital_samples), 'lcp', (select count(lcp_ms) from vital_samples),
        'inp', (select count(inp_ms) from vital_samples), 'fcp', (select count(fcp_ms) from vital_samples),
        'ttfb', (select count(ttfb_ms) from vital_samples)),
      'context_coverage', jsonb_build_object(
        'build', (select count(*) from vital_samples where nullif(build, '') is not null),
        'device_class', (select count(*) from vital_samples where nullif(device_class, '') is not null),
        'article_first', (select count(*) from vital_samples where nullif(article_first, '') is not null),
        'nav_timing', (select count(*) from vital_samples where jsonb_typeof(nav_timing) = 'object')),
      'classification', jsonb_build_object(
        'human', (select count(*) from vital_samples where clean_classification='human'),
        'unknown', (select count(*) from vital_samples where clean_classification='unknown'),
        'bot', (select count(*) from vital_samples where clean_classification='bot')
      ),
      'p75', jsonb_build_object(
        'cls', (
          select percentile_cont(0.75) within group (order by cls)
          from vital_samples where cls is not null
        ),
        'lcp_ms', (
          select percentile_cont(0.75) within group (order by lcp_ms)
          from vital_samples where lcp_ms is not null
        ),
        'inp_ms', (
          select percentile_cont(0.75) within group (order by inp_ms)
          from vital_samples where inp_ms is not null
        ),
        'fcp_ms', (
          select percentile_cont(0.75) within group (order by fcp_ms)
          from vital_samples where fcp_ms is not null
        ),
        'ttfb_ms', (
          select percentile_cont(0.75) within group (order by ttfb_ms)
          from vital_samples where ttfb_ms is not null
        )
      ),
      'good_rate_pct', jsonb_build_object(
        'cls', (
          select round((
            100.0 * count(*) filter (where cls is not null and cls <= 0.1)
            / nullif(count(cls),0)
          )::numeric, 1)
          from vital_samples
        ),
        'lcp', (
          select round((
            100.0 * count(*) filter (where lcp_ms is not null and lcp_ms <= 2500)
            / nullif(count(lcp_ms),0)
          )::numeric, 1)
          from vital_samples
        ),
        'inp', (
          select round((
            100.0 * count(*) filter (where inp_ms is not null and inp_ms <= 200)
            / nullif(count(inp_ms),0)
          )::numeric, 1)
          from vital_samples
        ),
        'fcp', (select round((100.0 * count(*) filter (where fcp_ms is not null and fcp_ms <= 1800) / nullif(count(fcp_ms), 0))::numeric, 1) from vital_samples),
        'ttfb', (select round((100.0 * count(*) filter (where ttfb_ms is not null and ttfb_ms <= 800) / nullif(count(ttfb_ms), 0))::numeric, 1) from vital_samples)
      ),
      'thresholds', jsonb_build_object(
        'fcp_good_max_ms', 1800,
        'fcp_poor_above_ms', 3000,
        'ttfb_good_max_ms', 800,
        'ttfb_poor_above_ms', 1800,
        'cls_good_max', 0.1,
        'cls_poor_above', 0.25,
        'lcp_good_max_ms', 2500,
        'lcp_poor_above_ms', 4000,
        'inp_good_max_ms', 200,
        'inp_poor_above_ms', 500
      ),
      'routes', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'path', r.path,
            'samples', r.samples,
            'cls_p75', r.cls_p75,
            'lcp_p75_ms', r.lcp_p75,
            'inp_p75_ms', r.inp_p75,
            'fcp_p75_ms', r.fcp_p75,
            'ttfb_p75_ms', r.ttfb_p75,
            'cls_not_good', r.cls_not_good,
            'cls_poor', r.cls_poor
          )
          order by coalesce(r.cls_p75,0) desc, r.samples desc, r.path
        )
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
      ),
      'by_surface', coalesce((select jsonb_agg(to_jsonb(x) order by x.samples desc, x.surface) from (
        select surface_group as surface, count(*)::bigint as samples,
          count(lcp_ms)::bigint as lcp_samples, count(cls)::bigint as cls_samples, count(inp_ms)::bigint as inp_samples,
          count(fcp_ms)::bigint as fcp_samples, count(ttfb_ms)::bigint as ttfb_samples,
          round((percentile_cont(0.75) within group (order by lcp_ms))::numeric) as lcp_p75_ms,
          round((percentile_cont(0.75) within group (order by inp_ms))::numeric) as inp_p75_ms,
          round((percentile_cont(0.75) within group (order by fcp_ms))::numeric) as fcp_p75_ms,
          round((percentile_cont(0.75) within group (order by ttfb_ms))::numeric) as ttfb_p75_ms,
          round((percentile_cont(0.75) within group (order by cls))::numeric, 4) as cls_p75,
          round((100.0 * count(*) filter (where lcp_ms <= 2500) / nullif(count(lcp_ms), 0))::numeric, 1) as lcp_good_pct,
          round((100.0 * count(*) filter (where cls <= 0.1) / nullif(count(cls), 0))::numeric, 1) as cls_good_pct,
          round((100.0 * count(*) filter (where inp_ms <= 200) / nullif(count(inp_ms), 0))::numeric, 1) as inp_good_pct,
          min(ts) as first_at, max(ts) as latest_at
        from vital_ctx group by surface_group) x), '[]'::jsonb),
      'by_device', coalesce((select jsonb_agg(to_jsonb(x) order by x.samples desc, x.device) from (
        select device_group as device, count(*)::bigint as samples,
          count(lcp_ms)::bigint as lcp_samples, count(cls)::bigint as cls_samples, count(inp_ms)::bigint as inp_samples,
          count(fcp_ms)::bigint as fcp_samples, count(ttfb_ms)::bigint as ttfb_samples,
          round((percentile_cont(0.75) within group (order by lcp_ms))::numeric) as lcp_p75_ms,
          round((percentile_cont(0.75) within group (order by inp_ms))::numeric) as inp_p75_ms,
          round((percentile_cont(0.75) within group (order by fcp_ms))::numeric) as fcp_p75_ms,
          round((percentile_cont(0.75) within group (order by ttfb_ms))::numeric) as ttfb_p75_ms,
          round((percentile_cont(0.75) within group (order by cls))::numeric, 4) as cls_p75,
          round((100.0 * count(*) filter (where lcp_ms <= 2500) / nullif(count(lcp_ms), 0))::numeric, 1) as lcp_good_pct,
          round((100.0 * count(*) filter (where cls <= 0.1) / nullif(count(cls), 0))::numeric, 1) as cls_good_pct,
          round((100.0 * count(*) filter (where inp_ms <= 200) / nullif(count(inp_ms), 0))::numeric, 1) as inp_good_pct,
          min(ts) as first_at, max(ts) as latest_at
        from vital_ctx group by device_group) x), '[]'::jsonb),
      'by_build', coalesce((select jsonb_agg(to_jsonb(x) order by x.latest_at desc, x.build) from (
        select build_group as build, count(*)::bigint as samples,
          count(lcp_ms)::bigint as lcp_samples, count(cls)::bigint as cls_samples, count(inp_ms)::bigint as inp_samples,
          count(fcp_ms)::bigint as fcp_samples, count(ttfb_ms)::bigint as ttfb_samples,
          round((percentile_cont(0.75) within group (order by lcp_ms))::numeric) as lcp_p75_ms,
          round((percentile_cont(0.75) within group (order by inp_ms))::numeric) as inp_p75_ms,
          round((percentile_cont(0.75) within group (order by fcp_ms))::numeric) as fcp_p75_ms,
          round((percentile_cont(0.75) within group (order by ttfb_ms))::numeric) as ttfb_p75_ms,
          round((percentile_cont(0.75) within group (order by cls))::numeric, 4) as cls_p75,
          round((100.0 * count(*) filter (where lcp_ms <= 2500) / nullif(count(lcp_ms), 0))::numeric, 1) as lcp_good_pct,
          round((100.0 * count(*) filter (where cls <= 0.1) / nullif(count(cls), 0))::numeric, 1) as cls_good_pct,
          round((100.0 * count(*) filter (where inp_ms <= 200) / nullif(count(inp_ms), 0))::numeric, 1) as inp_good_pct,
          min(ts) as first_at, max(ts) as latest_at,
          count(*) filter (where device_group = 'mobile')::bigint as mobile_samples,
          count(*) filter (where device_group = 'desktop')::bigint as desktop_samples
        from vital_ctx group by build_group order by max(ts) desc limit 12) x), '[]'::jsonb),
      'by_article_first', coalesce((select jsonb_agg(to_jsonb(x) order by x.samples desc, x.article_first) from (
        select article_first_group as article_first, count(*)::bigint as samples,
          count(lcp_ms)::bigint as lcp_samples, count(cls)::bigint as cls_samples, count(inp_ms)::bigint as inp_samples,
          count(fcp_ms)::bigint as fcp_samples, count(ttfb_ms)::bigint as ttfb_samples,
          round((percentile_cont(0.75) within group (order by lcp_ms))::numeric) as lcp_p75_ms,
          round((percentile_cont(0.75) within group (order by inp_ms))::numeric) as inp_p75_ms,
          round((percentile_cont(0.75) within group (order by fcp_ms))::numeric) as fcp_p75_ms,
          round((percentile_cont(0.75) within group (order by ttfb_ms))::numeric) as ttfb_p75_ms,
          round((percentile_cont(0.75) within group (order by cls))::numeric, 4) as cls_p75,
          round((100.0 * count(*) filter (where lcp_ms <= 2500) / nullif(count(lcp_ms), 0))::numeric, 1) as lcp_good_pct,
          round((100.0 * count(*) filter (where cls <= 0.1) / nullif(count(cls), 0))::numeric, 1) as cls_good_pct,
          round((100.0 * count(*) filter (where inp_ms <= 200) / nullif(count(inp_ms), 0))::numeric, 1) as inp_good_pct,
          min(ts) as first_at, max(ts) as latest_at
        from vital_ctx group by article_first_group) x), '[]'::jsonb),
      'nav_timing_p75', (select jsonb_build_object(
        'samples', count(*) filter (where wait_ms is not null),
        'redirect_ms', round((percentile_cont(0.75) within group (order by redirect_ms))::numeric),
        'worker_ms', round((percentile_cont(0.75) within group (order by worker_ms))::numeric),
        'dns_ms', round((percentile_cont(0.75) within group (order by dns_ms))::numeric),
        'connect_ms', round((percentile_cont(0.75) within group (order by connect_ms))::numeric),
        'wait_ms', round((percentile_cont(0.75) within group (order by wait_ms))::numeric),
        'download_ms', round((percentile_cont(0.75) within group (order by download_ms))::numeric),
        'wait_p50_ms', round((percentile_cont(0.5) within group (order by wait_ms))::numeric)) from vital_ctx),
      'routes_by_samples', coalesce((select jsonb_agg(jsonb_build_object('path', r.path, 'samples', r.samples, 'cls_p75', r.cls_p75,
          'lcp_p75_ms', r.lcp_p75, 'inp_p75_ms', r.inp_p75, 'fcp_p75_ms', r.fcp_p75, 'ttfb_p75_ms', r.ttfb_p75) order by r.samples desc, r.path)
        from (select * from vital_route_rollup order by samples desc, path limit 20) r), '[]'::jsonb),
      'watch', (select jsonb_build_object('computed_at', c.computed_at, 'producer', c.producer, 'producer_version', c.producer_version) || c.payload
        from public.analytics_cache c where c.cache_key = 'speed_watch:latest'),
      'watch_open', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'created_at', s.created_at, 'detector', s.detector, 'title', s.title,
          'reason', s.reason, 'observed', s.observed, 'status', s.status, 'sample_size', s.sample_size, 'confidence', s.confidence) order by s.created_at desc)
        from public.system_suggestions s where (s.detector like 'web_vitals_%' or s.detector like 'post_document_%') and s.status in ('pending', 'later')), '[]'::jsonb),
      'post_document_freshness', (select jsonb_build_object('computed_at', c.computed_at) || c.payload
        from public.analytics_cache c where c.cache_key = 'post_documents:freshness_watch')
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

  -- Only server-stamped v2 rows belong to this forward-only report. Legacy
  -- anonymous rows are not guessed into people/sessions and are never rewritten.
  with measured as (
    select e.*, e.props->>'_measurement_account' as account_id,
      e.props->'measurement'->>'visitor_id' as browser_id,
      e.props->'measurement'->>'page_path' as page_path,
      case when e.props->>'_measurement_account' is not null then 'account:' || (e.props->>'_measurement_account')
        when e.props->'measurement'->>'visitor_id' is not null then 'browser:' || (e.props->'measurement'->>'visitor_id') end as audience
    from public.events e where e.ts >= v_from and e.ts < v_to and not e.is_bot
      and e.props->'_measurement_verified' = '2'::jsonb
      and (p_path_prefix is null or e.path=p_path_prefix or e.path like rtrim(p_path_prefix,'/')||'/%')
  ), visits as (
    select * from measured where surface='page' and event_type='view'
  ), people as (
    select audience, max(account_id) as account_id, count(distinct browser_id) as browsers,
      count(distinct session_id) as sessions,
      count(*) filter(where surface='page' and event_type='view') as views,
      count(*) filter(where surface not in ('page','arrival')) as actions,
      sum(case when surface='page' and event_type='engagement' then (props->>'engaged_ms')::bigint else 0 end) as engaged_ms,
      max(ts) as last_seen
    from measured where audience is not null group by audience
  )
  select v_payload || jsonb_build_object('identified_traffic',jsonb_build_object(
    'version',2,'source','events','timezone','Asia/Jerusalem','from',v_from,'to',v_to,
    'first_event',(select min(ts) from measured),
    'summary',jsonb_build_object('views',(select count(*) from visits),
      'sessions',(select count(distinct session_id) from measured),
      'browsers',(select count(distinct browser_id) from measured),
      'accounts',(select count(distinct account_id) from measured),
      'actions',(select count(*) from measured where surface not in ('page','arrival')),
      'unidentified_events',(select count(*) from measured where audience is null)),
    'pages',coalesce((select jsonb_agg(to_jsonb(x) order by views desc,page_path) from
      (select page_path,count(*) as views from visits group by page_path order by views desc,page_path limit 40) x),'[]'::jsonb),
    'arrivals',coalesce((select jsonb_agg(to_jsonb(x) order by sessions desc,source) from
      (select props->>'source' as source,count(distinct session_id) as sessions from measured
       where surface='arrival' and event_type='source' group by props->>'source' order by sessions desc,source limit 20) x),'[]'::jsonb),
    'actions',coalesce((select jsonb_agg(to_jsonb(x) order by count desc,surface,event_type) from
      (select surface,event_type,count(*) as count from measured where surface not in ('page','arrival')
       group by surface,event_type order by count desc,surface,event_type limit 40) x),'[]'::jsonb),
    'visitors',coalesce((select jsonb_agg(to_jsonb(x) order by last_seen desc,audience) from
      (select p.*, coalesce(nullif(u.display_name,''),nullif(u.username,'')) as account_name,
        (select jsonb_agg(to_jsonb(q) order by views desc,page_path) from
          (select v.page_path,count(*) as views from visits v where v.audience=p.audience group by v.page_path order by views desc,v.page_path limit 8) q) as pages
       from people p left join public.users u on u.id::text=p.account_id order by p.last_seen desc,p.audience limit 100) x),'[]'::jsonb)
  )) into v_payload;

  -- #1456: one admin reader, same time window and canonical classifier.
  with measured as materialized (
    select e.*, e.props->'measurement'->>'visitor_id' as browser_id,
      e.props->>'_measurement_account' as account_id,
      case when e.surface='journey_2029' then 'journey' when e.surface='els' then 'els'
        when e.surface='calculator_2029' and e.props->>'surface'='professional' then 'calculator_advanced'
        when e.surface='activity_2029' and e.props->>'section' in ('now','personal','raziel','calculator','calculator_advanced') then e.props->>'section' else public.fn_ti_surface2029(e.props->'measurement'->>'page_path') end as section
    from public.events e where e.ts>=v_from and e.ts<v_to
      and e.props->'_measurement_verified'='2'::jsonb
      and (p_path_prefix is null or e.path=p_path_prefix or e.path like rtrim(p_path_prefix,'/')||'/%')
  ), clean as materialized (
    select session_id,clean_classification from public.fn_ti_clean_classification(
      (v_from at time zone 'Asia/Jerusalem')::date,(v_to at time zone 'Asia/Jerusalem')::date)
  ), classified as (
    select m.*,coalesce(c.clean_classification,'unknown') as traffic_class
    from measured m left join clean c using(session_id)
  ), sessions as (
    select session_id, count(*) filter(where surface='page' and event_type='view') as pages,
      sum(case when surface='page' and event_type='engagement' then (props->>'engaged_ms')::bigint else 0 end) as engaged_ms
    from measured where session_id is not null group by session_id
  ), prior_browsers as (
    select distinct props->'measurement'->>'visitor_id' as id from public.events
    where ts>=v_from-interval '30 days' and ts<v_from and props->'_measurement_verified'='2'::jsonb
  )
  select v_payload || jsonb_build_object('site_activity',jsonb_build_object(
    'version',1,'from',v_from,'to',v_to,'generated_at',now(),'latest_event',(select max(ts) from measured),
    'source','events / fn_ti_clean_classification','history','forward_only',
    'summary',jsonb_build_object(
      'entrances',(select count(distinct session_id) from measured where surface='arrival' and event_type='source'),
      'views',(select count(*) from measured where surface='page' and event_type='view'),
      'browsers',(select count(distinct browser_id) from measured),
      'accounts',(select count(distinct account_id) from measured),
      'registered_accounts',(select count(*) from auth.users where created_at>=v_from and created_at<v_to and email_confirmed_at is not null),
      'active_accounts_5m',(select count(distinct account_id) from measured where ts>=v_to-interval '5 minutes'),
      'new_observed_browsers',(select count(distinct browser_id) from measured where browser_id is not null and not exists(select 1 from prior_browsers where id=browser_id)),
      'returning_observed_browsers',(select count(distinct browser_id) from measured where exists(select 1 from prior_browsers where id=browser_id)),
      'unknown_identity_events',(select count(*) from measured where browser_id is null and account_id is null),
      'single_page_unengaged_sessions',(select count(*) from sessions where pages=1 and engaged_ms<15000)),
    'traffic_classes',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select traffic_class,count(*) as events,count(distinct session_id) as sessions from classified group by traffic_class)x),'[]'::jsonb),
    'sections',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select section,count(*) filter(where surface='page' and event_type='view') as views,
        count(*) filter(where (surface='activity_2029' and event_type='view') or (surface='calculator_2029' and event_type='calculator_view')) as domain_views,
        count(*) filter(where surface='activity_2029' and event_type<>'view') as actions,max(ts) as latest_event
      from measured group by section)x),'[]'::jsonb),
    'actions',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select surface,event_type,count(*) as events from measured
      where surface not in ('page','arrival','performance') group by surface,event_type order by events desc limit 100)x),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(x) order by day) from (
      select (ts at time zone 'Asia/Jerusalem')::date as day,
        count(*) filter(where surface='page' and event_type='view') as views,
        count(*) filter(where surface='activity_2029' and event_type='compute') as computes,
        count(*) filter(where (surface='activity_2029' and event_type='search') or (surface='els' and event_type in ('search','cross_search'))) as searches
      from measured group by 1)x),'[]'::jsonb),
    'methods',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select props->>'method' as method,count(*) as selections from measured
      where surface='calculator_2029' and event_type='result_selected' and props ? 'method'
      group by props->>'method' order by selections desc limit 30)x),'[]'::jsonb),
    'top_numbers',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select props->'measurement'->>'page_path' as path,count(*) as views
      from measured where surface='page' and event_type='view'
        and props->'measurement'->>'page_path' ~ '^/number/[0-9]{1,5}$'
      group by 1 order by views desc,path limit 20)x),'[]'::jsonb),
    'top_phrases',coalesce((select jsonb_agg(to_jsonb(x)) from (
      select g.phrase,g.ragil as value,count(*) as selections from measured m
      join public.gematria_words g on g.id::text=m.props->>'word_id'
      where m.surface='activity_2029' and m.event_type='select'
        and g.public_trend_approved and public.fn_ti_public_word_eligible(g.id)
      group by g.id,g.phrase,g.ragil order by selections desc,g.phrase limit 20)x),'[]'::jsonb),
    'publications',jsonb_build_object('public_ciphers',(select count(*) from public.els_records
      where status='published' and visibility='public' and not coalesce(home_hidden,false)),
      'approved_convergences',(select count(*) from public.topic_cards_public)),
    'legacy_search_latest',(select max(created_at) from public.search_log),
    'legacy_wall_latest',(select max(last_at) from public.gematria_wall),
    'limitations',jsonb_build_array('bots_observed_at_edge_not_reingested','new_means_not_observed_in_prior_30d',
      'bounce_is_single_page_and_under_15s_not_proven_abandonment','legacy_search_consent_not_recorded',
      'typing_is_not_search','first_compute_legacy_not_total_compute','private_views_content_free_only','registrations_from_auth_owner_not_client_events')
  )) into v_payload;

  return v_payload;
end;
$function$


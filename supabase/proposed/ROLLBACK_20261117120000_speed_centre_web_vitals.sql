-- ROLLBACK of supabase/migrations/20261117120000_speed_centre_web_vitals.sql (speed centre, ZURIEL 17.11.2026). PROPOSED ONLY: apply only on
-- an explicit decision. It removes exactly what that migration added: the hourly call from fn_health_watch, the added parts of
-- admin_2029_analytics (back to its reviewed definition, md5 checked; fn_health_watch back to its exact previous text), and the two new
-- functions. Suggestions and the heartbeat
-- the watch already wrote stay as provenance (system_suggestions / analytics_cache 'speed_watch:latest').
-- Roll the website back first (the speed centre reads the added keys but shows "not available" without them).
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
do $guard$
begin
  if to_regprocedure('public.fn_web_vitals_watch()') is null or to_regprocedure('public.fn_web_vital_surface_group(text,text)') is null then
    raise exception 'the speed centre is not applied; nothing to roll back';
  end if;
end $guard$;

do $unpatch_watch$
declare d text := pg_get_functiondef('public.fn_health_watch()'::regprocedure); n text;
begin
  n := replace(d, $new6$  -- Web Vitals watch (ZURIEL 17.11.2026, System Suggestions): once an hour on this 15-minute path. Regressions and measurement gaps
  -- become de-duplicated suggestions; its heartbeat (analytics_cache speed_watch:latest) shows a stopped watch as stale.
  if extract(minute from now()) < 15 then
    begin
      perform public.fn_web_vitals_watch();
    exception when others then
      null;
    end;
  end if;

  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$new6$, $old6$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old6$);
  if (length(d) - length(replace(d, $new6$  -- Web Vitals watch (ZURIEL 17.11.2026, System Suggestions): once an hour on this 15-minute path. Regressions and measurement gaps
  -- become de-duplicated suggestions; its heartbeat (analytics_cache speed_watch:latest) shows a stopped watch as stale.
  if extract(minute from now()) < 15 then
    begin
      perform public.fn_web_vitals_watch();
    exception when others then
      null;
    end;
  end if;

  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$new6$, ''))) <> length($new6$  -- Web Vitals watch (ZURIEL 17.11.2026, System Suggestions): once an hour on this 15-minute path. Regressions and measurement gaps
  -- become de-duplicated suggestions; its heartbeat (analytics_cache speed_watch:latest) shows a stopped watch as stale.
  if extract(minute from now()) < 15 then
    begin
      perform public.fn_web_vitals_watch();
    exception when others then
      null;
    end;
  end if;

  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$new6$) or n = d then raise exception 'rollback anchor 6 not found exactly once'; end if;
  d := n;
  execute d;
end $unpatch_watch$;

do $unpatch_reader$
declare d text := pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure); n text;
begin
  n := replace(d, $new1$      props->>'nav_type' as nav_type,
      props->>'build' as build,
      props->>'device_class' as device_class,
      props->>'article_first' as article_first,
      props->'nav_timing' as nav_timing,
      props->'cls_shift_sources' as cls_shift_sources,
$new1$, $old1$      props->>'nav_type' as nav_type,
      props->'cls_shift_sources' as cls_shift_sources,
$old1$);
  if (length(d) - length(replace(d, $new1$      props->>'nav_type' as nav_type,
      props->>'build' as build,
      props->>'device_class' as device_class,
      props->>'article_first' as article_first,
      props->'nav_timing' as nav_timing,
      props->'cls_shift_sources' as cls_shift_sources,
$new1$, ''))) <> length($new1$      props->>'nav_type' as nav_type,
      props->>'build' as build,
      props->>'device_class' as device_class,
      props->>'article_first' as article_first,
      props->'nav_timing' as nav_timing,
      props->'cls_shift_sources' as cls_shift_sources,
$new1$) or n = d then raise exception 'rollback anchor 1 not found exactly once'; end if;
  d := n;
  n := replace(d, $new2$  vital_ctx as (
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
$new2$, $old2$  vital_route_rollup as (
$old2$);
  if (length(d) - length(replace(d, $new2$  vital_ctx as (
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
$new2$, ''))) <> length($new2$  vital_ctx as (
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
$new2$) or n = d then raise exception 'rollback anchor 2 not found exactly once'; end if;
  d := n;
  n := replace(d, $new3$    'web_vitals', jsonb_build_object(
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
$new3$, $old3$    'web_vitals', jsonb_build_object(
      'samples', (select count(*) from vital_samples),
$old3$);
  if (length(d) - length(replace(d, $new3$    'web_vitals', jsonb_build_object(
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
$new3$, ''))) <> length($new3$    'web_vitals', jsonb_build_object(
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
$new3$) or n = d then raise exception 'rollback anchor 3 not found exactly once'; end if;
  d := n;
  n := replace(d, $new4$          from vital_samples
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
$new4$, $old4$          from vital_samples
        )
      ),
      'thresholds', jsonb_build_object(
        'cls_good_max', 0.1,
$old4$);
  if (length(d) - length(replace(d, $new4$          from vital_samples
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
$new4$, ''))) <> length($new4$          from vital_samples
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
$new4$) or n = d then raise exception 'rollback anchor 4 not found exactly once'; end if;
  d := n;
  n := replace(d, $new5$        limit 1
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
        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
    'visitors', coalesce((
$new5$, $old5$        limit 1
      )
    ),
    'visitors', coalesce((
$old5$);
  if (length(d) - length(replace(d, $new5$        limit 1
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
        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
    'visitors', coalesce((
$new5$, ''))) <> length($new5$        limit 1
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
        from public.system_suggestions s where s.detector like 'web_vitals_%' and s.status in ('pending', 'later')), '[]'::jsonb)
    ),
    'visitors', coalesce((
$new5$) or n = d then raise exception 'rollback anchor 5 not found exactly once'; end if;
  d := n;
  execute d;
  if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) <> 'c57a1005a8f3195f422ac4b8cee437eb' then
    raise exception 'admin_2029_analytics did not return to its reviewed definition';
  end if;
end $unpatch_reader$;

drop function public.fn_web_vitals_watch();
drop function public.fn_web_vital_surface_group(text, text);
notify pgrst, 'reload schema';
commit;

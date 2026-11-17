-- Speed centre (ZURIEL 17.11.2026, "ריכוז, חיבור ופיקוח על תיקוני המהירות בתוך מרכז הבקרה הקיים"; standing approval in session).
-- EXTEND_EXISTING, additive only: nothing is dropped or revoked from an existing object; no new table, store or analytics system.
--   1. public.fn_web_vital_surface_group(path, article_first): one classification of a sample's page (home / post / community / other),
--      shared by the reader and the watch.
--   2. public.admin_2029_analytics (Traffic Intelligence reader, the one /2029/control already uses): web_vitals gains the time of the
--      first and latest sample, per-metric sample counts, the coverage of the field context, FCP and TTFB good shares and thresholds,
--      breakdowns by page kind, device class, build (the entry file name — not a Git SHA) and article-first state, the p75 parts of the
--      first byte (nav_timing), the routes with most samples, and the speed watch's heartbeat and open findings. Everything it returned
--      before (summary, visitors, identified_traffic, routes, ...) is unchanged. Applied as an exact patch of the live definition
--      (md5 c57a1005a8f3195f422ac4b8cee437eb, the definition in supabase/proposed/20261115180000_measurement_identity_PROPOSAL.sql).
--   3. public.fn_web_vitals_watch() (System Suggestions / Health): regressions and measurement gaps as de-duplicated suggestions through
--      the existing suggest_add, and its heartbeat in the existing analytics_cache ('speed_watch:latest'). Not callable by anon/authenticated.
--   4. public.fn_health_watch (the existing 15-minute health-watch job) calls it once an hour. Exact patch of the live definition
--      (md5 f60c3bc51fb7201cd28a00070da3f38b); one block is added before the reliability watch, nothing else changes.
-- Apply this exact file in one call. Rollback: supabase/proposed/ROLLBACK_20261117120000_speed_centre_web_vitals.sql
-- Test: tests/sql/speed_centre_web_vitals_v1.sql (local Postgres; .github/workflows/speed-centre-sql-gate.yml)
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
do $guard$
begin
  if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) <> 'c57a1005a8f3195f422ac4b8cee437eb' then
    raise exception 'admin_2029_analytics is not the reviewed definition; review before applying';
  end if;
  if md5(pg_get_functiondef('public.fn_health_watch()'::regprocedure)) <> 'f60c3bc51fb7201cd28a00070da3f38b' then
    raise exception 'fn_health_watch is not the reviewed definition; review before applying';
  end if;
  if to_regprocedure('public.suggest_add(text,text,text,text,jsonb,integer,integer,text,text)') is null then
    raise exception 'suggest_add is missing; review before applying';
  end if;
  if to_regprocedure('public.fn_web_vital_surface_group(text,text)') is not null or to_regprocedure('public.fn_web_vitals_watch()') is not null then
    raise exception 'the speed centre functions already exist; review before applying';
  end if;
end $guard$;

create function public.fn_web_vital_surface_group(p_path text, p_article_first text)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $function$
  -- The Home (and its 2029 alias), the Community, a Post (its /post/ address, an article-first document, or an original single-segment
  -- Hebrew address), or anything else. Used by the speed reader and the speed watch alike.
  select case
    when p_path in ('/', '/2029') then 'home'
    when p_path = '/community' or p_path like '/community/%' then 'community'
    when p_path like '/post/%' or coalesce(p_article_first, '') in ('served', 'adopted', 'replaced')
      or (p_path ~ '^/[^/]+/?$' and (p_path ~ '[א-ת]' or p_path ~* '%d7%')) then 'post'
    else 'other'
  end
$function$;

create function public.fn_web_vitals_watch()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
-- System Suggestions / Health (ZURIEL 17.11.2026, speed centre): an hourly look at the field Web Vitals the site already collects
-- (events.performance.web_vital: document navigations, internal admins excluded, one sample per document). It compares the last 24 hours
-- with the 7 days before them (two windows that do not overlap), for Home / Post / Community / the whole site, and records
--   * a regression: LCP, CLS or INP p75 above Google's "good" and clearly worse than the baseline, with enough samples on both sides;
--   * a measurement gap: page views in the last 6 hours and no speed sample at all;
-- as de-duplicated suggestions through the existing suggest_add, and its own result as the heartbeat analytics_cache 'speed_watch:latest'.
-- It changes nothing on the site and decides nothing (system_suggestions_law: the system only observes, explains and suggests).
declare
  v_now timestamptz := now();
  v_groups jsonb := '[]'::jsonb;
  v_findings jsonb := '[]'::jsonb;
  v_views_6h bigint := 0;
  v_samples_6h bigint := 0;
  v_latest timestamptz;
  v_status text := 'ok';
  v_payload jsonb;
  v_he text;
  g record;
  m record;
begin
  with raw as (
    select e.ts, e.path, e.props
    from public.events e
    left join public.persons pe on pe.person_id = e.person_id
    left join public.users u on u.id = pe.account_user_id
    where e.ts >= v_now - interval '8 days' and e.ts < v_now
      and e.surface = 'performance' and e.event_type = 'web_vital'
      and coalesce(u.role, '') <> 'admin'
      and coalesce(e.props->>'vitals_version', '') = '1'
      and nullif(e.props->>'sample_id', '') is not null
  ), s as (
    select distinct on (props->>'sample_id') ts, path, props
    from raw
    order by props->>'sample_id', ts desc, case when props->>'phase' = 'final' then 1 else 0 end desc
  ), v as (
    select case when ts >= v_now - interval '24 hours' then 'current' else 'baseline' end as win,
      public.fn_web_vital_surface_group(path, props->>'article_first') as grp,
      case when (props->>'lcp_ms') ~ '^[0-9]+([.][0-9]+)?$' then (props->>'lcp_ms')::double precision end as lcp,
      case when (props->>'cls') ~ '^[0-9]+([.][0-9]+)?$' then (props->>'cls')::double precision end as cls,
      case when (props->>'inp_ms') ~ '^[0-9]+([.][0-9]+)?$' then (props->>'inp_ms')::double precision end as inp
    from s
  ), grouped as (
    select win, grp, lcp, cls, inp from v where grp in ('home', 'post', 'community')
    union all
    select win, 'all', lcp, cls, inp from v
  ), agg as (
    select grp, win, count(*) as n,
      count(lcp) as n_lcp, percentile_cont(0.75) within group (order by lcp) as lcp,
      count(cls) as n_cls, percentile_cont(0.75) within group (order by cls) as cls,
      count(inp) as n_inp, percentile_cont(0.75) within group (order by inp) as inp
    from grouped
    group by grp, win
  )
  select coalesce(jsonb_agg(jsonb_build_object('group', grp, 'window', win, 'samples', n,
      'lcp_samples', n_lcp, 'lcp_p75_ms', round(lcp::numeric), 'cls_samples', n_cls, 'cls_p75', round(cls::numeric, 4),
      'inp_samples', n_inp, 'inp_p75_ms', round(inp::numeric)) order by grp, win), '[]'::jsonb)
  into v_groups
  from agg;

  for g in
    select c.value->>'group' as grp, c.value as cur, b.value as base
    from jsonb_array_elements(v_groups) c
    join jsonb_array_elements(v_groups) b on b.value->>'group' = c.value->>'group' and b.value->>'window' = 'baseline'
    where c.value->>'window' = 'current'
  loop
    for m in
      select * from (values
        ('lcp', 'lcp_p75_ms', 'lcp_samples', 2500::numeric, 0.20::numeric, 300::numeric),
        ('cls', 'cls_p75', 'cls_samples', 0.1::numeric, 0.50::numeric, 0.03::numeric),
        ('inp', 'inp_p75_ms', 'inp_samples', 200::numeric, 0.25::numeric, 50::numeric)
      ) t(metric, p_key, n_key, good, rel, abs_min)
    loop
      if coalesce((g.cur->>m.n_key)::int, 0) >= 20 and coalesce((g.base->>m.n_key)::int, 0) >= 40
         and (g.cur->>m.p_key) is not null and (g.base->>m.p_key) is not null
         and (g.cur->>m.p_key)::numeric > m.good
         and (g.cur->>m.p_key)::numeric >= (g.base->>m.p_key)::numeric * (1 + m.rel)
         and (g.cur->>m.p_key)::numeric - (g.base->>m.p_key)::numeric >= m.abs_min then
        v_he := case g.grp when 'home' then 'דף הבית' when 'post' then 'פוסטים' when 'community' then 'קהילה' else 'כל האתר' end;
        v_findings := v_findings || jsonb_build_object('kind', 'regression', 'group', g.grp, 'metric', m.metric,
          'current_p75', (g.cur->>m.p_key)::numeric, 'baseline_p75', (g.base->>m.p_key)::numeric,
          'current_samples', (g.cur->>m.n_key)::int, 'baseline_samples', (g.base->>m.n_key)::int);
        perform public.suggest_add('performance', 'web_vitals_regression',
          format('האטה ב%s: %s p75 %s (לפני: %s)', v_he, upper(m.metric), g.cur->>m.p_key, g.base->>m.p_key),
          format('ב־24 השעות האחרונות %s p75 ב%s הוא %s לעומת %s בשבעת הימים שלפני כן (%s מול %s דגימות), מעל סף "טוב" של Google (%s). זו מדידת פתיחת מסמך של גולשים, לא מעבר פנימי, והיא אינה מוכיחה סיבה.',
            upper(m.metric), v_he, g.cur->>m.p_key, g.base->>m.p_key, g.cur->>m.n_key, g.base->>m.n_key, m.good),
          jsonb_build_object('group', g.grp, 'metric', m.metric, 'current', g.cur, 'baseline', g.base,
            'windows', jsonb_build_object('current_hours', 24, 'baseline', 'the 7 days before the current window'), 'checked_at', v_now),
          60, (g.cur->>m.n_key)::int, 'medium', 'web_vitals_regression:' || g.grp || ':' || m.metric);
      end if;
    end loop;
  end loop;

  select count(*) into v_views_6h
  from public.events
  where ts >= v_now - interval '6 hours' and ts < v_now and surface = 'page' and event_type = 'view' and not coalesce(is_bot, false);
  select count(*) into v_samples_6h
  from public.events
  where ts >= v_now - interval '6 hours' and ts < v_now and surface = 'performance' and event_type = 'web_vital';
  select max(ts) into v_latest
  from public.events
  where ts >= v_now - interval '8 days' and ts < v_now and surface = 'performance' and event_type = 'web_vital';

  if v_views_6h >= 20 and v_samples_6h = 0 then
    v_findings := v_findings || jsonb_build_object('kind', 'measurement_gap', 'views_6h', v_views_6h, 'latest_sample_at', v_latest);
    perform public.suggest_add('performance', 'web_vitals_measurement_gap', 'מדידת המהירות הפסיקה',
      format('ב־6 השעות האחרונות נרשמו %s צפיות בדפים ואף דגימת מהירות אחת. הדגימה האחרונה: %s. חוסר מדידה אינו מהירות תקינה.',
        v_views_6h, coalesce(to_char(v_latest at time zone 'Asia/Jerusalem', 'DD.MM HH24:MI'), 'אין בשמונת הימים האחרונים')),
      jsonb_build_object('views_6h', v_views_6h, 'samples_6h', 0, 'latest_sample_at', v_latest, 'checked_at', v_now),
      80, least(v_views_6h, 2147483647)::int, 'high', 'web_vitals_measurement_gap');
  end if;

  v_status := case
    when exists (select 1 from jsonb_array_elements(v_findings) f where f->>'kind' = 'measurement_gap') then 'measurement_gap'
    when exists (select 1 from jsonb_array_elements(v_findings) f where f->>'kind' = 'regression') then 'regression'
    when coalesce((select (x->>'samples')::int from jsonb_array_elements(v_groups) x where x->>'group' = 'all' and x->>'window' = 'current'), 0) < 20 then 'insufficient_samples'
    else 'ok' end;

  v_payload := jsonb_build_object(
    'status', v_status, 'checked_at', v_now,
    'windows', jsonb_build_object('current_hours', 24, 'baseline', 'the 7 days before the current window', 'gap_hours', 6),
    'rules', jsonb_build_object('min_current_samples', 20, 'min_baseline_samples', 40,
      'lcp', jsonb_build_object('good_ms', 2500, 'worse_by', 0.20, 'min_change_ms', 300),
      'cls', jsonb_build_object('good', 0.1, 'worse_by', 0.50, 'min_change', 0.03),
      'inp', jsonb_build_object('good_ms', 200, 'worse_by', 0.25, 'min_change_ms', 50),
      'gap', jsonb_build_object('min_views_6h', 20, 'samples_6h', 0),
      'dedupe', 'suggest_add dedupe_key per group and metric (one open suggestion; a rejection mutes it for 30 days)'),
    'groups', v_groups, 'findings', v_findings,
    'views_6h', v_views_6h, 'samples_6h', v_samples_6h, 'latest_sample_at', v_latest,
    'scope', 'document_navigation_hard_load_rum_not_crux',
    'owner', 'system_suggestions_law (watch) + traffic_intelligence_law (measurement)');
  insert into public.analytics_cache (cache_key, payload, computed_at, cache_kind, producer, producer_version, billable_state)
  values ('speed_watch:latest', v_payload, v_now, 'watch_result', 'fn_web_vitals_watch', 'v1', 'NOT_BILLABLE')
  on conflict (cache_key) do update set payload = excluded.payload, computed_at = excluded.computed_at, cache_kind = excluded.cache_kind,
    producer = excluded.producer, producer_version = excluded.producer_version, billable_state = excluded.billable_state;
  return v_payload;
end;
$function$;

revoke all on function public.fn_web_vitals_watch() from public, anon, authenticated;
grant execute on function public.fn_web_vitals_watch() to service_role;

do $patch_reader$
declare d text := pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure); n text;
begin
  n := replace(d, $old1$      props->>'nav_type' as nav_type,
      props->'cls_shift_sources' as cls_shift_sources,
$old1$, $new1$      props->>'nav_type' as nav_type,
      props->>'build' as build,
      props->>'device_class' as device_class,
      props->>'article_first' as article_first,
      props->'nav_timing' as nav_timing,
      props->'cls_shift_sources' as cls_shift_sources,
$new1$);
  if (length(d) - length(replace(d, $old1$      props->>'nav_type' as nav_type,
      props->'cls_shift_sources' as cls_shift_sources,
$old1$, ''))) <> length($old1$      props->>'nav_type' as nav_type,
      props->'cls_shift_sources' as cls_shift_sources,
$old1$) or n = d then raise exception 'anchor 1 not found exactly once'; end if;
  d := n;
  n := replace(d, $old2$  vital_route_rollup as (
$old2$, $new2$  vital_ctx as (
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
$new2$);
  if (length(d) - length(replace(d, $old2$  vital_route_rollup as (
$old2$, ''))) <> length($old2$  vital_route_rollup as (
$old2$) or n = d then raise exception 'anchor 2 not found exactly once'; end if;
  d := n;
  n := replace(d, $old3$    'web_vitals', jsonb_build_object(
      'samples', (select count(*) from vital_samples),
$old3$, $new3$    'web_vitals', jsonb_build_object(
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
$new3$);
  if (length(d) - length(replace(d, $old3$    'web_vitals', jsonb_build_object(
      'samples', (select count(*) from vital_samples),
$old3$, ''))) <> length($old3$    'web_vitals', jsonb_build_object(
      'samples', (select count(*) from vital_samples),
$old3$) or n = d then raise exception 'anchor 3 not found exactly once'; end if;
  d := n;
  n := replace(d, $old4$          from vital_samples
        )
      ),
      'thresholds', jsonb_build_object(
        'cls_good_max', 0.1,
$old4$, $new4$          from vital_samples
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
$new4$);
  if (length(d) - length(replace(d, $old4$          from vital_samples
        )
      ),
      'thresholds', jsonb_build_object(
        'cls_good_max', 0.1,
$old4$, ''))) <> length($old4$          from vital_samples
        )
      ),
      'thresholds', jsonb_build_object(
        'cls_good_max', 0.1,
$old4$) or n = d then raise exception 'anchor 4 not found exactly once'; end if;
  d := n;
  n := replace(d, $old5$        limit 1
      )
    ),
    'visitors', coalesce((
$old5$, $new5$        limit 1
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
$new5$);
  if (length(d) - length(replace(d, $old5$        limit 1
      )
    ),
    'visitors', coalesce((
$old5$, ''))) <> length($old5$        limit 1
      )
    ),
    'visitors', coalesce((
$old5$) or n = d then raise exception 'anchor 5 not found exactly once'; end if;
  d := n;
  execute d;
end $patch_reader$;

do $patch_watch$
declare d text := pg_get_functiondef('public.fn_health_watch()'::regprocedure); n text;
begin
  n := replace(d, $old6$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old6$, $new6$  -- Web Vitals watch (ZURIEL 17.11.2026, System Suggestions): once an hour on this 15-minute path. Regressions and measurement gaps
  -- become de-duplicated suggestions; its heartbeat (analytics_cache speed_watch:latest) shows a stopped watch as stale.
  if extract(minute from now()) < 15 then
    begin
      perform public.fn_web_vitals_watch();
    exception when others then
      null;
    end;
  end if;

  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$new6$);
  if (length(d) - length(replace(d, $old6$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old6$, ''))) <> length($old6$  -- G3_RELIABILITY_PRECLOSE: incident + dead-man + heartbeat, on the same 15-minute path.
$old6$) or n = d then raise exception 'anchor 6 not found exactly once'; end if;
  d := n;
  execute d;
end $patch_watch$;

do $check$
declare r jsonb;
begin
  if md5(pg_get_functiondef('public.admin_2029_analytics(integer,text)'::regprocedure)) = 'c57a1005a8f3195f422ac4b8cee437eb'
     or md5(pg_get_functiondef('public.fn_health_watch()'::regprocedure)) = 'f60c3bc51fb7201cd28a00070da3f38b' then
    raise exception 'a patch did not take effect';
  end if;
  if has_function_privilege('anon', 'public.admin_2029_analytics(integer,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.admin_2029_analytics(integer,text)', 'execute')
     or has_function_privilege('anon', 'public.fn_web_vitals_watch()', 'execute')
     or has_function_privilege('authenticated', 'public.fn_web_vitals_watch()', 'execute') then
    raise exception 'unexpected privileges after the speed centre change';
  end if;
  if pg_get_functiondef('public.fn_health_watch()'::regprocedure) not like '%perform public.fn_web_vitals_watch();%' then
    raise exception 'fn_health_watch does not call the speed watch';
  end if;
  r := public.fn_web_vitals_watch();
  if r->>'status' not in ('ok', 'regression', 'measurement_gap', 'insufficient_samples') then
    raise exception 'speed watch returned no status';
  end if;
end $check$;

notify pgrst, 'reload schema';
commit;

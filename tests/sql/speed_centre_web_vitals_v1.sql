-- Speed centre (ZURIEL 17.11.2026): the extended Traffic Intelligence reader and the speed watch, on a local fixture.
-- Run after tests/sql/speed_centre_fixture.sql, the reviewed base definitions and the migration (see .github/workflows/speed-centre-sql-gate.yml).
\set ON_ERROR_STOP on
begin;
insert into public.users (id, role, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'admin', 'מנהל'), ('00000000-0000-4000-8000-0000000000b1', 'user', 'קורא');
insert into public.persons (person_id, account_user_id) values ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a1');

-- One web-vital document sample (vitals_version 1, its field context), at `age` before now.
create function pg_temp.vital(p_age interval, p_path text, p_lcp numeric, p_cls numeric, p_inp numeric, p_build text, p_device text, p_af text, p_person uuid default null, p_sample text default null)
returns void language sql as $$
  insert into public.events (ts, sod_id, person_id, surface, event_type, path, props)
  values (now() - p_age, 'sod-' || md5(random()::text), p_person, 'performance', 'web_vital', p_path,
    jsonb_strip_nulls(jsonb_build_object('vitals_version', '1', 'sample_id', coalesce(p_sample, gen_random_uuid()::text), 'phase', 'final',
      'lcp_ms', p_lcp, 'cls', p_cls, 'inp_ms', p_inp, 'fcp_ms', p_lcp / 2, 'ttfb_ms', 600,
      'build', p_build, 'device_class', p_device, 'article_first', p_af,
      'nav_timing', case when p_build is null then null else jsonb_build_object('wait_ms', 500, 'dns_ms', 0, 'connect_ms', 10, 'download_ms', 20, 'worker_ms', 5) end)));
$$;

\o /dev/null
-- Baseline (2 to 7 days ago): Home LCP 2000, Posts 2600. Current (last 24 hours): Home LCP 3200 (a regression), Posts 2650 (not one).
select pg_temp.vital(make_interval(hours => 30 + i), '/', 2000, 0.02, 100, '2029-OLD', 'mobile', 'none') from generate_series(1, 50) i;
select pg_temp.vital(make_interval(hours => 30 + i), '/שביל-' || i, 2600, 0.01, 90, null, null, null) from generate_series(1, 50) i;
select pg_temp.vital(make_interval(mins => 5 * i), '/', 3200, 0.02, 100, '2029-NEW', case when i % 2 = 0 then 'mobile' else 'desktop' end, 'none') from generate_series(1, 25) i;
select pg_temp.vital(make_interval(mins => 5 * i), '/post/:item', 2650, 0.01, 90, '2029-NEW', 'mobile', 'adopted') from generate_series(1, 25) i;
select pg_temp.vital(make_interval(mins => 4), '/community/chat', 1800, 0.2, 120, '2029-NEW', 'desktop', 'none');
-- The same document twice (a 15 s checkpoint and its final row) counts once; an administrator's samples never count.
select pg_temp.vital(interval '3 minutes', '/community/chat', 1800, 0.2, 120, '2029-NEW', 'desktop', 'none', null, 'dup-sample');
select pg_temp.vital(interval '2 minutes', '/community/chat', 1800, 0.2, 120, '2029-NEW', 'desktop', 'none', null, 'dup-sample');
select pg_temp.vital(interval '1 minute', '/', 99999, 9, 9999, '2029-NEW', 'desktop', 'none', '00000000-0000-4000-8000-0000000000a2');
\o

-- ── the watch ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
do $t$
declare r jsonb; n int;
begin
  r := public.fn_web_vitals_watch();
  if r->>'status' <> 'regression' then raise exception 'watch status %, expected regression: %', r->>'status', r; end if;
  if not exists (select 1 from public.system_suggestions where dedupe_key = 'web_vitals_regression:home:lcp' and status = 'pending' and category = 'performance' and detector = 'web_vitals_regression') then
    raise exception 'no Home LCP regression suggestion';
  end if;
  if exists (select 1 from public.system_suggestions where dedupe_key = 'web_vitals_regression:post:lcp') then raise exception 'Posts LCP 2650 vs 2600 is not a regression'; end if;
  if exists (select 1 from public.system_suggestions where dedupe_key like 'web_vitals_regression:%:cls' or dedupe_key like 'web_vitals_regression:%:inp') then
    raise exception 'CLS/INP below their good thresholds or without enough samples must not be reported';
  end if;
  if (select (x->>'samples')::int from jsonb_array_elements(r->'groups') x where x->>'group' = 'home' and x->>'window' = 'current') <> 25 then
    raise exception 'Home current samples: the administrator''s sample must not count';
  end if;
  select count(*) into n from public.system_suggestions where detector like 'web_vitals_%';
  r := public.fn_web_vitals_watch();
  if (select count(*) from public.system_suggestions where detector like 'web_vitals_%') <> n then raise exception 'a second run duplicated a suggestion'; end if;
  if not exists (select 1 from public.analytics_cache where cache_key = 'speed_watch:latest' and payload->>'status' = 'regression' and producer = 'fn_web_vitals_watch' and billable_state = 'NOT_BILLABLE') then
    raise exception 'no heartbeat';
  end if;
end $t$;

-- ── the reader ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
do $t$
declare r jsonb; w jsonb;
begin
  begin
    perform public.admin_2029_analytics(48, null);
    raise exception 'a non-administrator read the report';
  exception when others then
    if sqlerrm <> 'not authorized' then raise; end if;
  end;
  perform set_config('test.is_admin', 'true', true);
  r := public.admin_2029_analytics(24 * 8, null);
  w := r->'web_vitals';
  if w->>'samples' <> '152' then raise exception 'samples % (expected 152: 50+50+25+25+1+1, no admin, the duplicate once)', w->>'samples'; end if;
  if (w->'sample_counts'->>'lcp')::int <> 152 or (w->'sample_counts'->>'ttfb')::int <> 152 then raise exception 'per-metric sample counts %', w->'sample_counts'; end if;
  if (w->'context_coverage'->>'build')::int <> 102 or (w->'context_coverage'->>'nav_timing')::int <> 102 then raise exception 'context coverage % (50 historical samples carry none)', w->'context_coverage'; end if;
  if w->'thresholds'->>'ttfb_good_max_ms' <> '800' or w->'thresholds'->>'fcp_good_max_ms' <> '1800' or w->'thresholds'->>'cls_good_max' <> '0.1' then raise exception 'thresholds %', w->'thresholds'; end if;
  if (w->'good_rate_pct'->>'ttfb')::numeric <> 100 or w->'good_rate_pct'->'fcp' is null or w->'good_rate_pct'->'lcp' is null then raise exception 'good shares %', w->'good_rate_pct'; end if;
  if (select (x->>'samples')::int from jsonb_array_elements(w->'by_surface') x where x->>'surface' = 'home') <> 75
     or (select (x->>'samples')::int from jsonb_array_elements(w->'by_surface') x where x->>'surface' = 'post') <> 75
     or (select (x->>'samples')::int from jsonb_array_elements(w->'by_surface') x where x->>'surface' = 'community') <> 2 then
    raise exception 'by_surface %', w->'by_surface';
  end if;
  if (select (x->>'samples')::int from jsonb_array_elements(w->'by_build') x where x->>'build' = 'unknown') <> 50
     or (select (x->>'mobile_samples')::int from jsonb_array_elements(w->'by_build') x where x->>'build' = '2029-NEW') <> 37 then
    raise exception 'by_build %', w->'by_build';
  end if;
  if (select (x->>'samples')::int from jsonb_array_elements(w->'by_device') x where x->>'device' = 'unknown') <> 50 then raise exception 'by_device %', w->'by_device'; end if;
  if (select (x->>'samples')::int from jsonb_array_elements(w->'by_article_first') x where x->>'article_first' = 'adopted') <> 25 then raise exception 'by_article_first %', w->'by_article_first'; end if;
  if (w->'nav_timing_p75'->>'samples')::int <> 102 or (w->'nav_timing_p75'->>'wait_ms')::int <> 500 then raise exception 'nav_timing_p75 %', w->'nav_timing_p75'; end if;
  if jsonb_array_length(w->'routes_by_samples') < 3 or w->'routes_by_samples'->0->>'path' <> '/' then raise exception 'routes_by_samples %', w->'routes_by_samples'; end if;
  if w->'latest_sample_at' is null or w->'first_sample_at' is null then raise exception 'sample times'; end if;
  if w->'watch'->>'status' <> 'regression' or w->'watch'->'computed_at' is null then raise exception 'watch heartbeat in the reader %', w->'watch'; end if;
  if not exists (select 1 from jsonb_array_elements(w->'watch_open') x where x->>'detector' = 'web_vitals_regression') then raise exception 'open findings %', w->'watch_open'; end if;
  -- Everything the reader returned before is still there.
  if r->'summary' is null or r->'visitors' is null or r->'identified_traffic' is null or w->'routes' is null or w->'p75' is null or w->'classification' is null or w->'latest_cls_issue' is null then
    raise exception 'an existing part of the report is missing';
  end if;
  if r->'meta'->>'owner' <> 'traffic_intelligence_law' then raise exception 'meta changed'; end if;
end $t$;

-- ── a measurement gap: page views and no speed sample in the last 6 hours ─────────────────────────────────────────────────────────────
delete from public.events where surface = 'performance' and ts > now() - interval '6 hours';
insert into public.events (ts, surface, event_type, path) select now() - make_interval(mins => i), 'page', 'view', '/' from generate_series(1, 25) i;
do $t$
declare r jsonb;
begin
  r := public.fn_web_vitals_watch();
  if r->>'status' <> 'measurement_gap' or (r->>'views_6h')::int <> 25 or (r->>'samples_6h')::int <> 0 then raise exception 'gap status %', r; end if;
  if not exists (select 1 from public.system_suggestions where dedupe_key = 'web_vitals_measurement_gap' and estimated_impact = 'high') then raise exception 'no gap suggestion'; end if;
end $t$;

-- ── privileges and the health-watch call ─────────────────────────────────────────────────────────────────────────────────────────────
do $t$ begin
  if has_function_privilege('anon', 'public.fn_web_vitals_watch()', 'execute') or has_function_privilege('authenticated', 'public.fn_web_vitals_watch()', 'execute') then
    raise exception 'the watch must not be callable from the site';
  end if;
  if not has_function_privilege('service_role', 'public.fn_web_vitals_watch()', 'execute') then raise exception 'service_role cannot run the watch'; end if;
  if has_function_privilege('anon', 'public.admin_2029_analytics(integer,text)', 'execute') or not has_function_privilege('authenticated', 'public.admin_2029_analytics(integer,text)', 'execute') then
    raise exception 'reader privileges changed';
  end if;
  if pg_get_functiondef('public.fn_health_watch()'::regprocedure) not like '%if extract(minute from now()) < 15 then%perform public.fn_web_vitals_watch();%G3_RELIABILITY_PRECLOSE%' then
    raise exception 'fn_health_watch does not call the watch once an hour before the reliability watch';
  end if;
  perform public.fn_health_watch();   -- runs end to end on the fixture (the watch itself only within the first quarter of an hour)
end $t$;
rollback;
\echo speed centre SQL: PASS

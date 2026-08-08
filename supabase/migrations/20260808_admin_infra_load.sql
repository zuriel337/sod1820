-- Admin dashboard data source: daily user traffic vs hourly background (cron) DB load.
-- Powers the "🩺 עומסים ותשתית" tab in AdminPage. Admin-only (SECURITY DEFINER + role check),
-- same guard pattern as admin_growth_center. Returns { kpis, daily[], hourly[] } in Asia/Jerusalem.

CREATE OR REPLACE FUNCTION public.admin_infra_load(p_days integer DEFAULT 10, p_hours integer DEFAULT 48)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '25s'
AS $function$
declare
  v_admin boolean;
  d integer := greatest(1, least(coalesce(p_days,10), 60));
  h integer := greatest(6, least(coalesce(p_hours,48), 168));
  v_daily json; v_hourly json;
  v_avg int; v_peak int; v_peak_day text; v_normal numeric; v_spike numeric; v_spike_hour text;
begin
  select (role='admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin,false) then return json_build_object('error','forbidden'); end if;

  with days as (
    select generate_series(
      (date_trunc('day', now() at time zone 'Asia/Jerusalem') - make_interval(days => d-1)),
      date_trunc('day', now() at time zone 'Asia/Jerusalem'),
      interval '1 day')::date dd),
  sv as (select (ts at time zone 'Asia/Jerusalem')::date dd, count(*) c from public.site_visits
           where ts > now() - make_interval(days => d+1) group by 1),
  pv as (select (created_at at time zone 'Asia/Jerusalem')::date dd, count(*) c from public.page_views
           where created_at > now() - make_interval(days => d+1) group by 1),
  ve as (select (created_at at time zone 'Asia/Jerusalem')::date dd, count(*) c from public.visitor_events
           where created_at > now() - make_interval(days => d+1) group by 1),
  sl as (select (created_at at time zone 'Asia/Jerusalem')::date dd, count(*) c from public.search_log
           where created_at > now() - make_interval(days => d+1) group by 1)
  select json_agg(json_build_object(
           'd', to_char(days.dd,'DD.MM'),
           'visits', coalesce(sv.c,0), 've', coalesce(ve.c,0),
           'searches', coalesce(sl.c,0), 'pv', coalesce(pv.c,0)) order by days.dd)
  into v_daily
  from days
  left join sv on sv.dd=days.dd left join pv on pv.dd=days.dd
  left join ve on ve.dd=days.dd left join sl on sl.dd=days.dd;

  with days as (
    select generate_series(
      (date_trunc('day', now() at time zone 'Asia/Jerusalem') - make_interval(days => d-1)),
      date_trunc('day', now() at time zone 'Asia/Jerusalem'),
      interval '1 day')::date dd),
  sv as (select (ts at time zone 'Asia/Jerusalem')::date dd, count(*) c from public.site_visits
           where ts > now() - make_interval(days => d+1) group by 1),
  merged as (select days.dd, coalesce(sv.c,0) v from days left join sv on sv.dd=days.dd)
  select round(avg(v))::int, max(v),
         to_char((select dd from merged order by v desc limit 1),'DD.MM')
  into v_avg, v_peak, v_peak_day from merged;

  with hrs as (
    select generate_series(date_trunc('hour', now()) - make_interval(hours => h-1),
                           date_trunc('hour', now()), interval '1 hour') hh),
  veh as (select date_trunc('hour', created_at) hh, count(*) c from public.visitor_events
            where created_at > now() - make_interval(hours => h+1) group by 1),
  crh as (select date_trunc('hour', start_time) hh,
                 round(sum(extract(epoch from (end_time-start_time)))::numeric,1) s
            from cron.job_run_details
            where start_time > now() - make_interval(hours => h+1) group by 1)
  select json_agg(json_build_object(
           'h', to_char(hrs.hh at time zone 'Asia/Jerusalem','DD.MM HH24:00'),
           've', coalesce(veh.c,0), 'load_s', coalesce(crh.s,0)) order by hrs.hh)
  into v_hourly
  from hrs left join veh on veh.hh=hrs.hh left join crh on crh.hh=hrs.hh;

  with hrs as (
    select generate_series(date_trunc('hour', now()) - make_interval(hours => h-1),
                           date_trunc('hour', now()), interval '1 hour') hh),
  crh as (select date_trunc('hour', start_time) hh,
                 round(sum(extract(epoch from (end_time-start_time)))::numeric,1) s
            from cron.job_run_details
            where start_time > now() - make_interval(hours => h+1) group by 1),
  merged as (select hrs.hh, coalesce(crh.s,0) s from hrs left join crh on crh.hh=hrs.hh)
  select round(percentile_cont(0.5) within group (order by s)::numeric,1), max(s),
         to_char((select hh from merged order by s desc limit 1) at time zone 'Asia/Jerusalem','DD.MM HH24:00')
  into v_normal, v_spike, v_spike_hour from merged;

  return json_build_object(
    'generated_at', now(),
    'days', d, 'hours', h,
    'kpis', json_build_object(
      'avg_visits', v_avg, 'peak_visits', v_peak, 'peak_day', v_peak_day,
      'normal_load_s', v_normal, 'spike_load_s', v_spike, 'spike_hour', v_spike_hour),
    'daily', coalesce(v_daily,'[]'::json),
    'hourly', coalesce(v_hourly,'[]'::json));
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_infra_load(integer,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_infra_load(integer,integer) TO authenticated;

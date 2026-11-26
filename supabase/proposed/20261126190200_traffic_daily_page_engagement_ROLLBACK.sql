-- Rollback of 20261126190200_traffic_daily_page_engagement_PROPOSAL.sql: restores the exact original refresh_traffic_daily_range_v1 (md5 of prosrc
-- 97616f75277d4e4b0eaa1c63c82967f5), removes the cutover row and drops the five derived columns (their values are recomputable from events while it retains them).
-- The legacy columns are not touched. Fails if the live function is not the one this proposal installed (drift) so a later change is never overwritten.
do $migration$
begin
  perform set_config('lock_timeout', '3s', true);
  if (select prosrc from pg_proc where proname = 'refresh_traffic_daily_range_v1' and pronamespace = 'public'::regnamespace) not like '%traffic_daily_page_metrics_cutover%' then
    raise exception 'refresh_traffic_daily_range_v1 is not the P4 version; refusing to overwrite' using errcode = 'P0001';
  end if;
end
$migration$;

create or replace function public.refresh_traffic_daily_range_v1(p_from date, p_to date)
returns integer
language plpgsql
as $function$
declare
  n int;
begin
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'invalid traffic refresh range';
  end if;

  insert into public.traffic_daily(day,entrances,engaged,bounces,views,visitors,searches,bots,suspected,updated_at)
  select agg.d, agg.entrances, agg.engaged, agg.bounces, agg.views, agg.visitors, agg.searches,
         coalesce(bt.bots,0), agg.suspected, now()
  from (
    select h.day d,
      count(*) filter (where not h.suspected_bot) entrances,
      count(*) filter (where h.engaged and not h.suspected_bot) engaged,
      count(*) filter (where h.bounce and not h.suspected_bot) bounces,
      coalesce(sum(h.views) filter (where not h.suspected_bot),0) views,
      count(distinct h.visitor) filter (where not h.suspected_bot) visitors,
      coalesce(sum(h.searches) filter (where not h.suspected_bot),0) searches,
      count(*) filter (where h.suspected_bot) suspected
    from public.fn_human_entrances(p_from-1,p_to+1) h
    where h.day between p_from and p_to
    group by h.day
  ) agg
  left join (
    select ev.ts::date d, count(distinct ev.session_id) bots
    from public.events ev
    where ev.is_bot and ev.ts::date between p_from and p_to
    group by ev.ts::date
  ) bt on bt.d=agg.d
  on conflict(day) do update set
    entrances=excluded.entrances, engaged=excluded.engaged, bounces=excluded.bounces,
    views=excluded.views, visitors=excluded.visitors, searches=excluded.searches,
    bots=excluded.bots, suspected=excluded.suspected, updated_at=now();

  get diagnostics n=row_count;
  return n;
end;
$function$;

delete from public.analytics_cache where cache_key = 'traffic_daily_page_metrics_cutover';
alter table public.traffic_daily
  drop column if exists page_views, drop column if exists page_engaged, drop column if exists page_bounces,
  drop column if exists engagement_sessions, drop column if exists anomalous;

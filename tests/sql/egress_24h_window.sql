-- Behavioural regression tests against the actual SQL, not a reimplementation.
create function pg_temp.check_value(actual jsonb, expected jsonb, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception '%: expected %, got %', label, expected, actual; end if;
  raise notice 'PASS: %', label;
end $$;
create function pg_temp.hour(at timestamptz, bytes jsonb default '100', written timestamptz default now(), suffix text default '')
returns void language sql as $$
  insert into public.analytics_cache(cache_key,payload,computed_at,producer,producer_version)
  values ('infra_egress_hour:' || to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:00:00"Z"') || suffix,
    jsonb_build_object('window_start',to_char(at at time zone 'UTC','YYYY-MM-DD"T"HH24:00:00"Z"'),
      'window_end',to_char((at+interval '1 hour') at time zone 'UTC','YYYY-MM-DD"T"HH24:00:00"Z"'),
      'storage_get_bytes',bytes,'basis','OBSERVED_STORAGE_LOGS','traffic_classes',jsonb_build_object('bot_share',0)),
    written,'traffic_intelligence_law','v11');
$$;
create function pg_temp.read_day() returns jsonb language sql stable as $$
  select public.fn_storage_egress_observed_24h('2026-11-19T19:37:00Z');
$$;

select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','0','no rows: 0/24');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_observed_bytes','null','missing is not measured zero');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_guard,state}','"NO_HOURLY_DATA"','no hourly data is not OK');

-- Late writes and even old computed_at never change membership of the measured day.
select pg_temp.hour(h,'100',case when extract(hour from h)::int % 2 = 0 then '2026-11-21T00:00Z'::timestamptz else '2026-11-01T00:00Z'::timestamptz end)
from generate_series('2026-11-18T19:00Z'::timestamptz,'2026-11-19T18:00Z'::timestamptz,interval '1 hour') h;
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_bytes','2400','24 completed windows independent of computed_at');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,status}','"COMPLETE"','24 hours complete');
select pg_temp.check_value(to_jsonb(jsonb_array_length(pg_temp.read_day()->'storage_egress_observed_history_24h')),'24','history covers 24 distinct windows');

-- The previous hour is excluded even when it was just written; current/future intervals are excluded.
select pg_temp.hour('2026-11-18T18:00Z','999999','2026-11-19T19:36Z');
select pg_temp.hour('2026-11-19T19:00Z','999999');
select pg_temp.hour('2026-11-20T00:00Z','999999');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_bytes','2400','half-open UTC boundaries exclude old/current/future windows');

-- Four missing windows: return an explicitly partial sum, never a full-day value.
delete from analytics_cache where payload->>'window_start' in ('2026-11-18T20:00:00Z','2026-11-19T01:00:00Z','2026-11-19T10:00:00Z','2026-11-19T12:00:00Z');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','20','missing hours: 20/24');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,status}','"PARTIAL"','missing hours labelled PARTIAL');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_bytes','null','partial sum never masquerades as full day');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_observed_bytes','2000','partial observed sum preserved');
select pg_temp.check_value(to_jsonb(jsonb_array_length(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,missing_windows}')),'4','four exact missing windows');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_guard,state}','"PARTIAL"','a low partial sum cannot claim OK');

-- A duplicate revision replaces that hour, never increments coverage or doubles bytes.
select pg_temp.hour('2026-11-19T18:00Z','250','2026-11-22T00:00Z',':retry');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_observed_bytes','2150','newest duplicate is used once');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','20','duplicate cannot fill a missing hour');
select pg_temp.hour('2026-11-19T18:00Z','300','2026-11-22T00:00Z',':z');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_observed_bytes','2200','duplicate write-time tie has a deterministic cache-key winner');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_latest_at','"2026-11-19T19:00:00+00:00"','freshness follows measurement end, not write time');

-- Null/negative/string/fractional byte values and invalid windows never become zero or crash the reader.
truncate analytics_cache;
select pg_temp.hour('2026-11-19T18:00Z','null');
select pg_temp.hour('2026-11-19T17:00Z','-1');
select pg_temp.hour('2026-11-19T16:00Z','"oops"');
select pg_temp.hour('2026-11-19T15:00Z','1.5');
select pg_temp.hour('2026-11-19T14:00Z','100');
update analytics_cache set payload=payload || '{"window_end":"2026-11-19T16:00:00Z"}' where payload->>'window_start'='2026-11-19T14:00:00Z';
select pg_temp.hour('2026-11-19T13:00Z','100');
update analytics_cache set payload=payload || '{"window_start":"2026-02-31T13:00:00Z"}' where payload->>'window_start'='2026-11-19T13:00:00Z';
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','0','malformed/missing data does not fill coverage');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_observed_bytes','null','unknown bytes remain null');

truncate analytics_cache;
select pg_temp.hour(h,'0') from generate_series('2026-11-18T19:00Z'::timestamptz,'2026-11-19T18:00Z'::timestamptz,interval '1 hour') h;
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_bytes','0','a complete measured zero stays zero');
update analytics_cache set payload=jsonb_set(payload,'{coverage}','{"missing_or_invalid_content_length_requests":1}') where payload->>'window_start'='2026-11-19T18:00:00Z';
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,status}','"PARTIAL"','24 rows with missing measurements are still partial');
select pg_temp.check_value(pg_temp.read_day()->'storage_egress_observed_24h_bytes','null','incomplete measurements cannot publish full-day bytes');

truncate analytics_cache;
select pg_temp.hour('2026-11-19T16:00Z','0','2026-11-19T19:36Z');
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_guard,state}','"STALE"','rewriting an old window does not refresh the sensor');
set timezone='Asia/Jerusalem';
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','1','server timezone does not change UTC membership');
select pg_temp.check_value(public.fn_storage_egress_observed_24h('2026-10-25T01:30Z')#>'{storage_egress_observed_24h_coverage,required_hours}','24','DST still requires exactly 24 UTC windows');
set timezone='UTC';

-- Provider/invalidated/failed-source rows must never be presented as observed data.
truncate analytics_cache;
select pg_temp.hour('2026-11-19T18:00Z');
update analytics_cache set payload=payload || '{"basis":"EXACT_BILLING_HISTORY"}';
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','0','provider billing is not observed Storage');
update analytics_cache set payload=payload || '{"basis":"OBSERVED_STORAGE_LOGS","coverage":{"source_status":"UNAVAILABLE"}}';
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','0','unavailable source is not a measured hour');
update analytics_cache set payload=payload-'coverage',invalidated_at=now();
select pg_temp.check_value(pg_temp.read_day()#>'{storage_egress_observed_24h_coverage,observed_hours}','0','invalidated data is excluded');

-- Exercise both real consumers with a partial but already high observed lower bound.
truncate analytics_cache,work_log;
select pg_temp.hour(date_trunc('hour',now())-interval '1 hour','150000000');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_24h_coverage,observed_hours}','1','admin RPC consumes shared coverage');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_24h_bytes}','null','admin RPC does not label partial sum full day');
select pg_temp.check_value(public.admin_system_health()#>'{usage,supabase_cached_egress_basis}','"UNKNOWN"','provider cached egress stays UNKNOWN');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_guard,state}','"WARN"','partial lower bound can still cross the unchanged WARN threshold');
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where topic='🚨 ניטור Egress/Storage (אוטומטי)' and what_we_did like '%1/24%PARTIAL%')),'1','health watch alert carries observed coverage');
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where topic='🚨 ניטור Egress/Storage (אוטומטי)')),'1','existing alert deduplication preserved');
truncate work_log;
update analytics_cache set payload=payload || '{"storage_get_bytes":600000000,"traffic_classes":{"bot_share":"unavailable"}}';
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_guard,state}','"CRITICAL"','partial lower bound preserves the CRITICAL threshold');
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where topic='🚨 ניטור Egress/Storage (אוטומטי)' and status='critical')),'1','unknown bot share does not suppress a byte-threshold alert');

-- Work acceptance: a silent sensor must keep reminding even after its last hour leaves the day.
truncate analytics_cache,work_log;
select pg_temp.hour(date_trunc('hour',now())-interval '31 hours','100',now());
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_24h_coverage,observed_hours}','0','30h outage: admin card has 0/24');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_24h_coverage,status}','"NO_DATA"','30h outage: day coverage is NO_DATA');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_24h_observed_bytes}','null','30h outage: no stale bytes in day sum');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_history_24h}','[]','30h outage: no stale hour in day history');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_latest_at}',to_jsonb(date_trunc('hour',now())-interval '30 hours'),'30h outage: last measurement survives outside day, independent of recent write');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_guard,state}','"STALE"','30h outage: sensor stays STALE while coverage is NO_DATA');
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where status='sensor_stale')),'1','30h outage: stale reminder is emitted');
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where status='sensor_stale')),'1','30h outage: no duplicate within six-hour reminder interval');
update work_log set created_at=now()-interval '6 hours 1 second' where status='sensor_stale';
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where status='sensor_stale')),'2','30h outage: reminder returns after existing six-hour interval');

-- More recent unusable/future/invalid revisions cannot make the silent sensor look fresh.
select pg_temp.hour(date_trunc('hour',now())-interval '1 hour','null');
select pg_temp.hour(date_trunc('hour',now())-interval '2 hours','100');
update analytics_cache set payload=payload || '{"coverage":{"source_status":"UNAVAILABLE"}}' where payload->>'window_start'=to_char((date_trunc('hour',now())-interval '2 hours') at time zone 'UTC','YYYY-MM-DD"T"HH24:00:00"Z"');
select pg_temp.hour(date_trunc('hour',now())+interval '1 hour','100');
insert into analytics_cache(cache_key,payload,computed_at,producer,producer_version)
values ('infra_egress_hour:invalid','{"window_start":"2026-02-31T13:00:00Z","window_end":"2026-02-31T14:00:00Z","storage_get_bytes":100,"basis":"OBSERVED_STORAGE_LOGS"}',now(),'traffic_intelligence_law','v11');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_latest_at}',to_jsonb(date_trunc('hour',now())-interval '30 hours'),'invalid, unavailable and future observations cannot refresh sensor age');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_observed_24h_coverage,status}','"NO_DATA"','unusable newer rows do not fill the day');
select pg_temp.hour(date_trunc('hour',now())-interval '1 hour','0',now()+interval '1 second',':recovered');
select pg_temp.check_value(public.admin_system_health()#>'{usage,storage_egress_guard,state}','"PARTIAL"','fresh valid zero ends sensor staleness');
truncate analytics_cache,work_log;
select public.fn_health_watch();
select pg_temp.check_value(to_jsonb((select count(*) from work_log where status='sensor_stale')),'0','never-observed sensor does not invent a last measurement');

select pg_temp.check_value(to_jsonb(has_function_privilege('anon','public.fn_storage_egress_observed_24h(timestamptz)','execute')),'false','internal projection denied to anon');
select pg_temp.check_value(to_jsonb(has_function_privilege('authenticated','public.fn_storage_egress_observed_24h(timestamptz)','execute')),'false','internal projection denied to ordinary accounts');
set test.role='authenticated';
do $$ begin
  begin perform public.admin_system_health(); raise exception 'unauthorized admin read succeeded';
  exception when raise_exception then if sqlerrm <> 'not authorized' then raise; end if; end;
end $$;

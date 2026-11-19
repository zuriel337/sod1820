#!/usr/bin/env bash
# Local isolated PostgreSQL only. CI supplies a fresh database in its existing fixture service.
set -euo pipefail
case "${PGHOST:-}" in localhost|127.0.0.1|/tmp/*) ;; *) echo 'Use an isolated local PostgreSQL fixture'; exit 1;; esac
PSQL=${PSQL:-psql}
run() { "$PSQL" -X -v ON_ERROR_STOP=1 -q "$@"; }
stale_alarm() {
  run <<'SQL'
truncate public.analytics_cache,public.work_log;
insert into public.analytics_cache(cache_key,payload,computed_at,producer,producer_version)
select 'infra_egress_hour:stale-proof',jsonb_build_object(
  'window_start',to_char((date_trunc('hour',now())-interval '31 hours') at time zone 'UTC','YYYY-MM-DD"T"HH24:00:00"Z"'),
  'window_end',to_char((date_trunc('hour',now())-interval '30 hours') at time zone 'UTC','YYYY-MM-DD"T"HH24:00:00"Z"'),
  'storage_get_bytes',100,'basis','OBSERVED_STORAGE_LOGS','traffic_classes',jsonb_build_object('bot_share',0)),
  now()-interval '30 hours','traffic_intelligence_law','v11';
select public.fn_health_watch();
do $$ begin
  if (select count(*) from public.work_log where status='sensor_stale') <> 1 then
    raise exception '30-hour outage must produce one sensor_stale reminder';
  end if;
  raise notice 'PASS: 30-hour sensor_stale before migration / after migration / after rollback';
end $$;
truncate public.analytics_cache,public.work_log;
SQL
}
cd "$(dirname "$0")/../.."
run -f tests/sql/speed_centre_fixture.sql
run -f tests/sql/egress_24h_fixture.sql
run -f tests/sql/live/egress-readers-20261119.sql
run -c 'revoke all on function public.admin_system_health() from public; grant execute on function public.admin_system_health() to authenticated,service_role; revoke all on function public.fn_health_watch() from public; grant execute on function public.fn_health_watch() to service_role;'
stale_alarm
if run -f supabase/proposed/ROLLBACK_20261119220000_egress_24h_window.sql 2>/dev/null; then echo 'Rollback must refuse before migration'; exit 1; fi
run -f supabase/migrations/20261119220000_egress_24h_window.sql
stale_alarm
if run -f supabase/migrations/20261119220000_egress_24h_window.sql 2>/dev/null; then echo 'Migration must refuse a second application'; exit 1; fi
run -c "set test.role='service_role'" -f tests/sql/egress_24h_window.sql
node tests/sql/egress_24h_replay.mjs | run
run -f supabase/proposed/ROLLBACK_20261119220000_egress_24h_window.sql
stale_alarm
run <<'SQL'
do $$ begin
  if (select md5(prosrc) from pg_proc where oid='public.admin_system_health()'::regprocedure) <> 'ef8336c67f7bae8c1176699805c1c2c6'
    or (select md5(prosrc) from pg_proc where oid='public.fn_health_watch()'::regprocedure) <> '29e12793ac2afb89b5948c816b1d645f'
    or to_regprocedure('public.fn_storage_egress_observed_24h(timestamptz)') is not null then
    raise exception 'rollback must restore exact reader bodies and remove helper';
  end if;
  if has_function_privilege('anon','public.admin_system_health()','execute')
    or has_function_privilege('authenticated','public.fn_health_watch()','execute')
    or not has_function_privilege('authenticated','public.admin_system_health()','execute') then
    raise exception 'existing reader ACLs changed';
  end if;
end $$;
SQL
echo 'Egress 24h SQL gate: PASS (window/coverage/duplicates/missing data, real readers, permissions, exact rollback)'

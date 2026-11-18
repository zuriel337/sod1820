\set ON_ERROR_STOP on
create table public.test_kept as select count(*) as n from system_suggestions;
\ir ../../supabase/proposed/ROLLBACK_20261118190000_provider_freshness_watch.sql
select test_assert(to_regprocedure('public.fn_provider_freshness_watch()') is null, 'rollback drops the watch');
select test_assert(test_notify_md5() = 'c99975e5af83bf4999bf702f33bab986', 'rollback restores the live notify function byte for byte');
select test_assert((select command from cron.job where jobname = 'gsc-daily-sync') = (select command from test_live_cmd), 'rollback restores the live gsc-daily-sync command exactly');
select test_assert(not exists (select 1 from cron.job where jobname = 'provider-freshness-watch'), 'rollback unschedules the watch');
select test_assert((select count(*) from system_suggestions) = (select n from test_kept), 'rollback keeps every recommendation');
select 'PROVIDER FRESHNESS ALL PASS';

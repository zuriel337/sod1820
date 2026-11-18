\set ON_ERROR_STOP on
select test_assert(to_regprocedure('public.fn_provider_freshness_watch()') is null, 'refused apply leaves no watch function');
select test_assert(not exists (select 1 from cron.job where jobname = 'provider-freshness-watch'), 'refused apply schedules nothing');
update cron.job set command = (select command from test_live_cmd) where jobname = 'gsc-daily-sync';
\ir baseline-notify-high.sql
select test_assert(test_notify_md5() = 'c99975e5af83bf4999bf702f33bab986', 'live notify text restored after the drift case');

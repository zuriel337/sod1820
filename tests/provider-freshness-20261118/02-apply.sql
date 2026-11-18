\set ON_ERROR_STOP on
\ir ../../supabase/proposed/20261118190000_provider_freshness_watch_PROPOSAL.sql
create table public.test_after (notify_md5 text, gsc_cmd text);
insert into test_after select test_notify_md5(), (select command from cron.job where jobname = 'gsc-daily-sync');
select test_assert((select gsc_cmd from test_after) = replace((select command from test_live_cmd), '''sc-domain:sod1820.co.il''))', '''sc-domain:sod1820.co.il''),timeout_milliseconds:=120000)'),
  'gsc-daily-sync: only the 120 s wait is added, the rest of the command is unchanged');
select test_assert((select schedule = '41 * * * *' and command = 'select public.fn_provider_freshness_watch()' from cron.job where jobname = 'provider-freshness-watch'), 'watch scheduled hourly at :41');
select test_assert((select command = 'select public.fn_health_watch()' from cron.job where jobname = 'health-watch'), 'health-watch untouched');
select test_assert(not has_function_privilege('anon', 'public.fn_provider_freshness_watch()', 'execute'), 'anon cannot run the watch');
select test_assert(not has_function_privilege('authenticated', 'public.fn_provider_freshness_watch()', 'execute'), 'authenticated cannot run the watch');

-- Both sources empty: reported as no_data, never as zero; nothing is written to either store.
select test_assert((select r->'gsc'->>'state' = 'no_data' and r->'ga4'->>'state' = 'no_data' from (select fn_provider_freshness_watch() r) x), 'empty sources are no_data');
select test_assert((select count(*) = 0 from gsc_metrics) and (select count(*) = 0 from traffic_history), 'the watch writes no metric rows');
select test_assert((select count(*) = 2 from system_suggestions where detector = 'provider_freshness_watch' and observed->>'severity' = 'high'), 'two high recommendations');
select test_assert((select count(*) = 2 and bool_and(email = 'admin@example.test' and user_id = '11111111-1111-4111-8111-111111111111') from user_notifications), 'admin notified with the account e-mail; the member is not');
delete from user_notifications; delete from system_suggestions;

-- Fresh: Search Console fetched now with data through D-3 (normal Google lag); GA4 written now through today.
insert into gsc_metrics (site, date, dimension, key, clicks, impressions, fetched_at) values ('sc-domain:sod1820.co.il', current_date - 3, 'total', '', 0, 0, now()),
  ('sc-domain:sod1820.co.il', current_date - 1, 'discover:total', '', 5, 9, now());
insert into traffic_history (source, granularity, period, created_at) values ('ga', 'day', current_date, now());
select test_assert((select r->'gsc'->>'state' = 'fresh' and r->'ga4'->>'state' = 'fresh' and r->'gsc'->>'data_through' = (current_date - 3)::text from (select fn_provider_freshness_watch() r) x),
  'fresh sources; Search Console freshness reads Web totals only');
select test_assert((select count(*) = 0 from system_suggestions), 'fresh sources raise nothing');

-- Search Console sync stopped (last fetch 36 h ago): one recommendation and one notice, also after repeated hourly runs.
update gsc_metrics set fetched_at = now() - interval '36 hours';
select fn_provider_freshness_watch(); select fn_provider_freshness_watch(); select fn_provider_freshness_watch();
select test_assert((select count(*) = 1 from system_suggestions where dedupe_key = 'provider_freshness:gsc:sync_stopped' and estimated_impact = 'high'), 'gsc sync_stopped once');
select test_assert((select count(*) = 1 from user_notifications where kind = 'admin_system_high' and source_ref like 'system_suggestion:%'), 'one notice across hourly re-runs');

-- Search Console fetched but its data stops at D-6: data_stale. GA4 last write 31 h ago: sync_stopped. GA4 data through D-3: data_stale.
update gsc_metrics set fetched_at = now(), date = current_date - 6;
select test_assert((select r->'gsc'->>'state' = 'data_stale' from (select fn_provider_freshness_watch() r) x), 'gsc data_stale');
update traffic_history set created_at = now() - interval '31 hours';
select test_assert((select r->'ga4'->>'state' = 'sync_stopped' from (select fn_provider_freshness_watch() r) x), 'ga4 sync_stopped');
update traffic_history set created_at = now(), period = current_date - 3;
select test_assert((select r->'ga4'->>'state' = 'data_stale' from (select fn_provider_freshness_watch() r) x), 'ga4 data_stale');
insert into traffic_history (source, granularity, period, created_at) values ('ga:country:IL', 'day', current_date, now()), ('ga', 'month', current_date, now());
select test_assert((select r->'ga4'->>'state' = 'data_stale' from (select fn_provider_freshness_watch() r) x), 'ga4 freshness reads daily ga totals only');

-- Other detectors: impact high now notifies; low impact and non-pending do not; observed severity still honoured.
delete from user_notifications;
select suggest_add('perf', 'other', 'impact high', 'r', '{}', 50, 1, 'high', 'other:high');
select suggest_add('perf', 'other', 'impact low', 'r', '{}', 50, 1, 'low', 'other:low');
select suggest_add('perf', 'other', 'observed critical', 'r', '{"severity":"critical"}', 50, 1, 'medium', 'other:critical');
insert into system_suggestions (category, title, estimated_impact, status) values ('perf', 'decided high', 'high', 'approved');
select test_assert((select count(*) = 2 from user_notifications), 'high and critical notify; low and decided do not');
select test_assert((select count(*) = 1 from user_notifications where title = 'תקלת מערכת קריטית'), 'critical keeps its title');
update notification_prefs set muted_until = null;
update users set email = null where role = 'admin'; update notification_prefs set email = 'Prefs@Example.test' where user_id = '11111111-1111-4111-8111-111111111111';
select suggest_add('perf', 'other', 'prefs email', 'r', '{}', 50, 1, 'high', 'other:prefs');
select test_assert((select email = 'prefs@example.test' from user_notifications where body like 'prefs email%'), 'falls back to the preference e-mail');
update notification_prefs set email = null;
select test_assert((select count(*) = 1 from (select suggest_add('perf', 'other', 'no email', 'r', '{}', 50, 1, 'high', 'other:noemail')) x)
  and not exists (select 1 from user_notifications where body like 'no email%'), 'no e-mail: no notice, the recommendation is still written');
update users set email = 'Admin@Example.test' where role = 'admin';

-- A second apply changes nothing.
\ir ../../supabase/proposed/20261118190000_provider_freshness_watch_PROPOSAL.sql
select test_assert((select notify_md5 = test_notify_md5() and gsc_cmd = (select command from cron.job where jobname = 'gsc-daily-sync') from test_after), 'second apply is a no-op');
select test_assert((select count(*) = 1 from cron.job where jobname = 'provider-freshness-watch'), 'one watch job after a second apply');

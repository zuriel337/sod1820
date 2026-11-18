\set ON_ERROR_STOP on
\ir ../../supabase/proposed/ROLLBACK_20261118210000_analytics_followups.sql
select test_assert(test_md5('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)') = '60c470f64cb170ef7b9616f53f263578', 'rollback restores ingest_event byte for byte');
select test_assert(test_md5('public.fn_raziel_activity_notify(text,text)') = 'b636d84c4d9d4566b5fdd613e3fefefd', 'rollback restores raziel notify byte for byte');
select test_assert(not exists (select 1 from traffic_history where note like 'צפיות כפולות%') and (select note = 'existing note' from traffic_history where period = '2026-11-13'), 'rollback clears only its own note');
select test_assert((select count(*) = 2 from events where surface = 'els'), 'rollback keeps recorded events');
select 'ANALYTICS FOLLOWUPS ALL PASS';

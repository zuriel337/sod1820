\set ON_ERROR_STOP on
\ir baseline-raziel.sql
select test_assert(test_md5('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)') = '60c470f64cb170ef7b9616f53f263578', 'refused apply leaves ingest_event untouched');
select test_assert(not exists (select 1 from traffic_history where note like 'צפיות כפולות%'), 'refused apply writes no note');

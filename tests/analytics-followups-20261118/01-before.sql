\set ON_ERROR_STOP on
\ir fixture.sql
select test_assert(test_md5('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)') = '60c470f64cb170ef7b9616f53f263578', 'fixture ingest_event is the live text byte for byte');
select test_assert(test_md5('public.fn_raziel_activity_notify(text,text)') = 'b636d84c4d9d4566b5fdd613e3fefefd', 'fixture raziel notify is the live text byte for byte');
-- The live gaps, reproduced.
select test_assert(not test_els('plain'), 'live: an ELS search is refused');
-- Live: the insert omits the NOT NULL e-mail, so the call raises (wa-raziel catches the rpc error) and nothing is written.
do $$ declare failed boolean := false; begin
  begin perform fn_raziel_activity_notify('972500000000', 'group'); exception when not_null_violation then failed := true; end;
  perform test_assert(failed and not exists (select 1 from user_notifications), 'live: the raziel notice raises not_null_violation and writes nothing');
end $$;

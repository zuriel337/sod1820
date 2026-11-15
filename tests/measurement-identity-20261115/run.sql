\set ON_ERROR_STOP on
\ir fixture.sql
\ir baseline-ingest-event.sql
\ir baseline-admin-analytics.sql
revoke all on function admin_2029_analytics(integer,text) from public;
grant execute on function admin_2029_analytics(integer,text) to authenticated;
create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL %',label; end if; raise notice 'PASS %',label; end$$;
create function public.test_event(surface text default 'page',kind text default 'view',details jsonb default '{}',browser text default 'browser-test-1',sid text default 'session-test-1') returns void language sql as $$
 select public.ingest_event(p_sod_id=>'sod-test-1',p_surface=>surface,p_event_type=>kind,p_path=>'/post/:item',p_session_id=>sid,p_app_context=>'chrome',p_props=>details || jsonb_build_object('measurement',jsonb_build_object('version',2,'page_path','/post/example','visitor_id',browser)))
$$;
create function public.test_refuse(payload jsonb,label text) returns void language plpgsql as $$declare rejected boolean:=false; begin
 begin perform public.ingest_event(p_sod_id=>'sod-test-1',p_surface=>'page',p_event_type=>'view',p_path=>'/post/:item',p_session_id=>'session-test-1',p_app_context=>'chrome',p_props=>payload);
 exception when others then rejected:=true; end;
 perform public.test_assert(rejected,label);
end$$;
-- Unknown pre-release rows must not be retroactively assigned to an account.
select ingest_event(null,'page','view',p_path=>'/world');
\ir ../../supabase/proposed/20261115180000_measurement_identity_PROPOSAL.sql
insert into users values('11111111-1111-4111-8111-111111111111','member','First account','first'),('22222222-2222-4222-8222-222222222222','member','Second account','second');
set role anon;
select test_event();
reset role;
select test_assert((select props->'_measurement_account'='null'::jsonb and person_id is null from events where props->'_measurement_verified'='2'::jsonb limit 1),'guest is not an account');
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set role authenticated;
select test_event(sid=>'session-login-1');
select test_event('calculator_2029','first_compute','{"action_version":1,"method":"regular","count":1}',sid=>'session-login-1');
select test_event('arrival','source','{"action_version":1,"source":"google","tagged":false}',sid=>'session-login-1');
select test_event('page','engagement','{"visible_ms":5000,"engaged_ms":3000,"max_scroll_pct":40,"flush_reason":"route_change","engagement_version":1,"idle_threshold_ms":20000}',sid=>'session-login-1');
reset role;
select test_assert((select count(*)=1 from persons where account_user_id=auth.uid()),'reuse canonical account person');
set request.jwt.claim.sub='';
set role anon;
select test_event(sid=>'session-logout-1');
reset role;
select test_assert((select props->'_measurement_account'='null'::jsonb and person_id is null from events where session_id='session-logout-1'),'logout stays guest despite earlier login');
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
set role authenticated;
select test_event(details=>'{"_measurement_account":"11111111-1111-4111-8111-111111111111","_measurement_verified":999}',sid=>'session-second-1');
reset role;
select test_assert((select props->>'_measurement_account'=auth.uid()::text from events where session_id='session-second-1'),'server identity overrides forged account');
select test_assert((select count(*)=4 from events where props->>'_measurement_account'='11111111-1111-4111-8111-111111111111'),'account switch never rewrites earlier events');
select test_assert((select count(*)=2 from persons),'two accounts remain separate');
select ingest_event(null,'page','view',p_path=>'/world',p_props=>'{"_measurement_verified":2,"_measurement_account":"11111111-1111-4111-8111-111111111111"}');
select test_assert((select count(*)=7 from events where props->'_measurement_verified'='2'::jsonb),'legacy input cannot forge report membership');
select test_refuse('{"measurement":{"version":2,"page_path":"/post/example","visitor_id":"browser-test-1","account_id":"fake"}}','unknown attribution field rejected');
select test_refuse('{"measurement":{"version":2,"page_path":"/post/example?email=private","visitor_id":"browser-test-1"}}','query rejected');
select test_refuse('{"measurement":{"version":3,"page_path":"/post/example","visitor_id":"browser-test-1"}}','unknown version rejected');
select test_refuse('{"measurement":{"version":2,"page_path":"/post/example","visitor_id":true}}','non-string browser rejected');
select test_refuse('{"measurement":{"version":2,"page_path":"/post/example","visitor_id":"browser-test-1"},"free_text":"secret"}','free text rejected');
do $$declare rejected boolean:=false;begin
 begin perform test_event('calculator_2029','first_compute','{"action_version":1,"email":"x@example.test"}'); exception when others then rejected:=true; end;
 perform test_assert(rejected,'unknown action field rejected');
end$$;
do $$declare rejected boolean:=false;begin
 begin perform test_event('page','engagement','{"visible_ms":100,"engaged_ms":200,"max_scroll_pct":10,"flush_reason":"route_change","engagement_version":1,"idle_threshold_ms":20000}'); exception when others then rejected:=true; end;
 perform test_assert(rejected,'invalid engagement rejected');
end$$;
-- Null browser/session: visible missing coverage, never an invented visitor.
set request.jwt.claim.sub='';
select test_event(browser=>null,sid=>null);
set test.admin='false';
do $$declare rejected boolean:=false;begin
 begin perform admin_2029_analytics(); exception when others then rejected:=true; end;
 perform test_assert(rejected,'non-admin cannot read report');
end$$;
set test.admin='true';
-- Events use server now(); a later transaction reads a later now().
select test_assert((admin_2029_analytics()->'identified_traffic'->'summary'->>'views')::int=5,'report counts only canonical v2 page views');
select test_assert((admin_2029_analytics()->'identified_traffic'->'summary'->>'actions')::int=1,'report distinguishes action from content/page view');
select test_assert((admin_2029_analytics()->'identified_traffic'->'summary'->>'accounts')::int=2,'report counts two accounts');
select test_assert((admin_2029_analytics()->'identified_traffic'->'summary'->>'browsers')::int=1,'same browser is one browser across accounts');
select test_assert((admin_2029_analytics()->'identified_traffic'->'summary'->>'sessions')::int=4,'separate sessions at account boundaries');
select test_assert(jsonb_array_length(admin_2029_analytics()->'identified_traffic'->'visitors')=3,'guest and two accounts are distinct rows');
select test_assert((admin_2029_analytics()->'identified_traffic'->'arrivals'->0->>'sessions')::int=1,'arrival source associated with session');
select test_assert(admin_2029_analytics()->'identified_traffic'->'pages'->0->>'page_path'='/post/example','public page identity retained');
select test_assert((admin_2029_analytics()->'identified_traffic'->'summary'->>'unidentified_events')::int=1,'missing browser IDs reported as missing');
select test_assert(admin_2029_analytics() ? 'web_vitals','existing RUM projection retained');
select test_assert(not has_table_privilege('anon','events','INSERT') and not has_table_privilege('authenticated','events','INSERT'),'direct event writes remain closed');
\ir ../../supabase/proposed/ROLLBACK_20261115180000_measurement_identity.sql
select test_assert(md5(pg_get_functiondef('ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)'::regprocedure))='ed1d68fee90d27818219a0c18121bace','exact ingest rollback');
select test_assert(md5(pg_get_functiondef('admin_2029_analytics(integer,text)'::regprocedure))='8f2a62223a8da2b5ef66ca49e09a1432','exact report rollback');
select test_assert((select count(*)=10 from events),'rollback preserves collected history');
select 'MEASUREMENT IDENTITY ALL PASS';

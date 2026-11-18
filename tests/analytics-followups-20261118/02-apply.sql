\set ON_ERROR_STOP on
\ir ../../supabase/proposed/20261118210000_analytics_followups_PROPOSAL.sql
create table public.test_after as select test_md5('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)') ingest, test_md5('public.fn_raziel_activity_notify(text,text)') raziel;
-- ELS: both events, the three fields; nothing else.
select test_assert(test_els('plain'), 'els search admitted');
select test_assert(test_els('cross', 'cross_search'), 'els cross_search admitted');
select test_assert((select count(*) = 2 and bool_and(props->>'skip' = '7' and props->>'scope' = 'torah' and not props ? 'term' and not props ? 'uid') from events where surface = 'els'), 'stored props: kind/scope/skip only');
select test_assert(not test_els('plain', 'search', '{"term":"משה"}'), 'search term refused');
select test_assert(not test_els('plain', 'search', '{"uid":"11111111-1111-4111-8111-111111111111"}'), 'client account id refused');
select test_assert(not test_els('plain', 'save'), 'other els events refused');
select test_assert(not test_els('not a token'), 'non-token kind refused');
select ingest_event(p_sod_id=>'sod-test-0001', p_surface=>'content', p_event_type=>'view', p_path=>'/code', p_session_id=>'session-test-1', p_app_context=>'chrome',
  p_props=>'{"action_version":1,"kind":"post","item_id":5,"measurement":{"version":2,"page_path":"/code","visitor_id":"browser-test-1"}}');
select test_assert((select count(*) = 1 from events where surface = 'content'), 'other families unchanged');
-- Raziel: admin with e-mail notified once per sender per day; member not; linked phone not; no e-mail no notice.
select test_assert(fn_raziel_activity_notify('972500000000', 'group') = 1, 'one admin notice');
select test_assert((select email = 'admin@example.test' and user_id = '11111111-1111-4111-8111-111111111111' from user_notifications), 'admin e-mail written');
select test_assert(fn_raziel_activity_notify('972500000000', 'group') = 0, 'same sender same day: no second notice');
insert into wa_account_links values ('11111111-1111-4111-8111-111111111111', '972511111111');
select test_assert(fn_raziel_activity_notify('972511111111', 'group') = 0, 'the admin''s own phone: no notice');
update users set email = null; 
select test_assert(fn_raziel_activity_notify('972522222222', 'group') = 0, 'no e-mail: no notice, no error');
update users set email = 'Admin@Example.test' where role = 'admin';
-- GA note: only 11–15.11, both sources, never over an existing note; values unchanged.
select test_assert((select count(*) = 3 from traffic_history where note like 'צפיות כפולות%'), 'three rows noted (11, 15 ga; 15 IL)');
select test_assert((select note = 'existing note' from traffic_history where period = '2026-11-13'), 'existing note kept');
select test_assert((select views = 1972 and sessions = 298 and visitors = 171 from traffic_history where period = '2026-11-15' and source = 'ga'), 'values unchanged');
select test_assert((select note is null from traffic_history where period = '2026-11-16'), '16.11 untouched');
-- Second apply: no change.
\ir ../../supabase/proposed/20261118210000_analytics_followups_PROPOSAL.sql
select test_assert((select ingest = test_md5('public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean)') and raziel = test_md5('public.fn_raziel_activity_notify(text,text)') from test_after), 'second apply is a no-op');

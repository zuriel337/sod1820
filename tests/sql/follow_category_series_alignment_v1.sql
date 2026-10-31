-- THROWAWAY LOCAL POSTGRES ONLY. All accounts/data below are synthetic.
\set ON_ERROR_STOP on
\if :{?follow_series_only}
\else
\set follow_series_only false
\endif
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create table users(id uuid primary key,email text,role text);
create table persons(person_id uuid primary key,account_user_id uuid);
create table identity_edges(person_id uuid,kind text,legacy_id text);
create table notification_prefs(user_id uuid unique,visitor_id text unique,topics text[] default '{}',channels text[] default '{}',
  intensity text default 'normal',muted_until timestamptz,updated_at timestamptz default now());
create table subscribe_events(user_id uuid,visitor_id text,topic text,source text,action text,ts timestamptz default now());
create table user_notifications(id uuid default gen_random_uuid(),user_id uuid,email text,kind text,title text,body text,link text,
  source_topic text,source_ref text,channels_sent text[],dedupe_key text);
create unique index uq_user_notifications_dedupe on user_notifications(dedupe_key) where dedupe_key is not null;
create table notification_events(entity_type text,stable_id text,kind text,source_ref text,topics text[],recipients int,created_at timestamptz default now());
create table posts(id int primary key,title text,slug text,date timestamptz,categories text[],tags text[],author text);
alter table notification_prefs enable row level security;
create policy self_read on notification_prefs for select to authenticated using(user_id=auth.uid());
grant select on notification_prefs to authenticated;
\i tests/fixtures/follow-engine-live-20261026.sql
revoke execute on function public.dispatch(text,text,text,text,text,text,text,uuid) from public,anon,authenticated;
revoke execute on function public.resolve_topics(text,text) from public,anon,authenticated;
create trigger trg_posts_notify after insert on posts for each row execute function notify_on_post_publish();
create temp table follow_checks(message text);
create function pg_temp.ok(condition boolean,message text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'FAIL: %',message; end if;
insert into follow_checks values(message); end $$;

insert into users values
 ('00000000-0000-4000-8000-000000000001','one@example.invalid','member'),
 ('00000000-0000-4000-8000-000000000002','two@example.invalid','member'),
 ('00000000-0000-4000-8000-000000000003','three@example.invalid','member'),
 ('00000000-0000-4000-8000-000000000004','four@example.invalid','member');
insert into notification_prefs(user_id,visitor_id,topics,channels,muted_until) values
 ('00000000-0000-4000-8000-000000000001',null,array['cat:רמזי הגאולה','category:רמזים חזקים','series:mah-kore-habora','series:dimension-five','author:אלון לוי'],array['email'],null),
 ('00000000-0000-4000-8000-000000000002',null,array['series:mah-kore-habora','series:sod-hashmal'],'{}',null),
 ('00000000-0000-4000-8000-000000000003',null,array['cat:סוד החשמל'],'{}',null),
 ('00000000-0000-4000-8000-000000000004',null,array['series:mah-kore-habora'],'{}',now()+interval '1 day'),
 (null,'synthetic-guest',array['series:mah-kore-habora'],'{}',null);
create temp table pref_before as select * from notification_prefs;
select pg_temp.ok(canonical_follow_subject('series','dimension-five')='', 'preimage really lacks series');
select pg_temp.ok(canonical_follow_topic('cat:רמזי הגאולה')='cat:רמזי הגאולה','preimage really lacks rename');

\if :follow_series_only
\i :follow_series_migration
\else
\i supabase/migrations/20261026012207_follow_category_series_alignment_v1.sql
\endif

select pg_temp.ok(not exists((select * from notification_prefs except select * from pref_before)
  union all (select * from pref_before except select * from notification_prefs)), 'migration never rewrites saved choices/channels/mute');
select pg_temp.ok((select count(*) from user_notifications)=0,'migration sends nothing/backfills nothing');
\if :follow_series_only
select pg_temp.ok(canonical_follow_topic('category:רמזי הגאולה')='cat:רמזי הגאולה','series-only release preserves Legacy category meaning');
select pg_temp.ok(not(follow_topic_aliases('cat:רמזים חזקים') @> array['cat:רמזי הגאולה']),'series-only release does not introduce the client-incompatible rename');
select pg_temp.ok(md5(pg_get_functiondef('public.canonical_follow_topic(text)'::regprocedure))='536e29febf235d1bc9f4157b337ac51a','Legacy canonical topic function stays byte-identical');
select pg_temp.ok(md5(pg_get_functiondef('public.follow_topic_aliases(text)'::regprocedure))='3b207f3b0a2e9e1049ce7487275c76f0','Legacy aliases function stays byte-identical');
\else
select pg_temp.ok(canonical_follow_topic('category:רמזי הגאולה')='cat:רמזים חזקים','approved rename maps both namespaces');
select pg_temp.ok(follow_topic_aliases('cat:רמזים חזקים') @> array['cat:רמזי הגאולה','category:רמזי הגאולה'],'old names remain matchable');
\endif
select pg_temp.ok(resolve_topics('series','dimension-five')=array['series:dimension-five'],'server resolves series');
select pg_temp.ok(resolve_topics('series','unknown')='{}','unknown series is not invented');
select pg_temp.ok(canonical_follow_subject('category','מימד חמש')<>canonical_follow_subject('series','dimension-five'),'category is not series');
select pg_temp.ok(post_content_series_keys_v1(array['מימד חמש','הצופן בסרטים'],'{}',null)='{}','5003/5004-like records excluded from target series');
select pg_temp.ok(post_content_series_keys_v1(array['מימד חמש'],'{}','בדרך לנצח')=array['dimension-five'],'text/audio not excluded by media type');
select pg_temp.ok(post_content_series_keys_v1('{}',array['סוד החשמל'],'אחר')=array['sod-hashmal'],'tag-only membership works without invented authorship');
select pg_temp.ok(post_content_series_keys_v1('{}',array['מה קורה הבורא'],'אחר')='{}','series tag cannot override author requirement');
select pg_temp.ok(post_content_series_keys_v1('{}',array['מה קורה הבורא'],' אלון לוי ')='{}','author matching equals exact PostgREST filter');
select pg_temp.ok(post_content_series_keys_v1('{}',array[' מה קורה הבורא '],'אלון לוי')='{}','tag matching equals exact PostgREST filter');
select pg_temp.ok(not has_function_privilege('anon','public.post_content_series_keys_v1(text[],text[],text)','execute'),'internal helper not exposed');
select pg_temp.ok(not has_function_privilege('authenticated','public.dispatch(text,text,text,text,text,text,text,uuid)','execute'),'dispatch ACL unchanged');

select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
select pg_temp.ok((follow_subject_state('category','רמזים חזקים')->>'following')::boolean,'old alias reads as following');
select watch_toggle('cat:רמזים חזקים','synthetic',true,null);
select pg_temp.ok((select count(*) from subscribe_events)=0,'representation reconciliation creates no invented Follow history');
\if :follow_series_only
select pg_temp.ok((select cardinality(topics) from notification_prefs where user_id=auth.uid())=5,'different Legacy category choices remain separate in storage');
\else
select pg_temp.ok((select cardinality(topics) from notification_prefs where user_id=auth.uid())=4,'duplicate category aliases canonicalized on explicit action only');
\endif
select pg_temp.ok((select channels from notification_prefs where user_id=auth.uid())=array['email'],'existing channels remain unchanged');
select follow_subject_toggle('category','רמזי הגאולה','synthetic',false,null);
\if :follow_series_only
select pg_temp.ok(not (follow_subject_state('category','רמזי הגאולה')->>'following')::boolean
  and (follow_subject_state('category','רמזים חזקים')->>'following')::boolean,'Legacy cancellation removes only the selected category');
\else
select pg_temp.ok(not (follow_subject_state('category','רמזים חזקים')->>'following')::boolean,'unfollow old/new removes same intent');
\endif
select pg_temp.ok((select count(*) from subscribe_events where action='unfollow')=1,'one explicit unfollow event');
select watch_toggle('cat:רמזי הגאולה','synthetic',true,null);
select pg_temp.ok((select count(*) from subscribe_events where action='follow')=1,'re-follow is one new event');

-- Overlap of category aliases + author + series still creates one notification/account/event.
insert into posts values(7001,'Alon first','alon-first',now(),array['רמזים חזקים','רמזי הגאולה'],array['מה קורה הבורא'],'אלון לוי');
select pg_temp.ok((select count(*) from user_notifications where source_ref='7001')=2,'two eligible accounts; guest/muted excluded');
select pg_temp.ok((select count(*) from user_notifications where source_ref='7001' and user_id='00000000-0000-4000-8000-000000000001')=1,'overlap dedupes per recipient/event');
select pg_temp.ok((select count(*) from user_notifications where source_ref='7001' and source_topic='series:mah-kore-habora')=1,'series-only follower receives exact series reason');
select dispatch('series','mah-kore-habora','post_new','7001','retry','retry','/alon-first');
select pg_temp.ok((select count(*) from user_notifications where source_ref='7001')=2,'producer retry remains idempotent');
select pg_temp.ok(not exists(select 1 from user_notifications where user_id='00000000-0000-4000-8000-000000000004'),'mute preserved');

insert into posts values(7002,'Hashmal tag-only','hashmal-only',now(),'{}',array['סוד החשמל'],'אחר');
select pg_temp.ok((select count(*) from user_notifications where source_ref='7002')=1,'tag-only series follower notified');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7002' and user_id='00000000-0000-4000-8000-000000000003'),'category follower not silently subscribed to series');
insert into posts values(7003,'Film topic','film-topic',now(),array['מימד חמש','הצופן בסרטים'],'{}',null);
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7003'),'mixed old category does not notify target series');
insert into posts values(7004,'Consciousness text','consciousness',now(),array['מימד חמש'],'{}','בדרך לנצח');
select pg_temp.ok((select count(*) from user_notifications where source_ref='7004')=1,'non-video published series item notifies');

insert into posts values(7005,'Draft','draft',now(),'{}',array['מה קורה הבורא','טיוטה'],'אלון לוי');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7005'),'draft never notifies');
update posts set tags=array['מה קורה הבורא'] where id=7005;
select pg_temp.ok((select count(*) from user_notifications where source_ref='7005')=2,'explicit recent draft publication notifies once');
update posts set tags=array['מה קורה הבורא','חדש'],title='corrected' where id=7005;
update posts set categories=array['סוד החשמל'] where id=7005;
select pg_temp.ok((select count(*) from user_notifications where source_ref='7005')=2,'tag/category/title edits do not replay publication');
insert into posts values(7006,'Old imported','old-import','2000-01-01','{}','{}','אלון לוי');
update posts set tags=array['מה קורה הבורא'] where id=7006;
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7006'),'historical import/reclassification never broadcasts');
insert into posts values(7007,'Forum','forum',now(),'{}',array['מה קורה הבורא','פורום'],'אלון לוי');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7007'),'forum boundary preserved');
select pg_temp.ok(not exists(select 1 from user_notifications where channels_sent<>array['in_app']),'no external channel activated');

-- Same-account mutation only; an account without Follow gets a clean state.
select set_config('test.uid','00000000-0000-4000-8000-000000000003',false);
select pg_temp.ok(not (follow_subject_state('series','sod-hashmal')->>'following')::boolean,'category does not imply series');
select follow_subject_toggle('series','sod-hashmal','synthetic',true,null);
select follow_subject_toggle('series','sod-hashmal','synthetic',true,null);
select pg_temp.ok((select count(*) from subscribe_events where user_id=auth.uid() and topic='series:sod-hashmal')=1,'repeated explicit series follow idempotent');
select pg_temp.ok((select channels from notification_prefs where user_id=auth.uid())='{}','new Follow grants no email/push consent');
select set_config('test.uid','00000000-0000-4000-8000-000000000004',false);
select pg_temp.ok(not (follow_subject_state('series','sod-hashmal')->>'following')::boolean,'account isolation preserved');
select pg_temp.ok((select muted_until>now() from notification_prefs where user_id=auth.uid()),'another account mute remains unchanged');

select json_build_object('status','PASS','checks',(select count(*) from follow_checks),'notifications',(select count(*) from user_notifications),'live_writes',0) as follow_series_local_result;

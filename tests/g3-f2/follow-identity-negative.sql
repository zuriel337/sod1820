\set ON_ERROR_STOP on
\echo 'G3-F2 SQL/RLS negative suite: begin'

create schema if not exists g3f2_test;

create or replace function g3f2_test.assert_true(p_condition boolean, p_message text)
returns void language plpgsql security invoker set search_path='pg_catalog','public','g3f2_test' as $$
begin
  if not coalesce(p_condition,false) then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
end
$$;

create or replace function g3f2_test.assert_raises(p_sql text, p_message text)
returns void language plpgsql security invoker set search_path='pg_catalog','public','g3f2_test' as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'ASSERTION FAILED: expected error: %', p_message;
end
$$;

create or replace function g3f2_test.assert_affected(p_sql text, p_expected integer, p_message text)
returns void language plpgsql security invoker set search_path='pg_catalog','public','g3f2_test' as $$
declare v_count integer;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  if v_count <> p_expected then
    raise exception 'ASSERTION FAILED: % (expected rows %, got %)', p_message, p_expected, v_count;
  end if;
end
$$;

grant usage on schema g3f2_test to anon,authenticated;
grant execute on all functions in schema g3f2_test to anon,authenticated;

-- Stable test principals.
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('00000000-0000-0000-0000-0000000000a1','authenticated','authenticated','a@g3f2.invalid','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
 ('00000000-0000-0000-0000-0000000000b2','authenticated','authenticated','b@g3f2.invalid','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
 ('00000000-0000-0000-0000-0000000000c3','authenticated','authenticated','c@g3f2.invalid','',now(),'{}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do nothing;

insert into public.users(id,email,username,display_name,role)
values
 ('00000000-0000-0000-0000-0000000000a1','a@g3f2.invalid','follower-a','Follower A','user'),
 ('00000000-0000-0000-0000-0000000000b2','b@g3f2.invalid','writer-b','Writer B','user'),
 ('00000000-0000-0000-0000-0000000000c3','c@g3f2.invalid','follower-c','Follower C','user')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Migration/security structure: SECURITY DEFINER search_path, grants, RLS.
-- ---------------------------------------------------------------------------
select g3f2_test.assert_true((
  select count(*) = 7
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('watch_toggle','claim_follow_prefs_from_identity','notify_on_new_follower',
                      'notify_on_or_geula_update','follow_subject_state','follow_subject_toggle','dispatch')
    and p.prosecdef
    and coalesce(p.proconfig,'{}'::text[]) @> array['search_path=public']::text[]
), 'all affected SECURITY DEFINER functions must pin search_path=public');

select g3f2_test.assert_true(not has_function_privilege('anon','public.claim_follow_prefs_from_identity()','EXECUTE'),
  'anon must not execute identity-claim trigger function');
select g3f2_test.assert_true(not has_function_privilege('authenticated','public.claim_follow_prefs_from_identity()','EXECUTE'),
  'authenticated must not execute identity-claim trigger function');
select g3f2_test.assert_true(not has_function_privilege('anon','public.notify_on_new_follower()','EXECUTE'),
  'anon must not execute follower side-effect trigger function');
select g3f2_test.assert_true(not has_function_privilege('authenticated','public.notify_on_or_geula_update()','EXECUTE'),
  'authenticated must not execute dispatcher trigger function');
select g3f2_test.assert_true(has_function_privilege('anon','public.watch_toggle(text,text,boolean,text)','EXECUTE'),
  'anon Watch RPC capability must remain callable');
select g3f2_test.assert_true(has_function_privilege('authenticated','public.follow_subject_toggle(text,text,text,boolean,text)','EXECUTE'),
  'authenticated canonical Follow subject RPC must remain callable');
select g3f2_test.assert_true(not has_table_privilege('anon','public.identity_edges','INSERT')
  and not has_table_privilege('authenticated','public.identity_edges','INSERT')
  and not has_table_privilege('anon','public.persons','INSERT'),
  'identity proof tables must not be writable by clients');
select g3f2_test.assert_true((select relrowsecurity from pg_class where oid='public.notification_prefs'::regclass),
  'notification_prefs RLS must remain enabled');
select g3f2_test.assert_true((
  select position('email' in coalesce(column_default,'')) = 0
  from information_schema.columns
  where table_schema='public' and table_name='notification_prefs' and column_name='channels'
), 'Follow projection default must not contain email/push consent');

-- ---------------------------------------------------------------------------
-- anon cannot impersonate an account user or manufacture identity proof.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claims','{"role":"anon"}',false);
set role anon;
select g3f2_test.assert_raises(
  $$insert into public.notification_prefs(user_id,topics) values ('00000000-0000-0000-0000-0000000000a1'::uuid,array['number:1'])$$,
  'anon direct account preference insert must be rejected by RLS');
select g3f2_test.assert_raises(
  $$insert into public.identity_edges(sod_id,person_id,kind,legacy_id) values ('fake','00000000-0000-0000-0000-00000000f001'::uuid,'legacy_seed','forged')$$,
  'anon must not create identity proof');
reset role;

-- Seed B state + a server-proven visitor edge for B. A must not be able to select or mutate B.
insert into public.notification_prefs(user_id,topics,channels)
values ('00000000-0000-0000-0000-0000000000b2',array['number:222'],'{}'::text[]);
insert into public.persons(person_id,account_user_id,first_source)
values ('00000000-0000-0000-0000-00000000b200','00000000-0000-0000-0000-0000000000b2','g3f2');
insert into public.identity_edges(sod_id,person_id,kind,legacy_id)
values ('sod-b','00000000-0000-0000-0000-00000000b200','legacy_seed','visitor-b');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"a@g3f2.invalid"}',false);
set role authenticated;
select g3f2_test.assert_true(auth.uid()='00000000-0000-0000-0000-0000000000a1'::uuid,
  'test JWT must reproduce auth.uid()');
select g3f2_test.assert_true((select count(*) from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000b2')=0,
  'authenticated A must not read B Follow state through RLS');
select g3f2_test.assert_affected(
  $$update public.notification_prefs set topics=array['number:999'] where user_id='00000000-0000-0000-0000-0000000000b2'::uuid$$,
  0, 'authenticated A must not update B Follow state through RLS');
select g3f2_test.assert_true((public.follow_subject_state('number','222','visitor-b')->>'following')::boolean=false,
  'authenticated state RPC must ignore caller visitor_id and use auth.uid()');
select public.follow_subject_toggle('number','333','g3f2-auth-proof',true,'visitor-b');
reset role;
select g3f2_test.assert_true((select topics @> array['number:333'] from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1'),
  'authenticated A Follow must write A even when B visitor_id is supplied');
select g3f2_test.assert_true((select topics = array['number:222']::text[] from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000b2'),
  'caller-supplied visitor_id must not switch authenticated identity to B');

-- ---------------------------------------------------------------------------
-- visitor_id alone remains a guest capability; it cannot create an account claim.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claims','{"role":"anon"}',false);
set role anon;
select public.follow_subject_toggle('number','444','g3f2-guest',true,'unlinked-guest');
reset role;
select g3f2_test.assert_true((select count(*)=1 from public.notification_prefs where visitor_id='unlinked-guest' and user_id is null),
  'unlinked visitor Follow must remain guest state');
select g3f2_test.assert_true((select channels='{}'::text[] from public.notification_prefs where visitor_id='unlinked-guest'),
  'guest Follow must not auto opt in email/push');
select g3f2_test.assert_true((select count(*)=0 from public.identity_edges where legacy_id='unlinked-guest'),
  'visitor_id alone must not manufacture identity proof');

-- ---------------------------------------------------------------------------
-- Claim only through persons + identity_edges proof; guest channels never transfer.
-- ---------------------------------------------------------------------------
delete from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1' or visitor_id='guest-claim';
delete from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1' or visitor_id='guest-claim';
insert into public.notification_prefs(visitor_id,topics,channels,intensity)
values ('guest-claim',array['num_358'],array['email','push'],'normal');
insert into public.persons(person_id,account_user_id,first_source)
values ('00000000-0000-0000-0000-00000000a100','00000000-0000-0000-0000-0000000000a1','g3f2');
insert into public.identity_edges(sod_id,person_id,kind,legacy_id)
values ('sod-a','00000000-0000-0000-0000-00000000a100','legacy_seed','guest-claim');
select g3f2_test.assert_true((select count(*)=0 from public.notification_prefs where visitor_id='guest-claim'),
  'proven guest projection must be retired after claim');
select g3f2_test.assert_true((select topics=array['number:358']::text[] from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1'),
  'identity proof claim must canonicalize guest Follow onto account');
select g3f2_test.assert_true((select channels='{}'::text[] from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1'),
  'guest email/push channels must never transfer to account consent');

-- ---------------------------------------------------------------------------
-- Alias convergence is representation reconciliation, not a duplicate Follow.
-- ---------------------------------------------------------------------------
delete from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1';
delete from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1';
insert into public.notification_prefs(user_id,topics,channels)
values ('00000000-0000-0000-0000-0000000000a1',array['num_358'],'{}'::text[]);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"a@g3f2.invalid"}',false);
set role authenticated;
select public.follow_subject_toggle('number','358','g3f2-alias',true,null);
reset role;
select g3f2_test.assert_true((select topics=array['number:358']::text[] from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1'),
  'legacy num_358 must converge to one canonical number:358 subject');
select g3f2_test.assert_true((select count(*)=0 from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1'),
  'alias reconciliation must not create fake new Follow provenance');
select g3f2_test.assert_true(public.canonical_follow_subject('category','רמזי "גאולה"')='cat:רמזי ״גאולה״',
  'category compatibility form must canonicalize without creating a new engine');
select g3f2_test.assert_true(public.resolve_topics('number','358')=array['number:358','num_358']::text[],
  'World/System Frame resolver must retain canonical + compatibility aliases');

-- ---------------------------------------------------------------------------
-- Retry/idempotency + real follow -> unfollow -> follow history.
-- ---------------------------------------------------------------------------
delete from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1';
delete from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"a@g3f2.invalid"}',false);
set role authenticated;
select public.follow_subject_toggle('number','777','g3f2-retry',true,null);
select public.follow_subject_toggle('number','777','g3f2-retry',true,null);
reset role;
select g3f2_test.assert_true((select count(*)=1 from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1' and topic='number:777' and action='follow'),
  'duplicate/retry Follow must be idempotent');
select g3f2_test.assert_true((select channels='{}'::text[] from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1'),
  'account Follow must not auto opt in email/push');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"a@g3f2.invalid"}',false);
set role authenticated;
select public.follow_subject_toggle('number','777','g3f2-history',false,null);
select public.follow_subject_toggle('number','777','g3f2-history',true,null);
reset role;
select g3f2_test.assert_true((select count(*)=3 from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1' and topic='number:777'),
  'follow-unfollow-follow must retain all three provenance events');
select g3f2_test.assert_true((select count(*)=2 from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1' and topic='number:777' and action='follow')
  and (select count(*)=1 from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1' and topic='number:777' and action='unfollow'),
  'history must contain two real follows and one unfollow');

-- ---------------------------------------------------------------------------
-- Identity claim must not fabricate author new_follower; an explicit Follow still does.
-- ---------------------------------------------------------------------------
delete from public.user_notifications;
delete from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1' or visitor_id='guest-author';
delete from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1' or visitor_id='guest-author';
delete from public.identity_edges where person_id='00000000-0000-0000-0000-00000000a100';
delete from public.persons where person_id='00000000-0000-0000-0000-00000000a100';
insert into public.notification_prefs(visitor_id,topics,channels)
values ('guest-author',array['author:Writer B'],array['email']);
insert into public.persons(person_id,account_user_id,first_source)
values ('00000000-0000-0000-0000-00000000a101','00000000-0000-0000-0000-0000000000a1','g3f2');
insert into public.identity_edges(sod_id,person_id,kind,legacy_id)
values ('sod-a2','00000000-0000-0000-0000-00000000a101','legacy_seed','guest-author');
select g3f2_test.assert_true((select count(*)=0 from public.user_notifications where user_id='00000000-0000-0000-0000-0000000000b2' and kind='new_follower'),
  'identity claim must not fabricate new_follower');

delete from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000a1';
delete from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000a1';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","email":"a@g3f2.invalid"}',false);
set role authenticated;
select public.follow_subject_toggle('author','Writer B','g3f2-real-author-follow',true,null);
reset role;
select g3f2_test.assert_true((select count(*)=1 from public.user_notifications where user_id='00000000-0000-0000-0000-0000000000b2' and kind='new_follower'),
  'explicit author Follow must still emit one real new_follower side effect');

-- ---------------------------------------------------------------------------
-- Dispatcher remains the single fan-out path for durable Or Geula updates.
-- ---------------------------------------------------------------------------
delete from public.notification_prefs where user_id='00000000-0000-0000-0000-0000000000b2';
delete from public.subscribe_events where user_id='00000000-0000-0000-0000-0000000000b2';
delete from public.user_notifications where user_id='00000000-0000-0000-0000-0000000000b2';
delete from public.notification_events;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated","email":"b@g3f2.invalid"}',false);
set role authenticated;
select public.follow_subject_toggle('media_channel','orgeula','g3f2-channel-follow',true,null);
reset role;
insert into public.channel_updates(id,text,status,created_at,channel)
values ('00000000-0000-0000-0000-00000000d001','G3-F2 dispatcher probe','live',now(),'or-geula');
select g3f2_test.assert_true((select count(*)=1 from public.notification_events where entity_type='media_channel' and stable_id='or-geula' and kind='or_geula_new' and recipients=1),
  'Or Geula trigger must reach the existing Dispatcher event path');
select g3f2_test.assert_true((select count(*)=1 from public.user_notifications where user_id='00000000-0000-0000-0000-0000000000b2' and kind='or_geula_new' and source_topic='channel:or-geula'),
  'Dispatcher must fan out to the canonical channel Follow subject');
select g3f2_test.assert_true((
  select position('perform public.dispatch' in lower(pg_get_functiondef(p.oid))) > 0
     and position('insert into public.user_notifications' in lower(pg_get_functiondef(p.oid))) = 0
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='notify_on_or_geula_update'
), 'Or Geula trigger must call Dispatcher rather than build a parallel fan-out path');

-- World/System Frame consumer contract: opaque (entity_type, stable_id) seam only.
select g3f2_test.assert_true(public.canonical_follow_subject('number','358')='number:358',
  'canonical_follow_subject must derive number subject from entity_type + stable_id');
select g3f2_test.assert_true(public.canonical_follow_subject('unsupported','anything')='',
  'unsupported entity types must fail closed at the canonical Follow subject seam');

\echo 'G3-F2 SQL/RLS negative suite: PASS'

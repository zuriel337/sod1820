-- DISPOSABLE LOCAL POSTGRES ONLY. All identities/data are synthetic.
-- Extends the existing 44 checks with real SET ROLE / RLS / claim / receipt lifecycle.
\set ON_ERROR_STOP on
\i tests/sql/follow_category_series_alignment_v1.sql

grant usage on schema auth to anon,authenticated;
grant select,insert on follow_checks to anon,authenticated;
create function pg_temp.denied(p_sql text,p_message text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when insufficient_privilege then
    perform pg_temp.ok(true,p_message); return;
  end;
  raise exception 'FAIL: expected permission denial: %',p_message;
end $$;

-- Same live claim function, not a simulated preference merge.
\i docs/reviews/follow-series-release-20261031/identity-claim-preimage.sql
revoke all on function public.claim_follow_prefs_from_identity() from public,anon,authenticated;
create trigger test_identity_claim after insert on identity_edges
for each row execute function public.claim_follow_prefs_from_identity();

-- Extend only this local fixture with the live notification ownership predicate.
alter table user_notifications add column read_at timestamptz;
create function auth.jwt() returns jsonb language sql stable
as $$select coalesce(nullif(current_setting('test.claims',true),''),'{}')::jsonb$$;
alter table user_notifications enable row level security;
create policy un_owner_read on user_notifications for select to authenticated
using(user_id=auth.uid() or lower(email)=lower(coalesce(auth.jwt()->>'email','no-jwt-email')));
create policy un_owner_update on user_notifications for update to authenticated
using(user_id=auth.uid() or lower(email)=lower(coalesce(auth.jwt()->>'email','no-jwt-email')))
with check(user_id=auth.uid() or lower(email)=lower(coalesce(auth.jwt()->>'email','no-jwt-email')));
grant select on user_notifications to authenticated;
grant update(read_at) on user_notifications to authenticated;

insert into users values
 ('00000000-0000-4000-8000-000000000005','five@example.invalid','user'),
 ('00000000-0000-4000-8000-000000000006','six@example.invalid','user');
insert into notification_prefs(user_id,topics,channels,intensity,muted_until)
values('00000000-0000-4000-8000-000000000005',array['number:1820'],array['push'],'normal',null);
insert into notification_prefs(visitor_id,topics,channels,intensity,muted_until)
values('release-guest',array['series:dimension-five'],array['email'],'quiet',now()+interval '1 hour');

select set_config('test.uid','',false);
set role anon;
select pg_temp.ok((follow_subject_state('series','dimension-five','release-guest')->>'following')::boolean,
  'guest state reads only the exact opaque guest capability');
select pg_temp.denied('select * from public.notification_prefs','anon cannot enumerate preferences');
select pg_temp.denied('select * from public.user_notifications','anon cannot enumerate receipts');
select pg_temp.denied($q$select public.dispatch('series','dimension-five','post_new','fake','fake','fake','/fake')$q$,
  'anon cannot manufacture publication delivery');
select pg_temp.denied($q$insert into public.identity_edges values('10000000-0000-4000-8000-000000000005','legacy_seed','release-guest')$q$,
  'anon cannot manufacture verified identity proof');
reset role;

insert into posts values(7100,'Guest not delivered','release-before-claim',now(),array['מימד חמש'],'{}','בדרך לנצח');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7100'
  and (user_id='00000000-0000-4000-8000-000000000005' or user_id is null)),
  'guest intent is not an account recipient before a verified identity link');

-- Trusted identity boundary only: Auth/OTP provider itself is outside this SQL fixture.
insert into persons values('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000005');
insert into identity_edges values('10000000-0000-4000-8000-000000000005','legacy_seed','release-guest');
select pg_temp.ok((select topics @> array['number:1820','series:dimension-five'] from notification_prefs
  where user_id='00000000-0000-4000-8000-000000000005'),'claim merges guest series with existing account intent');
select pg_temp.ok((select channels=array['push'] and intensity='normal' and muted_until is null from notification_prefs
  where user_id='00000000-0000-4000-8000-000000000005'),'claim preserves existing account channels and settings');
select pg_temp.ok(not exists(select 1 from notification_prefs where visitor_id='release-guest'),'claim removes orphan guest projection');
insert into identity_edges values('10000000-0000-4000-8000-000000000005','login',null);
select pg_temp.ok((select cardinality(topics)=2 from notification_prefs where user_id='00000000-0000-4000-8000-000000000005'),
  'claim retry does not duplicate an intent');

-- A new account carries intent/mute, but never guest delivery consent.
insert into notification_prefs(visitor_id,topics,channels,intensity,muted_until)
values('release-new-account',array['series:sod-hashmal'],array['email'],'quiet',now()+interval '1 hour');
insert into persons values('10000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000006');
insert into identity_edges values('10000000-0000-4000-8000-000000000006','legacy_seed','release-new-account');
select pg_temp.ok((select topics=array['series:sod-hashmal'] and channels='{}'::text[] and intensity='quiet' and muted_until>now()
  from notification_prefs where user_id='00000000-0000-4000-8000-000000000006'),
  'new account receives intent/mute without inheriting guest email consent');

select set_config('test.uid','00000000-0000-4000-8000-000000000005',false);
select set_config('test.claims','{"email":"five@example.invalid"}',false);
set role authenticated;
select pg_temp.ok((follow_subject_state('series','dimension-five','someone-elses-visitor')->>'following')::boolean,
  'verified caller identity overrides the supplied visitor');
select follow_subject_toggle('series','dimension-five','release-acceptance',true,'release-new-account');
select pg_temp.ok((select count(*)=1 from notification_prefs),'preferences are restricted to the current account by RLS');
select pg_temp.denied($q$select public.dispatch('series','dimension-five','post_new','fake','fake','fake','/fake')$q$,
  'ordinary account cannot manufacture publication delivery');
reset role;
select pg_temp.ok((select topics=array['series:sod-hashmal'] from notification_prefs
  where user_id='00000000-0000-4000-8000-000000000006'),'tampered visitor does not mutate another account');

insert into posts values(7101,'Series receipt','release-series-receipt',now(),array['מימד חמש'],'{}','בדרך לנצח');
select pg_temp.ok((select count(*)=1 from user_notifications where source_ref='7101'
  and user_id='00000000-0000-4000-8000-000000000005' and source_topic='series:dimension-five'),
  'future publication creates one receipt for the claimed explicit series intent');

set role authenticated;
select pg_temp.ok((select count(*)=1 from user_notifications where source_ref='7101'),'recipient can read its own receipt');
update user_notifications set read_at=now() where source_ref='7101';
select pg_temp.ok((select read_at is not null from user_notifications where source_ref='7101'),'recipient can mark its receipt read');
select pg_temp.ok(not exists(select 1 from user_notifications where user_id<>auth.uid()),'other recipients stay invisible');
select follow_subject_toggle('series','dimension-five','release-acceptance',false,null);
select pg_temp.ok(not (follow_subject_state('series','dimension-five',null)->>'following')::boolean,
  'explicit cancellation is immediately reflected in the same reader');
reset role;
insert into posts values(7102,'After cancellation','release-after-cancel',now(),array['מימד חמש'],'{}','בדרך לנצח');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7102'
  and user_id='00000000-0000-4000-8000-000000000005'),'cancellation suppresses subsequent publication delivery');

set role authenticated;
select follow_subject_toggle('series','dimension-five','release-acceptance',true,null);
reset role;
update notification_prefs set muted_until=now()+interval '1 hour' where user_id='00000000-0000-4000-8000-000000000005';
insert into posts values(7103,'Muted','release-muted',now(),array['מימד חמש'],'{}','בדרך לנצח');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='7103'
  and user_id='00000000-0000-4000-8000-000000000005'),'mute suppresses subsequent publication delivery');
update notification_prefs set muted_until=null where user_id='00000000-0000-4000-8000-000000000005';
insert into posts values(7104,'Resumed','release-resumed',now(),array['מימד חמש'],'{}','בדרך לנצח');
select pg_temp.ok((select count(*)=1 from user_notifications where source_ref='7104'
  and user_id='00000000-0000-4000-8000-000000000005'),'delivery resumes after the mute ends');
select pg_temp.ok(not exists(select 1 from user_notifications where channels_sent<>array['in_app']),
  'even existing email/push preferences do not activate external delivery in this candidate');

select set_config('test.uid','00000000-0000-4000-8000-000000000006',false);
select set_config('test.claims','{"email":"six@example.invalid"}',false);
set role authenticated;
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref in ('7101','7104')),
  'account switch cannot read the previous account receipts');
update user_notifications set read_at=now() where source_ref='7104';
reset role;
select pg_temp.ok((select read_at is null from user_notifications where source_ref='7104'
  and user_id='00000000-0000-4000-8000-000000000005'),'another account cannot mark the previous account receipt read');

select json_build_object('status','PASS','checks',(select count(*) from follow_checks),
  'actual_roles_and_rls',true,'auth_provider_otp_tested',false,'external_delivery',false,'live_writes',0) as follow_series_release_result;

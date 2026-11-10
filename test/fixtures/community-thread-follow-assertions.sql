create function pg_temp.ok(value boolean, label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end$$;
insert into users(id,email) select ('11111111-1111-4111-8111-11111111111'||n)::uuid,'fixture'||n||'@example.invalid' from generate_series(1,5)n;
insert into research_contributions(id,origin,status,body,author_user_id,author_name) values
('22222222-2222-4222-8222-222222222221','openweb','approved','root','11111111-1111-4111-8111-111111111111','root owner'),
('22222222-2222-4222-8222-222222222222','openweb','approved','hidden','11111111-1111-4111-8111-111111111111','root owner'),
('22222222-2222-4222-8222-222222222223','number','approved','private','11111111-1111-4111-8111-111111111111','root owner'),
('22222222-2222-4222-8222-222222222224','openweb','approved','deleted','11111111-1111-4111-8111-111111111111','root owner');
update research_contributions set thread_hidden_at=now() where id='22222222-2222-4222-8222-222222222222';
update research_contributions set deleted_at=now() where id='22222222-2222-4222-8222-222222222224';
truncate user_notifications;
insert into notification_prefs(user_id,topics,channels,muted_until) values
('11111111-1111-4111-8111-111111111111',array['thread:22222222-2222-4222-8222-222222222221'],'{}',null),
('11111111-1111-4111-8111-111111111112',array['number:1820'],array['email'],null),
('11111111-1111-4111-8111-111111111113',array['thread:22222222-2222-4222-8222-222222222221'],'{}',null),
('11111111-1111-4111-8111-111111111114',array['thread:22222222-2222-4222-8222-222222222221'],'{}',now()+interval '1 day');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111112',false);
select watch_toggle('thread:22222222-2222-4222-8222-222222222221','community_thread',true,null);
select watch_toggle('thread:22222222-2222-4222-8222-222222222221','community_thread',true,null);
select pg_temp.ok((select count(*)=1 from subscribe_events),'repeated follow is idempotent and records one explicit source event');
select pg_temp.ok((select topics@>array['number:1820','thread:22222222-2222-4222-8222-222222222221'] and channels=array['email'] from notification_prefs where user_id=auth.uid()),'existing topics and channel consent preserved');
select pg_temp.ok((select count(*)=0 from user_notifications),'following creates no alert or historical backfill');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,created_at) values
('77777777-7777-4777-8777-777777777777','22222222-2222-4222-8222-222222222221','community_2029','pending','historical','11111111-1111-4111-8111-111111111113','2026-11-03');
update research_contributions set status='approved' where id='77777777-7777-4777-8777-777777777777';
select pg_temp.ok((select count(*)=0 from user_notifications),'historical native import and later approval never replay old events');
do $$declare bad text;begin
 foreach bad in array array['22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222223','22222222-2222-4222-8222-222222222224','99999999-9999-4999-8999-999999999999'] loop
  begin perform watch_toggle('thread:'||bad,'community_thread',true,null);raise exception 'nonpublic follow accepted';exception when insufficient_privilege then null;end;
 end loop;
 begin perform watch_toggle('thread:not-an-id','community_thread',true,null);raise exception 'bad identity accepted';exception when invalid_parameter_value then null;end;
 perform set_config('request.jwt.claim.sub','',false);
 begin perform watch_toggle('thread:22222222-2222-4222-8222-222222222221','community_thread',true,'visitor');raise exception 'guest followed';exception when insufficient_privilege then null;end;
end$$;
select pg_temp.ok((select count(*)=1 from subscribe_events),'guest/private/hidden/deleted/invalid identities cannot mutate thread follows');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent) values
('33333333-3333-4333-8333-333333333331','22222222-2222-4222-8222-222222222221','community_2029','approved','[sod:v1]
[b]reply[/b]','11111111-1111-4111-8111-111111111113','reply author','תגובה');
select pg_temp.ok((select count(*)=2 from user_notifications),'one in-app notification per recipient: follower and immediate author deduplicate');
select pg_temp.ok((select count(distinct user_id)=2 and bool_and(channels_sent=array['in_app']) and bool_and(source_topic='thread:22222222-2222-4222-8222-222222222221') from user_notifications),'canonical topic and in-app channel only');
select pg_temp.ok(not exists(select 1 from user_notifications where user_id in ('11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111114','11111111-1111-4111-8111-111111111115')),'actor, muted subscriber and nonfollower excluded');
select pg_temp.ok((select bool_and(body not like '%[sod:%' and link like '%thread=22222222-2222-4222-8222-222222222221&reply=33333333-3333-4333-8333-333333333331&path=%') from user_notifications),'notification contains a clean body and exact native thread/reply handoff');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent) values
('33333333-3333-4333-8333-333333333332','33333333-3333-4333-8333-333333333331','community_2029','approved','nested','11111111-1111-4111-8111-111111111112','nested author','תגובה');
select pg_temp.ok((select count(*)=2 and count(distinct user_id)=2 from user_notifications where source_ref='community:33333333-3333-4333-8333-333333333332'),'nested replies reach root followers and immediate parent author');
select pg_temp.ok((select bool_and(link like '%path=22222222-2222-4222-8222-222222222221,33333333-3333-4333-8333-333333333331,33333333-3333-4333-8333-333333333332') from user_notifications where source_ref='community:33333333-3333-4333-8333-333333333332'),'full ancestor path retained');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent) values
('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222221','community_2029','pending','pending','11111111-1111-4111-8111-111111111113','author','תגובה');
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref='community:33333333-3333-4333-8333-333333333333'),'pending reply sends nothing');
update research_contributions set status='approved' where id='33333333-3333-4333-8333-333333333333';
select pg_temp.ok((select count(*)=2 from user_notifications where source_ref='community:33333333-3333-4333-8333-333333333333'),'later approval emits once');
update research_contributions set body='edited',status='approved' where id='33333333-3333-4333-8333-333333333333';
update research_contributions set status='hidden' where id='33333333-3333-4333-8333-333333333333';
update research_contributions set status='approved' where id='33333333-3333-4333-8333-333333333333';
select pg_temp.ok((select count(*)=2 from user_notifications where source_ref='community:33333333-3333-4333-8333-333333333333'),'ordinary edits, duplicate approval and reapproval cannot duplicate recipient/event');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent)
select ('44444444-4444-4444-8444-44444444444'||n)::uuid,('22222222-2222-4222-8222-22222222222'||n)::uuid,'community_2029','approved','nonpublic ancestry','11111111-1111-4111-8111-111111111113','author','תגובה' from generate_series(2,4)n;
select pg_temp.ok(not exists(select 1 from user_notifications where source_ref like 'community:44444444%'),'hidden/deleted/non-Community ancestry discloses nothing');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111112',false);
do $$begin
 begin perform watch_toggle('thread:33333333-3333-4333-8333-333333333331','community_thread',true,null);raise exception 'reply accepted as root';exception when insufficient_privilege then null;end;
end$$;
select watch_toggle('thread:22222222-2222-4222-8222-222222222221','community_thread',false,null);
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent) values
('55555555-5555-4555-8555-555555555551','22222222-2222-4222-8222-222222222221','community_2029','approved','after unfollow','11111111-1111-4111-8111-111111111113','author','תגובה');
select pg_temp.ok((select count(*)=1 from user_notifications where source_ref='community:55555555-5555-4555-8555-555555555551'),'unfollow stops future root alerts');
select watch_toggle('thread:22222222-2222-4222-8222-222222222221','community_thread',true,null);
update research_contributions set thread_hidden_at=now() where id='22222222-2222-4222-8222-222222222221';
select watch_toggle('thread:22222222-2222-4222-8222-222222222221','community_thread',false,null);
select pg_temp.ok((select not topics@>array['thread:22222222-2222-4222-8222-222222222221'] from notification_prefs where user_id=auth.uid()),'hidden followed thread can always be removed');
select watch_toggle('number:1820','fixture',false,null);
select watch_toggle('number:1820','fixture',true,null);
select pg_temp.ok((select topics@>array['number:1820'] and channels=array['email'] from notification_prefs where user_id=auth.uid()),'established non-Community watch behavior preserved');

-- ZURIEL, 8.11.2026: a reply to a legacy message (author_contributor_id only, no
-- author_user_id) must still notify the contributor's linked account.
insert into contributors(id,user_id,display_name) values
('66666666-6666-4666-8666-666666666661','11111111-1111-4111-8111-111111111115','Legacy Owner');
insert into research_contributions(id,origin,status,body,author_contributor_id,author_name) values
('66666666-6666-4666-8666-666666666662','openweb','approved','legacy root','66666666-6666-4666-8666-666666666661','Legacy Owner');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent) values
('66666666-6666-4666-8666-666666666663','66666666-6666-4666-8666-666666666662','community_2029','approved','reply to legacy owner','11111111-1111-4111-8111-111111111113','reply author','תגובה');
select pg_temp.ok((select count(*)=1 from user_notifications where user_id='11111111-1111-4111-8111-111111111115'),'reply to a legacy (contributor-only) message notifies its linked account');
select pg_temp.ok((select bool_and(kind='reply' and link like '%thread=66666666-6666-4666-8666-666666666662&reply=66666666-6666-4666-8666-666666666663%') from user_notifications where user_id='11111111-1111-4111-8111-111111111115'),'legacy-owner notification carries the exact thread/reply link');
-- An explicit author_user_id on the message itself is never superseded by a
-- conflicting contributor link (mirrors _community_message_owned_by_caller_v1).
insert into contributors(id,user_id,display_name) values
('66666666-6666-4666-8666-666666666664','11111111-1111-4111-8111-111111111112','Other Owner');
insert into research_contributions(id,origin,status,body,author_user_id,author_contributor_id,author_name) values
('66666666-6666-4666-8666-666666666665','openweb','approved','explicit author wins','11111111-1111-4111-8111-111111111115','66666666-6666-4666-8666-666666666664','Explicit Owner');
insert into research_contributions(id,parent_id,origin,status,body,author_user_id,author_name,intent) values
('66666666-6666-4666-8666-666666666666','66666666-6666-4666-8666-666666666665','community_2029','approved','reply to explicit author','11111111-1111-4111-8111-111111111113','reply author','תגובה');
select pg_temp.ok((select count(*)=1 from user_notifications where user_id='11111111-1111-4111-8111-111111111115' and link like '%reply=66666666-6666-4666-8666-666666666666%'),'an explicit author_user_id is notified, never the conflicting contributor link');
select pg_temp.ok(not exists(select 1 from user_notifications where user_id='11111111-1111-4111-8111-111111111112' and link like '%reply=66666666-6666-4666-8666-666666666666%'),'the conflicting linked account of a different contributor is not notified');

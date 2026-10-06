-- Behavioral test (scratch PG only). Stubs minimal live shapes, loads the migration, asserts behavior.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key);
create table public.users(id uuid primary key, role text);
create table public.bot_outbox(done_key text primary key, bot text not null, chat_id text not null, reply text, msg_in text, attempts int not null default 0, status text not null default 'pending', first_at timestamptz not null default now(), last_at timestamptz not null default now(), sent_msg_id text, payload jsonb not null default '{}'::jsonb);
create table public.wa_account_links(id bigserial primary key, user_id uuid, phone text, verified_at timestamptz default now());
create table public.notification_prefs(id uuid primary key default gen_random_uuid(), user_id uuid unique, topics text[] default '{}', channels text[] default '{}', muted_until timestamptz);
create table public.user_notifications(id uuid primary key default gen_random_uuid(), email text, read_at timestamptz, created_at timestamptz default now(), user_id uuid, kind text default 'general', title text, body text, link text, source_topic text, source_ref text, channels_sent text[] default '{}', dedupe_key text);
create unique index on public.user_notifications(dedupe_key) where dedupe_key is not null;
create table public.system_suggestions(id bigint primary key generated always as identity, created_at timestamptz default now(), category text, title text, observed jsonb, status text default 'pending');
grant select,update,insert on public.user_notifications to authenticated; grant select,insert,update on public.user_notifications to service_role;
\i supabase/migrations/20261006210000_raziel_whatsapp_unified_notifications_v1.sql

create function pg_temp.q() returns int language sql as $$ select count(*)::int from public.bot_outbox $$;
create function pg_temp.ok(c boolean, m text) returns void language plpgsql as $$ begin if not c then raise exception 'FAIL: %', m; end if; end $$;
insert into public.users values ('00000000-0000-0000-0000-00000000000a','admin'),('00000000-0000-0000-0000-00000000000b','user'),('00000000-0000-0000-0000-00000000000c','user'),('00000000-0000-0000-0000-00000000000d','user');
-- a: admin linked+whatsapp, topics only system_high. b: linked, no whatsapp channel. c: whatsapp channel but NOT linked. d: linked+whatsapp but muted.
insert into public.wa_account_links(user_id,phone) values ('00000000-0000-0000-0000-00000000000a','972500000001'),('00000000-0000-0000-0000-00000000000b','972500000002'),('00000000-0000-0000-0000-00000000000d','972500000004');
insert into public.notification_prefs(user_id,topics,channels,muted_until) values
 ('00000000-0000-0000-0000-00000000000a','{admin:system_high}','{email,whatsapp}',null),
 ('00000000-0000-0000-0000-00000000000b','{news}','{email}',null),
 ('00000000-0000-0000-0000-00000000000c','{news}','{email,whatsapp}',null),
 ('00000000-0000-0000-0000-00000000000d','{news}','{whatsapp}', now()+interval '1 day');

-- linked + whatsapp pref queues exactly once, no legacy link in text, notification_id in payload
insert into public.user_notifications(id,user_id,title,body,link,source_topic) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-00000000000a','כותרת','גוף','/admin/legacy','news');
select pg_temp.ok(pg_temp.q()=1, 'linked+whatsapp queues exactly one');
select pg_temp.ok((select reply not like '%/admin%' and reply not like '%/%' and chat_id='972500000001@c.us' and payload->>'notification_id'='11111111-1111-1111-1111-111111111111' and bot='system' from public.bot_outbox), 'no link, right chat, payload id');
-- idempotent
insert into public.bot_outbox(done_key,bot,chat_id,reply) values ('x','system','y','z'); delete from public.bot_outbox where done_key='x';
-- others never queue
insert into public.user_notifications(user_id,title,body) values ('00000000-0000-0000-0000-00000000000b','t','b'),('00000000-0000-0000-0000-00000000000c','t','b'),('00000000-0000-0000-0000-00000000000d','t','b');
select pg_temp.ok(pg_temp.q()=1, 'no-pref / unlinked / muted never queue');
-- admin gate: admin:raziel_activity not in topics => no; admin:system_high => yes
insert into public.user_notifications(user_id,title,body,source_topic) values ('00000000-0000-0000-0000-00000000000a','t','b','admin:raziel_activity');
select pg_temp.ok(pg_temp.q()=1, 'admin topic gate blocks unopted topic');
insert into public.user_notifications(user_id,title,body,source_topic) values ('00000000-0000-0000-0000-00000000000a','t','b','admin:system_high');
select pg_temp.ok(pg_temp.q()=2, 'admin topic gate allows opted topic');

-- receipt: failed/retry/ignored never mark; sent marks once
update public.bot_outbox set status='sending', attempts=1 where done_key='un-wa:11111111-1111-1111-1111-111111111111';
select public.outbox_mark_system('un-wa:11111111-1111-1111-1111-111111111111','failed');
select pg_temp.ok((select channels_sent='{}' from public.user_notifications where id='11111111-1111-1111-1111-111111111111'),'failed does not mark sent');
update public.bot_outbox set status='sending' where done_key='un-wa:11111111-1111-1111-1111-111111111111';
select public.outbox_mark_system('un-wa:11111111-1111-1111-1111-111111111111','retry');
select pg_temp.ok((select channels_sent='{}' from public.user_notifications where id='11111111-1111-1111-1111-111111111111'),'retry does not mark sent');
update public.bot_outbox set status='sending' where done_key='un-wa:11111111-1111-1111-1111-111111111111';
select public.outbox_mark_system('un-wa:11111111-1111-1111-1111-111111111111','sent','mid');
select public.outbox_mark_system('un-wa:11111111-1111-1111-1111-111111111111','sent','mid'); -- replay => ignored
select pg_temp.ok((select channels_sent='{whatsapp}' from public.user_notifications where id='11111111-1111-1111-1111-111111111111'),'sent appends whatsapp exactly once');

-- raziel activity: default OFF (admin has no raziel_activity topic) => nothing
select pg_temp.ok(public.fn_raziel_activity_notify('972500000099','פרטי (DM)')=0, 'raziel_activity default off');
update public.notification_prefs set topics=topics||'{admin:raziel_activity}' where user_id='00000000-0000-0000-0000-00000000000a';
select pg_temp.ok(public.fn_raziel_activity_notify('972500000001','פרטי')=0, 'admin own phone excluded');
select pg_temp.ok(public.fn_raziel_activity_notify('972500000099','פרטי (DM)')=1, 'opted-in admin gets one');
select pg_temp.ok(public.fn_raziel_activity_notify('972500000099','פרטי (DM)')=0, 'deduped per sender/day');
select pg_temp.ok((select title||body not like '%972500000099%' and link is null from public.user_notifications where kind='admin_raziel_activity'),'privacy-minimal, no link');
select pg_temp.ok((select count(*) from public.bot_outbox where done_key like 'un-wa:%')=3,'activity flows through unified outbox');

-- system_high producer: admin a has system_high opted-in; b (non-admin) opted in too; c admin w/o topic
insert into public.users values ('00000000-0000-0000-0000-00000000000e','admin');
insert into public.notification_prefs(user_id,topics,channels) values ('00000000-0000-0000-0000-00000000000e','{news}','{email}');
update public.notification_prefs set topics=topics||'{admin:system_high}' where user_id='00000000-0000-0000-0000-00000000000b';
create function pg_temp.sh() returns int language sql as $$ select count(*)::int from public.user_notifications where kind='admin_system_high' $$;
insert into public.system_suggestions(category,title,observed,status) values ('cat','low',jsonb_build_object('severity','low'),'pending'),('cat','nosev','{}','pending'),('cat','hi-accepted',jsonb_build_object('severity','high'),'accepted');
select pg_temp.ok(pg_temp.sh()=0,'low/none severity or non-pending status => no notification');
insert into public.system_suggestions(category,title,observed,status) values ('infra',E'disk\nfull','{"severity":"high","secret":"RAWPAYLOAD","phone":"972599"}','pending');
select pg_temp.ok(pg_temp.sh()=1,'high+pending => exactly one (opted-in admin only; non-admin and no-opt-in excluded)');
select pg_temp.ok((select user_id='00000000-0000-0000-0000-00000000000a' and title||body not like '%RAWPAYLOAD%' and title||body not like '%972599%' and title not like E'%\n%' and link is null and source_topic='admin:system_high' and body like '%high%' from public.user_notifications where kind='admin_system_high'),'safe fields only, no raw payload/link');
update public.system_suggestions set title='disk full 2' where title like 'disk%';
select pg_temp.ok(pg_temp.sh()=1,'update dedupes per suggestion/user');
update public.system_suggestions set observed=jsonb_build_object('severity','critical'), status='pending' where title='low';
select pg_temp.ok(pg_temp.sh()=2,'update to critical+pending notifies');
update public.system_suggestions set status='accepted' where title='low'; update public.system_suggestions set status='pending' where title='low';
select pg_temp.ok(pg_temp.sh()=2,'status flap deduped');
update public.system_suggestions set status='pending', observed=jsonb_build_object('severity','high') where title='hi-accepted';
select pg_temp.ok(pg_temp.sh()=3,'accepted->pending high notifies');

-- column privileges: authenticated may update read_at only
select pg_temp.ok(has_column_privilege('authenticated','public.user_notifications','read_at','UPDATE'),'auth can update read_at');
select pg_temp.ok(not has_column_privilege('authenticated','public.user_notifications','channels_sent','UPDATE'),'auth cannot forge channels_sent');
select pg_temp.ok(not has_column_privilege('authenticated','public.user_notifications','title','UPDATE'),'auth cannot forge title');
select pg_temp.ok(not has_column_privilege('authenticated','public.user_notifications','body','UPDATE'),'auth cannot forge body');
select pg_temp.ok(not has_column_privilege('authenticated','public.user_notifications','link','UPDATE'),'auth cannot forge link');
select pg_temp.ok(not has_column_privilege('authenticated','public.user_notifications','user_id','UPDATE'),'auth cannot forge user_id');
select pg_temp.ok(has_table_privilege('authenticated','public.user_notifications','SELECT') and not has_table_privilege('authenticated','public.user_notifications','UPDATE'),'SELECT intact, no table-wide UPDATE');
select pg_temp.ok(has_table_privilege('service_role','public.user_notifications','UPDATE'),'service_role unaffected');
\echo RAZIEL_WA_UNIFIED_SQL_PASS

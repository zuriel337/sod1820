-- Scratch-DB stub for V5 replay: psql -f this, then -f supabase/migrations/20261001073835_g3_wa_db_held_http_cutover_v5_outbox.sql (verified on PG16 2026-10-01).
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('t.uid',true),'')::uuid $$;
create schema cron; create table cron.job(jobid serial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values(n,s,c) on conflict(jobname) do update set schedule=excluded.schedule, command=excluded.command returning jobid $$;
create function cron.alter_job(job_id bigint, command text) returns void language sql as $$ update cron.job set command=$2 where jobid=$1 $$;
create schema net; create function net.http_post(url text, body jsonb) returns bigint language sql as $$ select 1::bigint $$;
create table public.bot_outbox(done_key text primary key, bot text not null, chat_id text not null, reply text not null, msg_in text, attempts int not null default 0, status text not null default 'pending', first_at timestamptz not null default now(), last_at timestamptz not null default now(), sent_msg_id text);
alter table public.bot_outbox enable row level security;
create table public.admin_notify(channel text, target text, enabled bool);
insert into public.admin_notify values ('whatsapp','972500000001@c.us',true),('whatsapp','972500000002@c.us',true),('email','a@b.c',true);
create table public.wa_link_codes(id bigserial primary key, user_id uuid, phone text, code text, expires_at timestamptz, created_at timestamptz default now());
create table public.wa_account_links(user_id uuid, phone text);
create function public.wa_norm_phone(t text) returns text language sql as $$ select regexp_replace(t,'\D','','g') $$;
create function public.detect_suggestions() returns jsonb language sql as $$ select '{}'::jsonb $$;
create function public.site_pulse(i int) returns jsonb language sql as $$ select '{"new_findings":"1"}'::jsonb $$;
create table public.system_suggestions(title text,confidence int,status text,created_at timestamptz default now());
create function public.wa_send(a text,b text) returns jsonb language sql as $$ select '{}'::jsonb $$;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
-- fixture of the exact job 55 send tail
insert into cron.job(jobname,command) values ('ti-post-37034-daily-watch', $x$DECLARE
  v_send jsonb;
  v_accepted boolean := false;
BEGIN
  IF v_target IS NOT NULL THEN
    v_send:=public.wa_send(v_target,v_body);
    v_accepted:=coalesce((v_send->>'http_status')::integer between 200 and 299,false);
    IF v_accepted THEN update public.user_notifications set channels_sent=array['in_app','whatsapp'] where id=v_notice; END IF;
  END IF;
  update public.analytics_cache set payload=payload||jsonb_build_object('notification_id',v_notice,'delivery',jsonb_build_object('in_app_created',true,'whatsapp_target_configured',v_target is not null,'provider_accepted',v_accepted,'http_status',v_send->'http_status','delivery_receipt_confirmed',false)) where cache_key=v_key;
END;$x$);

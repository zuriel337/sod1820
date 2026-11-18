-- Isolated stand-ins for the live tables this proposal reads or writes (columns as read live 18.11.2026; only the ones used).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create table public.users (id uuid primary key, role text, email text);
create table public.notification_prefs (id uuid primary key default gen_random_uuid(), user_id uuid unique, visitor_id text, email text,
  topics text[] not null default '{}', channels text[] not null default '{}', updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(), intensity text not null default 'normal', muted_until timestamptz);
create table public.user_notifications (id uuid primary key default gen_random_uuid(), user_id uuid, email text not null,
  kind text not null default 'general', title text not null, body text, link text, read_at timestamptz,
  created_at timestamptz not null default now(), source_topic text, source_ref text, channels_sent text[] not null default '{}', dedupe_key text);
create unique index uq_user_notifications_dedupe on public.user_notifications (dedupe_key) where dedupe_key is not null;
create table public.system_suggestions (id bigserial primary key, created_at timestamptz default now(), category text not null, detector text,
  title text not null, reason text, observed jsonb, confidence smallint, sample_size integer, estimated_impact text,
  status text not null default 'pending', decided_at timestamptz, decision_note text, dedupe_key text);
create unique index system_suggestions_dedupe on public.system_suggestions (dedupe_key) where status = any (array['pending', 'later']);
create table public.gsc_metrics (site text not null, date date not null, dimension text not null, key text not null default '',
  clicks numeric, impressions numeric, ctr numeric, position numeric, fetched_at timestamptz, unique (site, date, dimension, key));
create table public.traffic_history (id bigserial primary key, source text, granularity text, period date, created_at timestamptz default now());

-- suggest_add exactly as read live 18.11.2026.
CREATE OR REPLACE FUNCTION public.suggest_add(p_category text, p_detector text, p_title text, p_reason text, p_observed jsonb, p_confidence integer, p_sample integer, p_impact text, p_dedupe text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id bigint;
begin
  if exists (select 1 from system_suggestions
             where dedupe_key = p_dedupe and (status in ('pending','later')
                or (status='rejected' and decided_at > now() - interval '30 days'))) then
    update system_suggestions set observed = p_observed, confidence = p_confidence, sample_size = p_sample, estimated_impact = p_impact
      where dedupe_key = p_dedupe and status in ('pending','later');
    return null;
  end if;
  insert into system_suggestions (category, detector, title, reason, observed, confidence, sample_size, estimated_impact, dedupe_key)
  values (p_category, p_detector, p_title, p_reason, p_observed, greatest(0,least(100,p_confidence)), p_sample, p_impact, p_dedupe)
  returning id into v_id;
  return v_id;
end; $function$;

\ir baseline-notify-high.sql
create trigger trg_system_suggestion_notify_high after insert or update of status, observed on public.system_suggestions
  for each row execute function public.fn_system_suggestion_notify_high();

-- A minimal pg_cron stand-in with the live job text (the vault lookup is kept verbatim; it is never executed here).
create schema cron;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create function cron.alter_job(job_id bigint, schedule text default null, command text default null) returns void language sql as $$
  update cron.job set schedule = coalesce(alter_job.schedule, job.schedule), command = coalesce(alter_job.command, job.command) where jobid = job_id $$;
create function cron.unschedule(job_name text) returns boolean language sql as $$ with d as (delete from cron.job where jobname = job_name returning 1) select exists (select 1 from d) $$;
create table public.test_live_cmd (command text);
insert into public.test_live_cmd values (' with s as (select decrypted_secret as key from vault.decrypted_secrets where name=''GSC_SYNC_KEY'' order by created_at desc limit 1) select net.http_post(url:=''https://linswmnnkjxvweumprav.supabase.co/functions/v1/gsc-sync'',headers:=jsonb_build_object(''Content-Type'',''application/json'',''x-gsc-key'',s.key),body:=jsonb_build_object(''days'',7,''site'',''sc-domain:sod1820.co.il'')) from s where nullif(s.key,'''') is not null; ');
insert into cron.job (jobname, schedule, command) select 'gsc-daily-sync', '17 5 * * *', command from public.test_live_cmd;
insert into cron.job (jobname, schedule, command) values ('health-watch', '*/15 * * * *', 'select public.fn_health_watch()');

create function public.test_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL %', label; end if; raise notice 'PASS %', label; end $$;
create function public.test_notify_md5() returns text language sql as $$ select md5(pg_get_functiondef('public.fn_system_suggestion_notify_high()'::regprocedure)) $$;

insert into public.users values ('11111111-1111-4111-8111-111111111111', 'admin', 'Admin@Example.test'),
  ('22222222-2222-4222-8222-222222222222', 'member', 'member@example.test');
insert into public.notification_prefs (user_id, topics) values ('11111111-1111-4111-8111-111111111111', '{admin:system_high}'),
  ('22222222-2222-4222-8222-222222222222', '{admin:system_high}');

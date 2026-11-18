-- Isolated stand-ins (columns as read live 18.11.2026; only those used). Auth is a dependency, not reimplemented.
create schema auth;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.persons(person_id uuid primary key default gen_random_uuid(),account_user_id uuid,created_at timestamptz default now(),first_seen timestamptz,last_seen timestamptz,first_source text);
create table public.users(id uuid primary key, role text, email text);
create table public.events(event_id uuid default gen_random_uuid(),ts timestamptz not null default now(),sod_id text,person_id uuid,session_id text,surface text,event_type text,path text,ref_host text,via text,app_context text,device text,journey_id text,depth_reached smallint,utm jsonb,is_bot boolean not null default false,props jsonb,ingest_at timestamptz default now());
create function public.resolve_person(text,text,text) returns uuid language sql as $$select null::uuid$$;
create table public.notification_prefs (id uuid primary key default gen_random_uuid(), user_id uuid unique, email text, topics text[] not null default '{}');
create table public.wa_account_links (user_id uuid, phone text);
create table public.user_notifications (id uuid primary key default gen_random_uuid(), user_id uuid, email text not null, kind text not null default 'general',
  title text not null, body text, link text, created_at timestamptz not null default now(), source_topic text, source_ref text, dedupe_key text);
create unique index uq_user_notifications_dedupe on public.user_notifications (dedupe_key) where dedupe_key is not null;
create table public.traffic_history (id bigserial primary key, period date not null, granularity text not null, views int, visitors int, sessions int,
  source text, note text, created_at timestamptz default now(), unique (period, granularity, source));
grant usage on schema public, auth to anon, authenticated;
\ir baseline-ingest-event.sql
\ir baseline-raziel.sql
grant execute on function public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb,boolean) to anon, authenticated;
grant insert on public.events to anon, authenticated;

create function public.test_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL %', label; end if; raise notice 'PASS %', label; end $$;
create function public.test_md5(p regprocedure) returns text language sql as $$ select md5(pg_get_functiondef(p)) $$;
-- An ELS search exactly as the client sends it (measurementBody of emit("els", ...)).
create function public.test_els(kind text, event text default 'search', extra jsonb default '{}') returns boolean language plpgsql as $$
begin
  perform public.ingest_event(p_sod_id=>'sod-test-0001', p_surface=>'els', p_event_type=>event, p_path=>'/code', p_session_id=>'session-test-1',
    p_app_context=>'chrome', p_props=>jsonb_build_object('action_version',1,'kind',kind,'scope','torah','skip',7) || extra
      || jsonb_build_object('measurement', jsonb_build_object('version',2,'page_path','/code','visitor_id','browser-test-1')));
  return true;
exception when others then
  raise notice 'refused: %', sqlerrm;
  return false;
end $$;

insert into public.users values ('11111111-1111-4111-8111-111111111111', 'admin', 'Admin@Example.test'), ('22222222-2222-4222-8222-222222222222', 'member', 'm@example.test');
insert into public.notification_prefs (user_id, topics) values ('11111111-1111-4111-8111-111111111111', '{admin:raziel_activity}'), ('22222222-2222-4222-8222-222222222222', '{admin:raziel_activity}');
insert into public.traffic_history (period, granularity, views, visitors, sessions, source, note) values
  ('2026-11-10','day',8,2,4,'ga',null), ('2026-11-11','day',1200,199,310,'ga',null), ('2026-11-15','day',1972,171,298,'ga',null),
  ('2026-11-15','day',1926,149,274,'ga:country:IL',null), ('2026-11-13','day',1702,165,224,'ga','existing note'), ('2026-11-16','day',540,173,288,'ga',null);

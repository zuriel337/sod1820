-- minimal stand-ins for the live objects the migration extends (test-only; never applied anywhere)
do $$ begin
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create table public.analytics_cache(cache_key text primary key, payload jsonb, computed_at timestamptz);
create table public.work_log(id uuid primary key default gen_random_uuid(), session_date date, topic text not null, what_we_did text, status text, open_threads text, created_at timestamptz default now(), archived boolean not null default false);
create table public.events(id bigserial primary key, ts timestamptz default now(), sod_id text, session_id text, surface text, event_type text, path text, props jsonb, is_bot boolean default false);
create table public.notify_log(t text);
create table public.suggestions_log(detector text, dedupe text);
create table public.nodes(id uuid primary key default gen_random_uuid(), type text not null, label text not null, description text, metadata jsonb, is_active boolean, rule_id text, rule_version int, depends_on jsonb, supersedes_version int, weight numeric, hebrew_date text, axis_theme text, gallery_id text, identity_key text);
create table public.channel_ingest_sources(enabled boolean, display_name text, label text, channel text, last_run_at timestamptz, poll_every_min int, priority int);
create function public.notify_admin(p_text text, p_image_url text default null) returns jsonb language sql as $$ insert into public.notify_log values (p_text) returning '{}'::jsonb $$;
create function public.suggest_add(a text,b text,c text,d text,e jsonb,f int,g int,h text,i text) returns bigint language sql as $$ insert into public.suggestions_log values (b,i) returning 1::bigint $$;
create function public.wa_admin(a text, b jsonb, c text) returns jsonb language sql as $$ select '{"result":{"stateInstance":"authorized"}}'::jsonb $$;
insert into public.nodes(type,label,description,metadata,is_active,rule_id,rule_version) values ('rule','deploy','v1 text',null,false,'deploy_on_request',1),('rule','deploy','v2 text','{}',true,'deploy_on_request',2);

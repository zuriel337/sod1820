-- Minimal stand-ins for what ingest_event touches. Only the function body is the live text.
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.events(event_id uuid, ts timestamptz, sod_id text, person_id uuid, session_id text, surface text, event_type text, path text, ref_host text,
  via text, app_context text, device text, journey_id text, depth_reached smallint, utm jsonb, is_bot boolean, props jsonb);
create table public.persons(person_id uuid primary key default gen_random_uuid(), account_user_id uuid, first_seen timestamptz, last_seen timestamptz, first_source text, created_at timestamptz default now());
create table public.gematria_words(id uuid primary key default gen_random_uuid(), public_trend_approved boolean);
create function public.gematria_public_word_eligible(uuid) returns boolean language sql stable as $$ select true $$;
create function public.resolve_person(text,text,text) returns uuid language sql as $$ select null::uuid $$;
create function public.edge_rate_limit_check(text,int,int) returns jsonb language sql as $$ select '{"allowed":true}'::jsonb $$;

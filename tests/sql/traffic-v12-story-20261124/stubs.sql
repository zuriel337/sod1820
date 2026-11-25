-- Stand-ins for objects ingest_event calls (not under test): auth.uid(), persons, resolve_person, edge_rate_limit_check, gematria_words.
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.persons (person_id uuid primary key default gen_random_uuid(), account_user_id uuid, created_at timestamptz default now(),
  first_seen timestamptz, last_seen timestamptz, first_source text);
create function public.resolve_person(text, text, text) returns uuid language sql as $$ select null::uuid $$;
create function public.edge_rate_limit_check(text, int, int) returns jsonb language sql as $$ select '{"allowed": true}'::jsonb $$;
create table public.gematria_words (id bigint primary key, public_trend_approved boolean);
create function public.gematria_public_word_eligible(bigint) returns boolean language sql as $$ select true $$;
-- public.events as live: partitioned by range(ts), same columns, no unique key on event_id.
create table public.events (event_id uuid default gen_random_uuid(), ts timestamptz default now(), sod_id text, person_id uuid, session_id text,
  surface text, event_type text, path text, ref_host text, via text, app_context text, device text, journey_id text, depth_reached smallint,
  utm jsonb, is_bot boolean default false, props jsonb, ingest_at timestamptz default now()) partition by range (ts);
create table public.events_default partition of public.events default;
create role anon nologin; create role authenticated nologin;

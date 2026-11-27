create role anon nologin; create role authenticated nologin;
create schema auth;
create table public.events(event_id uuid default gen_random_uuid(), ts timestamptz, sod_id text, person_id uuid, session_id text, surface text, event_type text, path text,
  ref_host text, via text, app_context text, device text, journey_id text, depth_reached smallint, utm jsonb, is_bot boolean default false, props jsonb);

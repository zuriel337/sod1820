-- Fixture only, consumed by the isolated Unix-socket PostgreSQL harness.
-- Never run against an existing Supabase project. This is not a migration.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
create table public.op_trace_roots (trace_id uuid primary key);
create table public.op_trace_spans (
  span_id uuid primary key, trace_id uuid not null references public.op_trace_roots(trace_id) on delete cascade
);
create table public.ai_token_log (
  id bigint generated always as identity primary key,
  source text, kind text, model text, input_tokens integer, output_tokens integer,
  user_id uuid references auth.users(id), ref text, ref_name text,
  trace_id uuid references public.op_trace_roots(trace_id) on delete set null,
  span_id uuid references public.op_trace_spans(span_id) on delete set null,
  unique(trace_id,span_id)
);
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on public.ai_token_log to service_role;
grant select on public.op_trace_roots, public.op_trace_spans to service_role;
-- Matches the canonical identity column: INSERT is granted; sequence USAGE is
-- not needed (and was not granted in the read-only metadata check).

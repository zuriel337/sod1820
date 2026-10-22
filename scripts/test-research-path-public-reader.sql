\set ON_ERROR_STOP on

-- Disposable PostgreSQL harness for Research Path public reader/publication security.
-- Mirrors only existing live prerequisites; it creates no production object.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end
$$;
alter role service_role bypassrls;

create schema if not exists auth;
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;

create table if not exists public.users(
  id uuid primary key,
  role text
);
create or replace function public.rd_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.users u where u.id=auth.uid() and u.role='admin')
$$;
revoke all on function public.rd_is_admin() from public, anon;
grant execute on function public.rd_is_admin() to authenticated, service_role;

-- Existing live prerequisites required by the tracked 2026-08-25 baseline snapshot.
create table if not exists public.persons(
  person_id uuid primary key
);
create table if not exists public.decision_reason_codes(
  code text primary key
);

\i supabase/migrations/20260825140000_research_intake_step0_live_schema_reconciliation.sql

-- Live governance vocabulary added after the baseline snapshot.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='decision_ledger_status_governance_vocab'
      and conrelid='public.decision_ledger'::regclass
  ) then
    alter table public.decision_ledger
      add constraint decision_ledger_status_governance_vocab
      check (status is null or status in ('confirmed','rejected','applied','executed'))
      not valid;
  end if;
end
$$;

\i supabase/migrations/20260907142000_research_path_foundation_v1.sql
\i supabase/migrations/20260913160507_g2_bedrock_research_path_outcome_envelope_v1.sql
\i supabase/migrations/20260922205800_g3_research_path_resumability_runtime_v1.sql
\i supabase/migrations/20261004110000_research_path_public_reader_v1.sql
\i tests/sql/research_path_public_reader_v1.sql

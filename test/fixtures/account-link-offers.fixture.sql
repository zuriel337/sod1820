-- Minimal Supabase-like fixture for account_link_offers_v1 (roles, auth.users, auth.uid()).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
insert into auth.users(id) values
 ('793dc271-2194-4110-b5ff-d2422d6f1c85'),  -- A: older (secondary) account
 ('365fb241-77ed-4a9d-98ab-4e30ab53c093'),  -- B: canonical (primary) account
 ('11111111-1111-4111-8111-111111111111'),  -- C: unrelated account
 ('22222222-2222-4222-8222-222222222222'),  -- D: second pair, secondary
 ('33333333-3333-4333-8333-333333333333')   -- E: second pair, primary
on conflict do nothing;

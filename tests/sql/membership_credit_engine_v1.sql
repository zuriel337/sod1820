-- Synthetic-only acceptance for Membership Credit Engine V1.
-- The runner creates a disposable, local PostgreSQL cluster with no project URL.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;

create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0
);
create table public.credit_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid,
  amount integer not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function public.credit_grant(p_user_id uuid, p_amount integer, p_reason text, p_meta jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.credit_ledger(user_id, amount, reason, meta)
  values (p_user_id, p_amount, p_reason, coalesce(p_meta, '{}'::jsonb));
  update public.profiles set credits = credits + p_amount where user_id = p_user_id;
  if not found then raise exception 'credit_profile_missing'; end if;
end;
$$;
revoke all on function public.credit_grant(uuid,integer,text,jsonb) from public, anon, authenticated;

-- Reproduce permissive historical defaults. The migration must secure every
-- new object explicitly without changing global defaults.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- APPLY_MEMBERSHIP_CREDIT_MIGRATION_HERE

create function public.credit_test_assert(ok boolean, message text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', message; end if;
end;
$$;
create function public.credit_test_throws(statement text, expected text)
returns void language plpgsql as $$
declare observed text;
begin
  begin execute statement; exception when others then observed := sqlerrm; end;
  if observed is null or position(expected in observed) = 0 then
    raise exception 'Expected rejection containing %, observed %', expected, coalesce(observed, 'NO REJECTION');
  end if;
end;
$$;

select public.credit_test_assert(
  (select count(*) = 5 and bool_and(c.relrowsecurity)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in (
     'membership_plans', 'credit_action_prices', 'membership_credit_cycles',
     'credit_reservations', 'credit_reservation_allocations'
   )),
  'RLS enabled on all five engine tables');

select public.credit_test_assert(
  not has_table_privilege('anon', 'public.membership_plans', 'SELECT')
  and not has_table_privilege('authenticated', 'public.credit_action_prices', 'SELECT')
  and not has_table_privilege('authenticated', 'public.membership_credit_cycles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.credit_reservations', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.credit_reservation_allocations', 'SELECT'),
  'catalogs, allocations and direct writes stay server-owned');

select public.credit_test_assert(
  not has_function_privilege('anon', 'public.credit_reserve_v1(text,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.credit_reserve_v1(text,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.credit_return_v1(uuid,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.credit_return_v1(uuid,text)', 'EXECUTE'),
  'RPC permissions separate member and service operations');

select public.credit_test_assert(
  (select bool_and(not active and not published) and count(*) = 2 from public.membership_plans)
  and (select bool_and(not active and launch_state = 'draft') and count(*) = 6 from public.credit_action_prices),
  'every commercial seed is disabled by default');

select public.credit_test_assert(
  (select monthly_price_ils = 30 and annual_price_ils = 300 and monthly_allowance = 600 and rollover_cap = 1200
   from public.membership_plans where plan_code = 'sod_personal')
  and (select monthly_price_ils = 79 and annual_price_ils = 790 and monthly_allowance = 3000 and rollover_cap = 6000
   from public.membership_plans where plan_code = 'sod_research')
  and (select credit_cost = 15 from public.credit_action_prices where action_key = 'raziel_fast')
  and (select credit_cost = 500 from public.credit_action_prices where action_key = 'els_matrix_ai_reading'),
  'draft economics match the approved internal contract');

insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.profiles(user_id, credits) values
  ('11111111-1111-4111-8111-111111111111', 100),
  ('22222222-2222-4222-8222-222222222222', 10);

update public.credit_action_prices
set active = true, launch_state = 'preview'
where action_key = 'raziel_fast';

set role anon;
select public.credit_test_throws(
  $$select public.credit_reserve_v1('raziel_fast','anon-op-0001')$$,
  'permission denied');
reset role;

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.credit_test_throws(
  $$update public.credit_action_prices set credit_cost = 1 where action_key = 'raziel_fast'$$,
  'permission denied');
select public.credit_test_assert(
  public.credit_reserve_v1('raziel_fast', 'reserve-op-0001')->>'cost' = '15',
  'server catalog fixes the cost');
select public.credit_test_assert(
  (public.credit_reserve_v1('raziel_fast', 'reserve-op-0001')->>'already')::boolean,
  'same operation reference is idempotent');
select public.credit_test_assert(
  public.credit_reserve_v1('raziel_fast', 'reserve-op-0001')->>'balance' = '85',
  'replay debits only once');
select public.credit_test_assert(
  (select count(*) = 1 from public.credit_reservations),
  'owner can read only own reservation through RLS');
select public.credit_test_throws(
  $$select public.credit_settle_v1('00000000-0000-0000-0000-000000000000', null)$$,
  'permission denied');

set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.credit_test_assert((select count(*) = 0 from public.credit_reservations), 'RLS hides another owner');
select public.credit_test_throws(
  $$select public.credit_reserve_v1('raziel_fast','poor-user-op-0001')$$,
  'insufficient_credits');
reset role;

set request.jwt.claim.role = 'service_role';
select public.credit_test_assert(
  public.credit_settle_v1(
    (select id from public.credit_reservations where operation_ref = 'reserve-op-0001'),
    'synthetic-result-1'
  )->>'status' = 'settled',
  'service settles a completed operation');
select public.credit_test_assert(
  (public.credit_settle_v1(
    (select id from public.credit_reservations where operation_ref = 'reserve-op-0001'),
    'synthetic-result-1'
  )->>'already')::boolean,
  'settlement replay is idempotent');

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.credit_reserve_v1('raziel_fast', 'return-op-00001');
reset role;
set request.jwt.claim.role = 'service_role';
select public.credit_test_assert(
  public.credit_return_v1(
    (select id from public.credit_reservations where operation_ref = 'return-op-00001'),
    'synthetic_failure'
  )->>'status' = 'returned',
  'technical failure returns reserved credits');
select public.credit_test_assert(
  (public.credit_return_v1(
    (select id from public.credit_reservations where operation_ref = 'return-op-00001'),
    'synthetic_failure'
  )->>'already')::boolean,
  'return replay cannot refund twice');
select public.credit_test_assert(
  (select credits = 85 from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'settled spend remains and failed spend is restored exactly once');

update public.membership_plans set active = true where plan_code = 'sod_personal';
select public.credit_test_assert(
  public.membership_credit_cycle_grant_v1(
    '11111111-1111-4111-8111-111111111111', 'sod_personal', 'period-2026-10',
    '2026-10-01 00:00:00+00', '2026-11-01 00:00:00+00'
  )->>'allowance' = '600',
  'service grants the monthly allowance');
select public.credit_test_assert(
  (public.membership_credit_cycle_grant_v1(
    '11111111-1111-4111-8111-111111111111', 'sod_personal', 'period-2026-10',
    '2026-10-01 00:00:00+00', '2026-11-01 00:00:00+00'
  )->>'already')::boolean,
  'billing replay does not grant twice');
select public.credit_test_assert(
  (select credits = 685 from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'allowance adds to purchased or earned balance');

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.credit_reserve_v1('raziel_fast', 'cycle-op-000001');
select public.credit_test_assert(
  (select remaining_credits = 585 and used_credits = 15
   from public.membership_credit_cycles where period_ref = 'period-2026-10'),
  'membership credits are consumed before general balance');
reset role;
set request.jwt.claim.role = 'service_role';
select public.credit_return_v1(
  (select id from public.credit_reservations where operation_ref = 'cycle-op-000001'),
  'provider_unavailable'
);
select public.credit_test_assert(
  (select remaining_credits = 600 and used_credits = 0
   from public.membership_credit_cycles where period_ref = 'period-2026-10'),
  'failure restores the source cycle while it is valid');

select public.membership_credit_cycle_grant_v1(
  '11111111-1111-4111-8111-111111111111', 'sod_personal', 'period-2026-11',
  '2026-11-01 00:00:00+00', '2026-12-01 00:00:00+00'
);
select public.membership_credit_cycle_grant_v1(
  '11111111-1111-4111-8111-111111111111', 'sod_personal', 'period-2026-12',
  '2026-12-01 00:00:00+00', '2027-01-01 00:00:00+00'
);
select public.credit_test_assert(
  (select coalesce(sum(remaining_credits), 0) = 1200
   from public.membership_credit_cycles
   where user_id = '11111111-1111-4111-8111-111111111111' and status = 'active')
  and (select credits = 1285 from public.profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'two-month rollover cap trims included credits but preserves general credits');

-- Force one synthetic cycle beyond its expiry. This is local fixture data only.
update public.membership_credit_cycles
set period_start = now() - interval '63 days',
    period_end = now() - interval '32 days',
    expires_at = now() - interval '1 day'
where period_ref = 'period-2026-11';

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.membership_credit_summary_v1();
reset role;
select public.credit_test_assert(
  (select credits = 685 from public.profiles where user_id = '11111111-1111-4111-8111-111111111111')
  and (select status = 'expired' and remaining_credits = 0
       from public.membership_credit_cycles where period_ref = 'period-2026-11'),
  'expiry removes only unused included credits and leaves general balance intact');

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.credit_reserve_v1('raziel_fast', 'expiry-op-00001');
reset role;
update public.credit_reservations set expires_at = now() - interval '1 minute'
where operation_ref = 'expiry-op-00001';
set request.jwt.claim.role = 'service_role';
select public.credit_test_assert(
  public.credit_release_expired_v1(10)->>'returned' = '1',
  'expired reservations are released by the service sweeper');
select public.credit_test_assert(
  public.credit_release_expired_v1(10)->>'returned' = '0',
  'reservation sweeper is replay-safe');

select public.credit_test_assert(
  (select count(*) = 4 from public.credit_ledger where reason = 'credit_reserve')
  and (select count(*) = 3 from public.credit_ledger where reason = 'credit_return'),
  'ledger records each debit and refund exactly once');

select 'MEMBERSHIP CREDIT ENGINE SQL ACCEPTANCE PASS' as result;

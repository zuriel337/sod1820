-- Synthetic-only acceptance. Runner refuses any container with network access.
drop database if exists cardcom_pilot_acceptance;
create database cardcom_pilot_acceptance;
\connect cardcom_pilot_acceptance

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='pilot_existing_reader') then create role pilot_existing_reader nologin; end if;
end $$;
create schema auth;
create schema extensions;
create schema private;
create extension pgcrypto with schema extensions;
grant usage on schema private to pilot_existing_reader;
create table private.pilot_existing_sentinel(id integer);
create temp table private_acl_before as select nspacl::text as acl from pg_namespace where nspname='private';
create table auth.users(id uuid primary key);
create table public.users(id uuid primary key, role text not null);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select on public.users to authenticated;
-- Reproduce permissive historic Supabase defaults: migration must revoke them
-- on its own objects without changing defaults or other schema permissions.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema private grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- APPLY_PILOT_MIGRATION_HERE

create function public.pilot_test_assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',message; end if; end $$;
create function public.pilot_test_throws(statement text, expected text) returns void language plpgsql as $$
declare observed text;
begin
  begin execute statement; exception when others then observed := sqlerrm; end;
  if observed is null or position(expected in observed)=0 then
    raise exception 'Expected rejection containing %, observed %',expected,coalesce(observed,'NO REJECTION');
  end if;
end $$;

select public.pilot_test_assert(
  (select nspacl::text from pg_namespace where nspname='private')=(select acl from private_acl_before),
  'shared private schema ACL unchanged');
select public.pilot_test_assert(
  (select count(*)=3 and bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where (n.nspname='public' and c.relname in ('membership_subscription_pilots','membership_subscription_pilot_charges'))
       or (n.nspname='private' and c.relname='cardcom_subscription_credentials')),
  'RLS enabled on exactly all three pilot tables');
select public.pilot_test_assert(
  not has_table_privilege('anon','public.membership_subscription_pilots','SELECT')
  and not has_table_privilege('anon','public.membership_subscription_pilot_charges','SELECT')
  and not has_table_privilege('authenticated','public.membership_subscription_pilots','INSERT')
  and not has_table_privilege('authenticated','public.membership_subscription_pilots','UPDATE')
  and not has_table_privilege('authenticated','private.cardcom_subscription_credentials','SELECT')
  and not has_table_privilege('anon','private.cardcom_subscription_credentials','SELECT'),
  'anonymous and direct credentials/product writes denied despite old defaults');
select public.pilot_test_assert(
  (select count(*)=8 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'membership_pilot_%'),
  'exact eight scoped RPC functions');
select public.pilot_test_assert(
  (select bool_and(p.prosecdef and p.proconfig is not null) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'membership_pilot_%'),
  'privileged seam has explicit search paths');
select public.pilot_test_assert(
  not has_function_privilege('authenticated','public.membership_pilot_claim_due(text)','EXECUTE')
  and not has_function_privilege('anon','public.membership_pilot_cancel()','EXECUTE')
  and not has_function_privilege('anon','public.membership_pilot_status(text)','EXECUTE'),
  'bridge and owner RPC permissions are distinct');

insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
insert into public.users(id,role) select id,case when id::text like '3333%' then 'member' else 'admin' end from auth.users;
set role anon;
select public.pilot_test_throws('select * from public.membership_subscription_pilots','permission denied');
select public.pilot_test_throws('select * from private.cardcom_subscription_credentials','permission denied');
select public.pilot_test_throws($q$select public.membership_pilot_start_guard('wrong-secret','11111111-1111-4111-8111-111111111111')$q$,'forbidden');
select public.pilot_test_throws($q$select public.membership_pilot_start_guard('synthetic-bridge-only','33333333-3333-4333-8333-333333333333')$q$,'admin_only');
select public.pilot_test_assert((public.membership_pilot_start_guard('synthetic-bridge-only','11111111-1111-4111-8111-111111111111')->>'allowed')::boolean,'admin may reserve first checkout');
select public.pilot_test_assert(public.membership_pilot_register('synthetic-bridge-only','11111111-1111-4111-8111-111111111111',
  'SODM-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','fixture-low-a','Synthetic A','a@example.invalid')->>'status'='pending','registration stays pending');
select public.pilot_test_assert(not (public.membership_pilot_start_guard('synthetic-bridge-only','11111111-1111-4111-8111-111111111111')->>'allowed')::boolean,'second checkout rejected');
select public.pilot_test_throws($q$select public.membership_pilot_register('synthetic-bridge-only','11111111-1111-4111-8111-111111111111',
  'SODM-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','fixture-low-duplicate','Synthetic Duplicate',null)$q$,'one_open_per_user');
select public.pilot_test_assert(public.membership_pilot_register('synthetic-bridge-only','22222222-2222-4222-8222-222222222222',
  'SODM-cccccccc-cccc-4ccc-8ccc-cccccccccccc','fixture-low-b','Synthetic B',null)->>'status'='pending','second authorized owner independent');
select public.pilot_test_assert(public.membership_pilot_webhook_lookup('synthetic-bridge-only','unknown')->>'known'='false','unknown webhook ignored');
reset role;

-- Owner RPC and RLS must not expose another account, even to another pilot admin.
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.pilot_test_assert(public.membership_pilot_status(null)->>'status'='pending','owner pending status');
select public.pilot_test_assert(public.membership_pilot_status(null)->>'low_profile_id'='fixture-low-a','only owner receives opaque reconciliation ID');
select public.pilot_test_assert(public.membership_pilot_status('SODM-cccccccc-cccc-4ccc-8ccc-cccccccccccc')->>'status'='none','cross-owner ref fails closed');
select public.pilot_test_assert(not public.membership_pilot_status(null) ?| array['token_ciphertext','token_iv','token_tag','billing_email','billing_name'],'owner status contains no credentials or billing details');
select public.pilot_test_throws('update public.membership_subscription_pilots set amount_ils=1','permission denied');
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
select public.pilot_test_assert((select count(*)=0 from public.membership_subscription_pilots),'unrelated member cannot read pilot rows');
select public.pilot_test_assert((select count(*)=0 from public.membership_subscription_pilot_charges),'unrelated member cannot read charge rows');
select public.pilot_test_assert(public.membership_pilot_status(null)->>'status'='none','unrelated status is empty');
select public.pilot_test_throws('select public.membership_pilot_cancel()','no_active_subscription');
reset role;
select public.pilot_test_throws('update public.membership_subscription_pilots set amount_ils=3','check constraint');
select public.pilot_test_throws('update public.membership_subscription_pilots set interval_months=12','check constraint');

select public.pilot_test_assert(public.membership_pilot_activate('synthetic-bridge-only',
  (select id from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a'),
  'SODM-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','9007199254740993',null,'synthetic-ciphertext','synthetic-iv','synthetic-tag','0628')->>'status'='active',
  'verified server activation succeeds');
create temp table first_period as select current_period_end from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a';
select public.pilot_test_assert(public.membership_pilot_activate('synthetic-bridge-only',
  (select id from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a'),
  'SODM-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','9007199254740993',null,'synthetic-ciphertext','synthetic-iv','synthetic-tag','0628')->>'already'='true',
  'repeated webhook is idempotent');
select public.pilot_test_assert(
  (select current_period_end from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a')=(select current_period_end from first_period),
  'webhook replay does not extend paid period');

-- Synthetic DB renewal simulation only. No Cardcom/network call occurs.
update public.membership_subscription_pilots set next_charge_at=now()-interval '1 minute' where cardcom_low_profile_id='fixture-low-a';
create temp table due_fixture as select public.membership_pilot_claim_due('synthetic-bridge-only') as data;
select public.pilot_test_assert((select data->>'found'='true' and data->>'amount_ils'='4.00' from due_fixture),'due amount fixed to four');
update public.membership_subscription_pilots set updated_at=now()-interval '31 minutes' where cardcom_low_profile_id='fixture-low-a';
select public.pilot_test_assert(public.membership_pilot_claim_due('synthetic-bridge-only')->>'external_uniq_tran_id'=(select data->>'external_uniq_tran_id' from due_fixture),'unknown-outcome retry retains exact idempotency ID');
select public.pilot_test_throws(format('select public.membership_pilot_settle_renewal(%L,%L::uuid,%L,true,0,null,null)',
  'synthetic-bridge-only',(select data->>'subscription_id' from due_fixture),(select data->>'external_uniq_tran_id' from due_fixture)),'verified_transaction_required');
select public.pilot_test_assert(public.membership_pilot_settle_renewal('synthetic-bridge-only',
  (select (data->>'subscription_id')::uuid from due_fixture),(select data->>'external_uniq_tran_id' from due_fixture),true,0,'renewal-fixture-1',null)->>'status'='active',
  'verified synthetic renewal settles');
create temp table renewal_period as select current_period_end from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a';
select public.pilot_test_assert(public.membership_pilot_settle_renewal('synthetic-bridge-only',
  (select (data->>'subscription_id')::uuid from due_fixture),(select data->>'external_uniq_tran_id' from due_fixture),true,0,'renewal-fixture-1',null)->>'already'='true',
  'settlement replay is idempotent');
select public.pilot_test_assert(
  (select current_period_end from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a')=(select current_period_end from renewal_period),
  'settlement replay cannot add another month');
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.pilot_test_assert(public.membership_pilot_cancel()->>'cancel_at_period_end'='true','owner cancellation recorded');
reset role;
update public.membership_subscription_pilots set next_charge_at=now()-interval '1 minute' where cardcom_low_profile_id='fixture-low-a';
select public.pilot_test_assert(public.membership_pilot_claim_due('synthetic-bridge-only')->>'found'='false','cancelled renewal cannot be claimed');
select public.pilot_test_assert((select status='cancelled' and next_charge_at is null from public.membership_subscription_pilots where cardcom_low_profile_id='fixture-low-a'),'cancelled state has no next charge');

-- Reversible empty-pilot rollback, tested with exact objects, no CASCADE.
-- On live paid data: disable renewals and preserve ledger instead of dropping.
delete from auth.users;
drop function public.membership_pilot_start_guard(text,uuid);
drop function public.membership_pilot_register(text,uuid,text,text,text,text);
drop function public.membership_pilot_webhook_lookup(text,text);
drop function public.membership_pilot_activate(text,uuid,text,text,text,text,text,text,text);
drop function public.membership_pilot_claim_due(text);
drop function public.membership_pilot_settle_renewal(text,uuid,text,boolean,integer,text,text);
drop function public.membership_pilot_status(text);
drop function public.membership_pilot_cancel();
drop table private.cardcom_subscription_credentials;
drop table public.membership_subscription_pilot_charges;
drop table public.membership_subscription_pilots;
select public.pilot_test_assert(to_regclass('public.membership_subscription_pilots') is null and
  to_regclass('private.cardcom_subscription_credentials') is null,'empty-pilot rollback removes only new scoped objects');
select public.pilot_test_assert(to_regclass('private.pilot_existing_sentinel') is not null and
  (select nspacl::text from pg_namespace where nspname='private')=(select acl from private_acl_before),
  'rollback preserves existing private schema and objects');
select 'CARDCom SQL ACCEPTANCE PASS' as result;

-- Synthetic-only supplement, applied AFTER the unchanged engine acceptance.
-- Local PostgreSQL only: no project URL, real user session or real credit grant.
reset role;
create table public.users (id uuid primary key references auth.users(id), role text not null);
alter table public.users enable row level security;
revoke all on public.users from public, anon, authenticated;
grant select on public.users to authenticated;
create policy pilot_fixture_own_role_read on public.users for select to authenticated using (id=(select auth.uid()));
insert into auth.users(id) values ('36f5cb84-71c3-4977-a2c7-d6413e973443');
insert into public.users(id,role) values
 ('36f5cb84-71c3-4977-a2c7-d6413e973443','admin'),
 ('22222222-2222-4222-8222-222222222222','user'),
 ('33333333-3333-4333-8333-333333333333','admin');
insert into public.profiles(user_id,credits) values ('36f5cb84-71c3-4977-a2c7-d6413e973443',35);
update public.profiles set credits=35 where user_id in
 ('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333');

-- APPLY_OWNER_PILOT_MIGRATION_HERE

select public.credit_test_assert((select credits=35 from public.profiles
 where user_id='36f5cb84-71c3-4977-a2c7-d6413e973443'),'migration does not grant or debit owner funds');
select public.credit_test_assert(not has_table_privilege('authenticated','public.credit_action_prices','UPDATE'),
 'caller cannot enable the pilot or change price/owner');
set role authenticated;
set request.jwt.claim.role='authenticated';
set request.jwt.claim.sub='36f5cb84-71c3-4977-a2c7-d6413e973443';
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','off-owner-0001')$$,'credit_pilot_not_authorized');
reset role;
update public.credit_action_prices set active=true,launch_state='preview',pilot_enabled=true,
 pilot_user_id='36f5cb84-71c3-4977-a2c7-d6413e973443' where action_key='raziel_fast';
select public.credit_test_throws($$update public.credit_action_prices set pilot_user_id='22222222-2222-4222-8222-222222222222'
 where action_key='raziel_fast'$$,'credit_action_owner_pilot_scope_v1');
select public.credit_test_throws($$update public.credit_action_prices set pilot_enabled=true,
 pilot_user_id='36f5cb84-71c3-4977-a2c7-d6413e973443' where action_key='raziel_deep'$$,'credit_action_owner_pilot_scope_v1');
set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
select public.credit_test_throws($$update public.users set role='admin' where id='22222222-2222-4222-8222-222222222222'$$,'permission denied');
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','non-pilot-gate-0001')$$,'credit_pilot_not_authorized');
-- Spoofing a role claim is insufficient: verified principal + stored role are required.
set request.jwt.claim.role='admin';
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','spoof-role-0001')$$,'credit_pilot_not_authorized');
set request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','other-admin-0001')$$,'credit_pilot_not_authorized');
set request.jwt.claim.sub='';
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','missing-uid-0001')$$,'authentication_required');
reset role;
select public.credit_test_assert((select bool_and(credits=35) from public.profiles where user_id in
 ('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333')),'NON_PILOT_MUST_NOT_BE_CHARGED');
select public.credit_test_assert(not exists(select 1 from public.credit_reservations where operation_ref in
 ('non-pilot-gate-0001','spoof-role-0001','other-admin-0001')),'denied callers create no reservations');
set role authenticated;
set request.jwt.claim.sub='36f5cb84-71c3-4977-a2c7-d6413e973443';
set request.jwt.claim.role='authenticated';
select public.credit_test_assert(public.credit_reserve_v1('raziel_fast','owner-success-0001')->>'balance'='20','owner35 to20');
select public.credit_test_assert(public.credit_reserve_v1('raziel_fast','owner-success-0001')->>'already'='true','replay does not debit twice');
select public.credit_test_assert(public.membership_credit_summary_v1()->>'balance'='20','meter returns canonical20');
reset role;
set request.jwt.claim.role='service_role';
select public.credit_settle_v1(id,'accepted-synthetic-result') from public.credit_reservations where operation_ref='owner-success-0001';
select public.credit_test_assert((select count(*)=1 and sum(amount)=-15 from public.credit_ledger where
 user_id='36f5cb84-71c3-4977-a2c7-d6413e973443' and reason='credit_reserve'),'one debit in canonical ledger');
select public.credit_test_assert((select status='settled' from public.credit_reservations where operation_ref='owner-success-0001'),'settled');
-- Provider/rejected-output/exception return all use the same existing service return.
set role authenticated;
set request.jwt.claim.role='authenticated';
select public.credit_reserve_v1('raziel_fast','owner-failure-0001');
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','owner-insufficient-0001')$$,'insufficient_credits');
reset role;
update public.credit_action_prices set pilot_enabled=false where action_key='raziel_fast';
set request.jwt.claim.role='service_role';
select public.credit_return_v1(id,'provider_failure') from public.credit_reservations where operation_ref='owner-failure-0001';
select public.credit_return_v1(id,'provider_failure') from public.credit_reservations where operation_ref='owner-failure-0001';
select public.credit_test_assert((select credits=20 from public.profiles where user_id='36f5cb84-71c3-4977-a2c7-d6413e973443'),'return remains possible with pilot disabled, no double refund');
set role authenticated;
set request.jwt.claim.role='authenticated';
select public.credit_test_throws($$select public.credit_reserve_v1('raziel_fast','off-after-return-0001')$$,'credit_pilot_not_authorized');
reset role;
select public.credit_test_assert((select role='admin' from public.users where id='36f5cb84-71c3-4977-a2c7-d6413e973443'),'owner role preserved');
-- Reapplying the additive guard must preserve funds, settled records and OFF.
-- APPLY_OWNER_PILOT_MIGRATION_HERE
select public.credit_test_assert((select credits=20 from public.profiles where user_id='36f5cb84-71c3-4977-a2c7-d6413e973443')
 and (select status='settled' from public.credit_reservations where operation_ref='owner-success-0001')
 and (select not pilot_enabled from public.credit_action_prices where action_key='raziel_fast'),'idempotent guard preserves all financial state');
select 'OWNER_PILOT_DATABASE_GUARD_PASS' as result;

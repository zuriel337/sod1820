\set ON_ERROR_STOP on
\set A '793dc271-2194-4110-b5ff-d2422d6f1c85'
\set B '365fb241-77ed-4a9d-98ab-4e30ab53c093'
\set C '11111111-1111-4111-8111-111111111111'
\set D '22222222-2222-4222-8222-222222222222'
\set E '33333333-3333-4333-8333-333333333333'

create or replace function pg_temp.expect(label text, ok boolean) returns void language plpgsql as $$ begin
  if not coalesce(ok,false) then raise exception 'ASSERT FAILED: %', label; end if; raise notice 'PASS: %', label; end $$;
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), false); end $$;

-- seed (the exact file ZURIEL authorized) + a second pair for dismiss/expiry paths
\i docs/reviews/account-link-20261105/seed-torah-temima.sql
insert into public.account_link_offers (primary_user_id, secondary_user_id, basis, asserted_by) values (:'E', :'D', 'owner_assertion', 'test');

select id as oa from public.account_link_offers where secondary_user_id = :'A' \gset
select id as od from public.account_link_offers where secondary_user_id = :'D' \gset
select pg_temp.expect('seed created exactly one offer for the Torah Temima pair', (select count(*) from public.account_link_offers where secondary_user_id = :'A' and primary_user_id = :'B') = 1);
select pg_temp.expect('seeding is idempotent', (select count(*) from public.account_link_events where event='seeded' and offer_id = :'oa') = 1);

-- anon: nothing
set role anon;
do $$ begin begin perform * from public.account_link_offers; raise exception 'anon read table'; exception when insufficient_privilege then null; end; end $$;
do $$ begin begin perform * from public.account_link_offer_v1(); raise exception 'anon called offer rpc'; exception when insufficient_privilege then null; end; end $$;
reset role;
select pg_temp.expect('anon cannot read the table or call the offer RPC', true);

-- authenticated but not involved (C): no offer, cannot begin/dismiss someone else's offer, no enumeration
set role authenticated;
select pg_temp.as_user(:'C');
select pg_temp.expect('unrelated account sees no offer', (select count(*) from public.account_link_offer_v1()) = 0);
select pg_temp.expect('unrelated account cannot begin', public.account_link_begin_v1(:'oa') is null);
select pg_temp.expect('unrelated account cannot dismiss', public.account_link_dismiss_v1(:'oa') = false);
do $$ begin begin perform * from public.account_link_offers; raise exception 'authenticated read table'; exception when insufficient_privilege then null; end; end $$;
-- the PRIMARY account never gets the offer and nothing about the pair
select pg_temp.as_user(:'B');
select pg_temp.expect('primary account sees no offer', (select count(*) from public.account_link_offer_v1()) = 0);
-- authenticated users cannot run the service-only confirm
do $$ begin begin perform public.account_link_confirm_v1(gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'x'); raise exception 'authenticated ran confirm'; exception when insufficient_privilege then null; end; end $$;
-- the secondary account (A) sees exactly its own offer, with no reference to the other account
select pg_temp.as_user(:'A');
select pg_temp.expect('secondary sees its own offer', (select count(*) from public.account_link_offer_v1()) = 1);
reset role;

-- nonce + confirm paths
set role authenticated; select pg_temp.as_user(:'A');
select public.account_link_begin_v1(:'oa') as nonce \gset
reset role;
select pg_temp.expect('nonce issued to the secondary session (64 hex chars)', length(:'nonce') = 64);
select pg_temp.expect('nonce is stored only hashed', (select nonce_hash is not null and nonce_hash <> :'nonce' from public.account_link_offers where secondary_user_id = :'A'));
set role service_role;
select pg_temp.expect('wrong nonce rejected', public.account_link_confirm_v1(:'oa', :'A', :'B', 'deadbeef') = 'rejected');
select pg_temp.expect('wrong primary rejected', public.account_link_confirm_v1(:'oa', :'A', :'C', :'nonce') = 'rejected');
select pg_temp.expect('wrong secondary rejected', public.account_link_confirm_v1(:'oa', :'C', :'B', :'nonce') = 'rejected');
reset role;
select pg_temp.expect('offer still unverified after failed attempts', (select state from public.account_link_offers where secondary_user_id = :'A') = 'offered');
set role service_role;
select pg_temp.expect('correct pair + nonce verifies', public.account_link_confirm_v1(:'oa', :'A', :'B', :'nonce') = 'verified');
select pg_temp.expect('repeat/replay is idempotent, not a second merge', public.account_link_confirm_v1(:'oa', :'A', :'B', :'nonce') = 'already_verified');
reset role;
select pg_temp.expect('nonce consumed', (select nonce_hash is null and nonce_expires_at is null and verified_at is not null from public.account_link_offers where secondary_user_id = :'A'));
select pg_temp.expect('verified offer no longer shown', (select count(*) from (select set_config('request.jwt.claim.sub', :'A', false)) s, public.account_link_offer_v1()) = 0);
select pg_temp.expect('exactly one verified event', (select count(*) from public.account_link_events where event='verified') = 1);

-- expiry
set role authenticated; select pg_temp.as_user(:'D');
select public.account_link_begin_v1(:'od') as nonce2 \gset
reset role;
update public.account_link_offers set nonce_expires_at = now() - interval '1 second' where secondary_user_id = :'D';
set role service_role;
select pg_temp.expect('expired nonce rejected', public.account_link_confirm_v1(:'od', :'D', :'E', :'nonce2') = 'rejected');
reset role;

-- dismiss ("not now"): recorded once, never re-shown, cannot be confirmed afterwards
set role authenticated; select pg_temp.as_user(:'D');
select pg_temp.expect('dismiss works for the secondary', public.account_link_dismiss_v1(:'od') = true);
select pg_temp.expect('dismiss twice is a no-op', public.account_link_dismiss_v1(:'od') = false);
select pg_temp.expect('dismissed offer is not shown', (select count(*) from public.account_link_offer_v1()) = 0);
select pg_temp.expect('begin after dismiss returns nothing', public.account_link_begin_v1(:'od') is null);
reset role;
set role service_role;
select pg_temp.expect('confirm after dismiss rejected', public.account_link_confirm_v1(:'od', :'D', :'E', :'nonce2') = 'rejected');
reset role;

-- ledger is append-only; Auth and everything else untouched
do $$ begin begin update public.account_link_events set event='seeded'; raise exception 'ledger updated'; exception when raise_exception then if sqlerrm like '%ledger updated%' then raise; end if; end; end $$;
do $$ begin begin delete from public.account_link_events; raise exception 'ledger deleted'; exception when raise_exception then if sqlerrm like '%ledger deleted%' then raise; end if; end; end $$;
select pg_temp.expect('events ledger is append-only', (select count(*) from public.account_link_events) >= 6);
select pg_temp.expect('auth.users untouched (5 fixture rows)', (select count(*) from auth.users) = 5);

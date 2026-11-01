-- Append ONLY to the disposable synthetic fixture. Never run on a project.
reset role;
update public.profiles set credits=35 where user_id='22222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select set_config('request.jwt.claim.role','authenticated',false);
set role authenticated;
-- A non-pilot principal must not acquire a charge through the exposed RPC.
select public.credit_reserve_v1('raziel_fast','non-pilot-gate-0001');
reset role;
select public.credit_test_assert(
 (select credits=35 from public.profiles where user_id='22222222-2222-4222-8222-222222222222'),
 'NON_PILOT_MUST_NOT_BE_CHARGED');

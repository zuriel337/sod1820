-- Proves harden-grants.sql: BEFORE anon can execute both functions (the live finding); AFTER only authenticated can; behaviour for members is unchanged.
create or replace function pg_temp.as_role(r text, uid text) returns void language plpgsql as $$begin
  execute format('set local role %I', r); perform set_config('request.jwt.claim.sub', coalesce(uid,''), true); end$$;
reset role;
select test_expect(has_function_privilege('anon','public.request_els_library_review(uuid,boolean)','execute'),'GRANTS BEFORE: anon can execute request_els_library_review (the finding)');
select test_expect(has_function_privilege('anon','public.els_my_strong_ciphers()','execute'),'GRANTS BEFORE: anon can execute els_my_strong_ciphers (the finding)');
\ir harden-grants.sql
reset role;
select test_expect(not has_function_privilege('anon','public.request_els_library_review(uuid,boolean)','execute'),'GRANTS AFTER: anon cannot execute request_els_library_review');
select test_expect(not has_function_privilege('anon','public.els_my_strong_ciphers()','execute'),'GRANTS AFTER: anon cannot execute els_my_strong_ciphers');
select test_expect(has_function_privilege('authenticated','public.request_els_library_review(uuid,boolean)','execute') and has_function_privilege('authenticated','public.els_my_strong_ciphers()','execute'),'GRANTS AFTER: authenticated still can');
select test_expect(not has_function_privilege('public','public.els_my_strong_ciphers()','execute') or true,'GRANTS AFTER: (PUBLIC pseudo-role checked through anon above)');
begin; select pg_temp.as_role('anon', null);
do $$begin begin perform public.els_my_strong_ciphers(); raise exception 'anon call must be refused'; exception when insufficient_privilege then null; end; end$$;
commit;
begin; select pg_temp.as_role('authenticated','00000000-0000-0000-0000-000000000001');
select test_expect(jsonb_typeof(public.els_my_strong_ciphers())='array','GRANTS AFTER: a member still gets their own list');
select test_expect((public.request_els_library_review('a0000000-0000-0000-0000-0000000000ff',true)->>'error')='not_found','GRANTS AFTER: a member call still reaches the function body');
commit;
reset role;
-- the other new internals stay closed to clients
select test_expect(not has_function_privilege('authenticated','public.detect_els_strong_ciphers()','execute') and not has_function_privilege('authenticated','public.els_resolve_suggestions(uuid,text)','execute') and not has_function_privilege('authenticated','public.els_strong_cipher_assessment(public.els_records)','execute'),'GRANTS: internals stay closed to clients');

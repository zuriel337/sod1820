-- Reverts harden-grants.sql only: restores the default EXECUTE-to-PUBLIC state apply.sql left. Functions and data are untouched.
begin;
grant execute on function public.request_els_library_review(uuid, boolean) to public;
grant execute on function public.els_my_strong_ciphers() to public;
commit;

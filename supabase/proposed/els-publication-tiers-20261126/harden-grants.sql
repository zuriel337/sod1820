-- ELS publication tiers: grant hardening (ZURIEL 26.11.2026). NOT APPLIED. Run only after apply.sql, with its own exact approval.
-- apply.sql created two client-facing functions and granted them to authenticated, but PostgreSQL also grants EXECUTE to PUBLIC on creation,
-- so anon could call them. No exposure (anon gets not_authenticated / an empty list), but the intent is authenticated only.
-- Scope: exactly these two functions. save_els_matrix keeps its existing grants; no data, policy or function body changes.
begin;
do $guard$
begin
  if to_regprocedure('public.request_els_library_review(uuid,boolean)') is null or to_regprocedure('public.els_my_strong_ciphers()') is null then
    raise exception 'apply.sql is not in place';
  end if;
end;
$guard$;
revoke execute on function public.request_els_library_review(uuid, boolean) from public, anon;
revoke execute on function public.els_my_strong_ciphers() from public, anon;
grant execute on function public.request_els_library_review(uuid, boolean) to authenticated;
grant execute on function public.els_my_strong_ciphers() to authenticated;
commit;

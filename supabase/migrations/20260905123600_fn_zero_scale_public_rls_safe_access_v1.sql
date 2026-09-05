-- P1 1237: expose fn_zero_scale to public Number/Entity Hub reads without bypassing gematria_words RLS.
-- Live fix applied first on canonical Supabase linswmnnkjxvweumprav and verified under anon/authenticated roles.
-- SECURITY INVOKER is required: gematria_words public RLS filters verified+published+non-encrypted rows,
-- while service_role/admin semantics continue to follow their own role/RLS privileges.

alter function public.fn_zero_scale(integer) security invoker;

revoke execute on function public.fn_zero_scale(integer) from public;
grant execute on function public.fn_zero_scale(integer) to anon, authenticated, service_role;

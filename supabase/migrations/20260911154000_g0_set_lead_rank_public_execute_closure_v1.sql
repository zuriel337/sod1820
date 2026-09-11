-- G0 2029 LIVE CLEAN — close stale public SECURITY DEFINER mutator.
-- Live verified before this migration:
--   public.set_lead_rank(text,integer,integer) = SECURITY DEFINER, no auth gate,
--   PUBLIC EXECUTE; current app writes lead order through
--   public.admin_set_lead_ranks(integer,text[]) which performs a server-side
--   auth.uid() + users.role='admin' check.
--
-- Preserve the low-level function for internal/service compatibility only.
-- Do not widen admin_set_lead_ranks or change ranking semantics here.

revoke execute on function public.set_lead_rank(text, integer, integer) from public;
revoke execute on function public.set_lead_rank(text, integer, integer) from anon, authenticated;
grant execute on function public.set_lead_rank(text, integer, integer) to service_role;

comment on function public.set_lead_rank(text, integer, integer) is
  'Legacy low-level lead-rank mutator. Public/authenticated execution revoked by G0 2029 closure; current app writes through admin_set_lead_ranks with server-side admin authorization. Retained for internal/service compatibility only.';

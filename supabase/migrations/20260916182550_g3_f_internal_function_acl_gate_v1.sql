-- SOD1820 — G3-F internal Follow trigger-function ACL gate
-- Owner: subscription_funnel_law v19
-- Supabase grants EXECUTE on newly created public functions to API roles by default.
-- These trigger functions are server-internal and must never become callable client RPCs.
-- Revoke both inherited PUBLIC access and the Supabase role-specific default grants.

revoke all on function public.claim_follow_prefs_from_identity()
  from public, anon, authenticated, service_role;

revoke all on function public.notify_on_or_geula_update()
  from public, anon, authenticated, service_role;

revoke all on function public.notify_on_new_follower()
  from public, anon, authenticated, service_role;

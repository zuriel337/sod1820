-- H1 — vercel_usage_estimate is a SECURITY DEFINER view over site_visits (167k rows).
-- site_visits is RLS-enabled with no policy (server-only), but the view bypassed that and
-- exposed daily page_views / distinct visitors / bandwidth estimates to every signed-in user.
-- Caller proof: zero references in src/, supabase/functions/ and api/.
-- Revoke authenticated SELECT. postgres and service_role paths are untouched.
-- Reversible: grant select on public.vercel_usage_estimate to authenticated;

revoke select on public.vercel_usage_estimate from authenticated;

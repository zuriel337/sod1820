-- Rollback of 20261107120000_def028_legacy_top_pages_and_redirect_map.sql. Restores the exact pre-change state captured 7.11.2026.
grant execute on function public.legacy_top_pages(integer) to public, anon, authenticated;
alter view public.redirect_map set (security_invoker = false);

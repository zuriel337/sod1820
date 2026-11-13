-- M0-A · dormant "anyone signed in may write" policies made admin-only - PROPOSED (production DB change, explicit ZURIEL approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-G / §6 item 8 (hygiene). These ALL policies allow every signed-in user (or any
-- "authenticated" role) to write. Today clients hold only SELECT on these tables, so the write half is inert - but any future
-- GRANT would open them. Same policy names, same commands and roles; only the condition becomes rd_is_admin().
-- Side effect, intended: on hint_sets / hint_set_members / trails / trail_members the policy named "admin_all" also let every
-- signed-in user READ unpublished or non-public rows (0 rows on 12.11.2026). Public reads keep their own policies
-- (public_read_published / public_read_via_set / public_read_via_trail, "public read", word_aliases_public_read, anon_read).
-- Rollback: supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql.

drop policy if exists "authenticated write" on public.insights;
create policy "authenticated write" on public.insights for all to authenticated
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

drop policy if exists word_aliases_auth_write on public.word_aliases;
create policy word_aliases_auth_write on public.word_aliases for all to authenticated
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

drop policy if exists admin_all on public.hint_sets;
create policy admin_all on public.hint_sets for all to authenticated
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

drop policy if exists admin_all on public.hint_set_members;
create policy admin_all on public.hint_set_members for all to authenticated
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

drop policy if exists admin_all on public.trails;
create policy admin_all on public.trails for all to authenticated
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

drop policy if exists admin_all on public.trail_members;
create policy admin_all on public.trail_members for all to authenticated
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

drop policy if exists auth_write on public.page_content;
create policy auth_write on public.page_content for all to public
  using ((select public.rd_is_admin())) with check ((select public.rd_is_admin()));

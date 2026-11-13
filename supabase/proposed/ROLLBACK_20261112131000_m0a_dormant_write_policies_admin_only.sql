-- Rollback of 20261112131000_m0a_dormant_write_policies_admin_only.sql: the exact policies read from pg_policies on 12.11.2026.
drop policy if exists "authenticated write" on public.insights;
create policy "authenticated write" on public.insights for all to authenticated using (true) with check (true);
drop policy if exists word_aliases_auth_write on public.word_aliases;
create policy word_aliases_auth_write on public.word_aliases for all to authenticated using (true) with check (true);
drop policy if exists admin_all on public.hint_sets;
create policy admin_all on public.hint_sets for all to authenticated using (true) with check (true);
drop policy if exists admin_all on public.hint_set_members;
create policy admin_all on public.hint_set_members for all to authenticated using (true) with check (true);
drop policy if exists admin_all on public.trails;
create policy admin_all on public.trails for all to authenticated using (true) with check (true);
drop policy if exists admin_all on public.trail_members;
create policy admin_all on public.trail_members for all to authenticated using (true) with check (true);
drop policy if exists auth_write on public.page_content;
create policy auth_write on public.page_content for all to public using ((auth.role() = 'authenticated'::text));

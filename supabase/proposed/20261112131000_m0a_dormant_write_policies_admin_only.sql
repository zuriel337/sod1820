-- M0-A · dormant "anyone signed in may write" policies made admin-only - PROPOSED (production DB change, explicit ZURIEL approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-G / §6 item 8 (hygiene). These ALL policies allow every signed-in user (or any
-- "authenticated" role) to write. Today clients hold only SELECT on these tables, so the write half is inert - but any future
-- GRANT would open them. Same policy names, same commands and roles; only the condition becomes rd_is_admin().
-- Side effect, intended: on hint_sets / hint_set_members / trails / trail_members the policy named "admin_all" also let every
-- signed-in user READ unpublished or non-public rows (0 rows on 12.11.2026). Public reads keep their own policies
-- (public_read_published / public_read_via_set / public_read_via_trail, "public read", word_aliases_public_read, anon_read).
-- Rollback: supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql.
-- Revision 14.11.2026 (foundation package): the file runs as ONE transaction with lock and statement timeouts (it either applies completely or not at all) and, where the objects are policies or grants, with a catalogue fingerprint guard
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Catalogue guard: row level security and every policy of the seven tables with a dormant write policy must be exactly the live "before" state read on 14.11.2026 (fingerprint 4408d4349d306b19e2b6dade0e273e78),
-- or already the "after" state of this file (fingerprint 80bd7ea3853d215d069542f1a252a318: a re-run is then a no-op). Anything else stops the file before any change.
create or replace function pg_temp.m0a_fp_s6() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text as x from pg_class where oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('insights','word_aliases','hint_sets','hint_set_members','trails','trail_members','page_content')
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s6();
begin
  if v not in ('4408d4349d306b19e2b6dade0e273e78', '80bd7ea3853d215d069542f1a252a318') then
    raise exception 'M0-A step 6: the catalogue is not the reviewed one (fingerprint %, expected 4408d4349d306b19e2b6dade0e273e78 before or 80bd7ea3853d215d069542f1a252a318 after); nothing changed', v;
  end if;
end $$;

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

-- Postcondition: the catalogue is exactly the "after" state proven on the isolated fixture.
do $$
declare v text := pg_temp.m0a_fp_s6();
begin
  if v <> '80bd7ea3853d215d069542f1a252a318' then
    raise exception 'M0-A step 6: the catalogue after the change is not the reviewed one (fingerprint %, expected 80bd7ea3853d215d069542f1a252a318)', v;
  end if;
end $$;

commit;

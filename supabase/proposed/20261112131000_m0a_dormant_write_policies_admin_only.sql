-- M0-A · dormant "anyone signed in may write" policies made admin-only - PROPOSED (production DB change, explicit ZURIEL approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.4-G / §6 item 8 (hygiene). These ALL policies allow every signed-in user (or any
-- "authenticated" role) to write. Today clients hold only SELECT on these tables, so the write half is inert - but any future
-- GRANT would open them. Same policy names, same commands and roles; only the condition becomes rd_is_admin().
-- Side effect, intended: on hint_sets / hint_set_members / trails / trail_members the policy named "admin_all" also let every
-- signed-in user READ unpublished or non-public rows (0 rows on 12.11.2026). Public reads keep their own policies
-- (public_read_published / public_read_via_set / public_read_via_trail, "public read", word_aliases_public_read, anon_read).
-- Rollback: supabase/proposed/ROLLBACK_20261112131000_m0a_dormant_write_policies_admin_only.sql.
-- Revision 14.11.2026 (foundation package, after an independent review): the file runs as ONE transaction with a lock timeout, a statement timeout and its OWN search_path
-- (the text of policy expressions that the guard compares depends on it); it takes SHARE UPDATE EXCLUSIVE on the tables it changes BEFORE it reads the catalogue, so a
-- policy change made by another session (CREATE / ALTER / DROP POLICY take ACCESS EXCLUSIVE, which conflicts with it) is either finished and seen by the guard or still
-- running (the file then fails on the lock timeout and changes nothing); and it carries a catalogue fingerprint guard. Locks: the policy DDL of this file waits for
-- running reads for at most the lock timeout (2s) and new reads queue behind it meanwhile; on a timeout nothing changes and the file is sent again later.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
set local search_path = public, pg_catalog;
lock table public.insights, public.word_aliases, public.hint_sets, public.hint_set_members, public.trails, public.trail_members, public.page_content in share update exclusive mode;

-- Catalogue guard: client grants (the premise that clients hold SELECT only), column grants, row level security, every policy and every policy comment of the seven dormant-policy tables must be exactly the live "before" state read on 14.11.2026 (fingerprint 02bfd7d1412a1b948b9d5e829bb9b24a),
-- or already the "after" state of this file (fingerprint 145d5f1ba760e46e5d8d8470dfff38c6: a re-run is then a no-op). Anything else stops the file before any change.
create or replace function pg_temp.m0a_fp_s6() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text as x from pg_class where oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r collate "C") from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('insights','word_aliases','hint_sets','hint_set_members','trails','trail_members','page_content')
    union all select 'g|'||c.relname||'|'||r.rolname||'|'||p.priv from pg_class c cross join (values ('anon'),('authenticated')) r(rolname) cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv) where c.oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass]) and has_table_privilege(r.rolname, c.oid, p.priv)
    union all select 'cacl|'||c.relname||'.'||a.attname||'|'||a.attacl::text from pg_attribute a join pg_class c on c.oid = a.attrelid where a.attacl is not null and not a.attisdropped and c.oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass])
    union all select 'cm|'||c.relname||'|'||p.polname||'|'||obj_description(p.oid, 'pg_policy') from pg_policy p join pg_class c on c.oid = p.polrelid where obj_description(p.oid, 'pg_policy') is not null and c.oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass])
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s6();
begin
  if v not in ('02bfd7d1412a1b948b9d5e829bb9b24a', '145d5f1ba760e46e5d8d8470dfff38c6') then
    raise exception 'M0-A step 6: the catalogue is not the reviewed one (fingerprint %, expected 02bfd7d1412a1b948b9d5e829bb9b24a before or 145d5f1ba760e46e5d8d8470dfff38c6 after); nothing changed', v;
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
  if v <> '145d5f1ba760e46e5d8d8470dfff38c6' then
    raise exception 'M0-A step 6: the catalogue after the change is not the reviewed one (fingerprint %, expected 145d5f1ba760e46e5d8d8470dfff38c6)', v;
  end if;
end $$;

commit;

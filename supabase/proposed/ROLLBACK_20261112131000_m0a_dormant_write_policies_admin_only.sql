-- Rollback of 20261112131000_m0a_dormant_write_policies_admin_only.sql: the exact policies read from pg_policies on 12.11.2026.
-- Revision 14.11.2026 (foundation package, after an independent review): the file runs as ONE transaction with a lock timeout, a statement timeout and its OWN search_path
-- (the text of policy expressions that the guard compares depends on it); it takes SHARE UPDATE EXCLUSIVE on the tables it changes BEFORE it reads the catalogue, so a
-- policy change made by another session (CREATE / ALTER / DROP POLICY take ACCESS EXCLUSIVE, which conflicts with it) is either finished and seen by the guard or still
-- running (the file then fails on the lock timeout and changes nothing); and it carries a catalogue fingerprint guard. Locks: the policy DDL of this file waits for
-- running reads for at most the lock timeout (2s) and new reads queue behind it meanwhile; on a timeout nothing changes: STOP and inspect (pg_locks, pg_stat_activity), do not resend automatically.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
set local search_path = public, pg_catalog;
lock table public.insights, public.word_aliases, public.hint_sets, public.hint_set_members, public.trails, public.trail_members, public.page_content in share update exclusive mode;

-- Catalogue guard: this rollback runs only on the exact state its apply produced (fingerprint 145d5f1ba760e46e5d8d8470dfff38c6). The state before the apply
-- (02bfd7d1412a1b948b9d5e829bb9b24a) means there is nothing to roll back; any other state is a later change that needs a human decision. Nothing is changed then.
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
  if v = '02bfd7d1412a1b948b9d5e829bb9b24a' then
    raise exception 'M0-A step 6 rollback: the catalogue is already the state before the apply; nothing to roll back, nothing changed';
  end if;
  if v <> '145d5f1ba760e46e5d8d8470dfff38c6' then
    raise exception 'M0-A step 6 rollback: the catalogue is not the state the apply produced (fingerprint %, expected 145d5f1ba760e46e5d8d8470dfff38c6): changed since; nothing changed, a human decision is needed', v;
  end if;
end $$;

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

-- Postcondition: the exact state before the apply, as read live on 14.11.2026 (fingerprint 02bfd7d1412a1b948b9d5e829bb9b24a).
do $$
declare v text := pg_temp.m0a_fp_s6();
begin
  if v <> '02bfd7d1412a1b948b9d5e829bb9b24a' then
    raise exception 'M0-A step 6 rollback: the catalogue after the rollback is not the state before the apply (fingerprint %, expected 02bfd7d1412a1b948b9d5e829bb9b24a)', v;
  end if;
end $$;

commit;

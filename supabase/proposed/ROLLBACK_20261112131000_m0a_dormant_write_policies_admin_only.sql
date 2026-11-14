-- Rollback of 20261112131000_m0a_dormant_write_policies_admin_only.sql: the exact policies read from pg_policies on 12.11.2026.
-- Revision 14.11.2026 (foundation package): the file runs as ONE transaction with lock and statement timeouts (it either applies completely or not at all) and, where the objects are policies or grants, with a catalogue fingerprint guard
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Catalogue guard: this rollback runs only on the exact state its apply produced (fingerprint 80bd7ea3853d215d069542f1a252a318). The state before the apply
-- (4408d4349d306b19e2b6dade0e273e78) means there is nothing to roll back; any other state is a later change that needs a human decision. Nothing is changed then.
create or replace function pg_temp.m0a_fp_s6() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'rls|'||relname||'|'||relrowsecurity::text||'|'||relforcerowsecurity::text as x from pg_class where oid = any(array['public.insights'::regclass,'public.word_aliases'::regclass,'public.hint_sets'::regclass,'public.hint_set_members'::regclass,'public.trails'::regclass,'public.trail_members'::regclass,'public.page_content'::regclass])
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('insights','word_aliases','hint_sets','hint_set_members','trails','trail_members','page_content')
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s6();
begin
  if v = '4408d4349d306b19e2b6dade0e273e78' then
    raise exception 'M0-A step 6 rollback: the catalogue is already the state before the apply; nothing to roll back, nothing changed';
  end if;
  if v <> '80bd7ea3853d215d069542f1a252a318' then
    raise exception 'M0-A step 6 rollback: the catalogue is not the state the apply produced (fingerprint %, expected 80bd7ea3853d215d069542f1a252a318): changed since; nothing changed, a human decision is needed', v;
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

-- Postcondition: the exact state before the apply, as read live on 14.11.2026 (fingerprint 4408d4349d306b19e2b6dade0e273e78).
do $$
declare v text := pg_temp.m0a_fp_s6();
begin
  if v <> '4408d4349d306b19e2b6dade0e273e78' then
    raise exception 'M0-A step 6 rollback: the catalogue after the rollback is not the state before the apply (fingerprint %, expected 4408d4349d306b19e2b6dade0e273e78)', v;
  end if;
end $$;

commit;

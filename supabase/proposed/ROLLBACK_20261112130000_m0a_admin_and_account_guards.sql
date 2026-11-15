-- Rollback of 20261112130000_m0a_admin_and_account_guards.sql. Restores the exact 12.11.2026 bodies (verified by md5),
-- the previous wa_msg_count execute grant (implicit PUBLIC) and the previous gematria_wall read policy.
-- Revision 14.11.2026 (foundation package, after an independent review): the file runs as ONE transaction with a lock timeout, a statement timeout and its OWN search_path
-- (the text of policy expressions that the guard compares depends on it); it takes SHARE UPDATE EXCLUSIVE on the tables it changes BEFORE it reads the catalogue, so a
-- policy change made by another session (CREATE / ALTER / DROP POLICY take ACCESS EXCLUSIVE, which conflicts with it) is either finished and seen by the guard or still
-- running (the file then fails on the lock timeout and changes nothing); and it carries a catalogue fingerprint guard. Locks: the policy DDL of this file waits for
-- running reads for at most the lock timeout (2s) and new reads queue behind it meanwhile; on a timeout nothing changes: STOP and inspect (pg_locks, pg_stat_activity), do not resend automatically.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '60s';
set local search_path = public, pg_catalog;
lock table public.gematria_wall in share update exclusive mode;

-- Catalogue guard: this rollback runs only on the exact state its apply produced (fingerprint 192223d65171d46c109ce53b16efce93). The state before the apply
-- (a824022fbfbc6aeedf0d351be430e485) means there is nothing to roll back; any other state is a later change that needs a human decision. Nothing is changed then.
create or replace function pg_temp.m0a_fp_s4_tail() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'x|wa_msg_count|'||r||'|'||has_function_privilege(r, 'public.wa_msg_count(uuid)'::regprocedure, 'EXECUTE')::text as x from unnest(array['anon','authenticated','service_role']) r
    union all select 'pub|wa_msg_count|'||exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')::text from pg_proc p where p.oid = 'public.wa_msg_count(uuid)'::regprocedure
    union all select 'acl|wa_msg_count|'||coalesce((select string_agg(case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end||':'||a.privilege_type||':'||a.is_grantable::text, ',' order by (case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end) collate "C") from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a), '-') from pg_proc p where p.oid = 'public.wa_msg_count(uuid)'::regprocedure
    union all select 'p|'||tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r collate "C") from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename in ('gematria_wall')
    union all select 'rls|gematria_wall|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid='public.gematria_wall'::regclass
    union all select 'cacl|'||c.relname||'.'||a.attname||'|'||a.attacl::text from pg_attribute a join pg_class c on c.oid = a.attrelid where a.attacl is not null and not a.attisdropped and c.oid = any(array['public.gematria_wall'::regclass])
    union all select 'cm|'||c.relname||'|'||p.polname||'|'||obj_description(p.oid, 'pg_policy') from pg_policy p join pg_class c on c.oid = p.polrelid where obj_description(p.oid, 'pg_policy') is not null and c.oid = any(array['public.gematria_wall'::regclass])
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s4_tail();
begin
  if v = 'a824022fbfbc6aeedf0d351be430e485' then
    raise exception 'M0-A step 4 rollback: the catalogue is already the state before the apply; nothing to roll back, nothing changed';
  end if;
  if v <> '192223d65171d46c109ce53b16efce93' then
    raise exception 'M0-A step 4 rollback: the catalogue is not the state the apply produced (fingerprint %, expected 192223d65171d46c109ce53b16efce93): changed since; nothing changed, a human decision is needed', v;
  end if;
end $$;

create or replace function pg_temp.m0a_unpatch(p_sig text, p_md5_patched text, p_md5_original text, p_patched_anchor text, p_original_anchor text)
returns text language plpgsql as $f$
declare d text; n text;
begin
  d := pg_get_functiondef(p_sig::regprocedure);
  if md5(d) = p_md5_original then return 'already'; end if;
  if md5(d) <> p_md5_patched then raise exception 'M0-A rollback drift: % is neither the patched nor the original body (md5 %)', p_sig, md5(d); end if;
  n := replace(d, p_patched_anchor, p_original_anchor);
  execute n;
  if md5(pg_get_functiondef(p_sig::regprocedure)) <> p_md5_original then raise exception 'M0-A rollback: % not restored exactly', p_sig; end if;
  return 'restored';
end $f$;

select pg_temp.m0a_unpatch('public.admin_resolve_translit(text,text,boolean)',
  '29151b32c06ed3c36fab0211f243403b', '2aab330cb1f1fc77e51d902dfae5041b',
  E'declare v record;\nbegin\n  if not public.rd_is_admin() then raise exception ''admin only'' using errcode = ''42501''; end if;\n',
  E'declare v record;\nbegin\n');

select pg_temp.m0a_unpatch('public.admin_ai_cost(integer)',
  'd33b0bfbaf9d1f39177333bef3024b9f', '0487c48ca5e930f132c3b30cceb69ca9',
  E'v_wa jsonb;\nbegin\n  if not public.rd_is_admin() then raise exception ''admin only'' using errcode = ''42501''; end if;\n',
  E'v_wa jsonb;\nbegin\n');

select pg_temp.m0a_unpatch('public.link_visitor_identity(text)',
  '310dde303e978757604318a3f82a652a', '4622faa398b9531275077139de09cc4e',
  E'on conflict (visitor) do update set user_id = excluded.user_id, email = excluded.email, last_seen = now()\n    where public.visitor_identity.user_id is null or public.visitor_identity.user_id = excluded.user_id;\n',
  E'on conflict (visitor) do update set user_id = excluded.user_id, email = excluded.email, last_seen = now();\n');

grant execute on function public.wa_msg_count(uuid) to public;
revoke execute on function public.wa_msg_count(uuid) from service_role;

drop policy if exists "wall public read" on public.gematria_wall;
create policy "wall public read" on public.gematria_wall for select to public using (true);

-- Postcondition: the exact state before the apply, as read live on 14.11.2026 (fingerprint a824022fbfbc6aeedf0d351be430e485).
do $$
declare v text := pg_temp.m0a_fp_s4_tail();
begin
  if v <> 'a824022fbfbc6aeedf0d351be430e485' then
    raise exception 'M0-A step 4 rollback: the catalogue after the rollback is not the state before the apply (fingerprint %, expected a824022fbfbc6aeedf0d351be430e485)', v;
  end if;
end $$;

commit;

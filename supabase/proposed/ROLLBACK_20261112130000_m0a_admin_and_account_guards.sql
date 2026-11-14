-- Rollback of 20261112130000_m0a_admin_and_account_guards.sql. Restores the exact 12.11.2026 bodies (verified by md5),
-- the previous wa_msg_count execute grant (implicit PUBLIC) and the previous gematria_wall read policy.
-- Revision 14.11.2026 (foundation package): the file runs as ONE transaction with lock and statement timeouts (it either applies completely or not at all) and, where the objects are policies or grants, with a catalogue fingerprint guard
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Catalogue guard: this rollback runs only on the exact state its apply produced (fingerprint 00a5e44d3412c197b2f76983523a4e01). The state before the apply
-- (0eb07c1da74babeaf438250b700054fc) means there is nothing to roll back; any other state is a later change that needs a human decision. Nothing is changed then.
create or replace function pg_temp.m0a_fp_s4_tail() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'x|wa_msg_count|'||r||'|'||has_function_privilege(r, 'public.wa_msg_count(uuid)'::regprocedure, 'EXECUTE')::text as x from unnest(array['anon','authenticated','service_role']) r
    union all select 'pub|wa_msg_count|'||exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')::text from pg_proc p where p.oid = 'public.wa_msg_count(uuid)'::regprocedure
    union all select 'p|gematria_wall|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') from pg_policies where schemaname='public' and tablename='gematria_wall'
    union all select 'rls|gematria_wall|'||relrowsecurity::text||'|'||relforcerowsecurity::text from pg_class where oid='public.gematria_wall'::regclass
  ) q
$f$;
do $$
declare v text := pg_temp.m0a_fp_s4_tail();
begin
  if v = '0eb07c1da74babeaf438250b700054fc' then
    raise exception 'M0-A step 4 rollback: the catalogue is already the state before the apply; nothing to roll back, nothing changed';
  end if;
  if v <> '00a5e44d3412c197b2f76983523a4e01' then
    raise exception 'M0-A step 4 rollback: the catalogue is not the state the apply produced (fingerprint %, expected 00a5e44d3412c197b2f76983523a4e01): changed since; nothing changed, a human decision is needed', v;
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

-- Postcondition: the exact state before the apply, as read live on 14.11.2026 (fingerprint 0eb07c1da74babeaf438250b700054fc).
do $$
declare v text := pg_temp.m0a_fp_s4_tail();
begin
  if v <> '0eb07c1da74babeaf438250b700054fc' then
    raise exception 'M0-A step 4 rollback: the catalogue after the rollback is not the state before the apply (fingerprint %, expected 0eb07c1da74babeaf438250b700054fc)', v;
  end if;
end $$;

commit;

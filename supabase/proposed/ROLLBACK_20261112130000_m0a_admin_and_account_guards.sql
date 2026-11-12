-- Rollback of 20261112130000_m0a_admin_and_account_guards.sql. Restores the exact 12.11.2026 bodies (verified by md5),
-- the previous wa_msg_count execute grant (implicit PUBLIC) and the previous gematria_wall read policy.
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

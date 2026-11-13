-- Rollback of 20261112133000_m0a_add_contribution_client_address.sql: restores the exact 12.11.2026 body (md5-verified).
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

select pg_temp.m0a_unpatch('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)',
  '19759e2793b11c1f7ad0e095343ede42', 'a2110027d793b61e461bb62954a4be69',
  E'    -- M0 (12.11.2026): the platform-set client address first (as add_guest_community_message); the first X-Forwarded-For hop is client-controlled.\n    v_ip := coalesce(nullif(btrim(coalesce((current_setting(''request.headers'', true)::json)->>''cf-connecting-ip'', '''')), ''''),\n                     nullif(btrim(coalesce((current_setting(''request.headers'', true)::json)->>''x-real-ip'', '''')), ''''),\n                     split_part(coalesce((current_setting(''request.headers'', true)::json)->>''x-forwarded-for'',''''), '','', 1));\n',
  E'    v_ip := split_part(coalesce((current_setting(''request.headers'', true)::json)->>''x-forwarded-for'',''''), '','', 1);\n');

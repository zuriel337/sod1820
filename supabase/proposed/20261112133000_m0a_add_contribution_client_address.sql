-- M0-A · add_contribution guest rate limit keyed by the platform client address - PROPOSED (production DB change, explicit approval).
-- Source: SOD1820_PERMISSIONS_MAP_20261112 §3.3 / §6 item 7 (limits for product writes); found by M0-B's guest-write inventory.
-- Today the guest limit (5 per hour, anon_contrib_log) is keyed by the FIRST X-Forwarded-For hop, which the caller controls: a
-- new fake first hop per request bypasses the limit. The same precedence as add_guest_community_message is applied:
-- cf-connecting-ip, then x-real-ip, then the old value. Nothing else changes (signed-in path, statuses, moderation, limit).
-- The body is read from the live catalogue, md5-verified (12.11.2026), patched at one anchor and re-created (grants kept).
-- Rollback: ROLLBACK_20261112133000_m0a_add_contribution_client_address.sql. Test: tests/sql/m0a_db_permissions_v1.sql.

create or replace function pg_temp.m0a_patch(p_sig text, p_md5_before text, p_md5_after text, p_anchor text, p_replacement text)
returns text language plpgsql as $f$
declare d text; n text;
begin
  d := pg_get_functiondef(p_sig::regprocedure);
  if md5(d) = p_md5_after then return 'already'; end if;
  if md5(d) <> p_md5_before then raise exception 'M0-A drift: % changed since review (md5 %)', p_sig, md5(d); end if;
  n := replace(d, p_anchor, p_replacement);
  if n = d or (length(d) - length(replace(d, p_anchor, ''))) <> length(p_anchor) then raise exception 'M0-A anchor not unique in %', p_sig; end if;
  execute n;
  if md5(pg_get_functiondef(p_sig::regprocedure)) <> p_md5_after then raise exception 'M0-A: % re-created with an unexpected body', p_sig; end if;
  return 'patched';
end $f$;

select pg_temp.m0a_patch('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)',
  'a2110027d793b61e461bb62954a4be69', '19759e2793b11c1f7ad0e095343ede42',
  E'    v_ip := split_part(coalesce((current_setting(''request.headers'', true)::json)->>''x-forwarded-for'',''''), '','', 1);\n',
  E'    -- M0 (12.11.2026): the platform-set client address first (as add_guest_community_message); the first X-Forwarded-For hop is client-controlled.\n    v_ip := coalesce(nullif(btrim(coalesce((current_setting(''request.headers'', true)::json)->>''cf-connecting-ip'', '''')), ''''),\n                     nullif(btrim(coalesce((current_setting(''request.headers'', true)::json)->>''x-real-ip'', '''')), ''''),\n                     split_part(coalesce((current_setting(''request.headers'', true)::json)->>''x-forwarded-for'',''''), '','', 1));\n');

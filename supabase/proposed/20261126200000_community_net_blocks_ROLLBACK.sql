-- Rollback of 20261126200000_community_net_blocks_PROPOSAL.sql: restores the two guest write routes by removing exactly the inserted fragments (requires the live md5 of each
-- original) and drops the staff API and the internal helpers. It KEEPS every table and row (keys, blocks, events, community_guest_posts.net_ref): no record is deleted; with the
-- functions restored the data is inert. Deleting the tables would be a separate, explicitly approved step.
do $migration$
declare v_def text; v_new text;
  t1n constant text := $a$  if v_key is null then raise exception 'no identity'; end if;
  -- Community network protection (26.11.2026): guests only; a signed-in account is never blocked because of its network.
  if auth.uid() is null and exists (select 1 from public.research_contributions rc0 where rc0.id = p_id and rc0.origin in ('openweb','community_2029'))
     and public.community_net_blocked_v1(public.community_net_ref_v1(public.community_trusted_client_ip_v1())) then raise exception 'community_write_blocked'; end if;
$a$;
  t1 constant text := $a$  if v_key is null then raise exception 'no identity'; end if;
$a$;
  g1n constant text := $a$  -- Community network protection (26.11.2026): from here v_ip is a keyed hash of the coarse network taken ONLY from cf-connecting-ip, never the raw address.
  v_ip := public.community_net_ref_v1(public.community_trusted_client_ip_v1());
  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;
  if public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
$a$;
  g1 constant text := $a$  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;
$a$;
  g3n constant text := $a$  from public.anon_contrib_log where ip in (v_ip, coalesce(public.community_trusted_client_ip_v1(), v_ip)) and created_at > now() - interval '24 hours';
$a$;
  g3 constant text := $a$  from public.anon_contrib_log where ip = v_ip and created_at > now() - interval '24 hours';
$a$;
  c2n constant text := $a$      where ip in (v_ip, coalesce(public.community_trusted_client_ip_v1(), v_ip)) and created_at > now() - interval '1 hour';
$a$;
  c2 constant text := $a$      where ip = v_ip and created_at > now() - interval '1 hour';
$a$;
  g2n constant text := $a$  insert into public.community_guest_posts (contribution_id, net_ref) values (v_id, v_ip);
$a$;
  g2 constant text := $a$  insert into public.community_guest_posts (contribution_id) values (v_id);
$a$;
  c1n constant text := $a$    v_ip := nullif(btrim(v_ip), '');
    -- Community network protection (26.11.2026): hash first, refuse a blocked network before any log write.
    v_ip := public.community_net_ref_v1(public.community_trusted_client_ip_v1());
    if v_ip is not null and coalesce(nullif(p_origin,''),'beit_midrash') in ('openweb','community_2029') and public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
    if v_ip is not null then
$a$;
  c1 constant text := $a$    v_ip := nullif(btrim(v_ip), '');
    if v_ip is not null then
$a$;
begin
  perform set_config('lock_timeout', '3s', true);
  v_def := pg_get_functiondef('public.add_guest_community_message(text,uuid,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) > 0 then
    v_new := replace(replace(replace(v_def, g1n, g1), g2n, g2), g3n, g3);
    if (select md5(prosrc) from pg_proc where oid = 'public.add_guest_community_message(text,uuid,text,text)'::regprocedure) is not null and position('community_net_ref_v1' in v_new) > 0 then
      raise exception 'add_guest_community_message changed after the patch; refusing' using errcode = 'P0001'; end if;
    execute v_new;
  end if;
  v_def := pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) > 0 then
    v_new := replace(replace(v_def, c1n, c1), c2n, c2);
    if position('community_net_ref_v1' in v_new) > 0 then raise exception 'add_contribution changed after the patch; refusing' using errcode = 'P0001'; end if;
    execute v_new;
  end if;
  v_def := pg_get_functiondef('public.toggle_contribution_reaction(uuid,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) > 0 then
    v_new := replace(v_def, t1n, t1);
    if position('community_net_ref_v1' in v_new) > 0 then raise exception 'toggle_contribution_reaction changed after the patch; refusing' using errcode = 'P0001'; end if;
    execute v_new;
  end if;
  if (select md5(prosrc) from pg_proc where proname = 'add_guest_community_message' and pronamespace = 'public'::regnamespace) is distinct from '4eb11358227e6b3d8d77b933e076b28a'
     or (select md5(prosrc) from pg_proc where proname = 'add_contribution' and pronamespace = 'public'::regnamespace) is distinct from '2c2baa01ecf07abf1e1511f3cb951d3b'
     or (select md5(prosrc) from pg_proc where proname = 'toggle_contribution_reaction' and pronamespace = 'public'::regnamespace) is distinct from '96af69da3d9d8b1b82113248b09e97fa' then
    raise exception 'the restored functions do not have the original fingerprints; the whole rollback is cancelled' using errcode = 'P0001'; end if;
end
$migration$;
drop function if exists public.community_guest_block_from_message_v1(uuid,text,text);
drop function if exists public.community_guest_hide_v1(uuid,text);
drop function if exists public.community_guest_recent_v1(integer);
drop function if exists public.community_net_block_lift_v1(uuid,text);
drop function if exists public.community_net_block_request_permanent_v1(uuid,text);
drop function if exists public.community_net_block_approve_permanent_v1(uuid,text);
drop function if exists public.community_net_blocks_list_v1(boolean,integer);
drop function if exists public.community_net_blocked_v1(text);
drop function if exists public.community_net_ref_v1(text);
drop function if exists public.community_trusted_client_ip_v1();

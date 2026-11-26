-- Rollback of 20261126200000_community_net_blocks_PROPOSAL.sql: restores the two guest write routes by removing exactly the inserted fragments (requires the live md5 of each
-- original) and drops the staff API and the internal helpers. It KEEPS every table and row (keys, blocks, events, community_guest_posts.net_ref): no record is deleted; with the
-- functions restored the data is inert. Deleting the tables would be a separate, explicitly approved step.
do $migration$
declare v_def text; v_new text;
  g1n constant text := $a$  -- Community network protection (26.11.2026): from here v_ip is a keyed hash of the coarse network, never the raw address.
  v_ip := public.community_net_ref_v1(v_ip);
  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;
  if public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
$a$;
  g1 constant text := $a$  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;
$a$;
  g2n constant text := $a$  insert into public.community_guest_posts (contribution_id, net_ref) values (v_id, v_ip);
$a$;
  g2 constant text := $a$  insert into public.community_guest_posts (contribution_id) values (v_id);
$a$;
  c1n constant text := $a$    v_ip := nullif(btrim(v_ip), '');
    -- Community network protection (26.11.2026): hash first, refuse a blocked network before any log write.
    v_ip := public.community_net_ref_v1(v_ip);
    if v_ip is not null and public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
    if v_ip is not null then
$a$;
  c1 constant text := $a$    v_ip := nullif(btrim(v_ip), '');
    if v_ip is not null then
$a$;
begin
  perform set_config('lock_timeout', '3s', true);
  v_def := pg_get_functiondef('public.add_guest_community_message(text,uuid,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) > 0 then
    v_new := replace(replace(v_def, g1n, g1), g2n, g2);
    if (select md5(prosrc) from pg_proc where oid = 'public.add_guest_community_message(text,uuid,text,text)'::regprocedure) is not null and position('community_net_ref_v1' in v_new) > 0 then
      raise exception 'add_guest_community_message changed after the patch; refusing' using errcode = 'P0001'; end if;
    execute v_new;
  end if;
  v_def := pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) > 0 then
    v_new := replace(v_def, c1n, c1);
    if position('community_net_ref_v1' in v_new) > 0 then raise exception 'add_contribution changed after the patch; refusing' using errcode = 'P0001'; end if;
    execute v_new;
  end if;
  if (select md5(prosrc) from pg_proc where proname = 'add_guest_community_message' and pronamespace = 'public'::regnamespace) is distinct from '4eb11358227e6b3d8d77b933e076b28a'
     or (select md5(prosrc) from pg_proc where proname = 'add_contribution' and pronamespace = 'public'::regnamespace) is distinct from '2c2baa01ecf07abf1e1511f3cb951d3b' then
    raise exception 'the restored functions do not have the original fingerprints; the whole rollback is cancelled' using errcode = 'P0001'; end if;
end
$migration$;
drop function if exists public.community_guest_block_from_message_v1(uuid,text,text,boolean);
drop function if exists public.community_guest_hide_v1(uuid,text);
drop function if exists public.community_net_block_lift_v1(uuid,text);
drop function if exists public.community_net_block_request_permanent_v1(uuid,text);
drop function if exists public.community_net_block_approve_permanent_v1(uuid,text);
drop function if exists public.community_net_blocks_list_v1(boolean,integer);
drop function if exists public.community_net_blocked_v1(text);
drop function if exists public.community_net_ref_v1(text);

-- Community protection against repeated guest harassment (PROPOSAL, NOT APPLIED; ZURIEL 26.11.2026, requested for Emily). Apply only on an explicit ZURIEL approval of this
-- exact file (CLAUDE.md 0.4: DDL, grants and function changes on the shared DB), as ONE transaction (apply_migration). Spec: docs/reviews/community-protection-20261126/README.md.
-- EXTENDS the existing moderation mechanism (community_can_moderate_guests, community_guest_review, community_guest_posts, add_guest_community_message); no second system.
--  * A GUEST write from a blocked network is refused with 'community_write_blocked': guest replies (add_guest_community_message), guest contributions (add_contribution, anonymous branch)
--    and guest likes/dislikes/reactions (toggle_contribution_reaction, only when auth.uid() is null). Reads, search engines and SIGNED-IN ACCOUNTS are never blocked (an account sharing a network
--    with a blocked guest is not affected: every check is guarded by auth.uid() is null) and every other route is untouched.
--  * The network address comes ONLY from the cf-connecting-ip header (set by Cloudflare, which replaces any client-sent value); x-real-ip and x-forwarded-for, which a client can write, are never used
--    for a block or for the hash. No address header = no reference (guests fail closed as before; add_contribution skips its limit as before).
--  * Hiding a message and blocking a network are two SEPARATE staff actions (no function does both).
--  * Permanent blocks stay DISABLED (community_net_settings.permanent_enabled = false) until the owner's account identity is verified and ZURIEL explicitly enables them.
--  * A network is identified ONLY by a keyed SHA-256 of the coarse address (IPv4 as is, IPv6 /64) made inside the database from the platform-set cf-connecting-ip (as the existing
--    functions already prefer). The raw address is never stored by the new code and is replaced by the hash in the existing rate-limit log from now on. The key lives in a table
--    nobody but the owner can read. Staff and clients never see the address or the hash (no function returns it).
--  * A message is tied to its network ONLY at write time, from now on. Historical messages have no reference and can never be blocked "by message" (no guessing, no time matching).
--  * Staff block by message for 24 hours, 3 days or 7 days with a mandatory reason; blocks expire by themselves (checked at write time, no cron). Permanent blocks are disabled; once enabled they need
--    a staff request and the approval of ONE designated approver user (setting empty = nobody can approve = fail closed).
--  * Every action is recorded in an append-only event table: who, when, why.
-- The write limits survive the switch: for the first 24 hours after applying, the rate-limit queries count the rows of a network under BOTH keys (the keyed hash and the raw address written by the old code,
-- derived from the trusted header only), so the window does not reset. New rows are written with the hash only; the raw rows age out by themselves.
-- Existing write limits are kept: the rate-limit queries and the log now use the keyed hash instead of the raw address (same counts per network: guests 3/hour, 10/24h, 60/hour globally; anonymous contributions 5/hour).
-- Guard: md5(prosrc) of add_guest_community_message 4eb11358227e6b3d8d77b933e076b28a, add_contribution 2c2baa01ecf07abf1e1511f3cb951d3b (live) or abbcf299635c0a8462c07274c10a9e4f (the live body after Discovery Center D5, docs/reviews/discovery-center-20261126; D5 first, then this file; both changes stay), toggle_contribution_reaction 96af69da3d9d8b1b82113248b09e97fa (live 26.11.2026); anchored text patches, each anchor exactly once.
-- Rollback: 20261126200000_community_net_blocks_ROLLBACK.sql (restores both functions exactly; keeps every table and row: no history is deleted).
do $migration$
declare
  v_g text; v_c text; v_t text;
begin
  perform set_config('lock_timeout', '3s', true);
  if to_regprocedure('public.community_can_moderate_guests()') is null then raise exception 'community_can_moderate_guests is missing' using errcode = 'P0001'; end if;
  select prosrc into v_g from pg_proc where proname = 'add_guest_community_message' and pronamespace = 'public'::regnamespace;
  select prosrc into v_c from pg_proc where proname = 'add_contribution' and pronamespace = 'public'::regnamespace;
  select prosrc into v_t from pg_proc where proname = 'toggle_contribution_reaction' and pronamespace = 'public'::regnamespace;
  if position('community_net_ref_v1' in coalesce(v_g,'')) = 0 and md5(v_g) is distinct from '4eb11358227e6b3d8d77b933e076b28a' then
    raise exception 'add_guest_community_message drift (md5 %); independent review required, nothing changed', md5(v_g) using errcode = 'P0001'; end if;
  if position('community_net_ref_v1' in coalesce(v_c,'')) = 0 and md5(v_c) not in ('2c2baa01ecf07abf1e1511f3cb951d3b', 'abbcf299635c0a8462c07274c10a9e4f') then
    raise exception 'add_contribution drift (md5 %); independent review required, nothing changed', md5(v_c) using errcode = 'P0001'; end if;
  if position('community_net_ref_v1' in coalesce(v_t,'')) = 0 and md5(v_t) is distinct from '96af69da3d9d8b1b82113248b09e97fa' then
    raise exception 'toggle_contribution_reaction drift (md5 %); independent review required, nothing changed', md5(v_t) using errcode = 'P0001'; end if;
end
$migration$;

-- 1. key, settings, blocks, events (RLS on, no policy, no grant: only SECURITY DEFINER code reads them)
create table if not exists public.community_net_key (
  singleton boolean primary key default true check (singleton),
  key bytea not null,
  created_at timestamptz not null default now());
insert into public.community_net_key(singleton, key)
  values (true, sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')))
  on conflict (singleton) do nothing;
create table if not exists public.community_net_settings (
  singleton boolean primary key default true check (singleton),
  permanent_enabled boolean not null default false,
  permanent_approver_user_id uuid,
  updated_at timestamptz not null default now());
alter table public.community_net_settings add column if not exists permanent_enabled boolean not null default false;
insert into public.community_net_settings(singleton) values (true) on conflict (singleton) do nothing;
create table if not exists public.community_net_blocks (
  id uuid primary key default gen_random_uuid(),
  net_ref text not null,
  duration_kind text not null check (duration_kind in ('h24','d3','d7','permanent')),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  reason text not null check (char_length(btrim(reason)) between 10 and 300),
  expires_at timestamptz,
  source_message_id uuid,
  lifted_at timestamptz, lifted_by uuid, lift_reason text,
  permanent_requested_at timestamptz, permanent_requested_by uuid, permanent_request_reason text,
  permanent_approved_at timestamptz, permanent_approved_by uuid,
  check ((duration_kind = 'permanent') = (expires_at is null)));
create unique index if not exists community_net_blocks_one_open_per_net on public.community_net_blocks (net_ref) where lifted_at is null;
create table if not exists public.community_net_block_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null check (action in ('block_created','message_hidden','block_lifted','block_expired','permanent_requested','permanent_approved')),
  block_id uuid, message_id uuid, reason text);
create or replace function public.community_net_block_events_append_only_v1() returns trigger language plpgsql as $f$
begin raise exception 'community_net_block_events is append-only'; end $f$;
drop trigger if exists trg_community_net_block_events_append_only on public.community_net_block_events;
create trigger trg_community_net_block_events_append_only before update or delete on public.community_net_block_events for each row execute function public.community_net_block_events_append_only_v1();
alter table public.community_net_key enable row level security;
alter table public.community_net_settings enable row level security;
alter table public.community_net_blocks enable row level security;
alter table public.community_net_block_events enable row level security;
revoke all on public.community_net_key, public.community_net_settings, public.community_net_blocks, public.community_net_block_events from public, anon, authenticated;
alter table public.community_guest_posts add column if not exists net_ref text;

-- 2. internal helpers (not callable by clients)
create or replace function public.community_trusted_client_ip_v1() returns text
language plpgsql stable set search_path to 'public', 'pg_temp' as $f$
declare v_h jsonb; v_ip text;
begin
  begin v_h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then return null; end;
  v_ip := nullif(btrim(coalesce(v_h->>'cf-connecting-ip', '')), '');
  if v_ip is null then return null; end if;
  begin perform v_ip::inet; exception when others then return null; end;
  return v_ip;
end $f$;
create or replace function public.community_net_ref_v1(p_ip text) returns text
language plpgsql stable security definer set search_path to 'public', 'pg_temp' as $f$
declare v_norm text; v_key bytea;
begin
  if p_ip is null or btrim(p_ip) = '' then return null; end if;
  begin
    v_norm := case when family(btrim(p_ip)::inet) = 6 then host(network(set_masklen(btrim(p_ip)::inet, 64))) else host(btrim(p_ip)::inet) end;
  exception when others then return null;
  end;
  select key into v_key from public.community_net_key where singleton;
  if v_key is null then return null; end if;
  return encode(sha256(v_key || convert_to(v_norm, 'UTF8')), 'hex');
end $f$;
create or replace function public.community_net_blocked_v1(p_ref text) returns boolean
language sql stable security definer set search_path to 'public', 'pg_temp' as $f$
  select p_ref is not null and exists (select 1 from public.community_net_blocks b
    where b.net_ref = p_ref and b.lifted_at is null and (b.expires_at is null or b.expires_at > now()))
$f$;
revoke all on function public.community_net_ref_v1(text), public.community_net_blocked_v1(text), public.community_trusted_client_ip_v1() from public, anon, authenticated;

-- 3. the two guest write routes: anchored patches (the address becomes a hash at once; the block is checked before any log write)
do $migration$
declare
  v_def text; v_new text;
  g1 constant text := $a$  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;
$a$;
  g1n constant text := $a$  -- Community network protection (26.11.2026): from here v_ip is a keyed hash of the coarse network taken ONLY from cf-connecting-ip, never the raw address.
  v_ip := public.community_net_ref_v1(public.community_trusted_client_ip_v1());
  -- Fail closed: without an address the limits cannot be enforced.
  if v_ip is null then raise exception 'rate_limited'; end if;
  if public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
$a$;
  g3 constant text := $a$  from public.anon_contrib_log where ip = v_ip and created_at > now() - interval '24 hours';
$a$;
  g3n constant text := $a$  from public.anon_contrib_log where ip in (v_ip, coalesce(public.community_trusted_client_ip_v1(), v_ip)) and created_at > now() - interval '24 hours';
$a$;
  g2 constant text := $a$  insert into public.community_guest_posts (contribution_id) values (v_id);
$a$;
  g2n constant text := $a$  insert into public.community_guest_posts (contribution_id, net_ref) values (v_id, v_ip);
$a$;
  c1 constant text := $a$    v_ip := nullif(btrim(v_ip), '');
    if v_ip is not null then
$a$;
  c1n constant text := $a$    v_ip := nullif(btrim(v_ip), '');
    -- Community network protection (26.11.2026): hash first, refuse a blocked network before any log write.
    v_ip := public.community_net_ref_v1(public.community_trusted_client_ip_v1());
    if v_ip is not null and coalesce(nullif(p_origin,''),'beit_midrash') in ('openweb','community_2029') and public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
    if v_ip is not null then
$a$;
  c2 constant text := $a$      where ip = v_ip and created_at > now() - interval '1 hour';
$a$;
  c2n constant text := $a$      where ip in (v_ip, coalesce(public.community_trusted_client_ip_v1(), v_ip)) and created_at > now() - interval '1 hour';
$a$;
  t1 constant text := $a$  if v_key is null then raise exception 'no identity'; end if;
$a$;
  t1n constant text := $a$  if v_key is null then raise exception 'no identity'; end if;
  -- Community network protection (26.11.2026): guests only; a signed-in account is never blocked because of its network.
  if auth.uid() is null and exists (select 1 from public.research_contributions rc0 where rc0.id = p_id and rc0.origin in ('openweb','community_2029'))
     and public.community_net_blocked_v1(public.community_net_ref_v1(public.community_trusted_client_ip_v1())) then raise exception 'community_write_blocked'; end if;
$a$;
begin
  v_def := pg_get_functiondef('public.add_guest_community_message(text,uuid,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) = 0 then
    if (length(v_def) - length(replace(v_def, g1, ''))) / length(g1) <> 1 or (length(v_def) - length(replace(v_def, g2, ''))) / length(g2) <> 1
       or (length(v_def) - length(replace(v_def, g3, ''))) / length(g3) <> 1 then
      raise exception 'add_guest_community_message anchors are not exactly once each; refusing' using errcode = 'P0001'; end if;
    execute replace(replace(replace(v_def, g1, g1n), g2, g2n), g3, g3n);
  end if;
  v_def := pg_get_functiondef('public.add_contribution(text,text,text,text,text,uuid,text,jsonb,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) = 0 then
    if (length(v_def) - length(replace(v_def, c1, ''))) / length(c1) <> 1
       or (length(v_def) - length(replace(v_def, c2, ''))) / length(c2) <> 1 then
      raise exception 'add_contribution anchor is not exactly once; refusing' using errcode = 'P0001'; end if;
    execute replace(replace(v_def, c1, c1n), c2, c2n);
  end if;
  v_def := pg_get_functiondef('public.toggle_contribution_reaction(uuid,text,text)'::regprocedure);
  if position('community_net_ref_v1' in v_def) = 0 then
    if (length(v_def) - length(replace(v_def, t1, ''))) / length(t1) <> 1 then
      raise exception 'toggle_contribution_reaction anchor is not exactly once; refusing' using errcode = 'P0001'; end if;
    execute replace(v_def, t1, t1n);
  end if;
end
$migration$;

-- 4. staff API (authenticated; moderators and admins only; nothing returns an address or a network reference)
create or replace function public.community_guest_block_from_message_v1(p_message_id uuid, p_duration text, p_reason text)
returns uuid language plpgsql security definer set search_path to 'public', 'pg_temp' as $f$
declare v_uid uuid := auth.uid(); v_ref text; v_id uuid; v_recent int; v_exp timestamptz; v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null or not public.community_can_moderate_guests() then raise exception 'not authorized'; end if;
  if p_duration not in ('h24','d3','d7') then raise exception 'bad_duration'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 300 then raise exception 'reason_required'; end if;
  if not exists (select 1 from public.community_guest_posts where contribution_id = p_message_id) then raise exception 'not_guest_post'; end if;
  select net_ref into v_ref from public.community_guest_posts where contribution_id = p_message_id;
  if v_ref is null then raise exception 'no_network_reference'; end if;   -- historical message: never guessed
  -- Serialise one staff member's blocks so the hourly cap holds for parallel requests too.
  perform pg_advisory_xact_lock(hashtextextended('community_net_block_actor:' || v_uid::text, 1820));
  select count(*) into v_recent from public.community_net_block_events where actor = v_uid and action = 'block_created' and at > now() - interval '1 hour';
  if v_recent >= 10 then raise exception 'too_many_blocks'; end if;
  perform pg_advisory_xact_lock(hashtextextended('community_net_block:' || v_ref, 1820));
  update public.community_net_blocks set lifted_at = now(), lift_reason = 'expired'
    where net_ref = v_ref and lifted_at is null and expires_at is not null and expires_at <= now();
  if exists (select 1 from public.community_net_blocks where net_ref = v_ref and lifted_at is null) then raise exception 'already_blocked'; end if;
  v_exp := now() + case p_duration when 'h24' then interval '24 hours' when 'd3' then interval '3 days' else interval '7 days' end;
  insert into public.community_net_blocks(net_ref, duration_kind, created_by, reason, expires_at, source_message_id)
    values (v_ref, p_duration, v_uid, v_reason, v_exp, p_message_id) returning id into v_id;
  insert into public.community_net_block_events(actor, action, block_id, message_id, reason) values (v_uid, 'block_created', v_id, p_message_id, v_reason);
  return v_id;
end $f$;
create or replace function public.community_guest_hide_v1(p_message_id uuid, p_reason text) returns void
language plpgsql security definer set search_path to 'public', 'pg_temp' as $f$
declare v_uid uuid := auth.uid(); v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null or not public.community_can_moderate_guests() then raise exception 'not authorized'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 300 then raise exception 'reason_required'; end if;
  if not exists (select 1 from public.community_guest_posts where contribution_id = p_message_id) then raise exception 'not_guest_post'; end if;
  update public.research_contributions set status = 'hidden', updated_at = now() where id = p_message_id and status = 'approved';
  update public.community_guest_posts set reviewed_at = now(), reviewed_by = v_uid where contribution_id = p_message_id;
  insert into public.community_net_block_events(actor, action, message_id, reason) values (v_uid, 'message_hidden', p_message_id, v_reason);
end $f$;
create or replace function public.community_net_block_lift_v1(p_block_id uuid, p_reason text) returns void
language plpgsql security definer set search_path to 'public', 'pg_temp' as $f$
declare v_uid uuid := auth.uid(); v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null or not public.community_can_moderate_guests() then raise exception 'not authorized'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 300 then raise exception 'reason_required'; end if;
  update public.community_net_blocks set lifted_at = now(), lifted_by = v_uid, lift_reason = v_reason where id = p_block_id and lifted_at is null;
  if not found then raise exception 'not_found'; end if;
  insert into public.community_net_block_events(actor, action, block_id, reason) values (v_uid, 'block_lifted', p_block_id, v_reason);
end $f$;
create or replace function public.community_net_block_request_permanent_v1(p_block_id uuid, p_reason text) returns void
language plpgsql security definer set search_path to 'public', 'pg_temp' as $f$
declare v_uid uuid := auth.uid(); v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null or not public.community_can_moderate_guests() then raise exception 'not authorized'; end if;
  if not coalesce((select permanent_enabled from public.community_net_settings where singleton), false) then raise exception 'permanent_disabled'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 300 then raise exception 'reason_required'; end if;
  update public.community_net_blocks set permanent_requested_at = now(), permanent_requested_by = v_uid, permanent_request_reason = v_reason
    where id = p_block_id and lifted_at is null and duration_kind <> 'permanent' and permanent_requested_at is null;
  if not found then raise exception 'not_found'; end if;
  insert into public.community_net_block_events(actor, action, block_id, reason) values (v_uid, 'permanent_requested', p_block_id, v_reason);
end $f$;
create or replace function public.community_net_block_approve_permanent_v1(p_block_id uuid, p_reason text) returns void
language plpgsql security definer set search_path to 'public', 'pg_temp' as $f$
declare v_uid uuid := auth.uid(); v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null or v_uid is distinct from (select permanent_approver_user_id from public.community_net_settings where singleton) then raise exception 'not authorized'; end if;
  if not coalesce((select permanent_enabled from public.community_net_settings where singleton), false) then raise exception 'permanent_disabled'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 300 then raise exception 'reason_required'; end if;
  update public.community_net_blocks set duration_kind = 'permanent', expires_at = null, permanent_approved_at = now(), permanent_approved_by = v_uid
    where id = p_block_id and lifted_at is null and permanent_requested_at is not null and duration_kind <> 'permanent' and (expires_at is null or expires_at > now());
  if not found then raise exception 'not_found'; end if;
  insert into public.community_net_block_events(actor, action, block_id, reason) values (v_uid, 'permanent_approved', p_block_id, v_reason);
end $f$;
create or replace function public.community_guest_recent_v1(p_limit integer default 30)
returns table(id uuid, created_at timestamptz, author_name text, body text, status text, reviewed boolean, can_block boolean, network_blocked boolean)
language sql stable security definer set search_path to 'public', 'pg_temp' as $f$
  select r.id, g.created_at, r.author_name, left(r.body, 400), r.status, g.reviewed_at is not null,
         g.net_ref is not null, public.community_net_blocked_v1(g.net_ref)
    from public.community_guest_posts g join public.research_contributions r on r.id = g.contribution_id
   where public.community_can_moderate_guests() and r.deleted_at is null and g.created_at > now() - interval '14 days'
   order by g.created_at desc
   limit least(greatest(coalesce(p_limit, 30), 1), 100)
$f$;
create or replace function public.community_net_blocks_list_v1(p_include_ended boolean default false, p_limit integer default 50)
returns table(id uuid, state text, duration_kind text, created_at timestamptz, expires_at timestamptz, reason text, created_by_name text, source_message_id uuid,
              linked_messages integer, permanent_requested boolean, lifted_at timestamptz, lifted_by_name text, lift_reason text)
language sql stable security definer set search_path to 'public', 'pg_temp' as $f$
  select b.id,
         case when b.lifted_at is not null then 'lifted' when b.expires_at is not null and b.expires_at <= now() then 'expired' else 'active' end,
         b.duration_kind, b.created_at, b.expires_at, b.reason,
         (select coalesce(nullif(u.display_name,''), nullif(u.username,'')) from public.users u where u.id = b.created_by),
         b.source_message_id,
         (select count(*)::int from public.community_guest_posts g where g.net_ref = b.net_ref),
         b.permanent_requested_at is not null and b.duration_kind <> 'permanent',
         b.lifted_at,
         (select coalesce(nullif(u.display_name,''), nullif(u.username,'')) from public.users u where u.id = b.lifted_by),
         b.lift_reason
    from public.community_net_blocks b
   where public.community_can_moderate_guests()
     and (p_include_ended or (b.lifted_at is null and (b.expires_at is null or b.expires_at > now())))
   order by b.created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$f$;
revoke all on function public.community_guest_block_from_message_v1(uuid,text,text), public.community_guest_hide_v1(uuid,text), public.community_net_block_lift_v1(uuid,text),
  public.community_net_block_request_permanent_v1(uuid,text), public.community_net_block_approve_permanent_v1(uuid,text), public.community_net_blocks_list_v1(boolean,integer), public.community_guest_recent_v1(integer) from public, anon;
grant execute on function public.community_guest_block_from_message_v1(uuid,text,text), public.community_guest_hide_v1(uuid,text), public.community_net_block_lift_v1(uuid,text),
  public.community_net_block_request_permanent_v1(uuid,text), public.community_net_block_approve_permanent_v1(uuid,text), public.community_net_blocks_list_v1(boolean,integer), public.community_guest_recent_v1(integer) to authenticated;

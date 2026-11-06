-- PROPOSED — NOT A MIGRATION, NOT APPLIED. This file is deliberately outside supabase/migrations so no tool can apply it
-- by accident. It needs ZURIEL's explicit approval of the exact statements before it becomes a migration.
--
-- Purpose: make the server the authority for the public-reading compute beacon (traffic_intelligence_law v12 draft).
-- The service worker is only defence in depth: a caller can reach this RPC without it (the anon key is public), and the
-- generic ingest_event is executable by PUBLIC with no validation. So the database itself enforces, on every call:
--   1. a closed schema            (same shape as readingActivityBody() in the worker);
--   2. a per-address rate limit   (reuses edge_rate_limit_check; address from request.headers, fail closed);
--   3. exactly-once idempotency   (primary key on activity_event_id, written in the same transaction as the event);
--   4. a server-set actor class   ("unknown": an anonymous beacon cannot prove who sent it).
-- It also closes the forgery path: the generic ingest_event ignores the three reserved compute event types, so a compute
-- row can only be produced by this function.
--
-- Why a key table and not a unique index on events: public.events is partitioned by RANGE (ts) and has no unique index.
-- A unique index on a partitioned table must contain the partition key, so (activity_event_id, ts) could not reject a replay
-- that carries a different ts, and per-partition indexes would miss a replay that crosses a month boundary.
-- The key table holds only the random event id and its first-seen time; it is not an analytics store.
--
-- ROLLBACK (all of it, no data loss for other families):
--   drop function if exists public.ingest_reading_activity_v1(text, text, text, jsonb);
--   drop function if exists public.fn_reading_activity_ids_prune_v1(interval);
--   create or replace function public.ingest_event(...)  -- restore the previous body (kept below, without the guard)
--   drop table if exists public.reading_activity_ids;
--   -- optional, only on explicit approval: delete from public.events where props->>'beacon' = 'v1';

begin;

create table if not exists public.reading_activity_ids (
  activity_event_id uuid primary key,
  first_seen_at timestamptz not null default now()
);
create index if not exists reading_activity_ids_first_seen_idx on public.reading_activity_ids (first_seen_at);
alter table public.reading_activity_ids enable row level security;
revoke all on public.reading_activity_ids from public, anon, authenticated;

create or replace function public.ingest_reading_activity_v1(
  p_event_type text, p_path text, p_app_context text, p_props jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  v_headers json;
  v_ip text;
  v_rate jsonb;
  v_keys text;
  v_id uuid;
  v_session text;
  v_rows integer;
begin
  -- 2. rate limit FIRST, so malformed floods are counted too. Fail closed without an address.
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then v_headers := null;
  end;
  v_ip := coalesce(
    nullif(btrim(coalesce(v_headers->>'cf-connecting-ip', '')), ''),
    nullif(btrim(coalesce(v_headers->>'x-real-ip', '')), ''),
    nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), ''));
  if v_ip is null then return jsonb_build_object('status', 'rate_limited', 'reason', 'no_address'); end if;
  v_rate := public.edge_rate_limit_check(encode(sha256(convert_to('reading-activity-v1|' || v_ip, 'utf8')), 'hex'), 60, 30);
  if coalesce((v_rate->>'allowed')::boolean, false) is not true then
    return jsonb_build_object('status', 'rate_limited', 'reason', 'address_ceiling');
  end if;

  -- 1. closed schema (identical to readingActivityBody)
  if p_event_type is null or p_event_type not in ('first_compute', 'repeat_compute', 'recompute') then
    return jsonb_build_object('status', 'rejected', 'reason', 'event_type'); end if;
  if p_path is null or p_path not in ('/gematria', '/community/calculator') then
    return jsonb_build_object('status', 'rejected', 'reason', 'path'); end if;
  if p_app_context is null or p_app_context not in ('facebook','instagram','whatsapp','telegram','line','chrome-ios','edge','opera','firefox','android-webview','chrome','safari','other') then
    return jsonb_build_object('status', 'rejected', 'reason', 'app_context'); end if;
  if p_props is null or jsonb_typeof(p_props) <> 'object' then
    return jsonb_build_object('status', 'rejected', 'reason', 'props'); end if;
  select string_agg(k, ',' order by k) into v_keys from jsonb_object_keys(p_props) k;
  if v_keys is distinct from 'activity_event_id,activity_session,entry,length_bucket,schema,surface_kind' then
    return jsonb_build_object('status', 'rejected', 'reason', 'props_keys'); end if;
  if p_props->'schema' is distinct from '1'::jsonb
     or jsonb_typeof(p_props->'activity_event_id') <> 'string' or jsonb_typeof(p_props->'activity_session') <> 'string'
     or jsonb_typeof(p_props->'entry') <> 'string' or jsonb_typeof(p_props->'length_bucket') <> 'string'
     or jsonb_typeof(p_props->'surface_kind') <> 'string'
     or (p_props->>'entry') not in ('direct', 'share', 'handoff')
     or (p_props->>'length_bucket') not in ('2-3', '4-8', '9-20', '21+')
     or (p_props->>'surface_kind') not in ('community', 'calculator', 'professional')
     or (p_props->>'activity_event_id') !~* v_uuid or (p_props->>'activity_session') !~* v_uuid then
    return jsonb_build_object('status', 'rejected', 'reason', 'props_values'); end if;
  v_id := (p_props->>'activity_event_id')::uuid;
  v_session := lower(p_props->>'activity_session');
  -- a signed-in account id must never be used as a random id (possible only if the caller skipped the worker)
  if auth.uid() is not null and (v_id = auth.uid() or v_session = auth.uid()::text) then
    return jsonb_build_object('status', 'rejected', 'reason', 'account_id'); end if;

  -- 3. exactly-once: the primary key serializes concurrent inserts of the same id; the loser waits for the winner's
  --    commit and then skips. The key and the event are written in this one transaction, so a failure rolls both back
  --    and a retry is recorded normally.
  insert into public.reading_activity_ids (activity_event_id) values (v_id) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('status', 'duplicate'); end if;

  -- 4. server-set provenance: the caller cannot send, and therefore cannot choose, an actor class.
  insert into public.events (ts, sod_id, person_id, session_id, surface, event_type, path, ref_host, via, app_context,
                             device, journey_id, depth_reached, utm, is_bot, props)
  values (now(), null, null, null, 'gematria', p_event_type, p_path, null, null, p_app_context,
          null, null, null, null, false,
          jsonb_set(p_props, '{activity_event_id}', to_jsonb(v_id::text)) || jsonb_build_object(
            'beacon', 'v1', 'actor_class', 'unknown', 'actor_basis', 'anonymous_beacon_no_identity'));
  return jsonb_build_object('status', 'recorded');
end
$fn$;
revoke all on function public.ingest_reading_activity_v1(text, text, text, jsonb) from public;
grant execute on function public.ingest_reading_activity_v1(text, text, text, jsonb) to anon, authenticated, service_role;

-- Retention: keys outlive the events they protect (events are kept 120 days by fn_telemetry_retention_120d).
create or replace function public.fn_reading_activity_ids_prune_v1(p_keep interval default interval '130 days')
returns integer language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare v_rows integer;
begin
  delete from public.reading_activity_ids where first_seen_at < now() - greatest(p_keep, interval '121 days');
  get diagnostics v_rows = row_count;
  return v_rows;
end
$fn$;
revoke all on function public.fn_reading_activity_ids_prune_v1(interval) from public, anon, authenticated;
grant execute on function public.fn_reading_activity_ids_prune_v1(interval) to service_role;

-- Forgery guard: the generic RPC is executable by PUBLIC. Compute rows may only come from ingest_reading_activity_v1.
-- Body below is the live body of ingest_event, plus the single guard marked GUARD.
create or replace function public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text DEFAULT NULL::text, p_ref_host text DEFAULT NULL::text, p_via text DEFAULT NULL::text, p_app_context text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_journey_id text DEFAULT NULL::text, p_depth smallint DEFAULT NULL::smallint, p_utm jsonb DEFAULT NULL::jsonb, p_props jsonb DEFAULT NULL::jsonb, p_is_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_person uuid;
begin
  -- GUARD: reserved compute identities are written only by ingest_reading_activity_v1.
  if p_surface = 'gematria' and p_event_type in ('first_compute', 'repeat_compute', 'recompute') then return; end if;
  if coalesce(p_is_bot,false) then return; end if;

  v_person := public.resolve_person(p_sod_id, p_app_context, p_via);
  insert into events (ts, sod_id, person_id, session_id, surface, event_type, path, ref_host,
                      via, app_context, device, journey_id, depth_reached, utm, is_bot, props)
    values (now(), p_sod_id, v_person, p_session_id, p_surface, p_event_type, p_path, p_ref_host,
            p_via, p_app_context, p_device, p_journey_id, p_depth, p_utm, false, p_props);
end $function$;

commit;

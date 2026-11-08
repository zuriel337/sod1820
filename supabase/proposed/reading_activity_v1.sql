-- PROPOSED — NOT A MIGRATION, NOT APPLIED. Deliberately outside supabase/migrations so no tool can apply it by accident.
-- It becomes a migration only after ZURIEL approves these exact statements.
--
-- Purpose: make the server the authority for the public-reading compute beacon (traffic_intelligence_law v12 draft).
-- The service worker is defence in depth only: the RPC is reachable without it (the anon key is public) and the generic
-- ingest_event is executable by PUBLIC with no validation. On every call the database itself enforces, in this order:
--   1. a trusted address            cf-connecting-ip only (set by Cloudflare; present on 100% of edge requests, 2026-11-06).
--                                   x-forwarded-for / x-real-ip are client-controllable and are NEVER used. No address => refused.
--   2. a per-address ceiling        60 per minute per address (IPv6 keyed by /64). Counts every call from the address, valid or not.
--   3. size bounds                  text arguments <= 32 chars, props <= 1024 bytes (checked in O(1) with pg_column_size).
--   4. a closed schema              same shape as readingActivityBody() in the worker.
--   5. a global ceiling             120 per minute across all addresses, evaluated only for well-formed calls.
--   6. exactly-once                 primary key on activity_event_id, written in the same transaction as the event.
--   7. a server-set actor class     "unknown": an anonymous beacon cannot prove who sent it. Never inferred.
-- Every refusal is counted in reading_activity_outcomes, so a drop in activity can be told apart from suppression.
-- The generic ingest_event ignores exactly the three reserved compute event types; nothing else about it changes.
--
-- WHY A KEY TABLE: public.events is partitioned by RANGE (ts) and has no unique index; a unique index on a partitioned table
-- must contain the partition key, so it could not reject a replay that carries another ts, and per-partition indexes would miss a
-- replay across a month boundary. The key table holds only a random id and its first-seen time. (Approved by ZURIEL 6.11.2026.)
--
-- ACL (least privilege; Supabase grants new public tables to anon/authenticated/service_role by default, so it is revoked explicitly):
--   public.reading_activity_ids        RLS on, no policy. anon/authenticated/service_role: no access.  service_role: SELECT (projections).
--   public.reading_activity_outcomes   RLS on, no policy. anon/authenticated/service_role: no access.  service_role: SELECT (projections).
--   ingest_reading_activity_v1(...)    EXECUTE: anon, authenticated, service_role. Not PUBLIC.
--   fn_reading_activity_count_v1(text) EXECUTE: owner only.
--   fn_reading_activity_prune_v1(...)  EXECUTE: service_role only.
--   ingest_event(...)                  ACL UNCHANGED (CREATE OR REPLACE keeps it): still executable by PUBLIC, as today.
--
-- ROLLBACK (no data loss for any other family; the three tables/functions are new):
--   1. restore the previous ingest_event body (the one without the line marked GUARD; it is the body kept below minus that line);
--   2. drop function if exists public.ingest_reading_activity_v1(text, text, text, jsonb);
--      drop function if exists public.fn_reading_activity_count_v1(text);
--      drop function if exists public.fn_reading_activity_prune_v1(interval);
--   3. drop table if exists public.reading_activity_ids, public.reading_activity_outcomes;
--   4. only on explicit approval: delete from public.events where props->>'beacon' = 'v1';
--   Step 1 first: after it the site-side calls simply fail closed (404 on the RPC) and nothing breaks.

begin;

create table if not exists public.reading_activity_ids (
  activity_event_id uuid primary key,
  first_seen_at timestamptz not null default now()
);
create index if not exists reading_activity_ids_first_seen_idx on public.reading_activity_ids (first_seen_at);

create table if not exists public.reading_activity_outcomes (
  minute timestamptz not null,
  outcome text not null check (outcome in ('duplicate', 'rejected_size', 'rejected_schema', 'rejected_account_id',
                                           'rate_limited_address', 'rate_limited_global', 'no_address')),
  n bigint not null default 0,
  primary key (minute, outcome)
);

alter table public.reading_activity_ids enable row level security;
alter table public.reading_activity_outcomes enable row level security;
revoke all on public.reading_activity_ids from public, anon, authenticated, service_role;
revoke all on public.reading_activity_outcomes from public, anon, authenticated, service_role;
grant select on public.reading_activity_ids, public.reading_activity_outcomes to service_role;

-- Counts one refused/duplicate call. "recorded" is not counted here: it is the number of beacon rows in public.events.
create or replace function public.fn_reading_activity_count_v1(p_outcome text) returns void
language sql security definer set search_path = public, pg_temp
as $fn$
  insert into public.reading_activity_outcomes (minute, outcome, n) values (date_trunc('minute', now()), p_outcome, 1)
  on conflict (minute, outcome) do update set n = public.reading_activity_outcomes.n + 1;
$fn$;
revoke all on function public.fn_reading_activity_count_v1(text) from public, anon, authenticated, service_role;

create or replace function public.ingest_reading_activity_v1(
  p_event_type text, p_path text, p_app_context text, p_props jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  c_address_limit constant integer := 60;     -- per address per minute (observed site-wide maximum: 22; p99: 13)
  c_global_limit constant integer := 120;     -- all addresses per minute (the maximum edge_rate_limit_check allows)
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  v_headers json;
  v_inet inet;
  v_addr text;
  v_rate jsonb;
  v_keys text;
  v_id uuid;
  v_session text;
  v_rows integer;
begin
  -- 1. trusted address only; without it the limits cannot be enforced, so refuse (fail closed)
  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then v_headers := null;
  end;
  begin
    v_inet := nullif(btrim(coalesce(v_headers->>'cf-connecting-ip', '')), '')::inet;
  exception when others then v_inet := null;
  end;
  if v_inet is null then
    perform public.fn_reading_activity_count_v1('no_address');
    return jsonb_build_object('status', 'rate_limited', 'reason', 'no_address');
  end if;
  -- IPv6 is keyed by its /64 (one subscriber can rotate inside it); IPv4-mapped IPv6 and IPv4 are keyed exactly.
  v_addr := case when family(v_inet) = 6 and not (v_inet <<= inet '::ffff:0:0/96')
                 then host(network(set_masklen(v_inet, 64))) else host(v_inet) end;

  -- 2. per-address ceiling first, so a noisy address is stopped before any other work
  v_rate := public.edge_rate_limit_check(encode(sha256(convert_to('reading-activity-v1|a|' || v_addr, 'utf8')), 'hex'), 60, c_address_limit);
  if coalesce((v_rate->>'allowed')::boolean, false) is not true then
    perform public.fn_reading_activity_count_v1('rate_limited_address');
    return jsonb_build_object('status', 'rate_limited', 'reason', 'address_ceiling');
  end if;

  -- 3. size bounds, O(1)
  if length(coalesce(p_event_type, '')) > 32 or length(coalesce(p_path, '')) > 32 or length(coalesce(p_app_context, '')) > 32
     or pg_column_size(p_props) > 1024 then
    perform public.fn_reading_activity_count_v1('rejected_size');
    return jsonb_build_object('status', 'rejected', 'reason', 'size');
  end if;

  -- 4. closed schema (identical to readingActivityBody)
  if p_event_type is null or p_event_type not in ('first_compute', 'repeat_compute', 'recompute')
     or p_path is null or p_path not in ('/gematria', '/community/calculator')
     or p_app_context is null or p_app_context not in ('facebook','instagram','whatsapp','telegram','line','chrome-ios','edge','opera','firefox','android-webview','chrome','safari','other')
     or p_props is null or jsonb_typeof(p_props) <> 'object' then
    perform public.fn_reading_activity_count_v1('rejected_schema');
    return jsonb_build_object('status', 'rejected', 'reason', 'schema');
  end if;
  select string_agg(k, ',' order by k) into v_keys from jsonb_object_keys(p_props) k;
  if v_keys is distinct from 'activity_event_id,activity_session,entry,length_bucket,schema,surface_kind'
     or p_props->'schema' is distinct from '1'::jsonb
     or jsonb_typeof(p_props->'activity_event_id') <> 'string' or jsonb_typeof(p_props->'activity_session') <> 'string'
     or jsonb_typeof(p_props->'entry') <> 'string' or jsonb_typeof(p_props->'length_bucket') <> 'string'
     or jsonb_typeof(p_props->'surface_kind') <> 'string'
     or (p_props->>'entry') not in ('direct', 'share', 'handoff')
     or (p_props->>'length_bucket') not in ('2-3', '4-8', '9-20', '21+')
     or (p_props->>'surface_kind') not in ('community', 'calculator', 'professional')
     or (p_props->>'activity_event_id') !~* v_uuid or (p_props->>'activity_session') !~* v_uuid then
    perform public.fn_reading_activity_count_v1('rejected_schema');
    return jsonb_build_object('status', 'rejected', 'reason', 'schema');
  end if;
  v_id := (p_props->>'activity_event_id')::uuid;
  v_session := lower(p_props->>'activity_session');
  -- a signed-in account id must never be used as a random id (possible only if the caller skipped the worker)
  if auth.uid() is not null and (v_id = auth.uid() or v_session = auth.uid()::text) then
    perform public.fn_reading_activity_count_v1('rejected_account_id');
    return jsonb_build_object('status', 'rejected', 'reason', 'account_id');
  end if;

  -- 5. global ceiling, only for well-formed calls (garbage cannot spend the global budget)
  v_rate := public.edge_rate_limit_check(encode(sha256(convert_to('reading-activity-v1|global', 'utf8')), 'hex'), 60, c_global_limit);
  if coalesce((v_rate->>'allowed')::boolean, false) is not true then
    perform public.fn_reading_activity_count_v1('rate_limited_global');
    return jsonb_build_object('status', 'rate_limited', 'reason', 'global_ceiling');
  end if;

  -- 6. exactly-once: the primary key serializes concurrent inserts of the same id; the loser waits for the winner's
  --    commit and then skips. Key and event are written in this one transaction, so a failure rolls both back and a
  --    retry is recorded normally.
  insert into public.reading_activity_ids (activity_event_id) values (v_id) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    perform public.fn_reading_activity_count_v1('duplicate');
    return jsonb_build_object('status', 'duplicate');
  end if;

  -- 7. server-set provenance: the caller cannot send, and therefore cannot choose, an actor class.
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
create or replace function public.fn_reading_activity_prune_v1(p_keep interval default interval '130 days')
returns integer language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare v_ids integer; v_out integer;
begin
  delete from public.reading_activity_ids where first_seen_at < now() - greatest(p_keep, interval '121 days');
  get diagnostics v_ids = row_count;
  delete from public.reading_activity_outcomes where minute < now() - greatest(p_keep, interval '121 days');
  get diagnostics v_out = row_count;
  return v_ids + v_out;
end
$fn$;
revoke all on function public.fn_reading_activity_prune_v1(interval) from public, anon, authenticated;
grant execute on function public.fn_reading_activity_prune_v1(interval) to service_role;

-- Forgery guard: the generic RPC is executable by PUBLIC. Compute rows may only come from ingest_reading_activity_v1.
-- The body is the live body of ingest_event, byte for byte, plus the single line marked GUARD. Signature, owner, security
-- definer, search_path and ACL are unchanged. Every other surface/event/bot combination behaves exactly as before.
create or replace function public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text DEFAULT NULL::text, p_ref_host text DEFAULT NULL::text, p_via text DEFAULT NULL::text, p_app_context text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_journey_id text DEFAULT NULL::text, p_depth smallint DEFAULT NULL::smallint, p_utm jsonb DEFAULT NULL::jsonb, p_props jsonb DEFAULT NULL::jsonb, p_is_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_person uuid;
begin
  if p_surface = 'gematria' and p_event_type in ('first_compute', 'repeat_compute', 'recompute') then return; end if; -- GUARD
  -- ⛔ בוטים (זחלני-חיפוש/סקרייפרים) לא נרשמים — הם היו ~68% מהטבלה וניפחו את ה-DB בלי ערך.
  --    נתוני-זחילה אמיתיים ממילא מגיעים מ-GSC. לביטול: הסר את שתי השורות הבאות.
  if coalesce(p_is_bot,false) then return; end if;

  v_person := public.resolve_person(p_sod_id, p_app_context, p_via);
  insert into events (ts, sod_id, person_id, session_id, surface, event_type, path, ref_host,
                      via, app_context, device, journey_id, depth_reached, utm, is_bot, props)
    values (now(), p_sod_id, v_person, p_session_id, p_surface, p_event_type, p_path, p_ref_host,
            p_via, p_app_context, p_device, p_journey_id, p_depth, p_utm, false, p_props);
end $function$;

commit;

\set ON_ERROR_STOP on
-- DISPOSABLE LOCAL DATABASE ONLY. A faithful replica of the live objects this feature touches, rebuilt from the live
-- definitions read on 2026-11-06 (function bodies are verbatim). No live project, no live data.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
grant usage on schema auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create schema private;

create table private.edge_rate_limit_buckets (key_hash text not null, bucket bigint not null, count integer not null, updated_at timestamptz not null default now(), primary key (key_hash, bucket));
CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer DEFAULT 300, p_limit integer DEFAULT 12)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare
  v_window integer := greatest(60, least(coalesce(p_window_seconds, 300), 3600));
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 120));
  v_bucket bigint;
  v_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate-limit key';
  end if;
  v_bucket := floor(extract(epoch from clock_timestamp()) / v_window)::bigint;
  insert into private.edge_rate_limit_buckets(key_hash, bucket, count, updated_at)
  values (p_key_hash, v_bucket, 1, clock_timestamp())
  on conflict (key_hash, bucket)
  do update set
    count = private.edge_rate_limit_buckets.count + 1,
    updated_at = clock_timestamp()
  returning count into v_count;
  if random() < 0.01 then
    delete from private.edge_rate_limit_buckets
    where updated_at < clock_timestamp() - interval '2 hours';
  end if;
  return jsonb_build_object('allowed', v_count <= v_limit, 'count', v_count, 'limit', v_limit, 'window_seconds', v_window);
end;
$function$;
revoke all on function public.edge_rate_limit_check(text, integer, integer) from public;
grant execute on function public.edge_rate_limit_check(text, integer, integer) to service_role;

-- events: partitioned by RANGE (ts), RLS on, no policies, no direct grants (as live)
create table public.events (
  event_id uuid not null default gen_random_uuid(), ts timestamptz not null default now(), sod_id text, person_id uuid, session_id text,
  surface text, event_type text, path text, ref_host text, via text, app_context text, device text, journey_id text,
  depth_reached smallint, utm jsonb, is_bot boolean, props jsonb, ingest_at timestamptz default now()
) partition by range (ts);
alter table public.events enable row level security;
do $$ declare m date := date_trunc('month', now())::date; begin
  execute format('create table public.events_cur partition of public.events for values from (%L) to (%L)', m, (m + interval '1 month')::date);
  execute format('create table public.events_prev partition of public.events for values from (%L) to (%L)', (m - interval '1 month')::date, m);
  execute 'create table public.events_default partition of public.events default';
end $$;
create function public.resolve_person(p_sod_id text, p_app_context text, p_via text) returns uuid language sql as $$ select null::uuid $$;

-- LIVE ingest_event, before the guard: executable by PUBLIC, no validation (default ACL)
CREATE OR REPLACE FUNCTION public.ingest_event(p_sod_id text, p_surface text, p_event_type text, p_path text DEFAULT NULL::text, p_ref_host text DEFAULT NULL::text, p_via text DEFAULT NULL::text, p_app_context text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_journey_id text DEFAULT NULL::text, p_depth smallint DEFAULT NULL::smallint, p_utm jsonb DEFAULT NULL::jsonb, p_props jsonb DEFAULT NULL::jsonb, p_is_bot boolean DEFAULT false)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_person uuid;
begin
  -- ⛔ בוטים (זחלני-חיפוש/סקרייפרים) לא נרשמים — הם היו ~68% מהטבלה וניפחו את ה-DB בלי ערך.
  --    נתוני-זחילה אמיתיים ממילא מגיעים מ-GSC. לביטול: הסר את שתי השורות הבאות.
  if coalesce(p_is_bot,false) then return; end if;

  v_person := public.resolve_person(p_sod_id, p_app_context, p_via);
  insert into events (ts, sod_id, person_id, session_id, surface, event_type, path, ref_host,
                      via, app_context, device, journey_id, depth_reached, utm, is_bot, props)
    values (now(), p_sod_id, v_person, p_session_id, p_surface, p_event_type, p_path, p_ref_host,
            p_via, p_app_context, p_device, p_journey_id, p_depth, p_utm, false, p_props);
end $function$;

-- Operational Trace (live columns and constraints)
create table public.op_trace_roots (
  trace_id uuid primary key, interaction_id text, capability text, surface text, channel text, locale text, identity_class text,
  session_ref text, subject_ref text, availability_ref text, entitlement_ref text, budget_ref text,
  started_at timestamptz not null default now(), ended_at timestamptz, outcome text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.op_trace_spans (
  span_id uuid primary key, trace_id uuid not null, parent_span_id uuid, kind text not null, name text not null, capability text, owner_ref text,
  plan_ref text, intelligence_level text, provider text, model text, model_version text, engine_version text, tool_version text,
  routing_reason text, escalation_reason text, fallback_reason text, started_at timestamptz not null, ended_at timestamptz, duration_ms bigint,
  outcome text, output_use text not null default 'not_applicable', stop_reason text, request_ref text,
  retry_ordinal integer not null default 0, continuation_ordinal integer not null default 0, resources jsonb not null default '{}'::jsonb,
  provider_native_amount numeric, provider_currency text, pricing_ref text, pricing_effective_at timestamptz, fx_rate numeric, fx_effective_at timestamptz,
  cost_ils numeric, cost_certainty text not null default 'unknown', credits_charged numeric, customer_price numeric,
  replay jsonb not null default '{}'::jsonb, redaction_applied boolean not null default true, raw_private_payload_logged boolean not null default false,
  payload_hash text, secure_payload_ref text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint op_trace_spans_cost_certainty_ck CHECK (cost_certainty = ANY (ARRAY['exact','estimated','unknown','not_billable'])),
  constraint op_trace_spans_duration_ck CHECK (duration_ms IS NULL OR duration_ms >= 0),
  constraint op_trace_spans_kind_ck CHECK (kind = ANY (ARRAY['root_interaction','router_plan','engine','model_call','tool_call','db_rpc','cache','network','media','storage_index','background_job','synthesis','export'])),
  constraint op_trace_spans_not_self_parent_ck CHECK (parent_span_id IS NULL OR parent_span_id <> span_id),
  constraint op_trace_spans_outcome_ck CHECK (outcome IS NULL OR outcome = ANY (ARRAY['success','partial','continuation_required','negative_result','access_filtered','cache_hit','cache_miss','degraded_fallback','cancelled','timeout','provider_error','tool_error','failed_with_reason'])),
  constraint op_trace_spans_output_use_ck CHECK (output_use = ANY (ARRAY['used','partially_used','rejected','superseded','not_applicable'])),
  constraint op_trace_spans_private_payload_ck CHECK (raw_private_payload_logged = false),
  constraint op_trace_spans_retry_ck CHECK (retry_ordinal >= 0 AND continuation_ordinal >= 0),
  constraint op_trace_spans_time_ck CHECK (ended_at IS NULL OR ended_at >= started_at),
  constraint op_trace_spans_tree_shape_ck CHECK ((kind = 'root_interaction' AND parent_span_id IS NULL) OR (kind <> 'root_interaction' AND parent_span_id IS NOT NULL)));
alter table public.op_trace_roots enable row level security; alter table public.op_trace_spans enable row level security;

CREATE OR REPLACE FUNCTION public.op_trace_begin_v1(p_trace_id uuid, p_root_span_id uuid, p_context jsonb DEFAULT '{}'::jsonb, p_started_at timestamp with time zone DEFAULT now())
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_root_span_id uuid;
begin
  if p_trace_id is null or p_root_span_id is null then
    raise exception 'trace_id and root_span_id are required';
  end if;
  insert into public.op_trace_roots(
    trace_id, interaction_id, capability, surface, channel, locale, identity_class,
    session_ref, subject_ref, availability_ref, entitlement_ref, budget_ref, started_at
  ) values (
    p_trace_id, nullif(p_context->>'interaction_id',''), nullif(p_context->>'capability',''), nullif(p_context->>'surface',''),
    nullif(p_context->>'channel',''), nullif(p_context->>'locale',''), nullif(p_context->>'identity_class',''),
    nullif(p_context->>'session_ref',''), nullif(p_context->>'subject_ref',''), nullif(p_context->>'availability_ref',''),
    nullif(p_context->>'entitlement_ref',''), nullif(p_context->>'budget_ref',''), coalesce(p_started_at, now())
  )
  on conflict (trace_id) do nothing;
  select s.span_id into v_root_span_id from public.op_trace_spans s
  where s.trace_id = p_trace_id and s.kind = 'root_interaction' and s.parent_span_id is null limit 1;
  if v_root_span_id is null then
    insert into public.op_trace_spans(span_id, trace_id, parent_span_id, kind, name, capability, owner_ref, started_at, output_use, cost_certainty, redaction_applied, raw_private_payload_logged)
    values (p_root_span_id, p_trace_id, null, 'root_interaction', coalesce(nullif(p_context->>'root_name',''), 'interaction'),
      nullif(p_context->>'capability',''), nullif(p_context->>'owner_ref',''), coalesce(p_started_at, now()), 'not_applicable', 'not_billable', true, false)
    on conflict (span_id) do nothing;
    select s.span_id into v_root_span_id from public.op_trace_spans s
    where s.trace_id = p_trace_id and s.kind = 'root_interaction' and s.parent_span_id is null limit 1;
  end if;
  if v_root_span_id is null then raise exception 'root span could not be established'; end if;
  return jsonb_build_object('trace_id', p_trace_id, 'root_span_id', v_root_span_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.op_trace_record_span_v1(p_trace_id uuid, p_span_id uuid, p_parent_span_id uuid, p_kind text, p_name text, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_outcome text, p_detail jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_duration bigint;
  v_raw_private boolean := coalesce((p_detail #>> '{privacy,rawPrivatePayloadLogged}')::boolean, false);
begin
  if p_trace_id is null or p_span_id is null or p_parent_span_id is null then
    raise exception 'trace_id, span_id and parent_span_id are required';
  end if;
  if p_started_at is null or p_ended_at is null or p_ended_at < p_started_at then
    raise exception 'valid started_at/ended_at are required';
  end if;
  if v_raw_private then raise exception 'raw private payload logging is forbidden'; end if;
  v_duration := greatest(0, floor(extract(epoch from (p_ended_at - p_started_at)) * 1000)::bigint);
  insert into public.op_trace_spans(
    span_id, trace_id, parent_span_id, kind, name, capability, owner_ref, plan_ref,
    intelligence_level, provider, model, model_version, engine_version, tool_version,
    routing_reason, escalation_reason, fallback_reason,
    started_at, ended_at, duration_ms, outcome, output_use, stop_reason, request_ref,
    retry_ordinal, continuation_ordinal, resources,
    provider_native_amount, provider_currency, pricing_ref, pricing_effective_at,
    fx_rate, fx_effective_at, cost_ils, cost_certainty, credits_charged, customer_price,
    replay, redaction_applied, raw_private_payload_logged, payload_hash, secure_payload_ref
  ) values (
    p_span_id, p_trace_id, p_parent_span_id, p_kind, p_name,
    nullif(p_detail->>'capability',''), nullif(p_detail->>'owner_ref',''), nullif(p_detail->>'plan_ref',''),
    nullif(p_detail->>'intelligence_level',''), nullif(p_detail->>'provider',''), nullif(p_detail->>'model',''),
    nullif(p_detail->>'model_version',''), nullif(p_detail->>'engine_version',''), nullif(p_detail->>'tool_version',''),
    nullif(p_detail->>'routing_reason',''), nullif(p_detail->>'escalation_reason',''), nullif(p_detail->>'fallback_reason',''),
    p_started_at, p_ended_at, v_duration, p_outcome,
    coalesce(nullif(p_detail->>'output_use',''), 'not_applicable'), nullif(p_detail->>'stop_reason',''), nullif(p_detail->>'request_ref',''),
    coalesce(nullif(p_detail->>'retry_ordinal','')::integer, 0), coalesce(nullif(p_detail->>'continuation_ordinal','')::integer, 0),
    coalesce(p_detail->'resources', '{}'::jsonb),
    nullif(p_detail #>> '{cost,providerNativeAmount}','')::numeric, nullif(p_detail #>> '{cost,providerCurrency}',''),
    nullif(p_detail #>> '{cost,pricingRef}',''), nullif(p_detail #>> '{cost,pricingEffectiveAt}','')::timestamptz,
    nullif(p_detail #>> '{cost,fxRate}','')::numeric, nullif(p_detail #>> '{cost,fxEffectiveAt}','')::timestamptz,
    nullif(p_detail #>> '{cost,costIls}','')::numeric, coalesce(nullif(p_detail #>> '{cost,certainty}',''), 'unknown'),
    nullif(p_detail #>> '{cost,creditsCharged}','')::numeric, nullif(p_detail #>> '{cost,customerPrice}','')::numeric,
    coalesce(p_detail->'replay', '{}'::jsonb), coalesce(nullif(p_detail #>> '{privacy,redactionApplied}','')::boolean, true),
    false, nullif(p_detail #>> '{privacy,payloadHash}',''), nullif(p_detail #>> '{privacy,securePayloadRef}','')
  )
  on conflict (span_id) do nothing;
  perform 1 from public.op_trace_spans s
  where s.span_id = p_span_id and s.trace_id = p_trace_id and s.parent_span_id = p_parent_span_id and s.kind = p_kind and s.name = p_name;
  if not found then raise exception 'span idempotency collision'; end if;
  return jsonb_build_object('trace_id', p_trace_id, 'span_id', p_span_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.op_trace_finish_v1(p_trace_id uuid, p_root_span_id uuid, p_outcome text, p_ended_at timestamp with time zone DEFAULT now(), p_stop_reason text DEFAULT NULL::text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_started timestamptz;
  v_ended timestamptz := coalesce(p_ended_at, now());
  v_duration bigint;
begin
  select started_at into v_started from public.op_trace_spans
  where span_id = p_root_span_id and trace_id = p_trace_id and kind = 'root_interaction';
  if v_started is null then return false; end if;
  v_duration := greatest(0, floor(extract(epoch from (v_ended - v_started)) * 1000)::bigint);
  update public.op_trace_spans
  set ended_at = coalesce(ended_at, v_ended), duration_ms = coalesce(duration_ms, v_duration), outcome = coalesce(outcome, p_outcome),
      stop_reason = coalesce(stop_reason, p_stop_reason), updated_at = now()
  where span_id = p_root_span_id and trace_id = p_trace_id;
  update public.op_trace_roots
  set ended_at = coalesce(ended_at, v_ended), outcome = coalesce(outcome, p_outcome), updated_at = now()
  where trace_id = p_trace_id;
  return true;
end;
$function$;

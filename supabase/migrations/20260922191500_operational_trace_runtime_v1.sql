-- G3 Operational Trace Runtime v1
-- EXTEND_EXISTING system_suggestions_law v3 + ai_analyze_contract v2.
-- Canonical physical persistence for the already-approved No-Black-Box root/span contract.
-- Existing ai_token_log / agent_token_costs remain the AI cost lineage; they are linked, not replaced.

begin;

create table if not exists public.op_trace_roots (
  trace_id uuid primary key,
  interaction_id text,
  capability text,
  surface text,
  channel text,
  locale text,
  identity_class text,
  session_ref text,
  subject_ref text,
  availability_ref text,
  entitlement_ref text,
  budget_ref text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint op_trace_roots_outcome_ck check (
    outcome is null or outcome = any (array[
      'success','partial','continuation_required','negative_result','access_filtered',
      'cache_hit','cache_miss','degraded_fallback','cancelled','timeout',
      'provider_error','tool_error','failed_with_reason'
    ])
  ),
  constraint op_trace_roots_time_ck check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.op_trace_spans (
  span_id uuid primary key,
  trace_id uuid not null references public.op_trace_roots(trace_id) on delete cascade,
  parent_span_id uuid,
  kind text not null,
  name text not null,
  capability text,
  owner_ref text,
  plan_ref text,
  intelligence_level text,
  provider text,
  model text,
  model_version text,
  engine_version text,
  tool_version text,
  routing_reason text,
  escalation_reason text,
  fallback_reason text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_ms bigint,
  outcome text,
  output_use text not null default 'not_applicable',
  stop_reason text,
  request_ref text,
  retry_ordinal integer not null default 0,
  continuation_ordinal integer not null default 0,
  resources jsonb not null default '{}'::jsonb,
  provider_native_amount numeric,
  provider_currency text,
  pricing_ref text,
  pricing_effective_at timestamptz,
  fx_rate numeric,
  fx_effective_at timestamptz,
  cost_ils numeric,
  cost_certainty text not null default 'unknown',
  credits_charged numeric,
  customer_price numeric,
  replay jsonb not null default '{}'::jsonb,
  redaction_applied boolean not null default true,
  raw_private_payload_logged boolean not null default false,
  payload_hash text,
  secure_payload_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint op_trace_spans_kind_ck check (
    kind = any (array[
      'root_interaction','router_plan','engine','model_call','tool_call','db_rpc',
      'cache','network','media','storage_index','background_job','synthesis','export'
    ])
  ),
  constraint op_trace_spans_outcome_ck check (
    outcome is null or outcome = any (array[
      'success','partial','continuation_required','negative_result','access_filtered',
      'cache_hit','cache_miss','degraded_fallback','cancelled','timeout',
      'provider_error','tool_error','failed_with_reason'
    ])
  ),
  constraint op_trace_spans_output_use_ck check (
    output_use = any (array['used','partially_used','rejected','superseded','not_applicable'])
  ),
  constraint op_trace_spans_cost_certainty_ck check (
    cost_certainty = any (array['exact','estimated','unknown','not_billable'])
  ),
  constraint op_trace_spans_retry_ck check (retry_ordinal >= 0 and continuation_ordinal >= 0),
  constraint op_trace_spans_duration_ck check (duration_ms is null or duration_ms >= 0),
  constraint op_trace_spans_time_ck check (ended_at is null or ended_at >= started_at),
  constraint op_trace_spans_private_payload_ck check (raw_private_payload_logged = false),
  constraint op_trace_spans_tree_shape_ck check (
    (kind = 'root_interaction' and parent_span_id is null)
    or
    (kind <> 'root_interaction' and parent_span_id is not null)
  ),
  constraint op_trace_spans_not_self_parent_ck check (parent_span_id is null or parent_span_id <> span_id),
  constraint op_trace_spans_identity_uq unique (span_id, trace_id)
);

alter table public.op_trace_spans
  drop constraint if exists op_trace_spans_parent_same_trace_fk;
alter table public.op_trace_spans
  add constraint op_trace_spans_parent_same_trace_fk
  foreign key (parent_span_id, trace_id)
  references public.op_trace_spans(span_id, trace_id)
  deferrable initially immediate;

create unique index if not exists op_trace_one_root_idx
  on public.op_trace_spans(trace_id)
  where kind = 'root_interaction' and parent_span_id is null;
create index if not exists op_trace_spans_trace_started_idx
  on public.op_trace_spans(trace_id, started_at);
create index if not exists op_trace_spans_kind_started_idx
  on public.op_trace_spans(kind, started_at desc);
create index if not exists op_trace_roots_started_idx
  on public.op_trace_roots(started_at desc);
create index if not exists op_trace_roots_capability_started_idx
  on public.op_trace_roots(capability, started_at desc);

alter table public.op_trace_roots enable row level security;
alter table public.op_trace_spans enable row level security;

revoke all on table public.op_trace_roots from public, anon, authenticated;
revoke all on table public.op_trace_spans from public, anon, authenticated;
grant select, insert, update on table public.op_trace_roots to service_role;
grant select, insert, update on table public.op_trace_spans to service_role;

-- Correlate the existing AI cost lineage to canonical operational spans.
alter table public.ai_token_log
  add column if not exists trace_id uuid,
  add column if not exists span_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_token_log'::regclass
      and conname = 'ai_token_log_trace_id_fk'
  ) then
    alter table public.ai_token_log
      add constraint ai_token_log_trace_id_fk
      foreign key (trace_id) references public.op_trace_roots(trace_id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_token_log'::regclass
      and conname = 'ai_token_log_span_id_fk'
  ) then
    alter table public.ai_token_log
      add constraint ai_token_log_span_id_fk
      foreign key (span_id) references public.op_trace_spans(span_id) on delete set null;
  end if;
end $$;

create index if not exists ai_token_log_trace_id_idx on public.ai_token_log(trace_id) where trace_id is not null;
create index if not exists ai_token_log_span_id_idx on public.ai_token_log(span_id) where span_id is not null;
create unique index if not exists ai_token_log_trace_span_uq
  on public.ai_token_log(trace_id, span_id)
  where trace_id is not null and span_id is not null;

-- Preserve the existing cost-view contract and append trace correlation.
create or replace view public.agent_token_costs as
select
  l.id,
  coalesce(l.source, '(unknown)'::text) as agent,
  l.model,
  l.created_at,
  coalesce(l.input_tokens, 0) as input_tokens,
  coalesce(l.output_tokens, 0) as output_tokens,
  coalesce(l.input_tokens, 0)::numeric / 1000000::numeric * p.usd_per_m_input
    + coalesce(l.output_tokens, 0)::numeric / 1000000::numeric * p.usd_per_m_output as cost_usd,
  (
    coalesce(l.input_tokens, 0)::numeric / 1000000::numeric * p.usd_per_m_input
    + coalesce(l.output_tokens, 0)::numeric / 1000000::numeric * p.usd_per_m_output
  ) * coalesce(p.usd_to_ils, 3.7) as cost_ils,
  l.trace_id,
  l.span_id
from public.ai_token_log l
left join public.api_pricing p
  on p.model = l.model
 and l.created_at::date >= p.valid_from
 and l.created_at::date <= coalesce(p.valid_until, '9999-12-31'::date);

revoke all on table public.agent_token_costs from public, anon, authenticated;
grant select on table public.agent_token_costs to service_role;

-- Service-only, idempotent root creation.
create or replace function public.op_trace_begin_v1(
  p_trace_id uuid,
  p_root_span_id uuid,
  p_context jsonb default '{}'::jsonb,
  p_started_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    p_trace_id,
    nullif(p_context->>'interaction_id',''),
    nullif(p_context->>'capability',''),
    nullif(p_context->>'surface',''),
    nullif(p_context->>'channel',''),
    nullif(p_context->>'locale',''),
    nullif(p_context->>'identity_class',''),
    nullif(p_context->>'session_ref',''),
    nullif(p_context->>'subject_ref',''),
    nullif(p_context->>'availability_ref',''),
    nullif(p_context->>'entitlement_ref',''),
    nullif(p_context->>'budget_ref',''),
    coalesce(p_started_at, now())
  )
  on conflict (trace_id) do nothing;

  select s.span_id into v_root_span_id
  from public.op_trace_spans s
  where s.trace_id = p_trace_id and s.kind = 'root_interaction' and s.parent_span_id is null
  limit 1;

  if v_root_span_id is null then
    insert into public.op_trace_spans(
      span_id, trace_id, parent_span_id, kind, name, capability, owner_ref,
      started_at, output_use, cost_certainty, redaction_applied, raw_private_payload_logged
    ) values (
      p_root_span_id, p_trace_id, null, 'root_interaction',
      coalesce(nullif(p_context->>'root_name',''), 'interaction'),
      nullif(p_context->>'capability',''),
      nullif(p_context->>'owner_ref',''),
      coalesce(p_started_at, now()),
      'not_applicable', 'not_billable', true, false
    )
    on conflict (span_id) do nothing;

    select s.span_id into v_root_span_id
    from public.op_trace_spans s
    where s.trace_id = p_trace_id and s.kind = 'root_interaction' and s.parent_span_id is null
    limit 1;
  end if;

  if v_root_span_id is null then
    raise exception 'root span could not be established';
  end if;

  return jsonb_build_object('trace_id', p_trace_id, 'root_span_id', v_root_span_id);
end;
$$;

revoke all on function public.op_trace_begin_v1(uuid,uuid,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.op_trace_begin_v1(uuid,uuid,jsonb,timestamptz) to service_role;

-- Service-only immutable completed child-span record.
create or replace function public.op_trace_record_span_v1(
  p_trace_id uuid,
  p_span_id uuid,
  p_parent_span_id uuid,
  p_kind text,
  p_name text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_outcome text,
  p_detail jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  if v_raw_private then
    raise exception 'raw private payload logging is forbidden';
  end if;

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
    nullif(p_detail->>'capability',''),
    nullif(p_detail->>'owner_ref',''),
    nullif(p_detail->>'plan_ref',''),
    nullif(p_detail->>'intelligence_level',''),
    nullif(p_detail->>'provider',''),
    nullif(p_detail->>'model',''),
    nullif(p_detail->>'model_version',''),
    nullif(p_detail->>'engine_version',''),
    nullif(p_detail->>'tool_version',''),
    nullif(p_detail->>'routing_reason',''),
    nullif(p_detail->>'escalation_reason',''),
    nullif(p_detail->>'fallback_reason',''),
    p_started_at, p_ended_at, v_duration, p_outcome,
    coalesce(nullif(p_detail->>'output_use',''), 'not_applicable'),
    nullif(p_detail->>'stop_reason',''),
    nullif(p_detail->>'request_ref',''),
    coalesce(nullif(p_detail->>'retry_ordinal','')::integer, 0),
    coalesce(nullif(p_detail->>'continuation_ordinal','')::integer, 0),
    coalesce(p_detail->'resources', '{}'::jsonb),
    nullif(p_detail #>> '{cost,providerNativeAmount}','')::numeric,
    nullif(p_detail #>> '{cost,providerCurrency}',''),
    nullif(p_detail #>> '{cost,pricingRef}',''),
    nullif(p_detail #>> '{cost,pricingEffectiveAt}','')::timestamptz,
    nullif(p_detail #>> '{cost,fxRate}','')::numeric,
    nullif(p_detail #>> '{cost,fxEffectiveAt}','')::timestamptz,
    nullif(p_detail #>> '{cost,costIls}','')::numeric,
    coalesce(nullif(p_detail #>> '{cost,certainty}',''), 'unknown'),
    nullif(p_detail #>> '{cost,creditsCharged}','')::numeric,
    nullif(p_detail #>> '{cost,customerPrice}','')::numeric,
    coalesce(p_detail->'replay', '{}'::jsonb),
    coalesce(nullif(p_detail #>> '{privacy,redactionApplied}','')::boolean, true),
    false,
    nullif(p_detail #>> '{privacy,payloadHash}',''),
    nullif(p_detail #>> '{privacy,securePayloadRef}','')
  )
  on conflict (span_id) do nothing;

  return jsonb_build_object('trace_id', p_trace_id, 'span_id', p_span_id);
end;
$$;

revoke all on function public.op_trace_record_span_v1(uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb) from public, anon, authenticated;
grant execute on function public.op_trace_record_span_v1(uuid,uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb) to service_role;

create or replace function public.op_trace_finish_v1(
  p_trace_id uuid,
  p_root_span_id uuid,
  p_outcome text,
  p_ended_at timestamptz default now(),
  p_stop_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started timestamptz;
  v_ended timestamptz := coalesce(p_ended_at, now());
  v_duration bigint;
begin
  select started_at into v_started
  from public.op_trace_spans
  where span_id = p_root_span_id and trace_id = p_trace_id and kind = 'root_interaction';

  if v_started is null then
    return false;
  end if;

  v_duration := greatest(0, floor(extract(epoch from (v_ended - v_started)) * 1000)::bigint);

  update public.op_trace_spans
  set ended_at = coalesce(ended_at, v_ended),
      duration_ms = coalesce(duration_ms, v_duration),
      outcome = coalesce(outcome, p_outcome),
      stop_reason = coalesce(stop_reason, p_stop_reason),
      updated_at = now()
  where span_id = p_root_span_id
    and trace_id = p_trace_id;

  update public.op_trace_roots
  set ended_at = coalesce(ended_at, v_ended),
      outcome = coalesce(outcome, p_outcome),
      updated_at = now()
  where trace_id = p_trace_id;

  return true;
end;
$$;

revoke all on function public.op_trace_finish_v1(uuid,uuid,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.op_trace_finish_v1(uuid,uuid,text,timestamptz,text) to service_role;


-- Attach the existing AI token-log row to the completed span after the cost row exists.
-- This preserves one cost authority: rollup prefers ai_token_log -> agent_token_costs
-- and only falls back to direct span cost when no linked AI row exists.
create or replace function public.op_trace_link_ai_cost_v1(
  p_trace_id uuid,
  p_span_id uuid,
  p_ai_token_log_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = public
as $
begin
  if not exists (
    select 1
    from public.ai_token_log l
    where l.id = p_ai_token_log_id
      and l.trace_id = p_trace_id
      and l.span_id = p_span_id
  ) then
    return false;
  end if;

  update public.op_trace_spans s
  set replay = case
        when s.replay ? 'costLogRef' then s.replay
        else jsonb_set(s.replay, '{costLogRef}', to_jsonb('ai_token_log:' || p_ai_token_log_id::text), true)
      end,
      updated_at = now()
  where s.trace_id = p_trace_id
    and s.span_id = p_span_id;

  return found;
end;
$;

revoke all on function public.op_trace_link_ai_cost_v1(uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function public.op_trace_link_ai_cost_v1(uuid,uuid,bigint) to service_role;

-- Admin/service drill-down. Cost is resolved from the existing AI cost lineage first,
-- then from direct span cost only when no linked AI token log exists, preventing double-count.
create or replace function public.admin_op_trace_v1(p_trace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root jsonb;
  v_spans jsonb;
  v_rollup jsonb;
begin
  if coalesce(auth.role()::text, '') <> 'service_role' then
    if not public.rd_is_admin() then
      raise exception 'forbidden';
    end if;
  end if;

  select to_jsonb(t) into v_root
  from public.op_trace_roots t
  where t.trace_id = p_trace_id;

  if v_root is null then
    return null;
  end if;

  with ai_cost as (
    select
      l.span_id,
      count(*) as linked_ai_calls,
      sum(c.cost_ils) as cost_ils,
      sum(c.cost_usd) as cost_usd,
      count(*) filter (where c.cost_usd is null) as unpriced_calls
    from public.ai_token_log l
    left join public.agent_token_costs c on c.id = l.id
    where l.trace_id = p_trace_id and l.span_id is not null
    group by l.span_id
  ),
  enriched as (
    select
      s.*,
      coalesce(a.linked_ai_calls, 0) as linked_ai_calls,
      a.cost_usd as linked_ai_cost_usd,
      a.cost_ils as linked_ai_cost_ils,
      coalesce(a.unpriced_calls, 0) as linked_ai_unpriced_calls,
      case
        when coalesce(a.linked_ai_calls, 0) > 0 then a.cost_ils
        else s.cost_ils
      end as effective_cost_ils,
      case
        when coalesce(a.linked_ai_calls, 0) > 0 and coalesce(a.unpriced_calls, 0) > 0 then 'unknown'
        when coalesce(a.linked_ai_calls, 0) > 0 then 'exact'
        else s.cost_certainty
      end as effective_cost_certainty
    from public.op_trace_spans s
    left join ai_cost a on a.span_id = s.span_id
    where s.trace_id = p_trace_id
  )
  select coalesce(jsonb_agg(to_jsonb(e) order by e.started_at, e.span_id), '[]'::jsonb)
  into v_spans
  from enriched e;

  with ai_cost as (
    select
      l.span_id,
      count(*) as linked_ai_calls,
      sum(c.cost_ils) as cost_ils,
      count(*) filter (where c.cost_usd is null) as unpriced_calls
    from public.ai_token_log l
    left join public.agent_token_costs c on c.id = l.id
    where l.trace_id = p_trace_id and l.span_id is not null
    group by l.span_id
  ),
  effective as (
    select
      s.span_id,
      case when coalesce(a.linked_ai_calls,0) > 0 then a.cost_ils else s.cost_ils end as cost_ils,
      case
        when coalesce(a.linked_ai_calls,0) > 0 and coalesce(a.unpriced_calls,0) > 0 then 'unknown'
        when coalesce(a.linked_ai_calls,0) > 0 then 'exact'
        else s.cost_certainty
      end as certainty,
      coalesce(a.linked_ai_calls,0) as linked_ai_calls
    from public.op_trace_spans s
    left join ai_cost a on a.span_id = s.span_id
    where s.trace_id = p_trace_id
  )
  select jsonb_build_object(
    'span_count', count(*),
    'known_cost_ils', round(coalesce(sum(cost_ils),0)::numeric, 6),
    'has_unknown_cost', coalesce(bool_or(certainty = 'unknown'), false),
    'linked_ai_calls', coalesce(sum(linked_ai_calls),0)
  )
  into v_rollup
  from effective;

  return jsonb_build_object('trace', v_root, 'spans', v_spans, 'rollup', v_rollup);
end;
$$;

revoke all on function public.admin_op_trace_v1(uuid) from public, anon;
grant execute on function public.admin_op_trace_v1(uuid) to authenticated, service_role;

create or replace function public.admin_op_trace_list_v1(
  p_days integer default 7,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if coalesce(auth.role()::text, '') <> 'service_role' then
    if not public.rd_is_admin() then
      raise exception 'forbidden';
    end if;
  end if;

  with roots as (
    select t.*
    from public.op_trace_roots t
    where t.started_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days,7),90)))
    order by t.started_at desc
    limit greatest(1, least(coalesce(p_limit,100),500))
  ),
  span_counts as (
    select s.trace_id, count(*) as span_count
    from public.op_trace_spans s
    join roots r on r.trace_id = s.trace_id
    group by s.trace_id
  ),
  ai_cost as (
    select l.trace_id,
           count(*) as linked_ai_calls,
           sum(c.cost_ils) as cost_ils,
           count(*) filter (where c.cost_usd is null) as unpriced_calls
    from public.ai_token_log l
    join roots r on r.trace_id = l.trace_id
    left join public.agent_token_costs c on c.id = l.id
    where l.trace_id is not null
    group by l.trace_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'trace_id', r.trace_id,
    'started_at', r.started_at,
    'ended_at', r.ended_at,
    'capability', r.capability,
    'surface', r.surface,
    'channel', r.channel,
    'identity_class', r.identity_class,
    'outcome', r.outcome,
    'span_count', coalesce(sc.span_count,0),
    'linked_ai_calls', coalesce(ac.linked_ai_calls,0),
    'linked_ai_cost_ils', case when coalesce(ac.unpriced_calls,0) > 0 then null else ac.cost_ils end,
    'cost_certainty', case
      when coalesce(ac.linked_ai_calls,0) = 0 then 'unknown'
      when coalesce(ac.unpriced_calls,0) > 0 then 'unknown'
      else 'exact'
    end
  ) order by r.started_at desc), '[]'::jsonb)
  into v_out
  from roots r
  left join span_counts sc on sc.trace_id = r.trace_id
  left join ai_cost ac on ac.trace_id = r.trace_id;

  return v_out;
end;
$$;

revoke all on function public.admin_op_trace_list_v1(integer,integer) from public, anon;
grant execute on function public.admin_op_trace_list_v1(integer,integer) to authenticated, service_role;

comment on table public.op_trace_roots is
  'Canonical G3 operational root traces under system_suggestions_law v3. This is operational observability, not research truth, behavioral analytics attribution, or cost authority.';
comment on table public.op_trace_spans is
  'Canonical G3 operational span tree. Links to owner-native logs by correlation IDs; raw private payload logging is forbidden in v1.';
comment on column public.ai_token_log.trace_id is
  'Optional correlation to canonical operational trace; historical rows remain NULL.';
comment on column public.ai_token_log.span_id is
  'Optional correlation to canonical operational model/tool span; historical rows remain NULL.';

commit;

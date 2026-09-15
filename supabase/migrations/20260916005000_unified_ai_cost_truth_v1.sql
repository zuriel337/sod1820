-- UNIFIED_AI_COST_TRUTH_V1
-- EXTEND_EXISTING ai_analyze_contract v2 + raziel_routing_law v2.
-- One cost path: ai_token_log -> api_pricing (effective-dated) -> agent_token_costs -> admin_ai_tokens.
-- Provider/model/source/kind are reporting dimensions only; provider/model never become truth owners.

create or replace function public._ai_provider(p_model text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_model,'')) like 'claude-%' then 'anthropic'
    when lower(coalesce(p_model,'')) like 'gemini-%' then 'google'
    when lower(coalesce(p_model,'')) like 'gpt-%' then 'openai'
    else 'unknown'
  end;
$$;

-- Compatibility helper only. Historical aggregation must use agent_token_costs,
-- which resolves the effective price at each call date. Unknown models return NULL,
-- never an invented Haiku/Sonnet fallback.
create or replace function public._ai_price(p_model text)
returns table(in_price numeric, out_price numeric)
language sql
stable
set search_path = public
as $$
  select p.usd_per_m_input, p.usd_per_m_output
  from public.api_pricing p
  where p.model = p_model
    and current_date >= p.valid_from
    and current_date <= coalesce(p.valid_until, date '9999-12-31')
  order by p.valid_from desc
  limit 1;
$$;

create or replace function public.admin_ai_tokens(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_total jsonb;
  v_by_source jsonb;
  v_by_model jsonb;
  v_by_provider jsonb;
  v_by_kind jsonb;
begin
  with base as (
    select c.id, c.agent, c.model, c.created_at, c.input_tokens, c.output_tokens,
           c.cost_usd, c.cost_ils, l.kind, public._ai_provider(c.model) as provider
    from public.agent_token_costs c
    join public.ai_token_log l on l.id = c.id
    where c.created_at >= v_since
  )
  select jsonb_build_object(
           'calls', count(*),
           'input_tokens', coalesce(sum(input_tokens), 0),
           'output_tokens', coalesce(sum(output_tokens), 0),
           'total_tokens', coalesce(sum(input_tokens + output_tokens), 0),
           'cost_usd', round(coalesce(sum(cost_usd), 0)::numeric, 4),
           'cost_ils', round(coalesce(sum(cost_ils), 0)::numeric, 4),
           'priced_calls', count(*) filter (where cost_usd is not null),
           'unpriced_calls', count(*) filter (where cost_usd is null),
           'pricing_complete', count(*) filter (where cost_usd is null) = 0
         )
  into v_total
  from base;

  with base as (
    select c.*, l.kind, public._ai_provider(c.model) as provider
    from public.agent_token_costs c
    join public.ai_token_log l on l.id = c.id
    where c.created_at >= v_since
  ), grouped as (
    select agent as key,
           count(*) as calls,
           coalesce(sum(input_tokens),0) as input_tokens,
           coalesce(sum(output_tokens),0) as output_tokens,
           sum(cost_usd) as cost_usd,
           sum(cost_ils) as cost_ils,
           count(*) filter (where cost_usd is null) as unpriced_calls
    from base group by agent
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'source', key, 'calls', calls, 'input_tokens', input_tokens,
           'output_tokens', output_tokens, 'total_tokens', input_tokens + output_tokens,
           'cost_usd', case when cost_usd is null then null else round(cost_usd::numeric,4) end,
           'cost_ils', case when cost_ils is null then null else round(cost_ils::numeric,4) end,
           'unpriced_calls', unpriced_calls
         ) order by input_tokens + output_tokens desc), '[]'::jsonb)
  into v_by_source from grouped;

  with base as (
    select c.*, l.kind, public._ai_provider(c.model) as provider
    from public.agent_token_costs c
    join public.ai_token_log l on l.id = c.id
    where c.created_at >= v_since
  ), grouped as (
    select model as key, public._ai_provider(model) as provider,
           count(*) as calls, coalesce(sum(input_tokens),0) as input_tokens,
           coalesce(sum(output_tokens),0) as output_tokens,
           sum(cost_usd) as cost_usd, sum(cost_ils) as cost_ils,
           count(*) filter (where cost_usd is null) as unpriced_calls
    from base group by model
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'model', key, 'provider', provider, 'calls', calls,
           'input_tokens', input_tokens, 'output_tokens', output_tokens,
           'total_tokens', input_tokens + output_tokens,
           'cost_usd', case when cost_usd is null then null else round(cost_usd::numeric,4) end,
           'cost_ils', case when cost_ils is null then null else round(cost_ils::numeric,4) end,
           'unpriced_calls', unpriced_calls
         ) order by input_tokens + output_tokens desc), '[]'::jsonb)
  into v_by_model from grouped;

  with base as (
    select c.*, l.kind, public._ai_provider(c.model) as provider
    from public.agent_token_costs c
    join public.ai_token_log l on l.id = c.id
    where c.created_at >= v_since
  ), grouped as (
    select provider as key, count(*) as calls,
           coalesce(sum(input_tokens),0) as input_tokens,
           coalesce(sum(output_tokens),0) as output_tokens,
           sum(cost_usd) as cost_usd, sum(cost_ils) as cost_ils,
           count(*) filter (where cost_usd is null) as unpriced_calls
    from base group by provider
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'provider', key, 'calls', calls,
           'input_tokens', input_tokens, 'output_tokens', output_tokens,
           'total_tokens', input_tokens + output_tokens,
           'cost_usd', case when cost_usd is null then null else round(cost_usd::numeric,4) end,
           'cost_ils', case when cost_ils is null then null else round(cost_ils::numeric,4) end,
           'unpriced_calls', unpriced_calls
         ) order by input_tokens + output_tokens desc), '[]'::jsonb)
  into v_by_provider from grouped;

  with base as (
    select c.*, l.kind, public._ai_provider(c.model) as provider
    from public.agent_token_costs c
    join public.ai_token_log l on l.id = c.id
    where c.created_at >= v_since
  ), grouped as (
    select coalesce(kind,'(unknown)') as key, count(*) as calls,
           coalesce(sum(input_tokens),0) as input_tokens,
           coalesce(sum(output_tokens),0) as output_tokens,
           sum(cost_usd) as cost_usd, sum(cost_ils) as cost_ils,
           count(*) filter (where cost_usd is null) as unpriced_calls
    from base group by coalesce(kind,'(unknown)')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', key, 'calls', calls,
           'input_tokens', input_tokens, 'output_tokens', output_tokens,
           'total_tokens', input_tokens + output_tokens,
           'cost_usd', case when cost_usd is null then null else round(cost_usd::numeric,4) end,
           'cost_ils', case when cost_ils is null then null else round(cost_ils::numeric,4) end,
           'unpriced_calls', unpriced_calls
         ) order by input_tokens + output_tokens desc), '[]'::jsonb)
  into v_by_kind from grouped;

  return jsonb_build_object(
    'days', p_days,
    'total', v_total,
    'by_source', v_by_source,
    'by_model', v_by_model,
    'by_provider', v_by_provider,
    'by_kind', v_by_kind
  );
end;
$$;

comment on function public._ai_provider(text) is
  'Reporting-only provider resolver for AI cost observability. Unknown stays unknown.';
comment on function public.admin_ai_tokens(integer) is
  'Unified AI cost summary from effective-dated agent_token_costs with additive provider/model/source/kind breakdown and explicit unpriced-call visibility.';

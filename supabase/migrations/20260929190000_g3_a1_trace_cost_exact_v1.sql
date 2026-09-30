-- SOD1820 — G3 A1: effective cost on the Operational Trace span (No Black Box).
--
-- Owner: system_suggestions_law v5 (trace/cost/routing observability) over the existing
-- cost owners. EXTEND_EXISTING only: this creates no cost store, no second pricing
-- authority and no telemetry system 2. `api_pricing` remains the single rate-card owner
-- and `ai_token_log` remains the usage record; this migration only resolves one against
-- the other and records the result on the span that already points at that log row.
--
-- WHY: op_trace_link_ai_cost_v1 already validated the (trace_id, span_id, ai_token_log_id)
-- linkage and wrote a `costLogRef` pointer into op_trace_spans.replay, but it never
-- populated the cost columns. Every model_call span therefore carried
-- cost_certainty='unknown', so the Roadmap's declared G3 blocker — an admin cost/usage
-- aggregate that drills down to root trace and individual span — had no priced span to
-- drill to. The edge caller (supabase/functions/ai-analyze/index.ts) is already wired and
-- is NOT changed by this migration.
--
-- COST CERTAINTY SEMANTICS (deliberate, and open to Human Gate revision):
--   exact         usage is provider-reported (ai_token_log token counts) AND an effective
--                 api_pricing row applies for that model at the log timestamp.
--   unknown       no effective pricing row. Amounts stay NULL — never invented as zero.
--   not_billable  no billable usage recorded on the log row.
-- This treats the recorded rate card as pricing provenance, not as an internal estimate.
-- If provider invoices are ever ingested, that becomes the stronger source and this
-- mapping should be revisited under the Truth/Human Gate boundary.
--
-- Idempotent: a span already carrying cost_certainty='exact' is never recomputed or
-- overwritten, so re-running is safe and re-linking cannot silently restate a cost.

create or replace function public.op_trace_link_ai_cost_v1(
  p_trace_id uuid,
  p_span_id uuid,
  p_ai_token_log_id bigint
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_log        public.ai_token_log%rowtype;
  v_price      public.api_pricing%rowtype;
  v_existing   text;
  v_in         bigint;
  v_out        bigint;
  v_usd        numeric;
  v_certainty  text;
  v_apply      boolean;
begin
  -- Same fail-closed linkage check as before: the log row must already claim this span.
  select l.* into v_log
  from public.ai_token_log l
  where l.id = p_ai_token_log_id
    and l.trace_id = p_trace_id
    and l.span_id = p_span_id;

  if not found then
    return false;
  end if;

  select s.cost_certainty into v_existing
  from public.op_trace_spans s
  where s.trace_id = p_trace_id
    and s.span_id = p_span_id;

  if not found then
    return false;
  end if;

  -- Idempotent: an already-exact span is never recomputed or restated. The pointer write
  -- below still runs, so a valid re-link keeps returning true rather than reporting failure.
  v_apply := coalesce(v_existing, '') <> 'exact';

  v_in  := greatest(coalesce(v_log.input_tokens, 0), 0);
  v_out := greatest(coalesce(v_log.output_tokens, 0), 0);

  -- Effective rate card for this model at the time the usage was recorded.
  select p.* into v_price
  from public.api_pricing p
  where p.model = v_log.model
    and v_log.created_at::date >= p.valid_from
    and (p.valid_until is null or v_log.created_at::date <= p.valid_until)
  order by p.valid_from desc
  limit 1;

  if v_in = 0 and v_out = 0 then
    v_certainty := 'not_billable';
  elsif v_price.id is null then
    v_certainty := 'unknown';           -- never fabricate a price
  else
    v_certainty := 'exact';
    v_usd := (v_in::numeric  / 1000000) * v_price.usd_per_m_input
           + (v_out::numeric / 1000000) * v_price.usd_per_m_output;
  end if;

  update public.op_trace_spans s
  set
      -- preserve the existing pointer behavior verbatim
      replay = case
                 when s.replay ? 'costLogRef' then s.replay
                 else jsonb_set(s.replay, '{costLogRef}',
                                to_jsonb('ai_token_log:' || p_ai_token_log_id::text), true)
               end,
      provider_native_amount = case when v_apply and v_certainty = 'exact'
                                    then round(v_usd, 6) else s.provider_native_amount end,
      provider_currency      = case when v_apply and v_certainty = 'exact'
                                    then 'USD' else s.provider_currency end,
      pricing_ref            = case when v_apply and v_certainty = 'exact'
                                    then v_price.id::text else s.pricing_ref end,
      pricing_effective_at   = case when v_apply and v_certainty = 'exact'
                                    then v_price.valid_from::timestamptz
                                    else s.pricing_effective_at end,
      fx_rate                = case when v_apply and v_certainty = 'exact'
                                    then v_price.usd_to_ils else s.fx_rate end,
      fx_effective_at        = case when v_apply and v_certainty = 'exact'
                                    then v_price.valid_from::timestamptz
                                    else s.fx_effective_at end,
      cost_ils               = case when v_apply and v_certainty = 'exact'
                                    then round(v_usd * v_price.usd_to_ils, 6)
                                    else s.cost_ils end,
      cost_certainty         = case when v_apply then v_certainty else s.cost_certainty end,
      model                  = coalesce(s.model, v_log.model),
      resources              = case when v_apply
                                    then coalesce(s.resources, '{}'::jsonb)
                                         || jsonb_build_object('input_tokens', v_in,
                                                               'output_tokens', v_out)
                                    else s.resources end,
      updated_at             = now()
  where s.trace_id = p_trace_id
    and s.span_id  = p_span_id;

  return found;
end;
$function$;

comment on function public.op_trace_link_ai_cost_v1(uuid, uuid, bigint) is
  'G3 A1 — links an op_trace_spans row to its ai_token_log usage AND resolves effective cost from the api_pricing rate card (exact / unknown / not_billable). EXTEND_EXISTING: no cost store, no second pricing authority. Idempotent; an exact span is never restated.';

-- ---------------------------------------------------------------------------
-- Backfill: additive only. Fills cost columns on model_call spans that already
-- have a joinable ai_token_log row. Touches no other column, deletes nothing,
-- and skips any span already marked exact.
-- ---------------------------------------------------------------------------
update public.op_trace_spans s
set provider_native_amount = round(c.usd, 6),
    provider_currency      = 'USD',
    pricing_ref            = c.pricing_id::text,
    pricing_effective_at   = c.valid_from::timestamptz,
    fx_rate                = c.usd_to_ils,
    fx_effective_at        = c.valid_from::timestamptz,
    cost_ils               = round(c.usd * c.usd_to_ils, 6),
    cost_certainty         = 'exact',
    model                  = coalesce(s.model, c.model),
    resources              = coalesce(s.resources, '{}'::jsonb)
                             || jsonb_build_object('input_tokens', c.in_tok,
                                                   'output_tokens', c.out_tok),
    updated_at             = now()
from (
  select l.trace_id, l.span_id, l.model,
         greatest(coalesce(l.input_tokens, 0), 0)  as in_tok,
         greatest(coalesce(l.output_tokens, 0), 0) as out_tok,
         p.id as pricing_id, p.valid_from, p.usd_to_ils,
         (greatest(coalesce(l.input_tokens, 0), 0)::numeric  / 1000000) * p.usd_per_m_input
       + (greatest(coalesce(l.output_tokens, 0), 0)::numeric / 1000000) * p.usd_per_m_output as usd
  from public.ai_token_log l
  join lateral (
    select p.* from public.api_pricing p
    where p.model = l.model
      and l.created_at::date >= p.valid_from
      and (p.valid_until is null or l.created_at::date <= p.valid_until)
    order by p.valid_from desc
    limit 1
  ) p on true
  where l.trace_id is not null
    and l.span_id is not null
    and (coalesce(l.input_tokens, 0) > 0 or coalesce(l.output_tokens, 0) > 0)
) c
where s.trace_id = c.trace_id
  and s.span_id  = c.span_id
  and s.kind     = 'model_call'
  and coalesce(s.cost_certainty, '') <> 'exact';

-- SOD1820 #1457: REVIEW ONLY — admin AI cost cohorts for Control Plane 2029.
-- NOT APPLIED. Requires code/security/Privacy & owner SHA/SQL approval before live use.
-- Pure aggregation of existing ai_token_log + agent_token_costs, not a new cost/identity store.
-- All money from internal rated AI ledger. Not vendor invoice or Vercel/Supabase expense.
begin;
create or replace function public.admin_ai_cost_cohorts_v1(p_days integer default 30)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $function$
declare
  v_uid uuid := auth.uid();
  v_start timestamptz;
  v_total jsonb;
  v_segments jsonb;
  v_sources jsonb;
  v_models jsonb;
  v_daily jsonb;
begin
  if v_uid is null or not exists (
    select 1 from public.users u where u.id = v_uid and u.role = 'admin'
  ) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'invalid bounded range' using errcode = '22023';
  end if;
  v_start := now() - make_interval(days => p_days);

  -- Scope: source token log with one optional per-call cost row.
  -- Verification of paying customer is based on settled payment evidence for
  -- that SAME principal at call time, not an editable tier or profile claim.
  with input as (
    select l.id, l.created_at, l.source, l.model, l.kind, l.input_tokens, l.output_tokens,
           c.cost_ils, c.cost_usd,
           case
             -- The single site owner has multiple site-admin accounts.
             -- Cohort grouping is based on the owner-approved admin-role policy;
             -- this is NOT an identity merge or independent account-link proof.
             when l.user_id is not null and u.role = 'admin' then 'owner_accounts'
             -- Community moderators have a distinct, restricted role and are
             -- never treated as site owners merely because they moderate.
             when l.user_id is not null and u.id is not null
               and u.community_moderator is true then 'community_moderator'
             when l.user_id is not null and u.id is not null and (
               exists (
                 select 1 from public.membership_subscription_pilots p
                 join public.membership_subscription_pilot_charges h on h.subscription_id = p.id
                 where p.user_id = l.user_id and p.status = 'active'
                   and h.status = 'approved' and h.response_code = 0
                   and h.settled_at is not null and h.settled_at <= l.created_at
                   and (p.current_period_start is null or l.created_at >= p.current_period_start)
                   and (p.current_period_end is null or l.created_at < p.current_period_end)
               )
               or exists (
                 select 1 from public.payment_requests r
                 where r.user_id = l.user_id and r.status = 'approved'
                   and r.cardcom_verified_at is not null and r.cardcom_verified_at <= l.created_at
               )
             ) then 'verified_paying_customer'
             when l.user_id is not null and u.id is not null then 'registered_customer_unknown'
             when l.user_id is null and nullif(btrim(l.visitor),'') is not null then 'anonymous_visitor'
             else 'unattributed_unknown'
           end as segment
    from public.ai_token_log l
    left join public.agent_token_costs c on c.id = l.id
    left join public.users u on u.id = l.user_id
    where l.created_at >= v_start and l.created_at < now()
  ), total as (
    select count(*) as calls, count(*) filter (where cost_ils is null) as unpriced_calls,
           count(*) filter (where segment='unattributed_unknown') as unattributed_calls,
           count(*) filter (where segment='unattributed_unknown' and cost_ils is not null) as unattributed_priced_calls,
           round(coalesce(sum(cost_ils),0),4) as cost_ils
    from input
  ), by_segment as (
    select segment,count(*) as calls, count(*) filter (where cost_ils is null) as unpriced_calls,
           round(coalesce(sum(cost_ils),0),4) as cost_ils
    from input group by segment
  ), by_source as (
    select coalesce(source,'UNKNOWN') source, count(*) calls,
           count(*) filter (where cost_ils is null) unpriced_calls,
           round(coalesce(sum(cost_ils),0),4) cost_ils
    from input group by coalesce(source,'UNKNOWN')
  ), by_model as (
    select coalesce(model,'UNKNOWN') model,count(*) calls,
           count(*) filter (where cost_ils is null) unpriced_calls,
           round(coalesce(sum(cost_ils),0),4) cost_ils
    from input group by coalesce(model,'UNKNOWN')
  ), by_day as (
    select (created_at at time zone 'Asia/Jerusalem')::date day,
           count(*) calls, round(coalesce(sum(cost_ils),0),4) cost_ils
    from input group by (created_at at time zone 'Asia/Jerusalem')::date
  )
  select jsonb_build_object(
    'v',1, 'from',v_start, 'to',now(), 'pricing_basis','internal_ai_token_ledger',
    'not_invoice',true,'includes_infrastructure',false,
    'total',(select to_jsonb(t) from total t),
    'by_segment',coalesce((select jsonb_agg(to_jsonb(s) order by s.segment) from by_segment s),'[]'::jsonb),
    'by_source',coalesce((select jsonb_agg(to_jsonb(s) order by s.cost_ils desc) from by_source s),'[]'::jsonb),
    'by_model',coalesce((select jsonb_agg(to_jsonb(s) order by s.cost_ils desc) from by_model s),'[]'::jsonb),
    'by_day',coalesce((select jsonb_agg(to_jsonb(s) order by s.day) from by_day s),'[]'::jsonb),
    'cohort_scope','owner_accounts_community_moderator_paid_registered_visitor_unattributed',
    'owner_attribution_basis','owner_asserted_site_admin_role_not_verified_account_merge',
    'unknown_not_zero',true
  ) into v_total;
  return v_total;
end
$function$;

-- No public/anonymous execution. Function itself independently verifies admin.
revoke all on function public.admin_ai_cost_cohorts_v1(integer) from public, anon, authenticated;
grant execute on function public.admin_ai_cost_cohorts_v1(integer) to authenticated;
commit;

-- REVIEW / ACCEPTANCE REQUIRED BEFORE APPLICATION:
-- 1) Non-admin authenticated, anonymous and service call abuse must fail closed.
-- 2) For 1/7/30/90 days, SUM(by_segment.cost_ils) agrees with total priced ledger.
-- 3) The sole site owner has multiple admin-role accounts; group their *costs*,
--    not identities, under owner_accounts. Do not use this SQL to merge accounts
--    or to infer future admin-role accounts belong to the same owner without review.
--    Community moderators must remain community_moderator, not owner_accounts.
-- 4) No user IDs, visitor tokens, emails, names, raw messages or payment details returned.
-- 5) Missing settled payment proof never infers a paying customer from tier or pilot status alone.
-- 6) Unknown and unpriced calls shown separately; no fake zero.
-- 7) Read-only and bounded; measure indexes, latency, no new client store.
-- 8) Existing Supabase/Vercel/Storage bills are presented on their own data sources.

CREATE OR REPLACE FUNCTION public.fn_raziel_research_intel(p_number integer DEFAULT NULL::integer, p_period text DEFAULT '7d'::text, p_limit integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- #1461 / owner decision 20.11.2026: demand comes ONLY from Traffic Intelligence over the
-- canonical events table (fn_ti_entity_demand_clean_composition -> fn_human_entrances).
-- visitor_events (number views frozen since 2026-11-09) and search_log (no consent, frozen)
-- no longer feed this reader. Demand, trend and research-strength stay separate signals;
-- clean human / unknown / bot stay separate axes; a silent source is "unavailable", not 0.
-- Signature and top-level shape are unchanged for fn_raziel_research_intel_scoped.
with params as (
  select case p_period when '24h' then 1 when '30d' then 30 else 7 end as days,
         case p_period when '24h' then '24h' when '30d' then '30d' else '7d' end as pk,
         (now() at time zone 'Asia/Jerusalem')::date as d_to
),
win as (
  select pk, days, d_to, d_to - (days - 1) as d_from,
         d_to - (2*days - 1) as p_from, d_to - days as p_to from params
),
-- Source health: the TI writer must have measured page views in the window.
health as (
  select exists(select 1 from public.events e, win w
                where e.surface='page' and e.event_type='view'
                  and e.ts >= w.d_from::timestamp at time zone 'Asia/Jerusalem') as measured
),
demand as (
  select c.entity_key::int as n,
         sum(c.clean_human_visits)::int as human, sum(c.clean_unknown_visits)::int as unknown,
         sum(c.clean_bot_visits)::int as bot
  from win w, public.fn_ti_entity_demand_clean_composition(w.d_from, w.d_to) c
  where c.entity_type='number' and c.entity_key ~ '^\d{1,5}$'
    and (p_number is null or c.entity_key = p_number::text)
  group by c.entity_key::int
),
prev as (
  select c.entity_key::int as n, sum(c.clean_human_visits + c.clean_unknown_visits)::int as visits
  from win w, public.fn_ti_entity_demand_clean_composition(w.p_from, w.p_to) c
  where c.entity_type='number' and c.entity_key ~ '^\d{1,5}$'
    and (p_number is null or c.entity_key = p_number::text)
  group by c.entity_key::int
),
-- Explicit 2029 searches that carried this number (activity_2029, content-free props).
searches as (
  select (e.props->>'number')::int as n, count(*) as c, count(distinct e.session_id) as s
  from public.events e, win w
  where e.surface='activity_2029' and e.event_type='search' and not e.is_bot
    and e.props ? 'number' and e.ts >= w.d_from::timestamp at time zone 'Asia/Jerusalem'
    and (p_number is null or e.props->>'number' = p_number::text)
  group by 1
),
base as (
  select d.n, d.human + d.unknown as visits, d.human, d.unknown, d.bot,
    -- Each TI visit is a distinct session: the floor equals >=10 events and >=5 sessions.
    case when coalesce(pr.visits,0) >= 10 then pr.visits end as prev_visits,
    case when s.c >= 10 and s.s >= 5 then s.c end as searches
  from demand d
  left join prev pr on pr.n = d.n
  left join searches s on s.n = d.n
  where d.human + d.unknown >= 10
),
scored as (
  select b.*,
    (select max(group_size) from convergences c where c.value=b.n) as conv_max,
    (select count(*) from convergences c where c.value=b.n) as conv_rows,
    (select count(*) from gematria_words g where g.ragil=b.n and public.gematria_public_word_eligible(g.id)) as vexpr,
    exists(select 1 from nodes nd where nd.type='number' and nd.label=b.n::text) as has_node,
    exists(select 1 from decision_ledger dl where dl.subject_ref=b.n::text and dl.status='pending') as pending_cand
  from base b
),
sig as (
  select s.*,
    case when s.visits>=20 then 'high' else 'medium' end as demand_level,
    case when s.prev_visits is null then 'insufficient_data'
         when s.visits > s.prev_visits*1.25 then 'rising'
         when s.visits < s.prev_visits*0.75 then 'falling' else 'stable' end as trend,
    round(s.visits::numeric / nullif(s.prev_visits,0), 2) as trend_ratio,
    case when coalesce(s.vexpr,0)>=25 or coalesce(s.conv_max,0)>=40 then 'high' when coalesce(s.vexpr,0)>=8 or coalesce(s.conv_max,0)>=12 then 'medium' else 'low' end as strength_level
  from scored s
),
classed as (
  select sig.*,
    case
      when demand_level='high' then 'proven_demand'
      when trend='rising' then 'rising_interest'
      when strength_level in ('high','medium') then 'research_strength'
      else 'insufficient_data'
    end as classification
  from sig
),
meta as (
  select w.pk, (select measured from health) as measured from win w
)
select case
when not (select measured from meta) then
  jsonb_build_object('mode', case when p_number is null then 'top' else 'number' end,
    'period',(select pk from meta),'aggregate_only',true,'generated_at',now(),
    'number',p_number,'source_state','unavailable','classification','insufficient_data',
    'note','Traffic Intelligence has no measured page views in this window; demand is unavailable, not zero.',
    'user_behavior_ne_canon',true)
when p_number is not null then
  coalesce((select jsonb_build_object(
     'mode','number','period',(select pk from meta),'aggregate_only',true,'generated_at',now(),
     'source_state','measured','number', c.n,
     'demand', jsonb_build_object('level',c.demand_level,'views',c.visits,'unique_users',null,
        'sessions',c.visits,'clean_human',c.human,'clean_unknown',c.unknown,'clean_bot',c.bot,
        'searches',c.searches,'source','traffic_intelligence:fn_ti_entity_demand_clean_composition',
        'unit','landing_sessions','period',(select pk from meta)),
     'trend', jsonb_build_object('value',c.trend,'ratio',c.trend_ratio,'current',c.visits,'previous',c.prev_visits,'comparison_period','prior_'||(select pk from meta)),
     'research_strength', jsonb_build_object('level',c.strength_level,'verified_expressions',c.vexpr,'max_convergence_group',c.conv_max,'convergence_rows',c.conv_rows,'has_anchor_node',c.has_node,'pending_candidate',c.pending_cand,'source','convergences+gematria_words(public)+nodes'),
     'classification', c.classification,
     'recommendation_reason',
        case c.classification
          when 'proven_demand' then 'ביקוש מדוד ב־Traffic Intelligence — '||c.visits||' כניסות (אדם '||c.human||' · לא ידוע '||c.unknown||')'
          when 'rising_interest' then 'עניין עולה — '||coalesce(c.trend_ratio::text,'—')||'x מול התקופה הקודמת'
          when 'research_strength' then 'חוזק מחקרי — '||coalesce(c.vexpr,0)||' ביטויים ציבוריים · התכנסות עד '||coalesce(c.conv_max,0)||' (ללא הוכחת ביקוש ציבורי)'
          else 'אין מספיק נתוני ביקוש; אפשר לדרג לפי חוזק מחקרי בלבד — לא לקרוא לזה פופולריות'
        end,
     'user_behavior_ne_canon', true)
   from classed c limit 1),
   jsonb_build_object('mode','number','period',(select pk from meta),'aggregate_only',true,'generated_at',now(),
     'source_state','measured','number',p_number,'classification','insufficient_data',
     'suppressed','below_privacy_floor','user_behavior_ne_canon',true))
else
  jsonb_build_object(
    'mode','top','period',(select pk from meta),'aggregate_only',true,'generated_at',now(),
    'source_state','measured',
    'note','ממוין לפי ביקוש מדוד (כניסות ב־Traffic Intelligence). Demand · Trend · Research-Strength = שלושה אותות נפרדים; Unknown נספר בנפרד.',
    'signals', coalesce((select jsonb_agg(jsonb_build_object(
       'number', c.n,
       'demand', jsonb_build_object('level',c.demand_level,'views',c.visits,'unique_users',null,'sessions',c.visits,'clean_human',c.human,'clean_unknown',c.unknown,'searches',c.searches),
       'trend', c.trend, 'trend_ratio', c.trend_ratio,
       'research_strength', jsonb_build_object('level',c.strength_level,'verified_expressions',c.vexpr,'max_convergence_group',c.conv_max),
       'classification', c.classification) order by c.visits desc, c.n)
     from (select * from classed order by visits desc, n limit greatest(least(p_limit,50),1)) c), '[]'::jsonb)
  )
end
$function$

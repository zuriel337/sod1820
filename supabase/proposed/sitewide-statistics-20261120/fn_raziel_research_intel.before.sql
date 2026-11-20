CREATE OR REPLACE FUNCTION public.fn_raziel_research_intel(p_number integer DEFAULT NULL::integer, p_period text DEFAULT '7d'::text, p_limit integer DEFAULT 8)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with params as (
  select case p_period when '24h' then interval '1 day' when '30d' then interval '30 days' else interval '7 days' end as cur,
         case p_period when '24h' then '24h' when '30d' then '30d' else '7d' end as pk,
         now() as nowts
),
demand as (
  select ve.slug::int as n,
    count(*) filter (where ve.event_type='view') as views,
    count(distinct ve.visitor_id) as uu
  from visitor_events ve, params p
  where ve.section='number' and ve.slug ~ '^\d{1,5}$'
    and ve.created_at > p.nowts - p.cur
    and (p_number is null or ve.slug = p_number::text)
  group by ve.slug::int
),
prev as (
  select ve.slug::int as n, count(*) filter (where ve.event_type='view') as views
  from visitor_events ve, params p
  where ve.section='number' and ve.slug ~ '^\d{1,5}$'
    and ve.created_at between p.nowts - 2*p.cur and p.nowts - p.cur
    and (p_number is null or ve.slug = p_number::text)
  group by ve.slug::int
),
searches as (
  select (sl.value::text)::int as n, count(*) c
  from search_log sl, params p
  where sl.value is not null and sl.value::text ~ '^\d{1,5}$'
    and sl.created_at > p.nowts - p.cur
    and (p_number is null or sl.value::text = p_number::text)
  group by (sl.value::text)::int
),
base as (
  select coalesce(d.n, s.n) as n,
    coalesce(d.views,0) as views, coalesce(d.uu,0) as uu,
    coalesce(pr.views,0) as prev_views, coalesce(s.c,0) as searches
  from demand d
  full join searches s on s.n = d.n
  left join prev pr on pr.n = coalesce(d.n, s.n)
),
scored as (
  select b.*,
    (select max(group_size) from convergences c where c.value=b.n) as conv_max,
    (select count(*) from convergences c where c.value=b.n) as conv_rows,
    (select count(*) from gematria_words g where g.ragil=b.n and g.is_verified) as vexpr,
    exists(select 1 from nodes nd where nd.type='number' and nd.label=b.n::text) as has_node,
    exists(select 1 from decision_ledger dl where dl.subject_ref=b.n::text and dl.status='pending') as pending_cand
  from base b
),
sig as (
  select s.*,
    case when s.views>=20 and s.uu>=12 then 'high' when s.views>=8 and s.uu>=5 then 'medium' when (s.views+s.searches)>=1 then 'low' else 'none' end as demand_level,
    case when s.prev_views=0 and s.views>0 then 'new' when s.views > s.prev_views*1.25 then 'rising' when s.views < s.prev_views*0.75 then 'falling' when s.views>0 then 'stable' else 'none' end as trend,
    round(s.views::numeric / nullif(s.prev_views,0), 2) as trend_ratio,
    case when coalesce(s.vexpr,0)>=25 or coalesce(s.conv_max,0)>=40 then 'high' when coalesce(s.vexpr,0)>=8 or coalesce(s.conv_max,0)>=12 then 'medium' else 'low' end as strength_level
  from scored s
),
classed as (
  select sig.*,
    case
      when demand_level='high' then 'proven_demand'
      when trend in ('rising','new') and (demand_level in ('medium','high') or strength_level in ('high','medium')) then 'rising_interest'
      when strength_level='high' then 'research_strength'
      when strength_level='medium' then 'research_strength'
      else 'insufficient_data'
    end as classification
  from sig
)
select case when p_number is not null then
  (select jsonb_build_object(
     'mode','number','period',(select pk from params),'aggregate_only',true,'generated_at',now(),
     'number', c.n,
     'demand', jsonb_build_object('level',c.demand_level,'views',c.views,'unique_users',c.uu,'searches',c.searches,'source','visitor_events(section=number)+search_log','period',(select pk from params)),
     'trend', jsonb_build_object('value',c.trend,'ratio',c.trend_ratio,'current',c.views,'previous',c.prev_views,'comparison_period','prior_'||(select pk from params)),
     'research_strength', jsonb_build_object('level',c.strength_level,'verified_expressions',c.vexpr,'max_convergence_group',c.conv_max,'convergence_rows',c.conv_rows,'has_anchor_node',c.has_node,'pending_candidate',c.pending_cand,'source','convergences+gematria_words+nodes'),
     'classification', c.classification,
     'recommendation_reason',
        case c.classification
          when 'proven_demand' then 'ביקוש ציבורי ישיר מוכח — '||c.views||' צפיות · '||c.uu||' משתמשים ייחודיים'
          when 'rising_interest' then 'עניין עולה — '||coalesce(c.trend_ratio::text,'חדש')||'x מול התקופה הקודמת'
          when 'research_strength' then 'חוזק מחקרי — '||coalesce(c.vexpr,0)||' ביטויים מאומתים · התכנסות עד '||coalesce(c.conv_max,0)||' (ללא הוכחת ביקוש ציבורי)'
          else 'אין מספיק נתוני ביקוש; אפשר לדרג לפי חוזק מחקרי בלבד — לא לקרוא לזה פופולריות'
        end,
     'user_behavior_ne_canon', true)
   from classed c limit 1)
else
  jsonb_build_object(
    'mode','top','period',(select pk from params),'aggregate_only',true,'generated_at',now(),
    'note','ממויין לפי ביקוש (צפיות). Demand · Trend · Research-Strength = שלושה אותות נפרדים, לא נגזרים זה מזה.',
    'signals', (select jsonb_agg(jsonb_build_object(
       'number', c.n,
       'demand', jsonb_build_object('level',c.demand_level,'views',c.views,'unique_users',c.uu,'searches',c.searches),
       'trend', c.trend, 'trend_ratio', c.trend_ratio,
       'research_strength', jsonb_build_object('level',c.strength_level,'verified_expressions',c.vexpr,'max_convergence_group',c.conv_max),
       'classification', c.classification) order by c.views desc, c.uu desc)
     from (select * from classed order by views desc, uu desc limit greatest(p_limit,1)) c)
  )
end
$function$

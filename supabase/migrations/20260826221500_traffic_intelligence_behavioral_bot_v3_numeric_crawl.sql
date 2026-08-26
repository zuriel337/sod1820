-- SOD1820 Traffic Intelligence — Behavioral Bot Rule v3
-- Human-Gate: ZURIEL, 2026-08-27
-- Preserves rule v2 and adds a country-agnostic numeric-crawl suspicion signature.
-- Country remains evidence only; this migration does not block any country or request.

CREATE OR REPLACE FUNCTION public.fn_human_entrances(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date)
RETURNS TABLE(session_id text, day date, first_ts timestamp with time zone, landing_path text, source text, device text, country text, visitor text, is_logged_in boolean, views integer, interactions integer, searches integer, engaged boolean, bounce boolean, suspected_bot boolean, classification_reason text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with base as (
    select e.* from public.events e
    where e.session_id is not null
      and (p_from is null or e.ts::date >= p_from)
      and (p_to   is null or e.ts::date <= p_to)
  ),
  sess as (
    select session_id,
      bool_or(is_bot) any_bot,
      count(*) filter (where event_type='view') views,
      count(*) filter (where event_type in ('search','cross_search','use','save','journey','add','open')) interactions,
      count(*) filter (where event_type in ('search','cross_search')) searches
    from base group by session_id
  ),
  ent as (select session_id, views, interactions, searches from sess where any_bot=false and views>=1),
  land as (
    select distinct on (b.session_id)
      b.session_id, b.ts first_ts, b.path landing_path, b.via source, b.device,
      (b.props->>'country') country, coalesce(b.person_id::text, b.sod_id) visitor,
      (b.person_id is not null) is_logged_in
    from base b join ent e2 using(session_id)
    where b.event_type='view'
    order by b.session_id, b.ts asc
  ),
  joined as (
    select l.session_id, l.first_ts::date dd, l.first_ts, l.landing_path, l.source, l.device, l.country,
           l.visitor, l.is_logged_in, e.views, e.interactions, e.searches,
           (e.views>=2) engaged, (e.views=1 and e.interactions=0) bounce,
           (
             (l.source='direct' and l.country is null and e.views=1 and e.interactions=0)
             or
             (l.source='direct' and e.views=1 and e.interactions=0
               and (l.landing_path='/numbers' or l.landing_path like '/number/%'))
           ) suspected_bot
    from ent e join land l using(session_id)
  )
  select j.session_id, j.dd, j.first_ts, j.landing_path, j.source, j.device, j.country,
         j.visitor, j.is_logged_in, j.views, j.interactions, j.searches, j.engaged, j.bounce,
         j.suspected_bot,
         case
           when j.suspected_bot and j.source='direct' and j.country is null and j.views=1 and j.interactions=0
             then 'direct + no_country + single_view + no_interaction (rule v2 preserved)'
           when j.suspected_bot and j.source='direct' and j.views=1 and j.interactions=0
                and (j.landing_path='/numbers' or j.landing_path like '/number/%')
             then 'direct + numeric_landing + single_view + no_interaction (rule v3)'
           else null
         end
  from joined j;
$function$;

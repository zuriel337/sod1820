-- TEST FIXTURE ONLY (not applied): live definitions read 20.11.2026, unchanged by #1461.
CREATE OR REPLACE FUNCTION public.fn_ti_entity_demand_sessions(p_from date, p_to date)
 RETURNS TABLE(entity_type text, entity_key text, session_id text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with h as (
    select session_id, landing_path
    from public.fn_human_entrances(p_from, p_to)
    where not suspected_bot and landing_path is not null
  ),
  parsed as (
    select h.session_id, h.landing_path,
      case when h.landing_path ~ '^/number/' then 'number'
           when h.landing_path ~ '^/topic/'  then 'topic'
           else 'page' end etype,
      case when h.landing_path ~ '^/number/' then public.url_decode(regexp_replace(h.landing_path,'^/number/',''))
           when h.landing_path ~ '^/topic/'  then regexp_replace(h.landing_path,'^/topic/','')
           else h.landing_path end slug
    from h
  ),
  keyed as (
    select p.session_id, p.etype,
      case when p.etype='number' then
         (case when p.slug ~ '^\d+$' then p.slug else nullif(public.fn_ragil(p.slug),0)::text end)
         else p.slug end ekey
    from parsed p
  )
  select etype, ekey, session_id from keyed where ekey is not null;
$function$;
CREATE OR REPLACE FUNCTION public.fn_ti_entity_demand_clean_composition(p_from date, p_to date)
 RETURNS TABLE(entity_type text, entity_key text, clean_human_visits integer, clean_unknown_visits integer, clean_bot_visits integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  with ds as (
    select entity_type, entity_key, session_id
    from public.fn_ti_entity_demand_sessions(p_from, p_to)
  ),
  cc as (
    select session_id, clean_classification
    from public.fn_ti_clean_classification(p_from, p_to)
  )
  select
    ds.entity_type, ds.entity_key,
    count(*) filter (where coalesce(cc.clean_classification,'unknown')='human')::int  as clean_human_visits,
    count(*) filter (where coalesce(cc.clean_classification,'unknown')='unknown')::int as clean_unknown_visits,
    count(*) filter (where coalesce(cc.clean_classification,'unknown')='bot')::int     as clean_bot_visits
  from ds
  left join cc using(session_id)
  group by ds.entity_type, ds.entity_key;
$function$;

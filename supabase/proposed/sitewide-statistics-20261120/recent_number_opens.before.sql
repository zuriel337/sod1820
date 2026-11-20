CREATE OR REPLACE FUNCTION public.recent_number_opens(lim integer DEFAULT 8)
 RETURNS TABLE(n integer, opens bigint, last_at timestamp with time zone, lead text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lim int := greatest(1, least(lim, 24));
  v_key text := 'recent_number_opens_clean_v1_v2:'||v_lim;
  v_on boolean := public._analytics_cache_on();
  v_payload jsonb;
begin
  if v_on then
    select public.analytics_cache_get_v1(v_key, 'recent_number_opens') into v_payload;
  end if;

  if v_payload is null then
    with raw as (
      select e.session_id, e.ts, e.path
      from public.events e
      where e.session_id is not null
        and e.surface = 'page' and e.event_type = 'view'
        and e.path ~ '^/number/'
        and e.ts >= now() - interval '24 hours'
    ),
    parsed as (
      select r.session_id, r.ts,
        case when regexp_replace(r.path, '^/number/', '') ~ '^[0-9]{1,5}$'
          then regexp_replace(r.path, '^/number/', '')::int
          else nullif(public.fn_ragil(public.url_decode(regexp_replace(r.path, '^/number/', ''))), 0)
        end as num
      from raw r
    ),
    valid as (
      select p.session_id, p.ts, p.num
      from parsed p
      where p.num between 1 and 99999
        and exists (select 1 from public.gematria_words g where g.ragil = p.num)
    ),
    clean as (
      select cc.session_id
      from public.fn_ti_clean_classification((current_date - 1), current_date) cc
      where cc.clean_classification = 'human'
    ),
    human_only as (
      select v.num, v.session_id, v.ts
      from valid v
      join clean c on c.session_id = v.session_id
    ),
    agg as (
      select num as n, count(distinct session_id) as opens, max(ts) as last_at
      from human_only
      group by num
    ),
    with_lead as (
      select a.n, a.opens, a.last_at,
        (select g.phrase from public.gematria_words g
           where g.ragil = a.n and g.is_verified = true
             and coalesce(g.visibility_tier, 0) >= 0
           order by g.lead_rank desc nulls last, length(g.phrase) asc
           limit 1) as lead
      from agg a
    )
    select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb)
    into v_payload
    from (select * from with_lead order by last_at desc limit v_lim) w;

    if v_on then
      insert into public.analytics_cache(cache_key, payload, computed_at)
      values (v_key, v_payload, now())
      on conflict (cache_key) do update set payload = excluded.payload, computed_at = now();
    end if;
  end if;

  return query
  select x.n, x.opens, x.last_at, x.lead
  from jsonb_to_recordset(v_payload) as x(n integer, opens bigint, last_at timestamptz, lead text);
end
$function$


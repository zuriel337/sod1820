-- G3 SECURITY PRECLOSURE — admin SECURITY DEFINER authorization closure
-- Live migration: 20260929224006_g3_security_preclosure_admin_rpc_authorization_v1
-- Scope: authorization only. Preserve existing analytics/cost/cache semantics.
-- Proven pre-fix: anon + authenticated non-admin could execute all five RPCs.
-- Canonical fix: auth.uid() -> public.users.role='admin' body guard, plus ACL defense in depth.
-- work_log BEFORE: 1e5f6356-ad63-4192-8e2b-b81ae6ec03f6

CREATE OR REPLACE FUNCTION public.admin_ai_tokens(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_total jsonb;
  v_by_source jsonb;
  v_by_model jsonb;
  v_by_provider jsonb;
  v_by_kind jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

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
$function$;
REVOKE ALL ON FUNCTION public.admin_ai_tokens(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_ai_tokens(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_tokens(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_journey_experiments(p_days integer DEFAULT 14)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_result jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  select q.result into v_result from (
    with base as (
        select * from journey_ab_log
        where created_at >= now() - (p_days || ' days')::interval
      ),
      bots as (
        select left(visitor_id, 9) as sig
        from base where visitor_id is not null
        group by 1 having count(distinct visitor_id) >= 2
      ),
      realev as (
        select * from base
        where visitor_id is not null
          and left(visitor_id, 9) not in (select sig from bots)
      ),
      lens_agg as (
        select lens as variant,
          count(distinct visitor_id) filter (where event='start') as starts,
          count(distinct visitor_id) filter (where event='step' and depth>=2) as step2,
          count(distinct visitor_id) filter (where event='complete') as completes
        from realev group by lens
      ),
      kind_agg as (
        select kind as variant,
          count(distinct visitor_id) filter (where event='start') as starts,
          count(distinct visitor_id) filter (where event='step' and depth>=2) as step2,
          count(distinct visitor_id) filter (where event='complete') as completes
        from realev where kind is not null group by kind
      ),
      cell_agg as (
        select lens, kind,
          count(distinct visitor_id) filter (where event='start') as starts,
          count(distinct visitor_id) filter (where event='step' and depth>=2) as step2,
          count(distinct visitor_id) filter (where event='complete') as completes
        from realev where kind is not null group by lens, kind
      )
      select jsonb_build_object(
        'days', p_days,
        'real_events', (select count(*) from realev),
        'bot_events', (select count(*) from base) - (select count(*) from realev),
        'bot_sigs', (select count(*) from bots),
        'lens', coalesce((select jsonb_agg(to_jsonb(l) order by l.variant) from lens_agg l), '[]'::jsonb),
        'kind', coalesce((select jsonb_agg(to_jsonb(k) order by k.variant) from kind_agg k), '[]'::jsonb),
        'cells', coalesce((select jsonb_agg(to_jsonb(c) order by c.lens, c.kind) from cell_agg c), '[]'::jsonb)
      )
  ) q(result);
  return v_result;
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_journey_experiments(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_journey_experiments(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_journey_experiments(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_real_traffic(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_key text := 'admin_real_traffic_v2:'||p_days; v_payload jsonb; v_on boolean := public._analytics_cache_on();
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  if v_on then
    select public.analytics_cache_get_v1(v_key, 'admin_real_traffic') into v_payload;
    if v_payload is not null then return v_payload; end if;
  end if;
  with bots as (select left(visitor, 9) as sig from site_visits
      where ts >= now() - greatest((p_days || ' days')::interval, interval '24 hours') and visitor is not null
      group by 1 having count(distinct visitor) >= 2),
  realv as (select ts, visitor, referrer from site_visits
      where ts >= now() - (p_days || ' days')::interval and visitor is not null and left(visitor, 9) not in (select sig from bots)),
  daily as (select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as d, date_trunc('day', ts)::date as dd,
      count(*) as visits, count(distinct visitor) as visitors from realv group by 1, 2),
  hourly as (select to_char(date_trunc('hour', ts at time zone 'Asia/Jerusalem'), 'HH24:00') as hr,
      count(distinct visitor) as visitors from realv where ts >= now() - interval '24 hours' group by 1),
  trend as (select round(avg(visitors) filter (where dd >= (now()::date - (p_days/2)))::numeric,0) recent_avg,
      round(avg(visitors) filter (where dd <  (now()::date - (p_days/2)))::numeric,0) prior_avg from daily),
  src as (select case
        when referrer is null or referrer='' then '(ישיר)'
        when referrer ilike '%google%' then 'Google' when referrer ilike '%facebook%' or referrer ilike '%fb.%' then 'Facebook'
        when referrer ilike '%instagram%' then 'Instagram'
        when referrer ilike '%t.co%' or referrer ilike '%twitter%' or referrer ilike '%x.com%' then 'X/Twitter'
        when referrer ilike '%whatsapp%' or referrer ilike '%wa.me%' then 'WhatsApp'
        when referrer ilike '%t.me%' or referrer ilike '%telegram%' then 'Telegram'
        when referrer ilike '%bing%' then 'Bing' when referrer ilike '%duckduckgo%' then 'DuckDuckGo'
        when referrer ilike '%youtube%' then 'YouTube' when referrer ilike '%tiktok%' then 'TikTok'
        when referrer ilike '%sod1820%' then '(ניווט פנימי)'
        else split_part(regexp_replace(referrer, '^https?://(www\.)?', ''), '/', 1) end as source,
      count(distinct visitor) as visitors, count(*) as visits from realv group by 1 order by visitors desc limit 12)
  select jsonb_build_object(
    'days', p_days,
    'total_real_visitors', (select count(distinct visitor) from realv),
    'total_real_visits', (select count(*) from realv),
    'bot_visitors', (select count(distinct s.visitor) from site_visits s where s.ts >= now()-(p_days||' days')::interval and left(s.visitor,9) in (select sig from bots)),
    'recent_avg', (select recent_avg from trend), 'prior_avg', (select prior_avg from trend),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'visits', visits, 'visitors', visitors) order by d) from daily), '[]'::jsonb),
    'hourly', coalesce((select jsonb_agg(jsonb_build_object('hr', hr, 'visitors', visitors) order by hr) from hourly), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(to_jsonb(s)) from src s), '[]'::jsonb)
  ) into v_payload;
  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at) values (v_key,v_payload,now())
    on conflict (cache_key) do update set payload=excluded.payload, computed_at=now();
  end if;
  return v_payload;
end; $function$;
REVOKE ALL ON FUNCTION public.admin_real_traffic(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_real_traffic(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_real_traffic(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_realtime_now(p_minutes integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_key text := 'admin_realtime_now_v2:'||p_minutes; v_payload jsonb; v_on boolean := public._analytics_cache_on();
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  if v_on then
    select public.analytics_cache_get_v1(v_key, 'admin_realtime_now') into v_payload;
    if v_payload is not null then return v_payload; end if;
  end if;
  with bots as (select left(visitor, 9) as sig from site_visits
      where ts >= now() - interval '24 hours' and visitor is not null group by 1 having count(distinct visitor) >= 2),
  recent as (select * from site_visits where ts >= now() - (p_minutes || ' minutes')::interval and visitor is not null
      and left(visitor, 9) not in (select sig from bots))
  select jsonb_build_object(
    'minutes', p_minutes,
    'now_visitors', (select count(distinct visitor) from recent),
    'now_views', (select count(*) from recent),
    'last30_visitors', (select count(distinct visitor) from site_visits s where s.ts >= now() - interval '30 minutes'
        and s.visitor is not null and left(s.visitor, 9) not in (select sig from bots)),
    'top_paths', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'n', n) order by n desc)
      from (select path, count(distinct visitor) as n from recent group by path order by n desc limit 5) p), '[]'::jsonb)
  ) into v_payload;
  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at) values (v_key,v_payload,now())
    on conflict (cache_key) do update set payload=excluded.payload, computed_at=now();
  end if;
  return v_payload;
end; $function$;
REVOKE ALL ON FUNCTION public.admin_realtime_now(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_realtime_now(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_realtime_now(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_traffic(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_result jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  select q.result into v_result from (
    with bots as (
        select left(visitor, 9) as sig from site_visits
        where ts >= now() - greatest((p_days || ' days')::interval, interval '24 hours') and visitor is not null
        group by 1 having count(distinct visitor) >= 2
      ),
      realv as (
        select ts, visitor, referrer from site_visits
        where ts >= now() - (p_days || ' days')::interval and visitor is not null
          and left(visitor, 9) not in (select sig from bots)
      ),
      daily as (
        select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as d,
          date_trunc('day', ts)::date as dd,
          count(*) as visits, count(distinct visitor) as visitors
        from realv group by 1, 2
      ),
      trend as (
        select
          round(avg(visitors) filter (where dd >= (now()::date - (p_days/2)))::numeric, 0) as recent_avg,
          round(avg(visitors) filter (where dd <  (now()::date - (p_days/2)))::numeric, 0) as prior_avg
        from daily
      ),
      src as (
        select case
            when referrer is null or referrer='' then '(ישיר)'
            when referrer ilike '%google%' then 'Google'
            when referrer ilike '%facebook%' or referrer ilike '%fb.%' then 'Facebook'
            when referrer ilike '%instagram%' then 'Instagram'
            when referrer ilike '%t.co%' or referrer ilike '%twitter%' or referrer ilike '%x.com%' then 'X/Twitter'
            when referrer ilike '%whatsapp%' or referrer ilike '%wa.me%' then 'WhatsApp'
            when referrer ilike '%t.me%' or referrer ilike '%telegram%' then 'Telegram'
            when referrer ilike '%bing%' then 'Bing'
            when referrer ilike '%duckduckgo%' then 'DuckDuckGo'
            when referrer ilike '%youtube%' then 'YouTube'
            when referrer ilike '%tiktok%' then 'TikTok'
            when referrer ilike '%sod1820%' then '(ניווט פנימי)'
            else split_part(regexp_replace(referrer, '^https?://(www\.)?', ''), '/', 1)
          end as source,
          count(distinct visitor) as visitors, count(*) as visits
        from realv group by 1 order by visitors desc limit 12
      ),
      ret as (
        select count(distinct visitor) as returning_cnt from site_visits
        where visitor in (select distinct visitor from realv)
          and ts < now() - (p_days || ' days')::interval and ts >= now() - interval '90 days'
          and left(visitor, 9) not in (select sig from bots)
      )
      select jsonb_build_object(
        'days', p_days,
        'total_visitors', (select count(distinct visitor) from realv),
        'total_visits', (select count(*) from realv),
        'returning', (select returning_cnt from ret),
        'bot_visitors', (select count(distinct s.visitor) from site_visits s
           where s.ts >= now() - (p_days || ' days')::interval and left(s.visitor,9) in (select sig from bots)),
        'recent_avg', (select recent_avg from trend),
        'prior_avg', (select prior_avg from trend),
        'now5', (select count(distinct visitor) from realv where ts >= now() - interval '5 minutes'),
        'now30', (select count(distinct visitor) from realv where ts >= now() - interval '30 minutes'),
        'today', (select count(distinct visitor) from realv where ts >= date_trunc('day', now())),
        'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'visits', visits, 'visitors', visitors) order by d) from daily), '[]'::jsonb),
        'sources', coalesce((select jsonb_agg(to_jsonb(s)) from src s), '[]'::jsonb)
      )
  ) q(result);
  return v_result;
end;
$function$;
REVOKE ALL ON FUNCTION public.admin_traffic(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_traffic(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_traffic(integer) TO authenticated;


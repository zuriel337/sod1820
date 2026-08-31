-- Traffic Intelligence temp-disk spike fix
-- Live root cause: admin_traffic_insights / admin_entries_breakdown / admin_funnel
-- repeatedly recomputed fn_human_entrances and spilled large temp files.
-- Reuse existing analytics_cache; no new table/engine/store.
--
-- REPRODUCIBILITY-ONLY PORT (2026-08-31, actor=CLAUDE, Foundation Audit follow-up):
-- This fix was already applied LIVE to the canonical DB on 2026-08-28 (see work_log
-- "actor=GPT · TRAFFIC INTELLIGENCE TEMP-DISK FIX · AFTER", status
-- LIVE_IMPLEMENTED_VERIFIED_PR_OPEN_NOT_MERGED, branch gpt/traffic-temp-disk-fix,
-- commit 27aa52d3, PR #222 — never merged to main). This file is a byte-for-byte
-- capture of that already-live code, verified via whitespace-normalized md5 against
-- pg_get_functiondef() for all three functions on project linswmnnkjxvweumprav
-- (all three hashes matched exactly). Porting this file changes NOTHING functionally —
-- it only closes the git/DB drift so `main`'s migration history reflects live reality.
-- No classification/bot-detection semantics touched; Behavioral Bot v3 untouched.

CREATE OR REPLACE FUNCTION public.admin_entries_breakdown(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  d0 date := current_date - greatest(p_days,1);
  res jsonb;
  v_key text := 'admin_entries_breakdown:'||p_days;
  v_on boolean := public._analytics_cache_on();
begin
  if not exists (select 1 from public.users where id=auth.uid() and role='admin') then
    raise exception 'not authorized';
  end if;
  if v_on then
    select payload into res from public.analytics_cache
    where cache_key=v_key and computed_at > now()-interval '10 minutes';
    if res is not null then return res; end if;
  end if;
  with h as materialized (
    select * from public.fn_human_entrances(d0,current_date) where not suspected_bot
  )
  select jsonb_build_object(
    'landing',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select landing_path path,count(*) entrances from h where landing_path is not null group by landing_path order by count(*) desc limit 15) x),
    'sources',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select coalesce(source,'direct') source,count(*) entrances from h group by coalesce(source,'direct') order by count(*) desc limit 12) x),
    'devices',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select coalesce(device,'?') device,count(*) entrances from h group by coalesce(device,'?') order by count(*) desc) x),
    'countries',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select coalesce(country,'?') country,count(*) entrances from h group by coalesce(country,'?') order by count(*) desc limit 12) x)
  ) into res;
  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at) values(v_key,res,now())
    on conflict(cache_key) do update set payload=excluded.payload,computed_at=now();
  end if;
  return res;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_traffic_insights(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  d0 date := current_date - greatest(p_days,1);
  res jsonb := '[]'::jsonb;
  v_key text := 'admin_traffic_insights:'||p_days;
  v_on boolean := public._analytics_cache_on();
  cur numeric; prev numeric; chg numeric;
  eng_all numeric; eng_srch numeric;
  best_src text; best_avg numeric; best_n int;
  top_page text; top_n int; top_bounce numeric;
  tool_pct numeric;
begin
  if not exists (select 1 from public.users where id=auth.uid() and role='admin') then
    raise exception 'not authorized';
  end if;
  if v_on then
    select payload into res from public.analytics_cache
    where cache_key=v_key and computed_at > now()-interval '10 minutes';
    if res is not null then return res; end if;
  end if;
  res := '[]'::jsonb;

  select sum(entrances) into cur from public.traffic_daily where day > current_date-7;
  select sum(entrances) into prev from public.traffic_daily where day > current_date-14 and day <= current_date-7;
  if prev is not null and prev > 0 then
    chg := round(100.0*(cur-prev)/prev);
    res := res || jsonb_build_object('icon',case when chg>=0 then '📈' else '📉' end,
      'text','תנועה אנושית ב-7 הימים: '||coalesce(cur,0)::int||' כניסות ('||case when chg>=0 then '+' else '' end||chg||'% מול השבוע הקודם).');
  end if;

  with h as materialized (
    select source,views,landing_path,bounce,engaged,searches,interactions
    from public.fn_human_entrances(d0,current_date)
    where not suspected_bot
  ),
  engagement as (
    select round(100.0*count(*) filter(where engaged)/nullif(count(*),0)) eng_all,
           round(100.0*count(*) filter(where engaged and searches>0)/nullif(count(*) filter(where searches>0),0)) eng_srch,
           round(100.0*count(*) filter(where searches>0 or interactions>0)/nullif(count(*),0),1) tool_pct
    from h
  ),
  src as (
    select source,round(avg(views),1) avg_views,count(*)::int n
    from h where source is not null group by source having count(*)>=30 order by avg(views) desc limit 1
  ),
  landing as (
    select landing_path,count(*)::int n,round(100.0*count(*) filter(where bounce)/count(*)) bounce_pct
    from h where landing_path is not null group by landing_path order by count(*) desc limit 1
  )
  select e.eng_all,e.eng_srch,s.source,s.avg_views,s.n,l.landing_path,l.n,l.bounce_pct,e.tool_pct
  into eng_all,eng_srch,best_src,best_avg,best_n,top_page,top_n,top_bounce,tool_pct
  from engagement e left join src s on true left join landing l on true;

  if eng_srch is not null then
    res := res || jsonb_build_object('icon','🔍','text','מי שמחפש ממשיך לעומק ב-'||eng_srch||'% מהמקרים — מול '||eng_all||'% בכלל. חיפוש = סימן-ערך חזק.');
  end if;
  if best_src is not null then
    res := res || jsonb_build_object('icon','⭐','text','המקור «'||best_src||'» מביא את המבקרים העמוקים ביותר ('||best_avg||' צפיות בממוצע, '||best_n||' כניסות).');
  end if;
  if top_page is not null then
    res := res || jsonb_build_object('icon','🛬','link',top_page,'text','הדף הפופולרי ביותר ('||top_n||' כניסות) — '||top_bounce||'% נוטשים מיד.');
  end if;
  res := res || jsonb_build_object('icon','🧪','text','רק '||coalesce(tool_pct,0)||'% מהכניסות משתמשות בכלי-מחקר (חיפוש/AI/מסע) — הזדמנות להגדלת מעורבות.');

  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at) values(v_key,res,now())
    on conflict(cache_key) do update set payload=excluded.payload,computed_at=now();
  end if;
  return res;
end $function$;

CREATE OR REPLACE FUNCTION public.admin_funnel(p_days integer DEFAULT 30)
RETURNS TABLE(ord integer, stage text, sessions integer, pct numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  d0 date := current_date - greatest(p_days,1);
  v_key text := 'admin_funnel:'||p_days;
  v_payload jsonb;
  v_on boolean := public._analytics_cache_on();
begin
  if not exists (select 1 from public.users where id=auth.uid() and role='admin') then
    raise exception 'not authorized';
  end if;
  if v_on then
    select payload into v_payload from public.analytics_cache
    where cache_key=v_key and computed_at > now()-interval '10 minutes';
    if v_payload is not null then
      return query select (x->>'ord')::int,(x->>'stage')::text,(x->>'sessions')::int,(x->>'pct')::numeric from jsonb_array_elements(v_payload) x order by (x->>'ord')::int;
      return;
    end if;
  end if;

  with hs as materialized (
    select session_id,views from public.fn_human_entrances(d0,current_date) where not suspected_bot
  ),
  ev as (
    select e.session_id,
      bool_or(e.event_type in ('search','cross_search')) searched,
      bool_or(e.event_type='open') opened,
      bool_or(e.event_type in ('use','journey')) used_tool
    from public.events e join hs on hs.session_id=e.session_id and e.ts::date>=d0
    group by e.session_id
  ),
  b as (
    select hs.session_id,hs.views,coalesce(ev.searched,false) searched,coalesce(ev.opened,false) opened,coalesce(ev.used_tool,false) used_tool
    from hs left join ev using(session_id)
  ),
  agg as (
    select count(*)::int c1,count(*) filter(where views>=2)::int c2,count(*) filter(where searched)::int c3,count(*) filter(where opened)::int c4,count(*) filter(where used_tool)::int c5 from b
  ),
  funnel_rows as (
    select v.ord as row_ord,v.stage as row_stage,v.sessions as row_sessions,round(100.0*v.sessions/nullif(a.c1,0),1) as row_pct
    from agg a cross join lateral (values (1,'כניסה',a.c1),(2,'צפייה בדף נוסף',a.c2),(3,'חיפוש',a.c3),(4,'פתיחת תוצאה',a.c4),(5,'שימוש בכלי מחקר',a.c5)) v(ord,stage,sessions)
  )
  select jsonb_agg(jsonb_build_object('ord',fr.row_ord,'stage',fr.row_stage,'sessions',fr.row_sessions,'pct',fr.row_pct) order by fr.row_ord)
  into v_payload from funnel_rows fr;

  if v_on then
    insert into public.analytics_cache(cache_key,payload,computed_at) values(v_key,coalesce(v_payload,'[]'::jsonb),now())
    on conflict(cache_key) do update set payload=excluded.payload,computed_at=now();
  end if;
  return query select (x->>'ord')::int,(x->>'stage')::text,(x->>'sessions')::int,(x->>'pct')::numeric from jsonb_array_elements(coalesce(v_payload,'[]'::jsonb)) x order by (x->>'ord')::int;
end $function$;

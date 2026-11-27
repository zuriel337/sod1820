-- PROPOSAL ONLY (cumulative open activity for /stats, ZURIEL 27.11.2026). NOT applied. Needs explicit ZURIEL approval for the exact
-- SHA and file hash (CLAUDE.md 0.4), and the contract amendment in README.md is a separate approval.
-- Adds ONE read-side producer (sibling of fn_ti_activity_pulse2029, same events pipeline, same classifier, same analytics_cache) and its
-- public wrapper (same pattern as research_pulse_2029). No new collection, no table, no change to any existing function or grant.
-- Revert: ROLLBACK.sql. The live fn_ti_activity_pulse2029 md5 is pinned below so the apply refuses on drift.
\set ON_ERROR_STOP on
begin;
do $pre$ begin
  if md5(pg_get_functiondef('public.fn_ti_activity_pulse2029(integer)'::regprocedure)) <> '83b931888f51de9429367006c6608e9d' then
    raise exception 'preimage drift: fn_ti_activity_pulse2029';
  end if;
  if to_regprocedure('public.fn_ti_clean_classification(date,date)') is null
     or to_regprocedure('public.analytics_cache_get_v1(text,text)') is null
     or to_regprocedure('public.sitemap_numbers()') is null
     or to_regclass('public.crawl_daily') is null or to_regclass('public.posts') is null
     or to_regclass('public.video_media_assets_v1') is null or to_regclass('public.analytics_cache') is null then
    raise exception 'open-activity: a dependency is missing';
  end if;
  if to_regprocedure('public.fn_ti_open_activity2029(text)') is not null or to_regprocedure('public.research_open_activity_2029(text)') is not null then
    raise exception 'open-activity: already applied';
  end if;
end $pre$;

create function public.fn_ti_open_activity2029(p_window text default 'week')
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $fn$
declare
  w text := case when p_window in ('day','week','month') then p_window else 'week' end;
  n integer := case w when 'day' then 1 when 'week' then 7 else 30 end;
  -- SETTLED windows: complete Jerusalem days only; today is never included, so a list never changes minute by minute
  -- and a single open cannot be dated or differenced against an earlier snapshot.
  to_d date := (now() at time zone 'Asia/Jerusalem')::date;
  from_d date := ((now() at time zone 'Asia/Jerusalem')::date) - (case w when 'day' then 1 when 'week' then 7 else 30 end);
  k text := 'ti_open_activity2029:v1:' || w || ':' || ((now() at time zone 'Asia/Jerusalem')::date)::text;
  min_sessions constant integer := 25;  -- the whole window must hold this many distinct human VISITORS (sod_id; session id as fallback) before any item list is drawn
  per_family constant integer := 150;   -- list cap per family; the rest is a count (the page offers "show more" inside this cap)
  payload jsonb; stamp timestamptz; nestloop text;
begin
  payload := public.analytics_cache_get_v1(k,'fn_ti_open_activity2029');
  select computed_at into stamp from public.analytics_cache where cache_key=k;
  if payload is null then
    if not pg_try_advisory_xact_lock(hashtextextended(k,1821)) then
      return jsonb_build_object('version',1,'state','refreshing','window',w);
    end if;
    nestloop := current_setting('enable_nestloop');
    perform set_config('enable_nestloop','off',true);  -- same single-statement planner hint as fn_ti_activity_pulse2029
    with clean as materialized (
      select session_id,clean_classification from public.fn_ti_clean_classification(from_d,to_d)
    ), seen as materialized (
      -- Two existing, closed event families: page/view (the measured route) and content/view (kind + the public numeric item id).
      -- Posts come from content/view (the exact public post id): the measured page path is the REQUESTED address and 50 of 92 post addresses opened in 30 days match no current slug.
      select ev.session_id,coalesce(ev.sod_id,ev.session_id) as vid,c.clean_classification as cls,ev.surface,ev.props->'measurement'->>'page_path' as pth,
        case when ev.surface='content' and ev.props->>'kind'='post' and ev.props->>'item_id' ~ '^[0-9]{1,12}$' then ev.props->>'item_id' end as pid
      from public.events ev join clean c using(session_id)
      where ev.ts >= (from_d::timestamp at time zone 'Asia/Jerusalem') and ev.ts < (to_d::timestamp at time zone 'Asia/Jerusalem')
        and not ev.is_bot and ev.props->'_measurement_verified'='2'::jsonb
        and ev.surface in ('page','content') and ev.event_type='view' and c.clean_classification in ('human','unknown')
    ), gate as (
      select count(distinct vid) as sessions from seen where cls='human' and surface='page'
    ), keyed as (
      -- The item text comes from the address and is NEVER shown: it must match a canonical public row below (a crafted URL cannot put its own words on the public page).
      select session_id,vid,cls,
        case when pid is not null then 'post'
             when surface='page' and pth ~ '^/number/[0-9]{1,5}$' then 'number'
             when surface='page' and pth ~ '^/(tag|category)/[^/]{1,120}$' then 'topic'
             when surface='page' and pth ~ '^/video/[0-9a-f]{32}$' then 'video' end as fam,
        case when pid is not null then pid
             when surface<>'page' then null
             when pth ~ '^/number/' then split_part(pth,'/',3)
             when pth ~ '^/(tag|category)/' then substr(pth,2)
             when pth ~ '^/video/' then substr(pth,8) end as item
      from seen
    ), cand as (
      select fam,item,cls,count(*) as opens,count(distinct vid) as sessions from keyed where fam is not null group by 1,2,3
    ), adm as materialized (
      select value from public.sitemap_numbers()
    ), okc as (
      select c.* from cand c where case c.fam
        when 'number' then exists(select 1 from adm a where a.value=c.item::integer)
        when 'post' then exists(select 1 from public.posts p where p.id=c.item::bigint and p.title is not null and not coalesce(p.tags,'{}'::text[]) && array['טיוטה'::text])
        when 'video' then exists(select 1 from public.video_media_assets_v1 v where v.public_id=c.item)
        when 'topic' then exists(select 1 from public.posts p where p.title is not null and not coalesce(p.tags,'{}'::text[]) && array['טיוטה'::text]
          and ((c.item like 'tag/%' and exists(select 1 from unnest(coalesce(p.tags,'{}'::text[])) t where replace(t,' ','-')=substr(c.item,5)))
            or (c.item like 'category/%' and exists(select 1 from unnest(coalesce(p.categories,'{}'::text[])) t where replace(t,' ','-')=substr(c.item,10)))))
        else false end
    ), human_items as (
      select fam,item,opens,case when opens>=10 and sessions>=5 then 'popular' else 'seen' end as tier from okc where cls='human'
    ), fams as (
      select fam,count(*) as items,sum(opens) as opens,
        coalesce(jsonb_agg(jsonb_build_object('k',item,'o',opens,'t',tier,'i',rk) order by (case when tier='popular' then 0 else 1 end),
          (case when tier='popular' then -opens else 0 end),item) filter (where rk<=per_family),'[]'::jsonb) as list
      from (select h.*,row_number() over (partition by fam order by (case when tier='popular' then 0 else 1 end),(case when tier='popular' then -opens else 0 end),item) rk from human_items h) q
      group by fam
    )
    select jsonb_build_object(
      'version',1,'window',w,'from',from_d,'to',to_d - 1,'timezone','Asia/Jerusalem','source','events',
      'state',case when (select sessions from gate) >= min_sessions then 'measured' else 'insufficient' end,
      -- No visitor or session count and no per-item time is ever published; only item opens. The floors count VISITORS, never sessions (S1, 27.11.2026).
      'families',case when (select sessions from gate) >= min_sessions then
        coalesce((select jsonb_object_agg(f.fam,jsonb_build_object('items',f.items,'opens',f.opens,'list',f.list)) from fams f),'{}'::jsonb) else '{}'::jsonb end,
      -- Sessions the classifier could not call human: totals only, never a list (unknown is shown as unknown, never added to people).
      'unknown',coalesce((select jsonb_object_agg(u.fam,jsonb_build_object('items',u.items,'opens',u.opens))
        from (select fam,count(*) as items,sum(opens) as opens from okc where cls='unknown' group by fam) u),'{}'::jsonb),
      -- Machines stay apart and stay where they were measured (served edge hits, never in an activity list).
      'machines',jsonb_build_object(
        'served',(select coalesce(sum(hits),0) from public.crawl_daily where day>=from_d and day<to_d and not blocked),
        'by_bot',coalesce((select jsonb_agg(jsonb_build_object('bot',b.bot,'hits',b.hits) order by b.hits desc) from (
          select bot,sum(hits)::bigint as hits from public.crawl_daily where day>=from_d and day<to_d and not blocked and bot<>'other' group by bot order by 2 desc limit 10) b),'[]'::jsonb)),
      'floors',jsonb_build_object('popular_events',10,'popular_visitors',5,'window_visitors',min_sessions,'unit','distinct_visitor','list_cap',per_family),
      'not_measured_by_item','["cipher","topic_card"]'::jsonb
    ) into payload;
    perform set_config('enable_nestloop',nestloop,true);
    stamp := now();
    insert into public.analytics_cache(cache_key,payload,computed_at,cache_kind,producer,producer_version,input_identity,expires_at,billable_state)
    values(k,payload,stamp,'memoized_result','fn_ti_open_activity2029',public.analytics_cache_producer_version_v1('fn_ti_open_activity2029'),k,
      ((to_d + 1)::timestamp at time zone 'Asia/Jerusalem') + interval '5 minutes','NOT_BILLABLE')
    on conflict(cache_key) do update set payload=excluded.payload,computed_at=excluded.computed_at,producer_version=excluded.producer_version,expires_at=excluded.expires_at,invalidated_at=null;
  end if;
  -- Titles and public state are re-read on every call (an unpublished or draft post disappears); the cache holds references only.
  return (payload - 'families') || jsonb_build_object('computed_at',stamp,
    'families',coalesce((select jsonb_object_agg(f.key,jsonb_build_object('items',f.value->'items','opens',f.value->'opens',
      'list',case f.key
        when 'post' then coalesce((select jsonb_agg(jsonb_build_object('href','/post/'||p.slug,'title',p.title,'opens',x.o,'tier',x.t) order by x.i)
          from jsonb_to_recordset(f.value->'list') as x(k text,o bigint,t text,i integer) join public.posts p on p.id=x.k::bigint
          where p.title is not null and not coalesce(p.tags,'{}'::text[]) && array['טיוטה'::text]),'[]'::jsonb)
        when 'number' then coalesce((select jsonb_agg(jsonb_build_object('href','/number/'||x.k,'n',x.k::integer,'opens',x.o,'tier',x.t) order by x.i)
          from jsonb_to_recordset(f.value->'list') as x(k text,o bigint,t text,i integer)),'[]'::jsonb)
        when 'video' then coalesce((select jsonb_agg(jsonb_build_object('href','/video/'||x.k,'opens',x.o,'tier',x.t) order by x.i)
          from jsonb_to_recordset(f.value->'list') as x(k text,o bigint,t text,i integer) where exists(select 1 from public.video_media_assets_v1 v where v.public_id=x.k)),'[]'::jsonb)
        else coalesce((select jsonb_agg(jsonb_build_object('href','/'||x.k,'label',replace(substr(x.k,position('/' in x.k)+1),'-',' '),'opens',x.o,'tier',x.t) order by x.i)
          from jsonb_to_recordset(f.value->'list') as x(k text,o bigint,t text,i integer)),'[]'::jsonb) end))
      from jsonb_each(payload->'families') f),'{}'::jsonb));
end $fn$;
revoke all on function public.fn_ti_open_activity2029(text) from public, anon, authenticated;

create function public.research_open_activity_2029(p_window text default 'week')
returns jsonb language sql security definer set search_path to 'public','pg_temp' as
$w$ select public.fn_ti_open_activity2029(case when p_window in ('day','week','month') then p_window else 'week' end) $w$;
revoke all on function public.research_open_activity_2029(text) from public;
grant execute on function public.research_open_activity_2029(text) to anon, authenticated;

do $post$ begin
  if has_function_privilege('anon','public.fn_ti_open_activity2029(text)','execute')
     or not has_function_privilege('anon','public.research_open_activity_2029(text)','execute') then
    raise exception 'open-activity: grant drift after apply';
  end if;
end $post$;
commit;

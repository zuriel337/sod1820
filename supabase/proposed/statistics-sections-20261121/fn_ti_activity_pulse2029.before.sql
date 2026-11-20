CREATE OR REPLACE FUNCTION public.fn_ti_activity_pulse2029(p_hours integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 h integer := case when p_hours in (24,168,720) then p_hours else 24 end;
 k text := 'ti_activity_pulse2029:v1:' || h;
 payload jsonb;
 stamp timestamptz;
 nestloop text;
begin
 payload := public.analytics_cache_get_v1(k,'fn_ti_activity_pulse2029');
 select computed_at into stamp from public.analytics_cache where cache_key=k;
 if payload is null then
   -- One bounded recomputation per window; contenders get explicit unavailable.
   if not pg_try_advisory_xact_lock(hashtextextended(k,1820)) then
     return jsonb_build_object('version',1,'state','refreshing','hours',h,'numbers','[]'::jsonb,'phrases','[]'::jsonb);
   end if;
   -- Live planner (20.11.2026, 720h): the classifier SRF is estimated at 5 human rows vs
   -- ~1,700 actual -> nested loop of 16.7M comparisons (9.4s > 8s statement_timeout); a hash
   -- join takes ~1.9s. The hint covers THIS statement only: a function-level SET would leak into
   -- every nested gematria_public_word_eligible() call (measured: ~100ms per word, 42s at 10x).
   nestloop := current_setting('enable_nestloop');
   perform set_config('enable_nestloop','off',true);
   with clean as materialized (
     select session_id,clean_classification from public.fn_ti_clean_classification(
       ((now()-make_interval(hours=>h)) at time zone 'Asia/Jerusalem')::date,
       (now() at time zone 'Asia/Jerusalem')::date)
   ), eligible as materialized (
     select e.* from public.events e join clean c using(session_id)
     where e.ts>=now()-make_interval(hours=>h) and e.ts<now() and not e.is_bot
       and e.props->'_measurement_verified'='2'::jsonb and c.clean_classification='human'
   ), number_events as (
     select case when props->'measurement'->>'page_path' ~ '^/number/[0-9]{1,5}$'
       then split_part(props->'measurement'->>'page_path','/',3)::integer end as n,session_id,ts
     from eligible where surface='page' and event_type='view'
   ), numbers as (
     -- Hour granularity: an exact max(ts) dates the latest single viewer of the group.
     select n,count(*) as events,count(distinct session_id) as sessions,date_trunc('hour',max(ts)) as last_at
     from number_events where n between 1 and 99999 group by n
     having count(*)>=10 and count(distinct session_id)>=5
   ), posts_viewed as (
     -- Popular public content: canonical post page views. Only the slug reference is cached;
     -- title and public state are re-read on every call (an unpublished/draft post disappears).
     select substr(props->'measurement'->>'page_path',7) as slug,count(*) as events,count(distinct session_id) as sessions
     from eligible where surface='page' and event_type='view' and props->'measurement'->>'page_path' like '/post/_%'
     group by 1 having count(*)>=10 and count(distinct session_id)>=5
   ), words as (
     select props->>'word_id' as id,count(*) as events,count(distinct session_id) as sessions,date_trunc('hour',max(ts)) as last_at
     from eligible where surface='activity_2029' and event_type in ('search','select')
       and props ? 'word_id' group by props->>'word_id'
     having count(*)>=10 and count(distinct session_id)>=5
   )
   select jsonb_build_object(
     'version',1,'hours',h,'source','events','timezone','Asia/Jerusalem','from',now()-make_interval(hours=>h),'to',now(),
     -- Freshness is published only for a window that itself meets the privacy floor and
     -- only at hour granularity; an exact max(ts) would disclose one person's action time.
     'latest_event',(select date_trunc('hour',max(ts)) from eligible
       having count(*)>=10 and count(distinct session_id)>=5),
     'numbers',coalesce((select jsonb_agg(to_jsonb(n.*)) from (select * from numbers order by events desc,n limit 8)n),'[]'::jsonb),
     'word_refs',coalesce((select jsonb_agg(to_jsonb(w)) from (select * from words order by events desc,id limit 8)w),'[]'::jsonb),
     'content_refs',coalesce((select jsonb_agg(jsonb_build_object('slug',c.slug,'events',c.events)) from (select * from posts_viewed order by events desc,slug limit 8)c),'[]'::jsonb),
     'trend',coalesce((select jsonb_agg(to_jsonb(t)) from (
       select surface,event_type,
         count(*) filter(where ts>=now()-make_interval(hours=>h)/2) as recent,
         count(*) filter(where ts<now()-make_interval(hours=>h)/2) as earlier
       from eligible where surface='activity_2029' and event_type in ('compute','search','save')
       group by surface,event_type
       having count(*) filter(where ts>=now()-make_interval(hours=>h)/2)>=10
         and count(*) filter(where ts<now()-make_interval(hours=>h)/2)>=10
         and count(distinct session_id) filter(where ts>=now()-make_interval(hours=>h)/2)>=5
         and count(distinct session_id) filter(where ts<now()-make_interval(hours=>h)/2)>=5
     )t),'[]'::jsonb),
     'activity',coalesce((select jsonb_agg(to_jsonb(a)) from (
       select surface,event_type,count(*) as events from eligible
       where (surface='activity_2029' and event_type in ('compute','search','save'))
          or (surface='journey_2029' and event_type='start')
          or (surface='els' and event_type in ('search','cross_search'))
       group by surface,event_type having count(*)>=10 and count(distinct session_id)>=5
     ) a),'[]'::jsonb)
   ) into payload;
   perform set_config('enable_nestloop',nestloop,true);
   stamp:=now();
   insert into public.analytics_cache(cache_key,payload,computed_at,cache_kind,producer,producer_version,input_identity,expires_at,billable_state)
   values(k,payload,stamp,'memoized_result','fn_ti_activity_pulse2029',public.analytics_cache_producer_version_v1('fn_ti_activity_pulse2029'),k,stamp+interval '60 seconds','NOT_BILLABLE')
   on conflict(cache_key) do update set payload=excluded.payload,computed_at=excluded.computed_at,
     producer_version=excluded.producer_version,expires_at=excluded.expires_at,invalidated_at=null;
 end if;
 -- Never return cached text or identities. Recheck live publication even on hits.
 return (payload-'word_refs'-'numbers'-'content_refs') || jsonb_build_object('computed_at',stamp,
   'state',case when payload->>'latest_event' is null then 'no_data'
     when (payload->>'latest_event')::timestamptz<now()-interval '24 hours' then 'stale' else 'measured' end,
   'numbers',coalesce((select jsonb_agg(jsonb_build_object('n',x.n,'events',x.events,'last_at',x.last_at))
     from jsonb_to_recordset(payload->'numbers') x(n integer,events bigint,last_at timestamptz)
     where exists(select 1 from public.gematria_words g where g.ragil=x.n and public.gematria_public_word_eligible(g.id))),'[]'::jsonb),
   'phrases',coalesce((select jsonb_agg(jsonb_build_object('phrase',g.phrase,'value',g.ragil,'events',x.events))
     from jsonb_to_recordset(payload->'word_refs') x(id text,events bigint)
     join public.gematria_words g on g.id::text=x.id
     where g.public_trend_approved and public.gematria_public_word_eligible(g.id)),'[]'::jsonb),
   -- Same visibility as the anon posts policy (posts_anon_read): never a draft.
   'content',coalesce((select jsonb_agg(jsonb_build_object('title',p.title,'href','/post/'||p.slug,'events',x.events) order by x.events desc)
     from jsonb_to_recordset(payload->'content_refs') x(slug text,events bigint)
     join public.posts p on p.slug=x.slug
     where not coalesce(p.tags,'{}'::text[]) && array['טיוטה'::text] and p.title is not null),'[]'::jsonb),
   'publications',jsonb_build_object(
     'approved_convergences',(select count(*) from public.topic_cards_public),
     'public_ciphers',(select count(*) from public.els_records where status='published' and visibility='public' and not coalesce(home_hidden,false))),
   'threshold',jsonb_build_object('events',10,'sessions',5),
   'coverage','clean_human_only; unknown excluded; no historical reconstruction');
end $function$

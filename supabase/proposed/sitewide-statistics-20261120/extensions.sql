-- PROPOSAL ONLY. Traffic Intelligence v11, existing events/cache/corpus owners.
-- A marker on the canonical word, NOT a second phrase registry. Default deny.
alter table public.gematria_words add column if not exists public_trend_approved boolean not null default false;

create or replace function public.gematria_public_word_eligible(p_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.gematria_words g where g.id=p_id
   and g.is_verified is true and g.is_published is true
   and coalesce(g.is_encrypted,false)=false and coalesce(g.visibility_tier,0)>=0
   and not exists(select 1 from public.gematria_blocklist b where position(b.pattern in g.phrase)>0)
   and not exists(select 1 from public.gematria_wall w where w.private is true and w.phrase=g.phrase))
$$;
revoke all on function public.gematria_public_word_eligible(uuid) from public,anon,authenticated;

-- All public callers, including suggestions/direct REST, must obey the same floor.
-- Restrictive policies compose with the current public read policy rather than replacing it.
create policy ti_public_word_floor on public.gematria_words as restrictive for select to anon,authenticated
using (public.rd_is_admin() or public.gematria_public_word_eligible(id));
-- Gematria corpus owner helper (not TI). RLS needs EXECUTE; it returns only eligibility, never phrase data.
grant execute on function public.gematria_public_word_eligible(uuid) to anon,authenticated;
-- #1461 owner decision 20.11.2026: gematria_wall is frozen history (typing writes, no consent,
-- no writes since 2026-11-04). It is no live metric and no client source: server-only read.
-- Rows are kept for audit; gematria_public_word_eligible still reads it (definer) for private=true.
create policy ti_wall_history_server_only on public.gematria_wall as restrictive for select to anon,authenticated
using (false);
-- search_log: frozen raw free-text history without recorded consent (no writes since 2026-11-09).
-- Server-only for every client role, admins included; rows are retained for audit/retention policy.
drop policy if exists ti_search_history_server_only on public.search_log; -- may pre-exist from search-log-floor.standalone.psql
create policy ti_search_history_server_only on public.search_log as restrictive for select to anon,authenticated
using (false);
-- Historic data is retained. Anonymous free-text writes cannot establish consent.
drop policy if exists ti_search_no_new_raw on public.search_log;
create policy ti_search_no_new_raw on public.search_log as restrictive for insert to anon,authenticated
with check (false);

create or replace function public.add_wall_word(p_phrase text,p_ragil integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- Retired write surface. Keep the ABI for old clients; never republish hidden rows.
 return;
end $$;

create or replace function public.fn_ti_surface2029(p text)
returns text language sql immutable as $$
 select case
 when p in ('/','/2029') then 'home'
 when p ~ '^/(2029/)?(now|global-now)' then 'now'
 when p ~ '^/(2029/)?(world|topic)' then 'world'
 when p ~ '^/(2029/)?(calculator-pro|gematria-pro)' then 'calculator_advanced'
 when p ~ '^/(2029/)?(gematria|calculator)' or p='/community/calculator' then 'calculator'
 when p ~ '^/(2029/)?codes' then 'cipher'
 when p ~ '^/(2029/)?(els|tzofen|code)' then 'els'
 when p ~ '^/(2029/)?(cipher|ciphers)' then 'cipher'
 when p ~ '^/(2029/)?number' then 'number'
 when p ~ '^/(2029/)?(post|tag|category)' then 'posts'
 when p ~ '^/(2029/)?book' then 'books'
 when p ~ '^/(2029/)?(video|media|or-geula)' then 'videos'
 when p ~ '^/(2029/)?community' then 'community'
 when p ~ '^/(2029/)?(members|researcher|forum)(/|$)' then 'community'
 when p ~ '^/(2029/)?(journey|life-journey)(/|$)' then 'journey'
 when p ~ '^/(2029/)?heichal' then 'heichal'
 when p ~ '^/(2029/)?me(/|$)' then 'personal'
 when p ~ '^/(2029/)?raziel' then 'raziel'
 else 'other' end
$$;
-- TI v4: fn_ti_* is server-only; only definer readers call this mapping.
revoke all on function public.fn_ti_surface2029(text) from public,anon,authenticated;

-- Public aggregate reader in the EXISTING fn_ti family, using the EXISTING cache.
-- Only aggregate counts and corpus references are cached; words are checked again
-- AFTER every cache read. No search_log/wall hit count feeds this projection.
create or replace function public.fn_ti_activity_pulse2029(p_hours integer default 24)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
 return (payload-'word_refs'-'numbers') || jsonb_build_object('computed_at',stamp,
   'state',case when payload->>'latest_event' is null then 'no_data'
     when (payload->>'latest_event')::timestamptz<now()-interval '24 hours' then 'stale' else 'measured' end,
   'numbers',coalesce((select jsonb_agg(jsonb_build_object('n',x.n,'events',x.events,'last_at',x.last_at))
     from jsonb_to_recordset(payload->'numbers') x(n integer,events bigint,last_at timestamptz)
     where exists(select 1 from public.gematria_words g where g.ragil=x.n and public.gematria_public_word_eligible(g.id))),'[]'::jsonb),
   'phrases',coalesce((select jsonb_agg(jsonb_build_object('phrase',g.phrase,'value',g.ragil,'events',x.events))
     from jsonb_to_recordset(payload->'word_refs') x(id text,events bigint)
     join public.gematria_words g on g.id::text=x.id
     where g.public_trend_approved and public.gematria_public_word_eligible(g.id)),'[]'::jsonb),
   'publications',jsonb_build_object(
     'approved_convergences',(select count(*) from public.topic_cards_public),
     'public_ciphers',(select count(*) from public.els_records where status='published' and visibility='public' and not coalesce(home_hidden,false))),
   'threshold',jsonb_build_object('events',10,'sessions',5),
   'coverage','clean_human_only; unknown excluded; no historical reconstruction');
end $$;
-- TI v4: the fn_ti_* family is server-only (postgres). The producer stays inside it.
revoke all on function public.fn_ti_activity_pulse2029(integer) from public,anon,authenticated;

-- The ONE public projection (TI v9 System Pulse) is a thin wrapper outside the fn_ti_*
-- namespace: it accepts only the three bounded windows and returns the producer's
-- already-floored, already-rechecked output. It widens no internal TI grant.
create or replace function public.research_pulse_2029(p_hours integer default 24)
returns jsonb language sql volatile security definer set search_path=public,pg_temp as $$
 select public.fn_ti_activity_pulse2029(case when p_hours in (24,168,720) then p_hours else 24 end)
$$;
revoke all on function public.research_pulse_2029(integer) from public;
grant execute on function public.research_pulse_2029(integer) to anon,authenticated;

-- Keep the existing ABI but consume the same safe read model. No legacy cached
-- lead text or expression-derived numbers can escape via this alternate API.
create or replace function public.recent_number_opens(lim integer default 8)
returns table(n integer,opens bigint,last_at timestamptz,lead text)
language sql security definer set search_path=public,pg_temp as $$
 select x.n,x.events,x.last_at,null::text
 from jsonb_to_recordset(public.fn_ti_activity_pulse2029(24)->'numbers') x(n integer,events bigint,last_at timestamptz)
 limit greatest(1,least(coalesce(lim,8),24))
$$;

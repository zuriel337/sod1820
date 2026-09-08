-- HOME_RECENT_NUMBERS_CLEAN_PROJECTION_V1 — remove bot/UNKNOWN amplification from the
-- public "recent numbers" Home meter.
-- Order: work_log 9b3ddbbb-3311-4410-b76b-e8d1de8b4f09 (Human-Gate ZURIEL "תעשה את זה").
-- OWNER CHECK=EXTEND_EXISTING: same public.recent_number_opens signature/return columns,
-- same public.analytics_cache/_analytics_cache_on caching layer, same RecentNumbers.jsx
-- component. No new table/store/cache/engine. Legacy public.page_views is left completely
-- untouched (still legacy provenance, still written by EntityPage's logView) — this
-- function simply stops reading it as its source.
--
-- Root problem this fixes: the previous version counted every raw page_views(kind=number)
-- row over 14 days, with no bot/session-quality filtering at all. Live proof at the time
-- of writing (24h window, same entity-parsing as this function): number 450 = 5 sessions,
-- 100% clean_classification=unknown, 0% human; number 140 = 2 sessions, 100% unknown.
-- Both would keep surfacing on the public Home meter forever under the old raw count.
-- Meanwhile 1820 = 2 sessions, 100% clean_classification=human — a real number people are
-- actually reading. This migration switches the source to canonical PAGE_VIEW events
-- (surface='page' AND event_type='view') restricted to sessions Clean Traffic v1
-- (fn_ti_clean_classification, untouched/frozen here) classifies as clean_classification=
-- 'human' — UNKNOWN and BOT sessions no longer count as an "open" in this public
-- projection at all.
CREATE OR REPLACE FUNCTION public.recent_number_opens(lim integer DEFAULT 8)
RETURNS TABLE(n integer, opens bigint, last_at timestamp with time zone, lead text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_lim int := greatest(1, least(lim, 24));
  -- Cache key is versioned (clean_v1) so it never collides with any stale entry a prior
  -- shape of this function might have left in analytics_cache.
  v_key text := 'recent_number_opens_clean_v1:'||v_lim;
  v_on boolean := public._analytics_cache_on();
  v_payload jsonb;
begin
  if v_on then
    -- 20-minute global TTL (within the dispatch's 15-30m band). A cache HIT never touches
    -- fn_ti_clean_classification — the expensive join only runs on a cold/expired key,
    -- at most once globally per TTL window, regardless of how many browsers are polling.
    select payload into v_payload from public.analytics_cache
    where cache_key = v_key and computed_at > now() - interval '20 minutes';
  end if;

  if v_payload is null then
    with raw as (
      -- Canonical PAGE_VIEW only (same definition used across the fn_ti_* family):
      -- surface='page' AND event_type='view'. Bounded to a genuinely-recent 24h window
      -- instead of the old 14-day legacy window.
      select e.session_id, e.ts, e.path
      from public.events e
      where e.session_id is not null
        and e.surface = 'page' and e.event_type = 'view'
        and e.path ~ '^/number/'
        and e.ts >= now() - interval '24 hours'
    ),
    parsed as (
      -- Same entity-value resolution as the existing TI entity parsing (fn_ti_entity_
      -- demand_sessions): numeric slug -> integer directly (bounded to 1-5 digits so an
      -- absurd path like /number/<20-digit-garbage> never overflows integer instead of
      -- being rejected by the range check below); otherwise url_decode + fn_ragil.
      select r.session_id, r.ts,
        case when regexp_replace(r.path, '^/number/', '') ~ '^[0-9]{1,5}$'
          then regexp_replace(r.path, '^/number/', '')::int
          else nullif(public.fn_ragil(public.url_decode(regexp_replace(r.path, '^/number/', ''))), 0)
        end as num
      from raw r
    ),
    valid as (
      -- Same bounds/existence guard as the previous version: 1..99999, and the number
      -- must actually have a gematria expression in the corpus (excludes meaningless/
      -- junk numeric paths).
      select p.session_id, p.ts, p.num
      from parsed p
      where p.num between 1 and 99999
        and exists (select 1 from public.gematria_words g where g.ragil = p.num)
    ),
    clean as (
      -- Clean Traffic v1 is frozen/untouched here. Called over a 2-day UTC date window
      -- (yesterday+today) — enough to safely cover any session touching the last 24h
      -- regardless of time-of-day, since Clean v1 itself filters by e.ts::date.
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
      -- Identical lead-phrase selection as the previous version.
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

  -- Sanitized output only: n/opens/last_at/lead. No session_id/person/sod_id/clean_evidence
  -- is ever exposed by this public-callable function.
  return query
  select x.n, x.opens, x.last_at, x.lead
  from jsonb_to_recordset(v_payload) as x(n integer, opens bigint, last_at timestamptz, lead text);
end
$function$;

-- Grants intentionally untouched by this migration: CREATE OR REPLACE preserves the
-- existing EXECUTE grants (PUBLIC/anon/authenticated/postgres), matching the dispatch's
-- "preserve intended PUBLIC/anon/authenticated access to this sanitized projection".

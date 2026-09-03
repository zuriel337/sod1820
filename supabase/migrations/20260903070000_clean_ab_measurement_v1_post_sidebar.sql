-- CLEAN_AB_MEASUREMENT_V1 — post_sidebar_v1 measurement fix.
-- Uses ONLY existing infrastructure: Behavioral Bot v3 (fn_human_entrances) via the
-- existing fn_ti_clean_classification (Clean Traffic Classification). No new bot engine,
-- no new table, no change to fn_ti_clean_classification/fn_human_entrances/variant
-- assignment (postExperiment.js variantFor/hash32 untouched), no change to sidebar UI.
--
-- Root problem this fixes: there was NO report at all for post_sidebar_v1 — only raw
-- client-side event writes (trackExp/track/emit). This migration adds a read-only
-- PROJECTION layer that attributes every event in a session to
-- {experiment, variant, session_id, visitor_id} by joining on session_id to the
-- session's entry marker (events.surface='post_exp', event_type='post_view') — instead
-- of writing variant physically onto every event row (which the task explicitly asked
-- to avoid). This works even for events whose own props never carried the experiment
-- tag (a pre-existing client bug in events.js, fixed separately in this same change —
-- see src/lib/events.js), because attribution here is by session_id membership, not by
-- reading the tag on each individual row.
--
-- Canonical source decision (verified live against the last 48h before writing this):
--   events       = canonical source for ALL post_sidebar_v1 report metrics. It is the
--                  only one of the two pipelines that carries session_id on (basically)
--                  every row, which is required for session-level experiment attribution
--                  and for joining to fn_ti_clean_classification (itself events-based).
--   visitor_events = NOT session-attributable for this experiment (no session_id column
--                  at all, except inside meta for the 4 explicit post_exp rows). Kept as
--                  a raw diagnostic/cross-check total only — never as the basis for the
--                  A/B decision. The two pipelines' counts differ for two confirmed,
--                  structural reasons (not a bug to "line up"):
--                    1) ingest_event() intentionally drops client-flagged bot events
--                       before they reach `events` (visitor_events has zero such
--                       filtering) — this alone explains most of the post_view/
--                       layout_present gap (479 vs 329 in the last 48h at the time of
--                       writing).
--                    2) story_open/story_view (and other high-frequency rapid-fire
--                       events fired while swiping through the sidebar's story rail)
--                       dual-write via two independent fire-and-forget requests
--                       (visitor_events insert + events RPC); the RPC leg is more
--                       likely to be aborted by immediate navigation/unmount, which is
--                       the dominant cause of the much larger story_open/story_view gap
--                       (87 vs 7 in the same window). This affects sidebar_on and
--                       sidebar_off equally, so it does not bias the A/B comparison —
--                       it only means absolute story counts are undercounted in
--                       `events`. Not "fixed" here: doing so would mean changing the
--                       global track()/emit() fire-and-forget transport, which is far
--                       outside this task's scope and risks breaking the existing
--                       pipeline for every other feature that uses it.

-- ── 1) Canonical session→variant projection for post_sidebar_v1 ──────────────────────
-- One row per session that entered the experiment (the entry marker is written exactly
-- once per session per post, guarded client-side by expLoggedRef in legacy.jsx).
-- Server-only (agent/service-role-only), matching the fn_ti_*/fn_human_entrances
-- convention (rls_client_read_protocol posture for this function family).
CREATE OR REPLACE FUNCTION public.fn_exp_post_sidebar_sessions(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE(
  session_id text,
  visitor_id text,
  variant text,
  entry_ts timestamptz,
  post_slug text,
  landing_path text,
  landing_source text,
  device text,
  app_context text,
  country text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select distinct on (e.session_id)
    e.session_id,
    e.sod_id as visitor_id,
    e.props->>'variant' as variant,
    e.ts as entry_ts,
    e.props->>'post_slug' as post_slug,
    e.props->>'landing_path' as landing_path,
    e.props->>'source' as landing_source,
    e.device,
    e.app_context,
    e.props->>'country' as country
  from public.events e
  where e.surface = 'post_exp'
    and e.event_type = 'post_view'
    and e.session_id is not null
    and e.props->>'experiment' = 'post_sidebar_v1'
    and e.props->>'variant' in ('sidebar_on', 'sidebar_off')
    and (p_from is null or e.ts >= p_from)
    and (p_to   is null or e.ts <= p_to)
  order by e.session_id, e.ts asc;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_exp_post_sidebar_sessions(timestamptz, timestamptz) FROM PUBLIC;

-- ── 2) Full A/B report — Clean Traffic Classification wired in ───────────────────────
-- HUMAN | UNKNOWN | BOT per session (from fn_ti_clean_classification, unmodified).
-- Decision metrics computed ONLY over clean_classification='human' sessions.
-- Human-Gate: no decision surfaced before p_human_gate (default 500) CLEAN HUMAN
-- sessions in BOTH variants — the caller (admin UI) renders COLLECTING vs READY from
-- the `human_gate` object; this function does not hide the raw counts, it just marks
-- readiness so the UI never has to guess.
-- Admin-gated (not the looser admin_journey_experiments precedent): this report
-- exposes per-bucket country/device diagnostics, which deserves a real authorization
-- check, same pattern as admin_worklog_update.
CREATE OR REPLACE FUNCTION public.admin_post_sidebar_experiment_report(
  p_from timestamptz DEFAULT (now() - interval '48 hours'),
  p_to   timestamptz DEFAULT now(),
  p_human_gate integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  with entry as (
    select * from public.fn_exp_post_sidebar_sessions(p_from, p_to)
  ),
  clean as (
    select * from public.fn_ti_clean_classification(p_from::date, p_to::date)
  ),
  -- 🩺 Contamination diagnostic #1: sessions rejected by fn_ti_clean_classification
  -- (bot/unknown) — computed below from `sessions`. But note clean_classification's
  -- `bot` bucket reads events.is_bot, which ingest_event() forces to false/drops before
  -- a bot-flagged event ever reaches `events` — so a session already excluded there
  -- never even appears in `entry`. Contamination diagnostic #2 (this CTE) recovers that
  -- population: the UNFILTERED raw entrants from visitor_events (zero bot filtering),
  -- so "ingestion_dropped" below is the real client-side-bot-rejection count.
  ve_raw as (
    select distinct
      ve.meta->>'session_id' as session_id,
      ve.meta->>'variant' as variant
    from public.visitor_events ve
    where ve.section = 'post_exp'
      and ve.event_type = 'post_view'
      and ve.meta->>'experiment' = 'post_sidebar_v1'
      and ve.meta->>'variant' in ('sidebar_on', 'sidebar_off')
      and ve.created_at >= p_from and ve.created_at <= p_to
      and ve.meta->>'session_id' is not null
  ),
  sessions as (
    select
      en.*,
      coalesce(cl.clean_classification, 'unknown') as classification,
      -- ⚠️ lower() is load-bearing, not cosmetic: location.pathname (landing_path) is
      -- browser-normalized to UPPERCASE percent-encoding (%D7%AA…) while post.slug
      -- (post_slug) is stored lowercase-encoded (%d7%aa…) for any Hebrew slug — verified
      -- live on 2026-09-03 (every Hebrew-slugged session was misclassified as "internal"
      -- without this). Without lower() the comparison silently fails for ~all Hebrew posts.
      (lower(en.landing_path) = lower(en.post_slug)) as is_external_landing,
      case
        when lower(en.landing_path) is distinct from lower(en.post_slug) then 'internal'
        when en.landing_source = 'google'   then 'google'
        when en.landing_source = 'facebook' then 'facebook'
        when en.landing_source = 'whatsapp' then 'whatsapp'
        when en.landing_source = 'ישיר'      then 'direct'
        else 'other'
      end as channel_bucket
    from entry en
    left join clean cl using (session_id)
  ),
  -- 🔗 Projection: every events row belonging to a session that entered the experiment,
  -- from entry_ts onward, is attributed to {experiment, variant, session_id, visitor_id}
  -- by this join — regardless of whether the row's own props carry the experiment tag.
  -- 10s buffer absorbs write-order jitter between the two independent fire-and-forget
  -- inserts that fire almost simultaneously on post load (entry marker vs page/view).
  ev as (
    select e.*, s.session_id as s_session_id, s.variant as s_variant
    from public.events e
    join sessions s
      on s.session_id = e.session_id
     and e.ts >= s.entry_ts - interval '10 seconds'
     and e.ts <= p_to
  ),
  per_session_metrics as (
    select
      s.session_id,
      s.variant,
      s.classification,
      count(*) filter (where ev.surface = 'page' and ev.event_type = 'view') as page_views,
      count(*) filter (where ev.surface = 'post_exp' and ev.event_type = 'scroll_depth' and ev.props->>'depth' = '75') as scroll75_hits,
      count(*) filter (where ev.surface = 'post_exp' and ev.event_type = 'scroll_depth' and ev.props->>'depth' = '90') as scroll90_hits,
      count(*) filter (where ev.surface = 'post_exp' and ev.event_type = 'internal_link_click') as internal_clicks,
      count(*) filter (where ev.event_type in ('search', 'cross_search')) as search_n,
      count(*) filter (where ev.event_type = 'compute') as compute_n,
      count(*) filter (where ev.event_type in ('share', 'share_story')) as share_n,
      count(*) filter (where ev.event_type = 'story_open') as story_open_n,
      count(*) filter (where ev.event_type = 'story_view') as story_view_n
    from sessions s
    left join ev on ev.s_session_id = s.session_id
    group by s.session_id, s.variant, s.classification
  ),
  variant_summary as (
    select
      variant,
      count(*) as raw_sessions,
      count(*) filter (where classification = 'human')  as human_sessions,
      count(*) filter (where classification = 'unknown') as unknown_sessions,
      count(*) filter (where classification = 'bot')     as bot_sessions
    from sessions
    group by variant
  ),
  human_metrics as (
    select
      variant,
      count(*) as n,
      avg(page_views)::numeric(10,3) as views_per_session,
      (count(*) filter (where page_views >= 2))::numeric   / nullif(count(*), 0) as second_page_rate,
      (count(*) filter (where page_views <= 1))::numeric   / nullif(count(*), 0) as exit_after_post_rate,
      (count(*) filter (where scroll75_hits > 0))::numeric / nullif(count(*), 0) as scroll75_rate,
      (count(*) filter (where scroll90_hits > 0))::numeric / nullif(count(*), 0) as scroll90_rate,
      avg(internal_clicks)::numeric(10,3) as internal_clicks_avg,
      avg(search_n)::numeric(10,3)  as search_avg,
      avg(compute_n)::numeric(10,3) as compute_avg,
      avg(share_n)::numeric(10,3)   as share_avg,
      (count(*) filter (where story_open_n > 0))::numeric / nullif(count(*), 0) as story_open_rate,
      (count(*) filter (where story_view_n > 0))::numeric / nullif(count(*), 0) as story_view_rate
    from per_session_metrics
    where classification = 'human'
    group by variant
  ),
  landing_breakdown as (
    select
      variant,
      count(*) filter (where is_external_landing)     as external_n,
      count(*) filter (where not is_external_landing) as internal_n,
      count(*) filter (where channel_bucket = 'google')   as ch_google,
      count(*) filter (where channel_bucket = 'facebook') as ch_facebook,
      count(*) filter (where channel_bucket = 'whatsapp') as ch_whatsapp,
      count(*) filter (where channel_bucket = 'direct')   as ch_direct,
      count(*) filter (where channel_bucket = 'other')    as ch_other
    from sessions
    where classification = 'human'
    group by variant
  ),
  -- Contamination diagnostics: raw sessions rejected as BOT / left as UNKNOWN.
  -- country/device are evidence/debug dimensions ONLY — never a filter or blocking rule
  -- anywhere in this function (matches live_state_resolution_law / behavioral bot v3
  -- posture: country is not, and must never become, a gate).
  contamination as (
    select variant, classification, coalesce(country, 'unknown') as country, coalesce(device, 'unknown') as device, count(*) as n
    from sessions
    where classification in ('bot', 'unknown')
    group by variant, classification, country, device
  ),
  ingestion_dropped as (
    -- present in the unfiltered visitor_events raw population but never reached `events`
    -- at all (ingest_event() drops client-flagged-bot events before insert) — this is
    -- the true "rejected as BOT" count, not clean_classification's bot bucket (which can
    -- only ever be 0 for this pipeline; see note on ve_raw above).
    select v.variant, count(*) as n
    from ve_raw v
    left join entry en on en.session_id = v.session_id
    where en.session_id is null
    group by v.variant
  ),
  ve_raw_summary as (
    select variant, count(*) as raw_sessions_unfiltered from ve_raw group by variant
  ),
  gate as (
    select
      jsonb_object_agg(variant, jsonb_build_object(
        'human_sessions', human_sessions, 'threshold', p_human_gate, 'ready', human_sessions >= p_human_gate
      )) as by_variant,
      bool_and(human_sessions >= p_human_gate) and count(*) = 2 as decision_ready
    from variant_summary
  ),
  stats_in as (
    select
      (select second_page_rate from human_metrics where variant = 'sidebar_on')  as p_on,
      (select second_page_rate from human_metrics where variant = 'sidebar_off') as p_off,
      (select n from human_metrics where variant = 'sidebar_on')  as n_on,
      (select n from human_metrics where variant = 'sidebar_off') as n_off
  ),
  stats_calc as (
    select
      p_on, p_off, n_on, n_off,
      case when (n_on + n_off) > 0 then (p_on * n_on + p_off * n_off) / (n_on + n_off) else null end as p_pool
    from stats_in
  ),
  stats_z as (
    select
      p_on, p_off, n_on, n_off, p_pool,
      case when p_pool is not null and n_on > 0 and n_off > 0
        then sqrt(p_pool * (1 - p_pool) * (1.0 / n_on + 1.0 / n_off))
        else null
      end as se
    from stats_calc
  )
  select jsonb_build_object(
    'window', jsonb_build_object('from', p_from, 'to', p_to),
    'human_gate', (select by_variant from gate),
    'decision_ready', coalesce((select decision_ready from gate), false),
    'variant_summary', coalesce((select jsonb_agg(to_jsonb(v) order by v.variant) from variant_summary v), '[]'::jsonb),
    'human_metrics', coalesce((select jsonb_agg(to_jsonb(h) order by h.variant) from human_metrics h), '[]'::jsonb),
    'landing_breakdown', coalesce((select jsonb_agg(to_jsonb(l) order by l.variant) from landing_breakdown l), '[]'::jsonb),
    'contamination_debug', coalesce((select jsonb_agg(to_jsonb(c) order by c.variant, c.classification, c.n desc) from contamination c), '[]'::jsonb),
    'ingestion_dropped_debug', jsonb_build_object(
      'note', 'sessions present in raw visitor_events but never reached events at all — ingest_event() drops client-flagged-bot events before insert. This is the real BOT-rejection count; clean_classification''s own bot bucket (in variant_summary) is structurally always 0 for this pipeline because those events never arrive here to begin with.',
      'by_variant', coalesce((
        select jsonb_object_agg(coalesce(r.variant, u.variant), jsonb_build_object(
          'raw_sessions_unfiltered', coalesce(r.raw_sessions_unfiltered, 0),
          'dropped_at_ingestion', coalesce(u.n, 0)
        ))
        from ve_raw_summary r
        full outer join ingestion_dropped u on u.variant = r.variant
      ), '{}'::jsonb)
    ),
    'stat_test', (
      select case
        when se is null or n_on is null or n_off is null or n_on = 0 or n_off = 0 then
          jsonb_build_object('available', false, 'reason', 'insufficient_data', 'metric', 'second_page_rate')
        else
          jsonb_build_object(
            'available', true,
            'metric', 'second_page_rate',
            'p_sidebar_on', p_on, 'p_sidebar_off', p_off,
            'n_sidebar_on', n_on, 'n_sidebar_off', n_off,
            'z', case when se > 0 then (p_on - p_off) / se else null end,
            'significant_95', case when se > 0 then (abs(p_on - p_off) / se) >= 1.96 else false end
          )
      end
      from stats_z
    )
  ) into v_result;

  return v_result;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_post_sidebar_experiment_report(timestamptz, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_post_sidebar_experiment_report(timestamptz, timestamptz, integer) TO authenticated;

-- ── 3) Raw diagnostic totals from visitor_events (audit/cross-check ONLY — never used
--       for the A/B decision; see rationale in the header comment above). ────────────
CREATE OR REPLACE FUNCTION public.admin_post_sidebar_raw_counts(
  p_from timestamptz DEFAULT (now() - interval '48 hours'),
  p_to   timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'not authorized';
  end if;

  with ve as (
    select
      coalesce(section, 'null') as bucket, event_type, count(*) as n
    from public.visitor_events
    where created_at >= p_from and created_at <= p_to
      and (
        section in ('post_exp', 'els', 'gematria', 'share', 'or-geula', 'tzofon', 'dim5')
        or event_type in ('story_open', 'story_view', 'search', 'cross_search', 'compute',
                           'share', 'share_story', 'post_view', 'layout_present',
                           'scroll_depth', 'internal_link_click')
      )
    group by 1, 2
  ),
  ev as (
    select
      coalesce(surface, 'null') as bucket, event_type, count(*) as n
    from public.events
    where ts >= p_from and ts <= p_to
      and (
        surface in ('post_exp', 'els', 'gematria', 'share', 'or-geula', 'tzofon', 'dim5', 'page')
        or event_type in ('story_open', 'story_view', 'search', 'cross_search', 'compute',
                           'share', 'share_story', 'post_view', 'layout_present',
                           'scroll_depth', 'internal_link_click')
      )
    group by 1, 2
  )
  select jsonb_build_object(
    'window', jsonb_build_object('from', p_from, 'to', p_to),
    'canonical_source_note', 'events = canonical for post_sidebar_v1 report; visitor_events = raw diagnostic only (no session_id column, cannot be session-attributed for these event types)',
    'visitor_events', coalesce((select jsonb_agg(to_jsonb(x) order by x.bucket, x.event_type) from ve x), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(x) order by x.bucket, x.event_type) from ev x), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_post_sidebar_raw_counts(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_post_sidebar_raw_counts(timestamptz, timestamptz) TO authenticated;

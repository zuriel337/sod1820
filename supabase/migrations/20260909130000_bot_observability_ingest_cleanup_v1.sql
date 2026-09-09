-- BOT_OBSERVABILITY_INGEST_CLEANUP_V1 (2026-09-09)
-- Closes work_log handoff BOT_CLASSIFICATION_ON_PROMINENCE_PATH (7c0186b5), reassigned to
-- CLAUDE by the Human Gate after it went unACKed by the analytics workstream.
--
-- OWNER CHECK = EXTEND_EXISTING. This migration changes NO Traffic Intelligence semantics.
-- It does not touch fn_ti_clean_classification, fn_human_entrances, traffic_daily,
-- refresh_traffic_daily, traffic_day_detail, fn_metatron_funnel, journey_pulse or
-- audience_cohort_v1. Human/Bot/Unknown remains defined solely by traffic_intelligence_law.
-- crawl_daily and edge_geo_log remain the SEPARATE, canonical crawl evidence and are
-- deliberately NOT merged into any human/TI denominator here.
--
-- Two things are done, both narrow:
--   (1) the legacy 13-argument ingest_event overload is dropped;
--   (2) events.is_bot and the surviving overload are documented at the source.

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) DROP the legacy, unguarded 13-argument overload.
--
-- WHY THIS BREAKS NOTHING — verified live before writing this migration:
--   * PostgREST resolves RPC ONLY by named parameters. A 13-named-argument call today
--     fails with SQLSTATE 42725 "function public.ingest_event(...) is not unique"
--     (probed inside begin/rollback; zero rows written). So no PostgREST client can
--     currently be calling this overload successfully — it is unreachable, not merely unused.
--   * All three repository callers send p_is_bot explicitly and therefore already resolve
--     to the 14-argument guarded overload:
--       src/lib/events.js      (emit)
--       src/lib/identity.js    (legacy_identity_conflict)
--       src/lib/engagement.js  (engagement flush)
--   * No other database function calls it. The single pg_proc text match,
--     admin_post_sidebar_experiment_report, only mentions the name inside an explanatory
--     JSON note string.
--   * pg_stat_user_functions could not be used as evidence (track_functions = 'none'),
--     which is precisely why the ambiguity proof above was used instead.
--
-- WHY IT IS AN IMPROVEMENT, not just a removal:
--   * Removing the ambiguity means a 13-parameter call STOPS erroring and starts resolving
--     deterministically to the guarded 14-argument overload (p_is_bot defaults to false).
--   * The dropped overload was granted EXECUTE to anon, authenticated and PUBLIC while
--     carrying no bot guard, so it was a client-reachable path for recording a
--     bot-originated event as human — the exact invariant BOT_READ_NO_SIDE_EFFECT_V1
--     (PR #411, live) was shipped to protect.
--
-- REVERSIBILITY — restore verbatim with:
--   CREATE OR REPLACE FUNCTION public.ingest_event(p_sod_id text, p_surface text,
--     p_event_type text, p_path text DEFAULT NULL::text, p_ref_host text DEFAULT NULL::text,
--     p_via text DEFAULT NULL::text, p_app_context text DEFAULT NULL::text,
--     p_device text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text,
--     p_journey_id text DEFAULT NULL::text, p_depth smallint DEFAULT NULL::smallint,
--     p_utm jsonb DEFAULT NULL::jsonb, p_props jsonb DEFAULT NULL::jsonb)
--   RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
--   declare v_person uuid;
--   begin
--     v_person := public.resolve_person(p_sod_id, p_app_context, p_via);
--     insert into events (ts, sod_id, person_id, session_id, surface, event_type, path,
--                         ref_host, via, app_context, device, journey_id, depth_reached, utm, props)
--       values (now(), p_sod_id, v_person, p_session_id, p_surface, p_event_type, p_path,
--               p_ref_host, p_via, p_app_context, p_device, p_journey_id, p_depth, p_utm, p_props);
--   end $f$;
--   GRANT EXECUTE ON FUNCTION public.ingest_event(text,text,text,text,text,text,text,text,text,text,smallint,jsonb,jsonb) TO anon, authenticated;
DROP FUNCTION IF EXISTS public.ingest_event(
  text, text, text, text, text, text, text, text, text, text, smallint, jsonb, jsonb);

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) Document the structural truth at the source, so the next reader — human or agent —
--     cannot mistake events.is_bot for a measurement. This is metadata only: zero
--     behaviour change, no read-model touched.
COMMENT ON COLUMN public.events.is_bot IS
  'ALWAYS FALSE BY CONSTRUCTION — NOT a measure of bot volume. public.ingest_event() '
  'returns early when the client reports p_is_bot=true, and hard-codes false on insert, '
  'so a bot row can never reach this table (verified: 0 true rows out of 244,741+ all-time). '
  'Reading it as "how many bots" therefore measures the guard, not the traffic, and always '
  'yields 0. Filtering "where is_bot = false" is correct but is a no-op: `events` is a '
  'humans-only table by construction. REAL crawl/bot evidence lives in separate sources and '
  'must be read from there: public.crawl_daily and public.edge_geo_log (edge/middleware, '
  'request-level, per bot and per content bucket) and public.site_visits (which deliberately '
  'MARKS bots via its own is_bot column instead of dropping them, giving the two-meter '
  '"including bots" vs "humans only" model). Human/Bot/Unknown classification semantics are '
  'owned by traffic_intelligence_law and are not defined by this column.';

COMMENT ON FUNCTION public.ingest_event(
  text, text, text, text, text, text, text, text, text, text, smallint, jsonb, jsonb, boolean) IS
  'Canonical, and now the ONLY, ingest path for public.events. Drops client-flagged bot '
  'events before insert and writes is_bot=false, which is why events is a humans-only table '
  'and events.is_bot is never a bot-volume measure (see the column comment). The legacy '
  '13-argument overload was dropped in BOT_OBSERVABILITY_INGEST_CLEANUP_V1 (2026-09-09): it '
  'carried no bot guard, was granted to anon/authenticated/PUBLIC, and was provably '
  'unreachable over PostgREST because a 13-named-argument call was ambiguous (SQLSTATE '
  '42725). Do not reintroduce a second overload — divergent ingest paths are how the guard '
  'gets bypassed.';

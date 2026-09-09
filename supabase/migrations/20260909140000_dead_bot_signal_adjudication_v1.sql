-- DEAD_BOT_SIGNAL_ADJUDICATION_V1 (2026-09-09)
-- Adjudicates the three residual bot signals reported by BOT_OBSERVABILITY_INGEST_CLEANUP_V1
-- (work_log AFTER ec344a5b). Verdict for all three: LEAVE — each for a DIFFERENT reason.
--
-- OWNER CHECK = EXTEND_EXISTING. This migration is METADATA ONLY: three COMMENT statements.
-- No function body is rewritten, no column is dropped, no classification is changed, no crawl
-- source is rewired. Human/Bot/Unknown semantics remain owned solely by traffic_intelligence_law.
--
-- Why documentation is the deliverable rather than deletion: all three read zero because the
-- ingest guard holds, and every one of them is either unreachable, unread, or load-bearing.
-- The actual risk they carry is not that they exist — it is that a future reader mistakes a
-- structural zero for a measurement, which is exactly the defect the previous slice fixed in
-- the Growth Center. So each is labelled at the source, where the next reader will look.

-- ─────────────────────────────────────────────────────────────────────────────
-- [1] traffic_daily.bots — LEAVE AS LEGACY COMPATIBILITY.
--
-- REMOVE was rejected: public.admin_entries_daily returns `setof public.traffic_daily`, so
--   dropping this column changes that RPC's return type — a client-contract break — on a
--   Traffic-Intelligence-owned rollup.
-- REPLACE was rejected: filling it from edge_geo_log or site_visits would make a TI daily
--   rollup start carrying real bot counts, i.e. a change to Human/Bot/Unknown accounting.
--   It is also unnecessary — the real figure is ALREADY displayed from real sources.
COMMENT ON COLUMN public.traffic_daily.bots IS
  'STRUCTURALLY ALWAYS 0 — legacy compatibility column, NOT a measurement. '
  'public.refresh_traffic_daily() fills it from `events.is_bot`, which is false by '
  'construction (public.ingest_event() drops client-flagged bot events before insert), so this '
  'column has summed to 0 for its entire history — while the REAL heuristic beside it, '
  'traffic_daily.suspected, is populated (13,498 as of 2026-09-09). No SQL consumer reads this '
  'column: the eight functions over traffic_daily (admin_command_center, admin_entries_daily, '
  'admin_entries_series, admin_measurement_gap, admin_traffic_insights, admin_traffic_unified, '
  'fn_ti_summary, fn_ti_traffic_layers) all ignore it, and fn_ti_traffic_layers derives its own '
  'bots_total from edge_geo_log instead. It reaches the admin client only because '
  'admin_entries_daily does `select *`, and the frontend aggregates but never renders it. '
  'DO NOT render it and DO NOT derive a percentage or ratio from it. For real bot volume use '
  'public.edge_geo_log (kind <> ''browser''), public.crawl_daily (per bot, per content bucket) '
  'or public.site_visits (which MARKS bots rather than dropping them). Kept rather than dropped '
  'because admin_entries_daily returns `setof traffic_daily`, so removing it would change that '
  'RPC''s return type. Adjudicated in DEAD_BOT_SIGNAL_ADJUDICATION_V1.';

-- ─────────────────────────────────────────────────────────────────────────────
-- [2] fn_metatron_journey_seeds — LEAVE, but this is the one that could be cleanly removed
--     later if the Traffic Intelligence owner wants it gone. Removal buys nothing today.
COMMENT ON FUNCTION public.fn_metatron_journey_seeds(integer, boolean) IS
  'NOTE on the bot_views key: it is STRUCTURALLY ALWAYS 0 and is NOT a measurement. It counts '
  '`events.is_bot`, which is false by construction (public.ingest_event() drops client-flagged '
  'bot events before insert). Its sibling human_views/unique_humans ARE real. As of '
  'DEAD_BOT_SIGNAL_ADJUDICATION_V1 (2026-09-09) bot_views has ZERO consumers — no database '
  'reader, and nothing in the frontend, api/ or edge functions — and this function is granted '
  'to postgres only, so it is not reachable from any client. It was therefore left in place '
  'rather than edited: deleting a bot count from a Metatron/Traffic-Intelligence function body '
  'is a bot-accounting change for no benefit while nothing reads it. Of the three residual dead '
  'bot signals this is the ONLY one with no dependency at all, so it is the safest candidate '
  'for a later removal — that call belongs to the Traffic Intelligence owner. If bot_views is '
  'ever surfaced, replace it with a real source first (edge_geo_log / crawl_daily / site_visits).';

-- ─────────────────────────────────────────────────────────────────────────────
-- [3] fn_ti_clean_classification — LEAVE. This one is NOT dead weight; it is a FAIL-SAFE,
--     and it is the canonical Human/Bot/Unknown classifier, which is off-limits here.
COMMENT ON FUNCTION public.fn_ti_clean_classification(date, date) IS
  'Canonical Clean Traffic Classification (HUMAN | UNKNOWN | BOT per session). Semantics are '
  'owned by traffic_intelligence_law — do not redefine them here. NOTE on raw_is_bot: it is '
  'bool_or(events.is_bot) per session and therefore reads false today, which makes the BOT '
  'bucket structurally 0. This is NOT a dead signal and must NOT be removed as one: it reads '
  'false only BECAUSE public.ingest_event() drops client-flagged bot events before insert, so '
  'raw_is_bot is the BACKSTOP that would immediately begin catching bot rows if that guard were '
  'ever removed, bypassed, or divergent — precisely the failure mode closed in '
  'BOT_OBSERVABILITY_INGEST_CLEANUP_V1 by dropping the unguarded 13-argument ingest_event '
  'overload, which was granted to anon/authenticated and could have written bot-originated '
  'events labelled as human. Five readers depend on this function '
  '(admin_post_sidebar_experiment_report, fn_ti_entity_demand_clean_composition, '
  'fn_ti_session_metrics, fn_ti_session_anomaly, recent_number_opens). The structural zero is '
  'already disclosed honestly in the admin UI (AdminPage.jsx, "BOT כאן תמיד יוצא 0 — לא מוסתר, '
  'זה מבנה-הצנרת"). Real crawl volume is measured elsewhere: edge_geo_log / crawl_daily / '
  'site_visits. Adjudicated in DEAD_BOT_SIGNAL_ADJUDICATION_V1.';

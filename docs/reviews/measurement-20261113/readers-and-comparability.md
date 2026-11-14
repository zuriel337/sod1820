# Measurement package: who reads the numbers, and what the fix does to them

Status: analysis only. No report, view, RPC or table was changed by this package. Evidence is the repository at
`origin/main` 9be0c29fc plus the audit of 12.11.2026 (`m0-security-stabilization-20261112/measurement-audit/README.md`, in PR #1321).
The live database was **not** read for this document: where a function has no `CREATE` in `supabase/migrations`
(see `supabase/rpc-live-baseline.json`), the row says so and the definition must be read live (`pg_get_functiondef`) before relying on it.

## 1. What the package changes in what is written

| Table | Written by | Before this package (live `aa0f6bc82`) | After |
|---|---|---|---|
| `site_visits` | `track_visit` | **Two rows** for every direct entry and every hard refresh (same visitor, same path, ~100 ms apart). Audit 12.11: 15,682 of 30,277 rows in 7 days (51.8%) were that second row. In-app navigation to **another page family was refused** by the worker (403), so it was never stored; in-app navigation inside one family (post to post) was stored. | **One row per real page view**: direct entry, refresh, back, forward, and every in-app page change, for guests and members, desktop and phone. A redirect hop and an address that is replaced within 150 ms are not rows. |
| `events` surface `page`, type `engagement` | engagement flush | One extra **zero-length** flush per hard load (the first, discarded tracker). | No zero-length flush for a page view that never existed. |
| `events` surfaces `calculator_2029`, `entry_2029`, `journey_2029`, `share`, `join`, `arrival`, `content` | bounded action family (#1321, M0-F) | Nothing since 4.11 (0 to 4 rows a week where the audit measured thousands a week before). | Rows again, with `sod_id` and `session_id` **null**, the normalized route and bounded fields only. |
| `visitor_events`, `page_views` | `track()`, `logView()` | ~8 rows a day and 0 to 1 a day since 4.11 (the public build skips them). | Unchanged: still closed in the public build. The same actions are written to `events` instead. |

Direction of the change in the counts, stated plainly:

- **Rows of `site_visits` per day do not simply halve.** The duplicate second row disappears (down), and the in-app page views that were silently dropped now appear (up). The net depends on how many pages a visitor opens after landing. What the number means also changes: before, it was close to "entries"; after, it is "page views".
- **Unique visitors (`count(distinct visitor)`) are not affected.** The duplicate row had the same visitor id.
- **Average engagement per row goes up** with no change in behaviour, because the zero-length rows leave the average.
- Whatever counts rows from before the release is **not directly comparable** with what counts rows after it (section 3).

## 2. Readers (table, RPC, view, job)

"Effect" is the effect of **this package** (one visit per page view, in-app navigation counted, engagement without the empty flush, actions in `events`).
"Blind" means the reader does not see the public build's rows today and the package does not change that.

| # | Reader (where defined) | What it counts | Effect of the fix |
|---|---|---|---|
| 1 | `visits_stats(p_days)` (`20260930153000_g3_telemetry_retention_120d_v2.sql:172`, cached as `visits_stats_v3:*`) | per day `count(*)` and `count(distinct visitor)` of non-bot `site_visits`; top 25 paths, 15 referrers, devices; `total_views`, `total_uniques`, `today_*`, `active_now` (5 min) | `views`, `paths`, `referrers`, `devices` **drop for the duplicates and rise for in-app page views**; `uniques`, `today_uniques`, `active_now` unchanged. The cache entry refreshes on its own TTL. |
| 2 | `refresh_site_visits_history_v1` and `traffic_history_combined(p_gran)` (same file, `:74` and `:117`) | writes one `traffic_history` row per day (`source='site_visits_legacy'`, `views = count(*)` non-bot) **before** the 120-day raw retention removes the rows; the combined series prefers Jetpack, then this source, then GA | The stored daily snapshots of every earlier day keep the **old, duplicated** numbers permanently. The combined history therefore has a **step at the release date**. This is the one place where the mixture is written down for good. |
| 3 | `admin_real_traffic(p_days)`, `admin_realtime_now(p_minutes)`, `admin_traffic(p_days)` (`20260929224006_g3_security_preclosure_admin_rpc_authorization_v1.sql:219, 278, 317`; cache `admin_real_traffic_v2:*`) | `total_real_visits`, `daily.visits`, `now_views` = `count(*)`; visitors = `count(distinct visitor)`; "bot" visitors = shared 9-character prefix of the visitor id among at least two ids; referrer buckets | visit counts change as in row 1; **visitors, bot detection and `returning` are unaffected** (they do not depend on rows per visitor); `top_paths` counts distinct visitors per path, unaffected. |
| 4 | `admin_live_visitors(p_minutes)` (`20260829131313_p1_admin_rpc_authorization_closure.sql:143`) | per visitor `pages = count(*)`, `dur = last - first`, `trail` of the last 6 paths, `returning`, `identified` (via `visitor_identity.email`) | `pages` falls for direct entries (no double), the **trail and `dur` improve** (in-app moves are now rows). `identified` stays near zero for new public visitors: the identity-link calls are refused by the worker (see `identity-gap.md`, row 4). |
| 5 | `admin_infra_load(p_days, p_hours)` (`20260808_admin_infra_load.sql:5`) | daily `site_visits`, `page_views`, `visitor_events`, `search_log` counts; average, peak and a spike flag computed from the daily `site_visits` counts | The average and peak move at the release date, so the **spike flag can fire or stay silent for a few days around it** until the window is on one side. |
| 6 | `visits_two_meter(p_days)`, `traffic_day_detail(p_day)` (`scripts/traffic_two_meter.sql:44, 84`; the definitions applied live are not in migrations) | per day total / humans / bots rows; `pages` = rows by path for a day | as row 1. `traffic_day_detail.sources` reads `events.via` by distinct session: **blind** (the public family writes no session and no `via`). |
| 7 | `visits_detail_for`, `site_pulse_today`, `admin_traffic_unified`, `admin_visitor_journeys`, `admin_page_dwell` (listed in `supabase/rpc-live-baseline.json`; **no definition in the repository**) | "investigations today (site_visits)", per-day/month detail, visitor journeys | Read the definition live. Anything that counts `site_visits` rows follows row 1; anything that follows a visitor gets longer, correct trails. |
| 8 | `refresh_traffic_daily_range_v1` / `traffic_daily`, `fn_human_entrances`, `fn_ti_session_metrics`, `fn_ti_clean_classification`, `fn_ti_entity_demand*`, `admin_entries_daily`, `admin_measurement_gap` (baseline list), `admin_traffic_insights` (`20260828081500_traffic_intelligence_temp_disk_cache_fix.sql`), and the sources `20260826221500…`, `20260907200000…`, `20260930153000…:15` | the canonical Traffic Intelligence "human entrances": `events` rows **with a `session_id`**, event type `view` | **Blind, unchanged.** The public build writes no `page/view` and no session; this is finding C3 (P0) of the closure list and waits for a decision. The fix does not make TI see more or less. |
| 9 | `admin_2029_analytics(p_hours, p_path_prefix)` (`20260919225200_g3_2029_analytics_one_tree_v1_uuid_fix.sql`), read by `src/lib/analytics2029.js` and shown in `src/components/experience2029/OperationalMetrics2029.jsx` (the `/2029/control` terminal) | people and sessions from `events` keyed by `person_id → account → role`; `page_views` = `surface='page' AND event_type='view'` | **Blind to public traffic, unchanged.** It lists a person only if that person has a `page/view` row, and the public build writes none. This is the admin reader the decision "detail for the administrator" points at. |
| 10 | `daily_kpi` job (`20261008170750_g4_kpi_funnel_aggregation_v1.sql`) | `pageviews`, `human_visitors`, `new/returning` from `events` joined to clean sessions | **Blind, unchanged** (needs `session_id` and `sod_id`). |
| 11 | `arrival_sources(p_days)` (`20260930153000_…:231`) and the growth/ambassador reports (`admin_growth_center`, `admin_ambassadors`; no definition in the repository) | arrival source, campaign tag, shares and joins from **`visitor_events`** (`section='arrival'`, `event_type='source'`) | **Not fed by the public build.** The new arrival, share and join rows go to `events` (`surface='arrival'/'share'/'join'`), which these readers do not read. Adapting the readers is the follow-up named "M1" in `cluster-F-measurement.md`. |
| 12 | `hot_posts_live(days, lim)` (`20261103175116_public_s2_guarded_readers.sql:128`, a **public** reader of "posts being read now"), `view_count`, `admin_journey_funnel` (the last two: baseline list, no definition in the repository), and the `pv` series of `admin_infra_load` | post and number views from **`page_views`** (`kind='post'`, joined to `posts.slug`) | **Not fed by the public build** (0 to 1 row a day since 4.11), so "hot posts" is empty or stale on the public site. The new `content/view` rows in `events` (`kind`, public numeric `item_id`, never the slug) are the replacement and nothing reads them yet. |
| 13 | `admin_journey_shares` (`20260901120000_canonical_share_predicate_readers.sql:98`), `admin_ai_usage`, `admin_research_usage`, `journey_pulse`, `activity_pulse` (`src/lib/visits.js`, `src/lib/supabase.js`) | shares, AI button use and research use from `visitor_events` | Not fed by the public build (as row 11). Nothing here is changed by the fix. |
| 14 | `fn_telemetry_retention_120d`, `admin_retention_preview`, `fn_reliability_watch`, the capacity/growth jobs (`20260930153000…:528, 284, 750`, `20260930170000_g3_capacity_growth_runtime_v1.sql`) | row counts and ages of `events`, `site_visits`, `visitor_events` | Volume only. `events` receives the action family again (the audit saw thousands a week before 4.11); `site_visits` receives the in-app rows and loses the duplicates. Retention is 120 days and unchanged. |
| 15 | Erasure and export (`g3_h2_erasure_export_closure_v1`, `g3_h2_legacy_subscription_export_erasure_coverage_v1`) | the `site_visits` and `events` rows of a person's visitor ids | Fewer duplicate rows in an export; the join key (`visitor`) is unchanged. |
| 16 | Raziel operator reads (`src/lib/research/razielPhaseCOperatorRead.test.js` pins `admin_entries_daily`, `admin_traffic_insights`) | the TI numbers of row 8 | Blind, unchanged. |

No `src/` component reads `getVisitsTwoMeter`, `getVisitStats`, `getArrivalSources`, `getTrafficHistory`, `getGrowthCenter` or `getHotPostsLive` today: their callers belonged to the retired Legacy admin and the exports are kept for the new terminal.
`api/` and `server/` contain no reader of these tables (`api/ga-insights.js`, `api/search-console.js`, `api/vercel-insights.js` read Google and Vercel).

## 3. Historical comparability and the marker

- **Before the release** the stored counts include the double rows (about half of all rows in the audit week) and lack the in-app page views of other families.
  **After it** they are one row per page view. The two periods **are not directly comparable**, and no stored row is rewritten by this package.
- **Comparable across the boundary:** unique visitors, `active_now`, the bot signature, referrer and device **shares** of a day (not their counts).
- **Not recoverable:** the in-app page views that were refused before. They were never stored.
- **Approximation for the old period, if a continuous series is wanted:** a read-side rule that drops a row when the same visitor wrote the same path less than 3 seconds earlier. It reproduces "entries" for the old days. It is a report change, so it is **not** done here.
- **Marker.** The release date is the only honest marker and it is not known until the package is deployed. What exists today and is cheap:
  - `traffic_history.note` for `source='site_visits_legacy'` is a constant written by `refresh_site_visits_history_v1` (a database change to extend it);
  - `src/lib/dayContext.js` attaches a calendar context to the days of the admin traffic payloads (code change, one more field);
  - the release report and the traffic-intelligence law text.
  None is built here, because the date does not exist yet. This is listed as decision D1 in the README.

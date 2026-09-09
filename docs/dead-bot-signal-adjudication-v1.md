# Dead Bot Signal Adjudication V1

**Task key:** `DEAD_BOT_SIGNAL_ADJUDICATION_V1`
**Lineage:** closes the three residuals reported by `BOT_OBSERVABILITY_INGEST_CLEANUP_V1` (`work_log` AFTER `ec344a5b`).
**OWNER CHECK:** `EXTEND_EXISTING` — documentation only. No function body rewritten, no column dropped, no classification changed.
**Baseline:** `origin/main = 82ff5a181b03680befd7befb253db1f920760ca8`
**Constraint honoured:** no change to Human/Bot/Unknown semantics (`traffic_intelligence_law`).
**Date:** 2026-09-09

---

## The common cause

All three read zero for one reason: `events.is_bot` is **false by construction** — `public.ingest_event()` drops client-flagged bot events before insert and hard-codes `false`. Anything that counts it measures the guard, not the traffic.

The risk they carry is **not that they exist**. It is that a future reader mistakes a structural zero for a measurement — exactly the defect the previous slice fixed in the Growth Center, where "0 bots · 0% of raw traffic · 1.0× inflation" was displayed while the real figure was 48% and ~1.9×.

So the deliverable is a label at the source, where the next reader looks — not a deletion.

## Verdicts — all three LEAVE, each for a different reason

### 1. `traffic_daily.bots` → **LEAVE AS LEGACY COMPATIBILITY**

| Evidence | Finding |
|---|---|
| Source | `refresh_traffic_daily()` ← `count(distinct session_id) from events where is_bot` |
| Live value | **0 for its entire history**, beside the real `traffic_daily.suspected` = 13,532 |
| SQL readers of the column | **none** — all eight functions over `traffic_daily` ignore it |
| Client exposure | reaches the admin client only via `admin_entries_daily`'s `select *` |
| Frontend | aggregated into `A.bots`; **never rendered** (verified: `A.bots` 0 uses vs `A.suspected` 4) |
| Constraints | `NOT NULL DEFAULT 0` — it cannot even be honestly nulled without an `ALTER` |

- **REMOVE rejected** — `admin_entries_daily` returns `setof public.traffic_daily`, so dropping the column changes that RPC's return type. That is a client-contract break on a Traffic-Intelligence-owned rollup.
- **REPLACE rejected** — filling it from `edge_geo_log`/`site_visits` would make a TI daily rollup begin carrying real bot counts, i.e. a change to Human/Bot/Unknown accounting, which this task forbids. It is also **unnecessary**: the real figure is already displayed from real sources — `TwoMeterPanel` (via `traffic_composition`/`edge_geo_log` and `visits_two_meter`/`site_visits`) and `fn_ti_traffic_layers.bots_total`.

### 2. `fn_metatron_journey_seeds.bot_views` → **LEAVE** (the only clean removal candidate)

| Evidence | Finding |
|---|---|
| Source | `count(*) filter (where is_bot)` over `events` → structurally 0 |
| DB readers | **zero** |
| Frontend / api / edge readers | **zero** (grep across `src/`, `api/`, `supabase/functions/`) |
| Reachability | ACL is `postgres` only — **not granted to anon or authenticated**, so no client can call it |

Removal buys nothing today, and deleting a bot count from a Metatron/TI-family function body is still a bot-accounting edit. **This is the one of the three that could be cleanly deleted later** — that call belongs to the Traffic Intelligence owner, and the decision is recorded in the function comment so it is not re-derived from scratch.

### 3. `fn_ti_clean_classification.raw_is_bot` → **LEAVE — and it is NOT a dead signal**

This one is categorically different from the other two, and calling it "dead" would be the wrong conclusion:

- **It is a fail-safe.** `raw_is_bot` reads false *only because* the ingest guard holds. It is the backstop that would immediately begin catching bot rows if that guard were ever removed, bypassed, or divergent — precisely the failure mode closed last slice by dropping the unguarded 13-argument `ingest_event` overload, which was granted to `anon`/`authenticated` and could have written bot-originated events labelled as human. Deleting it would remove the alarm that tells you the guard broke.
- **It is load-bearing.** Five readers depend on this function: `admin_post_sidebar_experiment_report`, `fn_ti_entity_demand_clean_composition` (which counts `clean_classification = 'bot'`), `fn_ti_session_metrics`, `fn_ti_session_anomaly`, `recent_number_opens`.
- **It is off-limits.** It *is* the canonical Human/Bot/Unknown classifier, which this task explicitly must not change.
- **It is already disclosed honestly** in the admin UI (`AdminPage.jsx`: "🩺 BOT כאן תמיד יוצא 0 — לא מוסתר, זה מבנה-הצנרת").

## What changed

Three `COMMENT` statements. Nothing else. The migration is asserted by test to contain **only** `COMMENT ON` — no `CREATE`, `DROP`, `ALTER`, `UPDATE`, `INSERT`, `DELETE`, `GRANT`, `REVOKE` or `TRUNCATE`.

## Verification

| Check | Result |
|---|---|
| Migration applied, all three comments present | **PASS** |
| `fn_ti_clean_classification` still runs | **PASS** — 9,474 sessions over 7d; 503 human; 0 bot (expected) |
| Function bodies unchanged | **PASS** — `prosrc` md5 recorded for all three; comments do not touch bodies |
| `traffic_daily` values unchanged | **PASS** — `bots` 0, `suspected` 13,532 (live growth) |
| `test/dead-bot-signal-adjudication.test.mjs` | **PASS** — 6 guard groups |
| `npm run build` | see AFTER |
| New test failures | **ZERO** |

## What this does not do

It does not change any Human/Bot/Unknown definition; it does not fold `crawl_daily` or `edge_geo_log` into any human/TI denominator (they remain the separate crawl evidence); it does not backfill or reinterpret history; and it does not remove anything. Two follow-ups remain the Traffic Intelligence owner's call: whether to eventually delete `bot_views`, and whether `traffic_daily.bots` should be dropped as part of a deliberate `admin_entries_daily` contract change.

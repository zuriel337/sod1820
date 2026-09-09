// BOT_OBSERVABILITY_INGEST_CLEANUP_V1 — guard test.
//
// events.is_bot is FALSE BY CONSTRUCTION: public.ingest_event() drops client-flagged bot
// events before insert and hard-codes false. Counting it therefore measures the guard, not
// the traffic, and always yields 0. Before this slice the admin Growth Center rendered
// exactly that as "בוטים שסוננו: 0 · 0% מהתנועה הגולמית", and derived an inflation factor of
// ev.total/ev.humans which is structurally 1.0 — while site_visits/edge showed ~48% bots.
//
// This test locks the correction in: no UI surface may derive a bot VOLUME, PERCENTAGE or
// INFLATION figure from the events pipeline. Real crawl evidence stays in its own sources
// (site_visits / crawl_daily / edge_geo_log), which this slice deliberately keeps separate.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const growth = read("src/components/GrowthCenterTab.jsx");
const migration = read("supabase/migrations/20260909130000_bot_observability_ingest_cleanup_v1.sql");

// Strip JSX/JS comments so an explanatory mention of the old field never satisfies — or
// trips — a check that is about executable code.
const code = growth
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

// ── 1. The events pipeline may no longer supply any bot-volume figure ────────
assert.ok(!/\bev\.bots\b/.test(code),
  "GrowthCenterTab must not render ev.bots — events.is_bot is false by construction, so it is always 0");
assert.ok(!/\bev\.bot_pct\b/.test(code),
  "GrowthCenterTab must not render ev.bot_pct — it is derived from events.is_bot and is always 0%");
assert.ok(!/ev\.total\s*\/\s*Math\.max\(\s*1\s*,\s*ev\.humans\s*\)/.test(code),
  "the inflation factor must not be ev.total/ev.humans — both are human-only, so the ratio is structurally 1.0");

// ── 2. The bot rate must come from the real measurement already in the payload ─
assert.ok(/sv\.bot_pct/.test(code),
  "the bot rate must be read from site_visits (sv.bot_pct), which measures bots instead of dropping them");
assert.ok(/100\s*\/\s*\(\s*100\s*-\s*sv\.bot_pct\s*\)/.test(code),
  "the inflation factor must be derived from the real rate: raw/human = 100/(100-P)");

// ── 3. The pipeline truth must be stated, not silently hidden. House precedent:
//      the existing honest note in AdminPage ("BOT כאן תמיד יוצא 0 — לא מוסתר").
assert.ok(/events\.is_bot/.test(growth) && /ingest_event/.test(growth),
  "the UI must explain WHY events cannot measure bots, rather than quietly dropping the row");
assert.ok(/crawl_daily|edge_geo_log|edge/.test(growth),
  "the UI must point at where the real crawl evidence lives");
// the pre-existing honest note elsewhere must survive untouched
assert.ok(/BOT כאן תמיד יוצא 0/.test(read("src/pages/AdminPage.jsx")),
  "the existing honest TI note in AdminPage must not be removed by this slice");

// ── 4. A surface whose bot figures are REAL must NOT have been touched.
//      traffic_day_detail counts bots from site_visits and edge_geo_log, so AdminPage's
//      per-page / per-country bot columns are correct and must stay.
const admin = read("src/pages/AdminPage.jsx");
assert.ok(/rows=\{detail\?\.pages\}[\s\S]{0,200}bots:\s*p\.bots/.test(admin),
  "AdminPage per-page bots (site_visits via traffic_day_detail) is real data and must remain");
assert.ok(/rows=\{detail\?\.countries\}[\s\S]{0,200}bots:\s*c\.bots/.test(admin),
  "AdminPage per-country bots (edge_geo_log via traffic_day_detail) is real data and must remain");

// ── 5. Ingest cleanup: exactly one ingest path, and the guard is intact ──────
assert.ok(/DROP FUNCTION IF EXISTS public\.ingest_event\(/.test(migration),
  "the migration must drop the legacy unguarded overload");
assert.ok(/smallint,\s*jsonb,\s*jsonb\s*\)/.test(migration.replace(/\s+/g, " ")),
  "the drop must target the 13-argument signature (ending ... smallint, jsonb, jsonb)");
assert.ok(/42725/.test(migration),
  "the migration must record the ambiguity proof that makes the drop provably non-breaking");
assert.ok(/CREATE OR REPLACE FUNCTION public\.ingest_event/.test(migration),
  "the migration must record the verbatim restore statement, so the drop is reversible");
assert.ok(/COMMENT ON COLUMN public\.events\.is_bot/.test(migration),
  "events.is_bot must be documented at the source");
assert.ok(/ALWAYS FALSE BY CONSTRUCTION/.test(migration),
  "the column comment must state the structural truth in the first line a reader sees");

// ── 6. Traffic Intelligence semantics must be untouched by this slice ────────
for (const forbidden of [
  "fn_ti_clean_classification", "fn_human_entrances", "refresh_traffic_daily",
  "traffic_day_detail", "fn_metatron_funnel", "journey_pulse", "audience_cohort_v1",
]) {
  assert.ok(!new RegExp("(CREATE|REPLACE|DROP|ALTER)[^;]*" + forbidden, "i").test(migration),
    `${forbidden} is Traffic Intelligence territory and must not be redefined by this slice`);
}
// crawl evidence stays a separate source, never folded into a human/TI denominator
assert.ok(!/(CREATE|REPLACE|ALTER)[^;]*crawl_daily/i.test(migration),
  "crawl_daily must remain the separate crawl evidence, not be rewired here");

console.log("bot-observability-no-false-volume: PASS");

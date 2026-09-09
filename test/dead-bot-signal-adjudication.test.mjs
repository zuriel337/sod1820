// DEAD_BOT_SIGNAL_ADJUDICATION_V1 — guard test.
//
// Three bot signals read zero for the same structural reason (events.is_bot is false by
// construction, because ingest_event drops client-flagged bot events). All three were
// adjudicated LEAVE — each for a DIFFERENT reason:
//   traffic_daily.bots                     → legacy compatibility (dropping it would change
//                                            admin_entries_daily's `setof traffic_daily` type)
//   fn_metatron_journey_seeds.bot_views    → no consumer anywhere; removal buys nothing
//   fn_ti_clean_classification.raw_is_bot  → NOT dead: a fail-safe backstop, and TI-owned
//
// This test locks in what the adjudication actually guarantees: the change was documentation
// only, none of the three may become a displayed metric, and the real bot sources stay real.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260909140000_dead_bot_signal_adjudication_v1.sql");
const admin = read("src/pages/AdminPage.jsx");
const growth = read("src/components/GrowthCenterTab.jsx");

// ── 1. The migration must be DOCUMENTATION ONLY. Nothing may execute behaviour. ──
const statements = mig
  .split("\n").filter(l => !l.trim().startsWith("--")).join("\n")
  .split(";").map(s => s.trim()).filter(Boolean);
assert.ok(statements.length > 0, "migration must contain statements");
for (const st of statements) {
  assert.ok(/^COMMENT ON (COLUMN|FUNCTION)\b/i.test(st),
    `documentation-only migration: every statement must be COMMENT ON, got: ${st.slice(0, 60)}`);
}
for (const verb of ["CREATE", "DROP", "ALTER", "UPDATE", "INSERT", "DELETE", "GRANT", "REVOKE", "TRUNCATE"]) {
  assert.ok(!new RegExp("(^|\\n)\\s*" + verb + "\\b", "i").test(statements.join(";\n")),
    `${verb} must not appear — this slice changes no behaviour and no semantics`);
}

// ── 2. All three signals must be adjudicated at the source ──────────────────
assert.ok(/COMMENT ON COLUMN public\.traffic_daily\.bots/i.test(mig),
  "traffic_daily.bots must be documented");
assert.ok(/COMMENT ON FUNCTION public\.fn_metatron_journey_seeds\(integer, ?boolean\)/i.test(mig),
  "fn_metatron_journey_seeds must be documented");
assert.ok(/COMMENT ON FUNCTION public\.fn_ti_clean_classification\(date, ?date\)/i.test(mig),
  "fn_ti_clean_classification must be documented");
assert.equal((mig.match(/DEAD_BOT_SIGNAL_ADJUDICATION_V1/g) || []).length >= 3, true,
  "each adjudication must name the slice that decided it");

// ── 3. Each must state its structural truth AND point at the real sources ───
for (const src of ["edge_geo_log", "crawl_daily", "site_visits"]) {
  assert.ok(mig.includes(src), `the real bot-evidence source ${src} must be named`);
}
assert.equal((mig.match(/STRUCTURALLY ALWAYS 0/g) || []).length, 2,
  "the two genuinely-dead signals must be labelled as structural zeros");

// ── 4. raw_is_bot must be recorded as a FAIL-SAFE, not as dead weight. If a future
//      slice deletes it as "dead", this assertion is the thing that should stop it.
assert.ok(/BACKSTOP/.test(mig) && /must NOT be removed as one/.test(mig),
  "fn_ti_clean_classification.raw_is_bot must be documented as a fail-safe, not a dead signal");
assert.ok(/traffic_intelligence_law/.test(mig),
  "the classifier comment must point ownership back at traffic_intelligence_law");

// ── 5. None of the three may be RENDERED. traffic_daily.bots reaches the admin client
//      via `select *` and is aggregated into A.bots — it must stay unrendered.
assert.ok(/bots: a\.bots \+ \(r\.bots \|\| 0\)/.test(admin),
  "the A.bots aggregate is expected to still exist (harmless passthrough) — update this test if it is removed");
for (const render of [/\{\s*A\.bots\s*\}/, /fmt\(\s*A\.bots\s*\)/, /A\.bots\.toLocaleString/, /kpi\(\s*A\.bots/]) {
  assert.ok(!render.test(admin),
    "A.bots (traffic_daily.bots) is structurally 0 and must never be rendered");
}
assert.ok(!/bot_views/.test(admin + growth),
  "fn_metatron_journey_seeds.bot_views must not be surfaced in the UI");

// ── 6. The honest disclosures shipped by the previous slices must survive ───
assert.ok(/BOT כאן תמיד יוצא 0/.test(admin),
  "the existing honest TI note in AdminPage must remain");
assert.ok(/sv\.bot_pct/.test(growth) && !/\bev\.bot_pct\b/.test(
  growth.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "")),
  "the Growth Center must still read its bot rate from the real site_visits source");

console.log("dead-bot-signal-adjudication: PASS");

// TM-08: migration-content guards re-homed from two tests that were deleted with the Legacy runtime (623b8d38a):
//   test/bot-observability-no-false-volume.test.mjs  (BOT_OBSERVABILITY_INGEST_CLEANUP_V1)
//   test/dead-bot-signal-adjudication.test.mjs       (DEAD_BOT_SIGNAL_ADJUDICATION_V1)
// Both read src/components/GrowthCenterTab.jsx and src/pages/AdminPage.jsx, which are gone, so the sections that asserted on those
// two files are not restored. The sections that asserted on the two migrations are restored here verbatim (recovered from
// 8ae69125f); both migrations are still in supabase/migrations/ and still describe what the database does:
//   events.is_bot is false by construction, the unguarded 13-argument ingest_event overload is dropped, and three structural-zero
//   bot signals are documented (not removed) because each is unreachable, unread, or a fail-safe.
// The one UI guarantee that outlives its files ("a structural zero is never rendered as a metric") is kept as a repository scan
// in the last test, over src/ instead of the two deleted files.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const ingestCleanup = read("supabase/migrations/20260909130000_bot_observability_ingest_cleanup_v1.sql");
const adjudication = read("supabase/migrations/20260909140000_dead_bot_signal_adjudication_v1.sql");
// The executable part of a migration (full-line `--` comments removed). The restored assertions that name a statement are checked
// against this as well as against the raw text: the originals matched the raw file, so a statement that had been commented out
// still satisfied them. Assertions about the recorded proof and the restore statement (which live in comments by design) stay raw.
const sqlCode = (sql) => sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

// ── BOT_OBSERVABILITY_INGEST_CLEANUP_V1 ─────────────────────────────────────────────────────────────────────────────────
test("ingest cleanup: exactly one ingest path remains, the drop is provably safe and reversible, and events.is_bot is documented as structural", () => {
  const migration = ingestCleanup;
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
  // Stronger than the original (which matched the raw file): the drop and the column comment must be executable statements.
  const code = sqlCode(migration);
  assert.ok(/^\s*DROP FUNCTION IF EXISTS public\.ingest_event\(\s*(?:text,\s*){10}smallint,\s*jsonb,\s*jsonb\s*\)\s*;/m.test(code),
    "the 13-argument drop must be an executable statement, not only text inside a comment");
  assert.ok(/COMMENT ON COLUMN public\.events\.is_bot IS\s*'ALWAYS FALSE BY CONSTRUCTION/.test(code),
    "the events.is_bot column comment must be an executable statement that starts with the structural truth");
});

test("ingest cleanup: Traffic Intelligence semantics and the crawl evidence sources are not redefined by the slice", () => {
  const migration = ingestCleanup;
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
});

// ── DEAD_BOT_SIGNAL_ADJUDICATION_V1 ─────────────────────────────────────────────────────────────────────────────────────
test("adjudication: the migration is documentation only (COMMENT ON statements, no behaviour, no semantics)", () => {
  const mig = adjudication;
  const statements = mig
    .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n")
    .split(";").map((s) => s.trim()).filter(Boolean);
  assert.ok(statements.length > 0, "migration must contain statements");
  for (const st of statements) {
    assert.ok(/^COMMENT ON (COLUMN|FUNCTION)\b/i.test(st),
      `documentation-only migration: every statement must be COMMENT ON, got: ${st.slice(0, 60)}`);
  }
  for (const verb of ["CREATE", "DROP", "ALTER", "UPDATE", "INSERT", "DELETE", "GRANT", "REVOKE", "TRUNCATE"]) {
    assert.ok(!new RegExp("(^|\\n)\\s*" + verb + "\\b", "i").test(statements.join(";\n")),
      `${verb} must not appear — this slice changes no behaviour and no semantics`);
  }
});

test("adjudication: all three residual bot signals are adjudicated at the source and point at the real bot evidence", () => {
  // Executable statements only (stronger than the original, which matched the raw file): each adjudication must be a stored comment.
  const mig = sqlCode(adjudication);
  assert.ok(/COMMENT ON COLUMN public\.traffic_daily\.bots/i.test(mig),
    "traffic_daily.bots must be documented");
  assert.ok(/COMMENT ON FUNCTION public\.fn_metatron_journey_seeds\(integer, ?boolean\)/i.test(mig),
    "fn_metatron_journey_seeds must be documented");
  assert.ok(/COMMENT ON FUNCTION public\.fn_ti_clean_classification\(date, ?date\)/i.test(mig),
    "fn_ti_clean_classification must be documented");
  assert.equal((mig.match(/DEAD_BOT_SIGNAL_ADJUDICATION_V1/g) || []).length >= 3, true,
    "each adjudication must name the slice that decided it");
  for (const src of ["edge_geo_log", "crawl_daily", "site_visits"]) {
    assert.ok(mig.includes(src), `the real bot-evidence source ${src} must be named`);
  }
  assert.equal((mig.match(/STRUCTURALLY ALWAYS 0/g) || []).length, 2,
    "the two genuinely-dead signals must be labelled as structural zeros");
});

test("adjudication: raw_is_bot stays recorded as a fail-safe and ownership stays with traffic_intelligence_law", () => {
  const mig = sqlCode(adjudication);
  // If a future slice deletes raw_is_bot as "dead", this assertion is the thing that should stop it.
  assert.ok(/BACKSTOP/.test(mig) && /must NOT be removed as one/.test(mig),
    "fn_ti_clean_classification.raw_is_bot must be documented as a fail-safe, not a dead signal");
  assert.ok(/traffic_intelligence_law/.test(mig),
    "the classifier comment must point ownership back at traffic_intelligence_law");
});

// ── the one UI guarantee that outlives GrowthCenterTab.jsx / AdminPage.jsx ──────────────────────────────────────────────
// Original sections: "none of the three may be RENDERED" and "no UI surface may derive a bot VOLUME from the events pipeline".
// Their files are deleted; the audit of the cleanup (git grep over src/, api/, server/ and the edge functions) found no remaining
// consumer. This keeps the guarantee for whatever UI is written next: events.is_bot-derived bot figures are structural zeros.
test("no UI source reads a structural-zero bot figure (bot_views, ev.bots, ev.bot_pct)", () => {
  const files = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(?:jsx?|mjs|cjs|tsx?)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(full);
    }
  };
  walk(path.join(root, "src"));
  assert.ok(files.length > 500, `expected to scan the whole src/ tree, saw ${files.length} files`);
  const offenders = [];
  for (const f of files) {
    const code = fs.readFileSync(f, "utf8");
    for (const re of [/\bbot_views\b/, /\bev\.bots\b/, /\bev\.bot_pct\b/]) {
      if (re.test(code)) offenders.push(`${path.relative(root, f)}: ${re}`);
    }
  }
  assert.deepEqual(offenders, [],
    "events.is_bot is false by construction (public.ingest_event drops client-flagged bots), so these figures are structural zeros; "
    + "read real bot volume from site_visits / crawl_daily / edge_geo_log instead");
});

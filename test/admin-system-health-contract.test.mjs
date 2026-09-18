// G3_2029_CONTROL_PLANE_FOUNDATION_V1 — guard test.
//
// admin_system_health() is the first non-UI 2029 Internal Control Plane read projection.
// This locks in the safety properties the assignment requires: fail-closed admin/service auth,
// no secrets/command text/recipient addresses/object paths leaking through the projection,
// explicit exact/estimated/unknown usage honesty, retention reused (not duplicated) from
// admin_retention_preview(), and no new table/store/registry.
//
// It also locks in the fn_health_watch correction: alerts must terminate in
// public.notify_admin() (subscription_funnel_law v19), never a direct wa_send()/hardcoded
// WhatsApp target — while the 1-hour dedupe and failure-isolation stay intact.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const mig = read("supabase/migrations/20260918215358_admin_system_health_v1.sql");
const visits = read("src/lib/visits.js");\nconst hardening = read("supabase/migrations/20260918215508_fn_health_watch_execute_hardening_v1.sql");

// ── 1. admin_system_health: fail-closed admin/service auth (reuses admin_retention_preview's
//      newest convention), SECURITY DEFINER, hardened search_path. ────────────────────────────
assert.match(mig, /create or replace function public\.admin_system_health\(\)/i);
assert.match(mig, /security definer/i);
assert.match(mig, /set search_path to 'public', 'pg_temp'/i);
assert.match(
  mig,
  /if auth\.role\(\) <> 'service_role' and not coalesce\(public\.rd_is_admin\(\), false\) then\s*\n\s*raise exception 'not authorized';/i,
  "admin_system_health must fail-closed with the same service_role/rd_is_admin() gate as admin_retention_preview"
);

// ── 2. Retention is REUSED, never duplicated: must call admin_retention_preview() and must
//      not re-query its source tables directly. ────────────────────────────────────────────
assert.match(mig, /v_retention\s*:=\s*public\.admin_retention_preview\(\)/i,
  "admin_system_health must call admin_retention_preview(), not reimplement retention logic");
for (const table of ["channel_updates", "wa_bot_log", "wa_deep_queue", "wa_vip_inbox", "wa_msg_ext", "wa_message_status"]) {
  assert.ok(!new RegExp("from\\s+public\\." + table, "i").test(mig),
    `admin_system_health must not directly query ${table} — that is admin_retention_preview's territory`);
}
assert.match(mig, /'pointer',\s*'public\.admin_retention_preview\(\) for full per-table detail'/,
  "retention must be exposed as a pointer/summary, not a duplicated Retention Store");

// ── 3. No secrets/command text, no recipient addresses, no object paths, no raw private data. ──
assert.ok(!/select[^;]*\bcommand\b[^;]*from\s+cron\.job/i.test(mig),
  "cron section must never select cron.job.command (may contain secrets)");
assert.ok(!/select[^;]*\bchat_id\b/i.test(mig),
  "communications/bots aggregates must never select bot_outbox.chat_id (a recipient address)");
assert.ok(!/select[^;]*\bpath\b[^;]*from\s+public\.media_migration_queue/i.test(mig),
  "media section must never select media_migration_queue.path (an object path)");
assert.ok(!/create table/i.test(mig), "no new table/store/registry/health ledger may be created");
assert.match(
  mig,
  /where published = 1 and coalesce\(curator_hidden, false\) = false/i,
  "public gallery health count must follow the canonical 2029 published=1 projection"
);
assert.ok(
  !/published in \(1,\s*2\)/i.test(mig),
  "published=2 is not part of the canonical public gallery projection"
);

// ── 4. Exact/estimated/unknown usage honesty. ───────────────────────────────────────────────
assert.match(mig, /'ai_cost_basis',\s*'EXACT'/);
assert.match(mig, /'vercel_bandwidth_basis',\s*'ESTIMATED'/);
assert.match(mig, /'supabase_cached_egress_basis',\s*'UNKNOWN'/);

// ── 5. Grants match the admin_retention_preview triad (revoke public/anon, allow authenticated
//      + service_role — auth is enforced inside the function, not by grants alone). ───────────
assert.match(mig, /revoke all on function public\.admin_system_health\(\) from public, anon;/i);
assert.match(mig, /grant execute on function public\.admin_system_health\(\) to authenticated, service_role;/i);

// ── 6. fn_health_watch correction: notify_admin only, no direct wa_send/hardcoded target,
//      dedupe + failure-isolation preserved. ────────────────────────────────────────────────
const healthWatchBodyMatch = mig.match(/create or replace function public\.fn_health_watch\(\)[\s\S]*?\$function\$;/i);
assert.ok(healthWatchBodyMatch, "fn_health_watch must be (re)defined as a real function body");
const healthWatchBody = healthWatchBodyMatch[0];
assert.ok(!/wa_send/i.test(healthWatchBody),
  "fn_health_watch's executable body must no longer call wa_send() directly");
assert.ok(!/972556651237/.test(healthWatchBody),
  "the hardcoded WhatsApp target must be removed from fn_health_watch's executable body");
assert.match(healthWatchBody, /perform public\.notify_admin\(/,
  "fn_health_watch alerts must terminate in public.notify_admin() per subscription_funnel_law v19");
assert.match(healthWatchBody, /created_at > now\(\)-interval '1 hour'/,
  "the existing 1-hour work_log dedupe must be preserved");
assert.match(healthWatchBody, /exception when others then null;\s*\n\s*end;/,
  "the notify_admin call must stay wrapped so a delivery failure never breaks the health scan");

// ── 7. Client helper follows the existing getCommandCenter convention exactly, with no UI
//      coupling introduced by this slice (Control Plane UI is explicitly out of scope). ───────
assert.match(visits, /export async function getSystemHealth\(\)\s*\{\s*\n\s*if \(!supabase\) return null;\s*\n\s*const \{ data, error \} = await supabase\.rpc\("admin_system_health"\);\s*\n\s*if \(error\) throw error;\s*\n\s*return data \|\| null;\s*\n\}/);
for (const uiFile of ["src/pages/AdminPage.jsx"]) {
  assert.ok(!new RegExp("admin_system_health|getSystemHealth").test(read(uiFile)),
    `${uiFile} must not wire up admin_system_health yet — no Control Plane UI in this slice`);
}


// ── 8. fn_health_watch is server-only after post-release advisor hardening. ───────────────
assert.match(hardening, /revoke all on function public\\.fn_health_watch\\(\\) from public, anon, authenticated;/i);
assert.match(hardening, /grant execute on function public\\.fn_health_watch\\(\\) to service_role;/i);

console.log("admin-system-health-contract: PASS");

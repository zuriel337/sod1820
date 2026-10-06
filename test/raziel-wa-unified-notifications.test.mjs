import assert from "node:assert/strict";
import fs from "node:fs";
import { mergeTopicsForSave, mergeChannelsForSave, ADMIN_TOPIC_KEYS, gatesToTopics } from "../src/lib/notifications.js";

const mig = fs.readFileSync("supabase/migrations/20261006210000_raziel_whatsapp_unified_notifications_v1.sql", "utf8");
const code = mig.replace(/^--.*$/gm, "");
assert.doesNotMatch(code, /create table/i);                       // no new store
assert.doesNotMatch(code, /net\.http|wa_send|wa_admin|green/i);    // no direct provider call
const proj = code.slice(code.indexOf("fn_user_notification_wa_project"), code.indexOf("outbox_mark_system"));
assert.doesNotMatch(proj, /new\.link/);                            // legacy link never forwarded
assert.match(proj, /un-wa:/);                                      // idempotent done_key from notification id
assert.match(proj, /on conflict \(done_key\) do nothing/);
assert.match(proj, /muted_until/);
assert.match(code, /grant execute on function public\.fn_raziel_activity_notify\(text, text\) to service_role/);

// wa-raziel: old direct alert retired
const wr = fs.readFileSync("supabase/functions/wa-raziel/index.ts", "utf8");
assert.doesNotMatch(wr, /מטטרון · רזיאל ענה/);
assert.doesNotMatch(wr, /\$\{SITE\}\/admin/);
assert.doesNotMatch(wr, /raziel_metatron_alert/);
assert.match(wr, /fn_raziel_activity_notify/);
const alertFn = wr.slice(wr.indexOf("async function alertZuriel"), wr.indexOf("async function alreadyDone"));
assert.doesNotMatch(alertFn, /sendMessage|waAdmin/);

// NotificationCenter + helpers
assert.deepEqual(ADMIN_TOPIC_KEYS, ["admin:system_high", "admin:raziel_activity"]);
const t = mergeTopicsForSave(["number:1820", "cat:x", "news", "admin:raziel_activity"], { gates: ["consciousness"], adminTopics: null });
assert.ok(t.includes("cat:x") && t.includes("admin:raziel_activity"), "non-gate follows + admin kept");
assert.deepEqual([...mergeTopicsForSave(["cat:x", "news"], { gates: [] })].sort(), ["cat:x"]); // gate topic dropped only when gate off
for (const x of gatesToTopics(["consciousness"])) assert.ok(t.includes(x));
assert.deepEqual(mergeTopicsForSave([], { gates: [], adminTopics: [] }), []);                    // admin:raziel_activity default off
assert.ok(!mergeTopicsForSave(["admin:system_high"], { gates: [], adminTopics: [] }).includes("admin:system_high")); // admin can turn off
assert.deepEqual(mergeTopicsForSave([], { gates: [], adminTopics: ["admin:system_high", "admin:attention", "bogus"] }), ["admin:system_high"]); // attention not savable
assert.deepEqual(mergeChannelsForSave(null, {}), ["email"]);
assert.deepEqual(mergeChannelsForSave(["email", "push", "sms"], { push: true }), ["email", "sms", "push"]);
assert.ok(!mergeChannelsForSave(["email"], { whatsapp: true, whatsappAllowed: false }).includes("whatsapp"));
assert.ok(mergeChannelsForSave(["email"], { whatsapp: true, whatsappAllowed: true }).includes("whatsapp"));
const nc = fs.readFileSync("src/components/NotificationCenter.jsx", "utf8");
assert.match(nc, /useWaLink/); assert.match(nc, /wa\.linked/);
assert.doesNotMatch(nc, /["']\/(admin|archive|number|or-geula)/);
import { ADMIN_NOTIFICATION_PREFS } from "../src/lib/notifications.js";
assert.ok(!ADMIN_NOTIFICATION_PREFS.some(a => a.key === "admin:attention"));
assert.doesNotMatch(nc, /admin:attention/);
const act = ADMIN_NOTIFICATION_PREFS.find(a => a.key === "admin:raziel_activity");
assert.doesNotMatch(act.desc, /על כל תשובת/); assert.match(act.desc, /לא כל תשובה/);
// system_high producer + column-privilege hardening (static)
assert.match(code, /on public\.system_suggestions/);
assert.match(code, /revoke update on public\.user_notifications from authenticated/i);
assert.match(code, /grant update \(read_at\) on public\.user_notifications to authenticated/i);
const sh = code.slice(code.indexOf("fn_system_suggestion_notify_high"));
assert.doesNotMatch(sh.replace(/new\.observed->>'severity'/g, ""), /new\.observed/); // raw payload never read into message
console.log("raziel-wa-unified-notifications PASS");

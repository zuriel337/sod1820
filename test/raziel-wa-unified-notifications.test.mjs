import assert from "node:assert/strict";
import fs from "node:fs";
import { mock } from "node:test";
import { mergeTopicsForSave, mergeChannelsForSave, ADMIN_TOPIC_KEYS, gatesToTopics } from "../src/lib/notifications.js";
import { saveNotificationPrefs, supabase } from "../src/lib/supabase.js";

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
// Follow v19: saving preferences or quiet mode is not consent to a new email channel.
for (const existing of [undefined, null, []]) {
  assert.deepEqual(mergeChannelsForSave(existing, {}), [], "missing/empty channels stay opted out");
}
assert.deepEqual(mergeChannelsForSave([], { push: true }), ["push"], "explicit push adds no email");
assert.deepEqual(mergeChannelsForSave(["push"], { push: false }), [], "disabling the last channel does not enable email");
assert.deepEqual(mergeChannelsForSave(null, { whatsapp: true, whatsappAllowed: false }), []);
assert.deepEqual(mergeChannelsForSave(null, { whatsapp: true, whatsappAllowed: true }), ["whatsapp"]);
const savedChannels = ["email", "sms", "push", "email"];
assert.deepEqual(mergeChannelsForSave(savedChannels, {}), ["email", "sms"], "unrelated existing channels are preserved");
assert.deepEqual(savedChannels, ["email", "sms", "push", "email"], "building preferences does not mutate the loaded row");
assert.deepEqual(mergeChannelsForSave(["email", "push", "sms"], { push: true }), ["email", "sms", "push"]);
assert.ok(!mergeChannelsForSave(["email"], { whatsapp: true, whatsappAllowed: false }).includes("whatsapp"));
assert.ok(mergeChannelsForSave(["email"], { whatsapp: true, whatsappAllowed: true }).includes("whatsapp"));

// Exercise the real preference-save path: an accidental email channel also inserts a subscriber.
// Every persistence method and network request is intercepted; only synthetic data is used.
const writes = [];
const fromMock = mock.method(supabase, "from", (table) => {
  if (table === "notification_prefs") return { upsert: async (row) => { writes.push({ table, row }); return { error: null }; } };
  if (table === "subscribers") return { insert: async (rows) => { writes.push({ table, rows }); return { error: null }; } };
  throw new Error(`Unexpected persistence target: ${table}`);
});
const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("Live network forbidden in consent regression"); });
try {
  const owner = { userId: "00000000-0000-4000-8000-000000000001", email: "owner@example.invalid", topics: ["number:1820"] };
  for (const existing of [undefined, null, []]) {
    for (const mutedUntil of [null, "2030-01-01T00:00:00.000Z"]) {
      writes.length = 0;
      assert.deepEqual(await saveNotificationPrefs({ ...owner, channels: mergeChannelsForSave(existing, {}), mutedUntil }), { ok: true });
      assert.deepEqual(writes.map(write => write.table), ["notification_prefs"], "save/quiet mode never subscribes an opted-out user");
      assert.deepEqual(writes[0].row.channels, []);
      assert.deepEqual(writes[0].row.topics, owner.topics);
      assert.equal(writes[0].row.muted_until, mutedUntil);
    }
  }
  // Positive control proves the spy observes the existing, explicitly selected email path.
  writes.length = 0;
  assert.deepEqual(await saveNotificationPrefs({ ...owner, channels: ["email"] }), { ok: true });
  assert.deepEqual(writes.map(write => write.table), ["notification_prefs", "subscribers"]);
  assert.equal(writes[1].rows[0].source, "notification-center");
  assert.equal(fetchMock.mock.callCount(), 0, "no live network or subscriber writes");
} finally {
  fromMock.mock.restore();
  fetchMock.mock.restore();
}
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

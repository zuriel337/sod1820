import test from "node:test";
import assert from "node:assert/strict";
import { groupRowToWorldUpdate, redactGroupText, fetchGroupSourceArrivals, GROUP_SOURCE_LABEL } from "./worldGroupSource.js";
import { buildWorldDiscoveryStream } from "./worldDiscoveryStream.js";
import { readFileSync } from "node:fs";

const row = (o = {}) => ({ id: "u1", body: "שלום עולם 358", created_at: "2026-10-01T10:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, ...o });

test("projects a proved four-author group row as unverified source", () => {
  const it = groupRowToWorldUpdate(row());
  assert.equal(it.kind, "source"); assert.equal(it.stateLabel, GROUP_SOURCE_LABEL);
  assert.equal(it.publicState, "group_source_message_unverified"); assert.equal(it.researchCount, 0);
  assert.equal(it.value, null); assert.deepEqual(it.numbers, []); // no Number 0, no invented number
});
test("unknown author / no group proof / empty body excluded (no name inference)", () => {
  assert.equal(groupRowToWorldUpdate(row({ contributor_slug: null, contributor_name: "צבי" })), null);
  assert.equal(groupRowToWorldUpdate(row({ group_proof: false })), null);
  assert.equal(groupRowToWorldUpdate(row({ group_proof: undefined })), null);
  assert.equal(groupRowToWorldUpdate(row({ body: "  " })), null);
});
test("PII redaction: phone, email, url", () => {
  const t = redactGroupText("התקשרו 050-123-4567 או a@b.com או https://x.co/y www.z.com");
  assert.ok(!/\d{3}-\d{3}/.test(t) && !t.includes("@") && !t.includes("http") && !t.includes("www"));
});
test("exact source reuse: one stream item per row, same id/sourceRef for World and bottom", () => {
  const g = [groupRowToWorldUpdate(row()), groupRowToWorldUpdate(row({ id: "u2" }))];
  const a = buildWorldDiscoveryStream({ groupItems: g }, { limit: 10 });
  const b = buildWorldDiscoveryStream({ groupItems: g }, { limit: 5 });
  assert.equal(a.items.length, 2); assert.deepEqual(a.items.map((i) => i.id), b.items.map((i) => i.id));
  assert.equal(a.items.filter((i) => i.creator === "צבי").length, 2);
});
test("no fake new items when reader returns nothing; reader error propagates (caller shows not_connected)", async () => {
  assert.equal(buildWorldDiscoveryStream({ groupItems: [] }).items.length, 0);
  assert.deepEqual(await fetchGroupSourceArrivals({ rpc: async () => ({ data: [], error: null }) }), []);
  await assert.rejects(fetchGroupSourceArrivals({ rpc: async () => ({ data: null, error: new Error("503") }) }));
});
test("migration contract: ingest-chain group JID proof (no wa_msg_ext requirement, no wa_bot_config), auto, ext_msg_id, live-only, no media, flag, no table grant, admin-only editor", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20261008170000_world_group_source_arrivals_v1.sql", import.meta.url), "utf8");
  for (const needle of ["channel_ingest_sources", "wa_msg_ext", "@g.us", "'torat-haremez', 'gilui-yomi'", "is distinct from s.chat_id", "cu.source = 'auto'", "cu.ext_msg_id is not null", "cu.status = 'live'", "image_url is null", "general_feed_enabled", "admin only"])
    assert.ok(sql.includes(needle), needle);
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(!/join\s+public\.wa_msg_ext/i.test(code), "wa_msg_ext must never be a required join");
  assert.ok(!/wa_bot_config/.test(code), "wa_bot_config is not source authority");
  assert.ok(!/status\s+in\s*\(|status\s*=\s*'private'/i.test(code.split("admin_set_contributor_general_feed_v1")[0]), "private rows are not exposed");
  assert.ok(!/grant\s+select\s+on\s+(table\s+)?public\./i.test(sql));
  assert.ok(!/(create|alter|drop)\s+policy/i.test(sql));
  assert.ok(!/update\s+public\.channel_updates|research_objects/i.test(sql.replace(/--.*$/gm, "")));
});

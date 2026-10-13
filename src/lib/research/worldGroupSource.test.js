import test from "node:test";
import assert from "node:assert/strict";
import { groupRowToWorldUpdate, redactGroupText, fetchGroupSourceArrivals, GROUP_SOURCE_LABEL } from "./worldGroupSource.js";
import { buildWorldDiscoveryStream } from "./worldDiscoveryStream.js";
import { readFileSync } from "node:fs";

const row = (o = {}) => ({ id: "u1", body: "שלום עולם 358", created_at: "2026-10-01T10:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique", ...o });

test("projects a proved four-author group row as unverified source", () => {
  const it = groupRowToWorldUpdate(row());
  assert.equal(it.kind, "source"); assert.equal(it.stateLabel, GROUP_SOURCE_LABEL);
  assert.equal(it.href, "/world#group-source-u1");
  assert.equal(it.sourceLabel, "הודעה מקבוצת מקור");
  assert.equal(it.arrivalAt, "2026-10-01T10:00:00.000Z");
  assert.equal(it.publicState, "group_source_message_unverified"); assert.equal(it.researchCount, 0);
  assert.equal(it.value, null); assert.deepEqual(it.numbers, []); // no Number 0, no invented number
});
test("unknown author / no group proof / empty body excluded (no name inference)", () => {
  assert.equal(groupRowToWorldUpdate(row({ contributor_slug: null, contributor_name: "צבי" })), null);
  assert.equal(groupRowToWorldUpdate(row({ group_proof: false })), null);
  assert.equal(groupRowToWorldUpdate(row({ group_proof: undefined })), null);
  assert.equal(groupRowToWorldUpdate(row({ proof_basis: "unverified" })), null);
  assert.equal(groupRowToWorldUpdate(row({ proof_basis: undefined })), null);
  assert.equal(groupRowToWorldUpdate(row({ body: "  " })), null);
  assert.equal(groupRowToWorldUpdate(row({ contributor_slug: "lookalike" })), null);
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
test("later research enriches one group occurrence without changing its arrival or making a second source", () => {
  const g = groupRowToWorldUpdate(row());
  const feed = buildWorldDiscoveryStream({
    groupItems: [g, g],
    research: [
      { id: "f1", status: "approved", source_ref: "channel_updates:u1#finding:1", created_at: "2026-10-03T10:00:00Z" },
      { id: "f2", status: "approved", source_ref: "channel_updates:u1#finding:2", created_at: "2026-10-04T10:00:00Z" },
    ],
  });
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].id, "group:u1");
  assert.equal(feed.items[0].at, "2026-10-01T10:00:00.000Z");
  assert.equal(feed.items[0].researchUpdatedAt, "2026-10-04T10:00:00.000Z");
  assert.equal(feed.items[0].researchCount, 2);
});
test("no fake new items when reader returns nothing; reader error propagates (caller shows not_connected)", async () => {
  assert.equal(buildWorldDiscoveryStream({ groupItems: [] }).items.length, 0);
  assert.deepEqual(await fetchGroupSourceArrivals({ rpc: async () => ({ data: [], error: null }) }), []);
  await assert.rejects(fetchGroupSourceArrivals({ rpc: async () => ({ data: null, error: new Error("503") }) }));
});
test("reader calls v2 RPC with cursor", async () => {
  let seen;
  await fetchGroupSourceArrivals({ limit: 5, before: "2026-10-01T00:00:00Z", rpc: async (n, a) => { seen = [n, a]; return { data: [], error: null }; } });
  assert.deepEqual(seen, ["world_group_source_arrivals_v2", { p_limit: 5, p_before: "2026-10-01T00:00:00Z" }]);
});
test("v2 migration contract: private proof table, service-only writer, hold, no pushname trust, no channel_updates grants", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20261008190000_world_group_source_provenance_v2.sql", import.meta.url), "utf8");
  const code = sql.replace(/--.*$/gm, "");
  for (const needle of ["channel_update_group_proof", "enable row level security", "revoke all on public.channel_update_group_proof from public, anon, authenticated",
    "to service_role", "held_at is null", "verified_phone_unique", "@g.us", "drop function if exists public.world_group_source_arrivals_v1"])
    assert.ok(sql.includes(needle), needle);
  const writerGrant = code.split(";").filter((st) => /grant\s+execute/i.test(st) && st.includes("record_channel_update_group_proof_v1"));
  assert.equal(writerGrant.length, 1); assert.ok(/to service_role\s*$/i.test(writerGrant[0].trim()), "proof writer granted to service_role only");
  assert.ok(!/senderName|pushname|wa_names|credit/i.test(code), "no name-based identity");
  assert.ok(!/grant\s+select\s+on\s+(table\s+)?public\.channel_updates/i.test(code));
  assert.ok(!/(create|alter|drop)\s+policy|research_objects/i.test(code));
  // the only channel_updates write: one id-scoped contributor_id bind of the just-inserted row (no text/status/credit change)
  const upd = code.match(/update\s+public\.channel_updates[^;]*;/gi) || [];
  assert.equal(upd.length, 2); assert.ok(/set contributor_id = v_contrib where id = p_update_id;$/i.test(upd[0].trim()), upd[0]);
  assert.match(upd[1], /set group_source_intake_public = not p_hold where id = p_update_id/);
  assert.match(code, /v_inserted = 1/);
  assert.match(code, /cu.group_source_intake_public is true/);
  assert.ok(/wa_account_links/.test(code) && /w\.verified_at is not null/.test(code), "verified account links only");
  assert.ok(!/grant[^;]*wa_account_links/i.test(code), "no grant on wa_account_links");
});
test("ingest sends proof from senderId, never senderName", () => {
  const ts = readFileSync(new URL("../../../supabase/functions/wa-channel-ingest/index.ts", import.meta.url), "utf8");
  const at = ts.indexOf('rpc("record_channel_update_group_proof_v1"');
  assert.ok(at > 0);
  const guard = ts.slice(ts.lastIndexOf("if (WORLD_GROUP_CHANNELS", at), at);
  const call = ts.slice(at, at + 400);
  assert.ok(guard.includes("!outgoing") && guard.includes("!imageUrl") && guard.includes("@g.us"));
  assert.ok(call.includes("p_sender_jid: senderId") && !call.includes("senderName"));
});

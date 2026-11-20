import test from "node:test";
import assert from "node:assert/strict";
import { waRecoverMissingGroupMessages, waGroupSenderFingerprint } from "../supabase/functions/_shared/waGroupMedia.js";
import { createHash } from "node:crypto";

const chatId = "fixture@g.us";
const envelope = { idMessage: "old", chatId, type: "incoming", senderId: "fixture@c.us", timestamp: 1780000000, typeMessage: "imageMessage" };
const options = { rows: [], chatId, targetIds: ["old"], verifiedRecovery: true };
test("sender receipt hashes an exact provider JID without resolving identity or exposing it", async () => {
  const jid = "123456789@c.us";
  assert.equal(await waGroupSenderFingerprint(jid), createHash("sha256").update(jid).digest("hex"));
  assert.notEqual(await waGroupSenderFingerprint(jid), await waGroupSenderFingerprint("123456788@c.us"));
  for (const value of [null, "", "display name", "123456789@lid", "123456789@g.us"]) assert.equal(await waGroupSenderFingerprint(value), null);
});
test("exact incoming envelope supplements history without modifying it", async () => {
  const rows = [{ idMessage: "recent" }];
  const result = await waRecoverMissingGroupMessages({ ...options, rows, fetchMessage: async payload => {
    assert.deepEqual(payload, { chatId, idMessage: "old" });
    return { http_status: 200, result: envelope };
  }});
  assert.deepEqual(result, [...rows, envelope]);
  assert.equal(rows.length, 1);
});
test("normal, unverified and already-present requests never fetch", async () => {
  for (const change of [{ verifiedRecovery: false }, { targetIds: [] }, { chatId: "fixture@c.us" }, { rows: [envelope] }]) {
    const input = { ...options, ...change };
    assert.deepEqual(await waRecoverMissingGroupMessages({ ...input, fetchMessage: () => { assert.fail("unexpected provider call"); } }), input.rows);
  }
});
test("wrong, edited, deleted or incomplete envelopes fail closed", async () => {
  for (const change of [
    { idMessage: "other" }, { chatId: "other@g.us" }, { type: "outgoing" },
    { isDeleted: true }, { deletedMessageId: "deleted" }, { isEdited: true }, { editedMessageId: "edited" },
    { senderId: "" }, { timestamp: 0 }, { timestamp: "1780000000" },
  ]) {
    assert.deepEqual(await waRecoverMissingGroupMessages({ ...options, fetchMessage: async () => ({ http_status: 200, result: { ...envelope, ...change } }) }), []);
  }
  for (const response of [{ http_status: 400, result: envelope }, { http_status: 200, result: [envelope] }, { ok: false }]) {
    assert.deepEqual(await waRecoverMissingGroupMessages({ ...options, fetchMessage: async () => response }), []);
  }
  assert.deepEqual(await waRecoverMissingGroupMessages({ ...options, fetchMessage: async () => { throw Error("provider unavailable"); } }), []);
});
test("duplicate target IDs are fetched once and request count is bounded", async () => {
  let calls = 0;
  await waRecoverMissingGroupMessages({ ...options, targetIds: ["old", "old"], fetchMessage: async () => { calls++; return { http_status: 200, result: envelope }; } });
  assert.equal(calls, 1);
  calls = 0;
  await waRecoverMissingGroupMessages({ ...options, targetIds: Array.from({ length: 60 }, (_, i) => `id${i}`), fetchMessage: async () => { calls++; return { http_status: 404 }; } });
  assert.equal(calls, 50);
});
test("recovery receipts distinguish absence from rejected envelopes without provider bodies", async () => {
  const notes = [];
  for (const response of [{ http_status: 400, result: { error: "private provider detail" } }, { http_status: 200, result: { ...envelope, isEdited: true } }, { http_status: 200, result: envelope }]) {
    await waRecoverMissingGroupMessages({ ...options, fetchMessage: async () => response, note: value => notes.push(value) });
  }
  assert.deepEqual(notes, [
    { msgId: "old", outcome: "provider_unavailable", httpStatus: 400 },
    { msgId: "old", outcome: "envelope_rejected" },
    { msgId: "old", outcome: "exact_envelope_recovered" },
  ]);
});

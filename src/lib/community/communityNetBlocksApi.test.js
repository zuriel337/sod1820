import test from "node:test";
import assert from "node:assert/strict";
import { NET_BLOCK_DURATIONS, approvePermanentNetBlock, blockGuestFromMessage, cleanNetBlockReason, fetchNetBlocks, hideGuestMessage, liftNetBlock, netBlockErrorMessage, netBlockReasonValid, requestPermanentNetBlock } from "./communityNetBlocksApi.js";
import { guestPublishErrorMessage } from "./communityGuestApi.js";

test("the durations are exactly 24 hours, 3 days and 7 days; permanent is not a creatable duration", () => {
  assert.deepEqual(NET_BLOCK_DURATIONS.map(d => d.id), ["h24", "d3", "d7"]);
  assert.ok(!NET_BLOCK_DURATIONS.some(d => d.id === "permanent"));
});
test("the staff client calls exactly the six RPCs with named arguments and a cleaned reason", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: name === "community_net_blocks_list_v1" ? [{ id: "b1", state: "active", duration_kind: "d3", created_at: "t", expires_at: "t2", reason: "סיבה ארוכה מספיק", created_by_name: "אמילי", linked_messages: "2", permanent_requested: true, net_ref: "must-not-be-read", ip: "1.2.3.4" }, { nope: 1 }] : "ok", error: null }; } };
  await blockGuestFromMessage({ messageId: "m", duration: "d3", reason: "  הטרדה   חוזרת‏ של אורח  " }, client);
  await hideGuestMessage({ messageId: "m", reason: "הודעה פוגענית וברורה" }, client);
  await liftNetBlock({ blockId: "b1", reason: "נבדק והוסר לבקשת הצוות" }, client);
  await requestPermanentNetBlock({ blockId: "b1", reason: "ההטרדה חוזרת ונשנית" }, client);
  await approvePermanentNetBlock({ blockId: "b1", reason: "אישור הבעלים לצמיתות" }, client);
  const rows = await fetchNetBlocks({ includeEnded: true, limit: 20 }, client);
  assert.deepEqual(calls.map(c => c[0]), ["community_guest_block_from_message_v1", "community_guest_hide_v1", "community_net_block_lift_v1", "community_net_block_request_permanent_v1", "community_net_block_approve_permanent_v1", "community_net_blocks_list_v1"]);
  assert.deepEqual(calls[0][1], { p_message_id: "m", p_duration: "d3", p_reason: "הטרדה חוזרת של אורח", p_hide: true });
  assert.deepEqual(calls[5][1], { p_include_ended: true, p_limit: 20 });
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["by", "createdAt", "duration", "expiresAt", "id", "liftReason", "liftedAt", "liftedBy", "linkedMessages", "permanentRequested", "reason", "state"], "no address or network reference is ever read from a row");
  assert.equal(rows[0].linkedMessages, 2);
});
test("server errors become Hebrew explanations and a blocked guest gets a neutral message", async () => {
  assert.match(netBlockErrorMessage({ message: "no_network_reference" }), /הודעה ישנה/);
  assert.match(netBlockErrorMessage({ message: "reason_required" }), /סיבה/);
  assert.match(netBlockErrorMessage({ message: "boom" }), /לא הושלמה/);
  const m = guestPublishErrorMessage({ message: "community_write_blocked" });
  assert.match(m, /מוגבלת/); assert.ok(!/חסומ|IP|כתובת/.test(m), "the guest is not told why or how");
  assert.equal(netBlockReasonValid("קצר"), false); assert.equal(netBlockReasonValid("סיבה ארוכה מספיק"), true);
  assert.equal(cleanNetBlockReason("א".repeat(400)).length, 300);
  await assert.rejects(blockGuestFromMessage({ messageId: "m", duration: "d3", reason: "סיבה ארוכה מספיק" }, { rpc: async () => ({ data: null, error: { message: "not authorized" } }) }));
});

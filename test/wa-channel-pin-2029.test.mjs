// Writer pins for WhatsApp channel sources (ZURIEL 11.11.2026: «הגילוי היומי» — שחר יצחק קנדרו ויניב לוי נעוצים בראש).
import test from "node:test";
import assert from "node:assert/strict";
import { waPinHours, waPinUntil, WA_PIN_HOURS_DEFAULT, WA_PIN_HOURS_MAX } from "../supabase/functions/_shared/waChannelPin.js";

const PIN = "972500000001@c.us";
const OTHER = "972500000002@c.us";
const TS = Date.parse("2026-11-11T08:00:00Z") / 1000;
const src = (extra = {}) => ({ channel: "gilui-yomi", pin_ids: [PIN], pin_hours: 24, ...extra });

test("a listed sender's live incoming message is pinned for pin_hours from the message time", () => {
  assert.equal(waPinUntil(src(), { senderId: PIN, outgoing: false, ts: TS, status: "live" }), "2026-11-12T08:00:00.000Z");
  assert.equal(waPinUntil(src({ pin_hours: 6 }), { senderId: PIN, ts: TS, status: "live" }), "2026-11-11T14:00:00.000Z");
});

test("identity is the sender number only: unlisted, outgoing, private, malformed or missing senders are never pinned", () => {
  assert.equal(waPinUntil(src(), { senderId: OTHER, ts: TS, status: "live" }), null);
  assert.equal(waPinUntil(src(), { senderId: PIN, outgoing: true, ts: TS, status: "live" }), null);
  assert.equal(waPinUntil(src(), { senderId: PIN, ts: TS, status: "private" }), null);
  assert.equal(waPinUntil(src(), { senderId: "", ts: TS, status: "live" }), null);
  assert.equal(waPinUntil(src(), { senderId: "972500000001", ts: TS, status: "live" }), null, "a bare number is not a sender id");
  assert.equal(waPinUntil(src({ pin_ids: [] }), { senderId: PIN, ts: TS, status: "live" }), null);
  assert.equal(waPinUntil({ channel: "gilui-yomi" }, { senderId: PIN, ts: TS, status: "live" }), null, "no registry list = no pins");
  assert.equal(waPinUntil(src(), { senderId: PIN, ts: 0, status: "live" }), null);
  // A display name never pins: only senderId is consulted.
  assert.equal(waPinUntil(src({ pin_ids: ["יצחק שחר קנדרו"] }), { senderId: PIN, ts: TS, status: "live" }), null);
});

test("pin length: invalid values fall back to 24 hours, and the length is capped at 7 days", () => {
  assert.equal(WA_PIN_HOURS_DEFAULT, 24);
  assert.equal(waPinHours({}), 24);
  assert.equal(waPinHours({ pin_hours: 0 }), 24);
  assert.equal(waPinHours({ pin_hours: -5 }), 24);
  assert.equal(waPinHours({ pin_hours: "x" }), 24);
  assert.equal(waPinHours({ pin_hours: 72 }), 72);
  assert.equal(waPinHours({ pin_hours: 1000 }), WA_PIN_HOURS_MAX);
  assert.equal(waPinUntil(src({ pin_hours: 1000 }), { senderId: PIN, ts: TS, status: "live" }), "2026-11-18T08:00:00.000Z");
});

test("trimmed registry entries still match exactly", () => {
  assert.equal(waPinUntil(src({ pin_ids: [`  ${PIN} `] }), { senderId: PIN, ts: TS, status: "live" }), "2026-11-12T08:00:00.000Z");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The personal unread mark: static contract. The real behaviour is proven in the browser spec (tests/personal-attention-badge-2029.spec.cjs).
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
test("the badge counts only what is addressed to the person, a message once, and is never part of the always-loaded frame", () => {
  const lib = read("../src/lib/notifications.js");
  assert.match(lib, /PERSONAL_ATTENTION_KINDS = \["reply", "new_follower", "contribution_approved", "matrix_approved", "chiddush_approved"\]/);
  assert.doesNotMatch(lib.match(/PERSONAL_ATTENTION_KINDS = \[[^\]]*\]/)[0], /"dm"|post_new|code_new|reality_new/, "no public feed and no DM notification (the message is counted from dm_inbox)");
  assert.match(lib, /supabase\.rpc\("dm_inbox"\)/);
  assert.match(lib, /\.eq\("link", dmNotificationLink\(counterpartId\)\)/, "a DM notification is matched by its exact link, never by time or text");
  const frame = read("../src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /PersonalAttentionBadge2029 = React\.lazy/);
  assert.doesNotMatch(frame, /import [^;]*PersonalAttentionBadge2029/, "never a static import in the frame");
  assert.equal((frame.match(/<PersonalAttentionBadge2029 userId=\{user\.id\}/g) || []).length, 3, "signed-in only, in each place the profile picture is drawn");
  assert.doesNotMatch(read("../src/components/experience2029/PersonalAttentionBadge2029.jsx"), /setInterval/, "no polling");
});
test("opening a conversation reads its notification too, after the thread was really read", () => {
  const hub = read("../src/features/personalPanels/MessagesHub.jsx");
  assert.match(hub, /markDmNotificationsRead\(conv\.counterpart, \{ userId: user\.id \}\)/);
  assert.ok(hub.indexOf("setMsgs(Array.isArray(m) ? m : [])") < hub.indexOf("markDmNotificationsRead(conv.counterpart"));
});

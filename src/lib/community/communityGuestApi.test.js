import test from "node:test";
import assert from "node:assert/strict";
import { fetchGuestUnreviewed, guestBodyHasLink, guestPublishErrorMessage, publishGuestCommunityMessage, reviewGuestMessage } from "./communityGuestApi.js";
import { createTypingTracker, shouldSendTyping, typingLabel, TYPING_TTL_MS } from "./communityTyping.js";

test("guest links and attachments are detected like the server does", () => {
  for (const text of ["https://x.co", "ראו www.example.com", "example.co.il/page", "youtu.be/abc", "📎 file"]) assert.equal(guestBodyHasLink(text), true, text);
  for (const text of ["שלום לכולם", "היום 12.5 בבוקר", "מה שלומכם? טוב.", "א.ב"]) assert.equal(guestBodyHasLink(text), false, text);
});
test("server error codes become Hebrew explanations", () => {
  assert.match(guestPublishErrorMessage({ message: "rate_limited" }), /ברצף/);
  assert.match(guestPublishErrorMessage({ message: "links_not_allowed" }), /קישורים/);
  assert.match(guestPublishErrorMessage({ message: "boom" }), /נשמרה/);
});
test("guest API calls the exact RPCs with named arguments", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: name === "community_guest_unreviewed" ? ["a", "b"] : "id-1", error: null }; } };
  assert.equal(await publishGuestCommunityMessage({ body: "היי", parentId: null, website: "" }, client), "id-1");
  assert.deepEqual(await fetchGuestUnreviewed(client), ["a", "b"]);
  await reviewGuestMessage("a", "hide", client);
  assert.deepEqual(calls, [
    ["add_guest_community_message", { p_body: "היי", p_parent_id: null, p_website: null }],
    ["community_guest_unreviewed", { p_ids: null }],
    ["community_guest_review", { p_id: "a", p_action: "hide" }]]);
  await assert.rejects(publishGuestCommunityMessage({ body: "x" }, { rpc: async () => ({ data: null, error: { message: "rate_limited" } }) }));
});
test("typing tracker expires, caps and ignores malformed keys", () => {
  const t = createTypingTracker();
  t.mark("abcdefgh-1", 0); t.mark("abcdefgh-1", 100); t.mark("abcdefgh-2", 100); t.mark("short", 100); t.mark(5, 100);
  assert.equal(t.count(200), 2);
  assert.equal(t.count(100 + TYPING_TTL_MS), 0);
  for (let i = 0; i < 80; i++) t.mark(`key-${String(i).padStart(6, "0")}`, 0);
  assert.equal(t.count(1), 50);
});
test("typing is throttled and labelled without names", () => {
  assert.equal(shouldSendTyping(0, 0), true);
  assert.equal(shouldSendTyping(1000, 2000), false);
  assert.equal(shouldSendTyping(1000, 4000), true);
  assert.equal(typingLabel(0), ""); assert.equal(typingLabel(1), "מישהו מקליד…"); assert.equal(typingLabel(3), "3 מקלידים…");
});

import test from "node:test";
import assert from "node:assert/strict";
import { fetchGuestUnreviewed, guestBodyHasLink, guestPublishErrorMessage, publishGuestCommunityMessage, reviewGuestMessage } from "./communityGuestApi.js";
import { cleanTypingName, createTypingTracker, shouldSendTyping, typingLabel, TYPING_TTL_MS } from "./communityTyping.js";

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
test("typing tracker expires, caps, dedupes names and ignores malformed keys", () => {
  const t = createTypingTracker();
  t.mark("abcdefgh-1", "דוד", 0); t.mark("abcdefgh-1", "דוד", 100); t.mark("abcdefgh-2", "דוד", 100);
  t.mark("abcdefgh-3", null, 100); t.mark("abcdefgh-4", "   ", 100); t.mark("short", "x", 100); t.mark(5, "x", 100);
  assert.deepEqual(t.people(200), { names: ["דוד"], anonymous: 2 });
  assert.equal(t.count(200), 3);
  assert.equal(t.count(100 + TYPING_TTL_MS), 0);
  for (let i = 0; i < 80; i++) t.mark(`key-${String(i).padStart(6, "0")}`, null, 0);
  assert.equal(t.count(1), 50);
});
test("typing names are cleaned of control and direction characters", () => {
  assert.equal(cleanTypingName("  רות\u202e  כהן\n"), "רות כהן");
  assert.equal(cleanTypingName("א".repeat(100)).length, 40);
  assert.equal(cleanTypingName(5), null); assert.equal(cleanTypingName(" "), null);
});
test("typing is throttled and labelled by name, anonymous or both", () => {
  assert.equal(shouldSendTyping(0, 0), true);
  assert.equal(shouldSendTyping(1000, 2000), false);
  assert.equal(shouldSendTyping(1000, 4000), true);
  assert.equal(typingLabel({ names: [], anonymous: 0 }), "");
  assert.equal(typingLabel({ names: ["דוד"], anonymous: 0 }), "דוד מקליד…");
  assert.equal(typingLabel({ names: [], anonymous: 1 }), "אנונימי מקליד…");
  assert.equal(typingLabel({ names: [], anonymous: 3 }), "3 אנונימיים מקלידים…");
  assert.equal(typingLabel({ names: ["דוד", "רות"], anonymous: 0 }), "דוד, רות מקלידים…");
  assert.equal(typingLabel({ names: ["דוד"], anonymous: 1 }), "דוד, אנונימי מקלידים…");
  assert.equal(typingLabel({ names: ["דוד", "רות", "יעל"], anonymous: 2 }), "דוד, רות ועוד 3 מקלידים…");
  assert.equal(typingLabel({ names: ["דוד"], anonymous: 3 }), "דוד, 3 אנונימיים מקלידים…");
});

import test from "node:test";
import assert from "node:assert/strict";
import { GUEST_NAME_STORAGE_KEY, cleanGuestName, fetchGuestUnreviewed, guestBodyHasLink, guestNameProblem, guestPublishErrorMessage, publishGuestCommunityMessage, readGuestName, reviewGuestMessage, saveGuestName } from "./communityGuestApi.js";
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
  const guestRow = { id: "a", author_name: "אורח", body: "הודעה ממתינה", created_at: "2026-11-08T10:00:00Z", path: ["a"] };
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: name === "community_guest_unreviewed" ? [guestRow] : "id-1", error: null }; } };
  const parent = "11111111-2222-4333-8444-555555555555";
  assert.equal(await publishGuestCommunityMessage({ body: "היי", parentId: parent, website: "" }, client), "id-1");
  const pending = await fetchGuestUnreviewed({}, client);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].line, "הודעה ממתינה");
  await reviewGuestMessage("a", "hide", client);
  assert.deepEqual(calls, [
    ["add_guest_community_message", { p_body: "היי", p_parent_id: parent, p_website: null }],
    ["community_guest_unreviewed", { p_ids: null }],
    ["community_guest_review", { p_id: "a", p_action: "hide" }]]);
  await assert.rejects(publishGuestCommunityMessage({ body: "x", parentId: parent }, { rpc: async () => ({ data: null, error: { message: "rate_limited" } }) }));
});
test("pending guest messages normalize like tree hints: drop empty/duplicate rows, link to the thread path", () => {
  const client = { rpc: async () => ({ data: [
    { id: "11111111-2222-4333-8444-555555555555", author_name: " דוד ", body: "שלום", created_at: "2026-11-08T10:00:00Z", path: ["11111111-2222-4333-8444-555555555555"] },
    { id: "11111111-2222-4333-8444-555555555555", body: "כפול" },
    { id: "", body: "בלי מזהה" },
  ], error: null }) };
  return fetchGuestUnreviewed({ href: "https://sod1820.co.il/community/chat" }, client).then(pending => {
    assert.equal(pending.length, 1);
    assert.equal(pending[0].authorName, "דוד");
    assert.equal(pending[0].href, "https://sod1820.co.il/community/chat?thread=11111111-2222-4333-8444-555555555555");
  });
});
test("a guest can only comment: a message without a parent never reaches the server", async () => {
  let called = false;
  const client = { rpc: async () => { called = true; return { data: "id", error: null }; } };
  await assert.rejects(publishGuestCommunityMessage({ body: "שיחה חדשה", parentId: null }, client), /reply_only/);
  assert.equal(called, false);
  assert.match(guestPublishErrorMessage({ message: "reply_only" }), /להגיב על הודעה קיימת/);
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

test("a guest never sends a name: the request has no name argument whatever the caller passes", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: "id-2", error: null }; } };
  const parentId = "11111111-2222-4333-8444-555555555555";
  await publishGuestCommunityMessage({ body: "היי", parentId, name: "דוד כהן" }, client);
  await publishGuestCommunityMessage({ body: "היי", parentId }, client);
  for (const [, args] of calls) assert.deepEqual(Object.keys(args), ["p_body", "p_parent_id", "p_website"]);
});
test("guest name validation mirrors the server rules", () => {
  assert.equal(guestNameProblem(""), ""); assert.equal(guestNameProblem("   "), "");
  for (const ok of ["דוד", "דוד כהן", "Ruth", "אבי-עזר", "יוסי 7", "א".repeat(30)]) assert.equal(guestNameProblem(ok), "ok", ok);
  for (const bad of ["א", "א".repeat(31), "<b>x</b>", "a_b", "a@b", "a/b", "x;y"]) assert.equal(guestNameProblem(bad), "invalid_name", bad);
  for (const link of ["www.evil.com", "http://x.co", "evil.co.il/a", "📎 קובץ"]) assert.equal(guestNameProblem(link), "links_not_allowed", link);
  assert.equal(cleanGuestName("  רות\u202e \n לוי  "), "רות לוי");
  assert.match(guestPublishErrorMessage({ message: "invalid_name" }), /2 עד 30/);
});
test("the remembered guest name is a best-effort device convenience", () => {
  const store = new Map();
  const storage = { getItem: key => store.has(key) ? store.get(key) : null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  assert.equal(readGuestName(storage), "");
  saveGuestName(storage, " דוד  כהן "); assert.equal(store.get(GUEST_NAME_STORAGE_KEY), "דוד כהן"); assert.equal(readGuestName(storage), "דוד כהן");
  saveGuestName(storage, "  "); assert.equal(store.has(GUEST_NAME_STORAGE_KEY), false, "an empty name forgets the saved one");
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(readGuestName(broken), ""); assert.doesNotThrow(() => saveGuestName(broken, "דוד"));
  assert.equal(readGuestName(null), "");
});

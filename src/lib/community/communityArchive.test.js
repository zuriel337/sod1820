import test from "node:test";
import assert from "node:assert/strict";
import { PROFILE_BASELINES, VERIFIED_ARCHIVE_PROFILES, communityAuthorIdentity, decodeCommunityText, fetchCommunityArchivePage, fetchCommunityReply, fetchCommunityReplies, fetchCommunityReplyCounts, fetchCommunityThread, fetchPublicAuthorActivityPage, legacyLikeCount, normalizeCommunityRow, normalizeCommunityThreadFocus } from "./communityArchive.js";

test("preserves the five user-authorized profile like baselines", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(PROFILE_BASELINES).map(([name, value]) => [name, value.likesLabel])), {
    "תורה תמימה": "648",
    "גרין רז": "427",
    "אביזוהר בן חיים": "2.9K",
    "אמילי": "22.9K",
    "שינשין": "20.3K",
  });
  assert.equal(PROFILE_BASELINES["תורה תמימה"].isPrivate, true);
  assert.equal(PROFILE_BASELINES["שינשין"].isPrivate, true);
  assert.equal(VERIFIED_ARCHIVE_PROFILES["f499536a-e993-4a7d-8706-a2e69337c320"].sourceUserId, "u_zawiGiUO");
  assert.equal(VERIFIED_ARCHIVE_PROFILES["e7581ab5-8c15-4832-b602-f361e41ff373"].likesLabel, "22.9K");
  assert.match(VERIFIED_ARCHIVE_PROFILES["e7581ab5-8c15-4832-b602-f361e41ff373"].publicBio, /מנהלת.*כעשור/);
  assert.equal(VERIFIED_ARCHIVE_PROFILES["19936860-6b35-4386-bc44-113289858ff0"].accountUserId, "b6ce542a-2b07-4749-8aba-532c886f6de7");
  assert.equal(VERIFIED_ARCHIVE_PROFILES["4cd9c034-0464-4600-a35d-7156f0584d9b"].accountUserId, "02a0d207-0136-4beb-a34d-8ff57d10cd85");
});

test("adds the immutable imported likes baseline to new canonical reactions", () => {
  assert.equal(legacyLikeCount({ likes: 12, "👍": ["u1", "u2"] }), 14);
  assert.equal(legacyLikeCount({ likes: 0, "👍": ["u1"] }), 1);
  assert.equal(legacyLikeCount({}), 0);
});

test("normalizes an archive message without exposing identity fields", () => {
  const row = normalizeCommunityRow({
    id: "m1",
    parent_id: "p1",
    body: "שלום &#34;עולם&#34;",
    author_name: null,
    contributor: { id: "c1", display_name: "אמילי", avatar_url: "https://example.com/a.jpg" },
    reactions: { likes: 3 },
    created_at: "2026-09-22T18:32:59Z",
  });
  assert.equal(row.authorName, "אמילי");
  assert.equal(row.authorKey, "c1");
  assert.equal(row.parentId, "p1");
  assert.equal(row.body, decodeCommunityText("שלום &#34;עולם&#34;"));
  assert.deepEqual(Object.keys(row).sort(), ["authorKey", "authorName", "authorUserId", "avatarUrl", "body", "createdAt", "id", "linkedUserId", "origin", "parentId", "reactions", "targetId", "targetType", "title"].sort());
  assert.equal(row.authorUserId, null);
  assert.equal(row.linkedUserId, null);
});

test("a signed-in message uses the account identity even when a new contributor row exists", () => {
  const row = normalizeCommunityRow({
    id: "new-message", author_name: "sod1820", author_user_id: "02a0d207-0136-4beb-a34d-8ff57d10cd85",
    author_contributor_id: "fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf", body: "בדיקה", origin: "community_2029",
  });
  assert.equal(row.authorKey, "user:02a0d207-0136-4beb-a34d-8ff57d10cd85");
  const identity = communityAuthorIdentity(row.authorKey);
  assert.deepEqual(identity.accountIds, ["02a0d207-0136-4beb-a34d-8ff57d10cd85"]);
  assert.deepEqual(identity.contributorIds, ["4cd9c034-0464-4600-a35d-7156f0584d9b"]);
  const other = communityAuthorIdentity("4cd9c034-0464-4600-a35d-7156f0584d9b");
  assert.deepEqual(other.accountIds, ["02a0d207-0136-4beb-a34d-8ff57d10cd85"]);
  assert.deepEqual(other.contributorIds, ["4cd9c034-0464-4600-a35d-7156f0584d9b"]);
  const second = communityAuthorIdentity("19936860-6b35-4386-bc44-113289858ff0");
  assert.deepEqual(second.accountIds, ["b6ce542a-2b07-4749-8aba-532c886f6de7"]);
  assert.deepEqual(communityAuthorIdentity("user:b6ce542a-2b07-4749-8aba-532c886f6de7").contributorIds, ["19936860-6b35-4386-bc44-113289858ff0"]);
  assert.equal(communityAuthorIdentity("user:36f5cb84-71c3-4977-a2c7-d6413e973443").verifiedOwner, false, "former presentation pair is no longer ownership evidence");
  assert.equal(communityAuthorIdentity("e7581ab5-8c15-4832-b602-f361e41ff373").verifiedOwner, false);
});

test("same display name never makes an unlinked message part of a known author profile", () => {
  const unlinked = normalizeCommunityRow({ id: "m2", author_name: "אמילי", body: "שלום", reactions: {} });
  assert.equal(unlinked.authorKey, null);
  const signedIn = normalizeCommunityRow({ id: "m3", author_name: "אמילי", author_user_id: "b6ce542a-2b07-4749-8aba-532c886f6de7", body: "שלום" });
  assert.equal(signedIn.authorKey, "user:b6ce542a-2b07-4749-8aba-532c886f6de7");
  assert.notEqual(signedIn.authorKey, "e7581ab5-8c15-4832-b602-f361e41ff373");
});

test("the chat pages roots and fetches approved direct replies in reading order", async () => {
  const parentId = "94970bb8-f12a-43b5-b1a8-5898e7e6cc57";
  const childId = "d69c5c78-fc0c-4f2c-9da5-620d426d84ed";
  const requests = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input.url || input);
    requests.push(url);
    const isRoot = url.searchParams.get("parent_id") === "is.null";
    const isReply = url.searchParams.get("parent_id") === `eq.${parentId}`;
    const isCount = url.searchParams.get("parent_id")?.startsWith("in.");
    const rows = isRoot ? [{ id: parentId, parent_id: null, body: "", created_at: "2026-09-22T00:00:00Z" }]
      : isReply ? [{ id: childId, parent_id: parentId, body: "תגובה", created_at: "2026-09-22T01:00:00Z" }]
        : isCount ? [{ id: childId, parent_id: parentId }] : [];
    return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "content-range": `0-${rows.length - 1}/${rows.length}` } });
  };
  try {
    const roots = await fetchCommunityArchivePage({ limit: 5 });
    const replies = await fetchCommunityReplies(parentId, { limit: 5 });
    const counts = await fetchCommunityReplyCounts([parentId]);
    assert.equal(roots.rows.length, 1);
    assert.equal(roots.rows[0].parentId, null);
    assert.equal(roots.rows[0].body, ""); // keeps an approved empty parent as context for visible replies
    assert.equal(replies.rows[0].parentId, parentId);
    assert.equal(replies.count, 1);
    assert.equal(counts[parentId], 1);
    assert.match(requests[1].searchParams.get("order"), /created_at\.asc,id\.asc/);
    assert.ok(requests[1].searchParams.getAll("body").includes("neq."));
    assert.ok(requests.every((url) => url.searchParams.get("status") === "eq.approved"));
  } finally { globalThis.fetch = previousFetch; }
});

test("an exact personal reply link reads only an approved public root and its requested child", async () => {
  const rootId = "94970bb8-f12a-43b5-b1a8-5898e7e6cc57";
  const replyId = "d69c5c78-fc0c-4f2c-9da5-620d426d84ed";
  assert.deepEqual(normalizeCommunityThreadFocus({ threadId: rootId, replyId, path: `${rootId},${replyId}` }), { threadId: rootId, replyId, path: [rootId, replyId] });
  assert.equal(normalizeCommunityThreadFocus({ threadId: "not-a-uuid", replyId }), null);
  const requests = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input.url || input); requests.push(url);
    const isReply = url.searchParams.get("parent_id") === `eq.${rootId}`;
    const row = isReply
      ? { id: replyId, parent_id: rootId, body: "תגובה ישנה", origin: "openweb", created_at: "2016-03-08T00:00:00Z" }
      : { id: rootId, parent_id: null, body: "פוסט ישן", origin: "openweb", created_at: "2016-03-07T00:00:00Z" };
    return new Response(JSON.stringify(row), { status: 200, headers: { "content-type": "application/vnd.pgrst.object+json" } });
  };
  try {
    const root = await fetchCommunityThread(rootId);
    const reply = await fetchCommunityReply(rootId, replyId);
    assert.equal(root.id, rootId); assert.equal(root.origin, "openweb");
    assert.equal(reply.id, replyId); assert.equal(reply.parentId, rootId);
    assert.ok(requests.every((url) => url.searchParams.get("status") === "eq.approved"));
    assert.ok(requests.every((url) => url.searchParams.get("origin") === "in.(openweb,community_2029)"));
    assert.equal(requests[0].searchParams.get("parent_id"), "is.null");
  } finally { globalThis.fetch = previousFetch; }
});

test("a public author page with no count header keeps its messages and an unknown total", async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  let unknownRange = false;
  globalThis.fetch = async (input) => {
    const url = new URL(input.url || input); requests.push(url);
    const rows = url.pathname.endsWith("/contributors") ? { user_id: null }
      : [{ id: "message-ref", author_name: "שם ציבורי", body: "הודעה", origin: "openweb" }];
    return new Response(JSON.stringify(rows), { headers: { "content-type": "application/json", ...(unknownRange ? { "content-range": "0-0/*" } : {}) } });
  };
  try {
    const page = await fetchPublicAuthorActivityPage("e7581ab5-8c15-4832-b602-f361e41ff373", { filter: "chat", limit: 20 });
    assert.equal(page.count, null); assert.equal(page.rows[0].id, "message-ref"); assert.equal(page.nextOffset, 1);
    assert.equal(requests[1].searchParams.get("status"), "eq.approved");
    assert.equal(requests[1].searchParams.get("origin"), "in.(openweb,community_2029)");
    unknownRange = true;
    assert.equal((await fetchPublicAuthorActivityPage("e7581ab5-8c15-4832-b602-f361e41ff373", { filter: "chat", limit: 20 })).count, null);
  } finally { globalThis.fetch = previousFetch; }
});

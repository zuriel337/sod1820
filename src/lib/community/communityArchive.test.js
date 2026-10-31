import test from "node:test";
import assert from "node:assert/strict";
import { PROFILE_BASELINES, VERIFIED_ARCHIVE_PROFILES, communityAuthorIdentity, compareCommunityLikedRows, decodeCommunityText, fetchCommunityArchivePage, fetchCommunityReply, fetchCommunityReplies, fetchCommunityReplyCounts, fetchCommunityThread, fetchPublicAuthorActivityPage, fetchCommunityAuthorSummary, legacyLikeCount, normalizeCommunityRow, normalizeCommunityThreadFocus } from "./communityArchive.js";

test("most-loved projection combines historical and current thumbs-up counts with stable ties", () => {
  const row = (id, day, reactions, isDeleted = false) => ({ id, createdAt: `2026-10-${day}T12:00:00Z`, reactions, isDeleted });
  const source = [row("a", "30", {}), row("b", "28", { likes: 12 }), row("c", "27", { likes: 10, "👍": ["one", "two", "three"] }),
    row("d", "29", { "👍": ["one"], "🔥": Array(30).fill("other") }), row("e", "30", { likes: -50 }),
    row("f", "30", { likes: "not a count" }), row("g", "30", { likes: 900 }, true), row("h", "28", { likes: "12" })];
  const original = JSON.stringify(source);
  const ranked = [...source].sort(compareCommunityLikedRows);
  assert.deepEqual(ranked.map(item => item.id), ["c", "h", "b", "d", "g", "f", "e", "a"]);
  assert.equal(JSON.stringify(source), original, "view ranking does not mutate the paginated source");
  const nextPage = row("next", "01", { likes: 100 });
  assert.equal([...source, nextPage].sort(compareCommunityLikedRows)[0].id, "next", "newly loaded older messages can rise to the top");
  assert.equal([{ ...source[1], reactions: { likes: 14 } }, source[2]].sort(compareCommunityLikedRows)[0].id, "b", "refreshed public counts can change ranking");
});

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
  assert.deepEqual(Object.keys(row).sort(), ["authorKey", "authorName", "authorUserId", "avatarUrl", "body", "createdAt", "editedAt", "isDeleted", "id", "linkedUserId", "origin", "parentId", "reactions", "targetId", "targetType", "title"].sort());
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
    if (url.pathname.includes("/rpc/")) return new Response(JSON.stringify({ code: "PGRST202" }), { status: 404, headers: { "content-type": "application/json" } });
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
    const url = new URL(input.url || input);
    if (url.pathname.includes("/rpc/")) return new Response(JSON.stringify({ code: "PGRST202" }), { status: 404, headers: { "content-type": "application/json" } });
    requests.push(url);
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

test("a tombstone retains only thread identity/time and strips author, text, media and reactions", () => {
  const row = normalizeCommunityRow({ id: "removed", parent_id: "parent", origin: "openweb", is_deleted: true,
    body: "PRIVATE-BODY", title: "PRIVATE-TITLE", author_name: "PRIVATE-NAME", author_user_id: "PRIVATE-ACCOUNT",
    author_contributor_id: "PRIVATE-SOURCE", contributor: { id: "PRIVATE-SOURCE", user_id: "PRIVATE-ACCOUNT", avatar_url: "PRIVATE-IMAGE" },
    reactions: { likes: 999 }, created_at: "2016-03-08", edited_at: "2026-10-26" });
  assert.equal(row.id, "removed"); assert.equal(row.parentId, "parent"); assert.equal(row.isDeleted, true);
  assert.equal(row.createdAt, "2016-03-08");
  assert.doesNotMatch(JSON.stringify(row), /PRIVATE|999/);
  assert.equal(normalizeCommunityRow({ id: "removed", deleted_at: "2026-10-26", body: "PRIVATE-BODY" }).body, "");
});

test("canonical feed/reply readers request only public message fields and preserve tombstones", async () => {
  const previousFetch = globalThis.fetch, requests = [];
  const id = "94970bb8-f12a-43b5-b1a8-5898e7e6cc57";
  globalThis.fetch = async input => {
    const url = new URL(input.url || input); requests.push(url);
    const data = url.pathname.endsWith("community_reply_counts") ? [{ parent_id: id, reply_count: "2" }]
      : [{ id, parent_id: null, origin: "openweb", is_deleted: true, created_at: "2016-03-08", total_count: "1",
           contributor_user_id: "PRIVATE-ACCOUNT", contributor_avatar_url: "PRIVATE-AVATAR" }];
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  };
  try {
    const feed = await fetchCommunityArchivePage();
    const replies = await fetchCommunityReplies(id);
    const counts = await fetchCommunityReplyCounts([id]);
    assert.equal(feed.rows[0].isDeleted, true); assert.equal(feed.count, 1);
    assert.equal(replies.rows[0].isDeleted, true); assert.equal(replies.count, 1);
    assert.equal(counts[id], 2);
    assert.equal(requests.length, 3, "one public RPC per operation; no fallback on a valid result");
    for (const request of requests.slice(0, 2)) {
      assert.doesNotMatch(request.searchParams.get("select"), /contributor_(user|avatar|display)/);
      assert.match(request.searchParams.get("select"), /is_deleted/);
    }
    assert.doesNotMatch(JSON.stringify(feed), /PRIVATE/);
  } finally { globalThis.fetch = previousFetch; }
});

test("canonical exact context matches the requested root/child and never falls back on absent or denied content", async () => {
  const root = "94970bb8-f12a-43b5-b1a8-5898e7e6cc57", child = "d69c5c78-fc0c-4f2c-9da5-620d426d84ed";
  let rows = [{ id: root, parent_id: null, origin: "openweb", is_deleted: true }, { id: child, parent_id: root, origin: "openweb", body: "visible child" }];
  let error = null;
  const client = { rpc() { return { select() { return Promise.resolve({ data: rows, error }); } }; },
    from() { throw new Error("must not widen an authoritative RPC result"); } };
  assert.equal((await fetchCommunityThread(root, { client })).isDeleted, true);
  assert.equal((await fetchCommunityReply(root, child, { client })).body, "visible child");
  assert.equal(await fetchCommunityReply(child, root, { client }), null);
  rows = [];
  assert.equal(await fetchCommunityThread(root, { client }), null);
  error = { code: "42501", message: "denied" };
  await assert.rejects(fetchCommunityThread(root, { client }), value => value.code === "42501");
});

test("public activity reuses the bounded likes scan, counts Israel posting days and excludes private activity", async () => {
  const calls = [], rows = [{ id: "one", created_at: "2026-10-26T19:00:00Z", reactions: { likes: 2 } },
    { id: "two", created_at: "2026-10-26T22:30:00Z", reactions: { likes: 3 } }];
  const client = { from(table) { assert.equal(table, "research_contributions"); const b = {};
    for (const method of ["select", "eq", "in", "not", "neq", "or", "order"]) b[method] = (...args) => { calls.push([method, ...args]); return b; };
    b.limit = async () => ({ data: rows.slice(0, 1), error: null });
    b.range = async () => { calls.push(["range"]); return { data: rows, error: null }; }; return b; } };
  const result = await fetchCommunityAuthorSummary("4cd9c034-0464-4600-a35d-7156f0584d9b", { client });
  assert.equal(result.archiveLikes, 5);
  assert.deepEqual(result.publicActivity, { version: "public-chat-summary-v1", scope: "public_chat_only", complete: true,
    activeDays: 2, lastPublicActivityAt: rows[1].created_at });
  assert.equal(calls.filter(c => c[0] === "range").length, 1, "no extra activity query or per-message request");
  assert.ok(calls.some(c => c[0] === "eq" && c[1] === "status" && c[2] === "approved"));
  assert.ok(calls.some(c => c[0] === "not" && c[1] === "body"));
  assert.ok(calls.some(c => c[0] === "in" && c[1] === "origin" && c[2].includes("openweb")));
});

test("empty public history is measured zero; invalid or truncated activity never manufactures a complete total", async () => {
  for (const kind of ["empty", "invalid", "truncated"]) {
    let pages = 0;
    const client = { from() { const b = {}; for (const method of ["select", "eq", "in", "not", "neq", "or", "order"]) b[method] = () => b;
      b.limit = async () => ({ data: [], error: null });
      b.range = async () => { pages++; return { data: kind === "empty" ? [] : kind === "invalid" ? [{ created_at: "bad", reactions: {} }]
        : Array.from({ length: 500 }, () => ({ created_at: "2026-10-26T19:00:00Z", reactions: {} })), error: null }; }; return b; } };
    const result = await fetchCommunityAuthorSummary("4cd9c034-0464-4600-a35d-7156f0584d9b", { client });
    if (kind === "empty") { assert.equal(result.publicActivity.activeDays, 0); assert.equal(result.publicActivity.complete, true); }
    if (kind === "invalid") { assert.equal(result.publicActivity.activeDays, null); assert.equal(result.publicActivity.complete, false); }
    if (kind === "truncated") { assert.equal(result.archiveLikes, null); assert.equal(result.publicActivity, undefined); assert.equal(pages, 10); }
  }
});

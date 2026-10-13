import test from "node:test";
import assert from "node:assert/strict";
import { PROFILE_BASELINES, VERIFIED_ARCHIVE_PROFILES, communityAuthorIdentity, decodeCommunityText, legacyLikeCount, normalizeCommunityRow } from "./communityArchive.js";

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
  assert.equal(VERIFIED_ARCHIVE_PROFILES["19936860-6b35-4386-bc44-113289858ff0"].accountUserId, "b6ce542a-2b07-4749-8aba-532c886f6de7");
  assert.equal(VERIFIED_ARCHIVE_PROFILES["4cd9c034-0464-4600-a35d-7156f0584d9b"].accountUserId, "36f5cb84-71c3-4977-a2c7-d6413e973443");
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
  assert.deepEqual(Object.keys(row).sort(), ["authorKey", "authorName", "authorUserId", "avatarUrl", "body", "createdAt", "id", "origin", "parentId", "reactions"].sort());
  assert.equal(row.authorUserId, null);
});

test("a signed-in message uses the account identity even when a new contributor row exists", () => {
  const row = normalizeCommunityRow({
    id: "new-message", author_name: "sod1820", author_user_id: "b6ce542a-2b07-4749-8aba-532c886f6de7",
    author_contributor_id: "fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf", body: "בדיקה", origin: "community_2029",
  });
  assert.equal(row.authorKey, "user:b6ce542a-2b07-4749-8aba-532c886f6de7");
  const identity = communityAuthorIdentity(row.authorKey);
  assert.deepEqual(identity.accountIds, ["36f5cb84-71c3-4977-a2c7-d6413e973443", "b6ce542a-2b07-4749-8aba-532c886f6de7"]);
  assert.deepEqual(identity.contributorIds, ["4cd9c034-0464-4600-a35d-7156f0584d9b", "19936860-6b35-4386-bc44-113289858ff0"]);
  assert.equal(communityAuthorIdentity("e7581ab5-8c15-4832-b602-f361e41ff373").verifiedOwner, false);
});

test("same display name never makes an unlinked message part of a known author profile", () => {
  const unlinked = normalizeCommunityRow({ id: "m2", author_name: "אמילי", body: "שלום", reactions: {} });
  assert.equal(unlinked.authorKey, null);
  const signedIn = normalizeCommunityRow({ id: "m3", author_name: "אמילי", author_user_id: "b6ce542a-2b07-4749-8aba-532c886f6de7", body: "שלום" });
  assert.equal(signedIn.authorKey, "user:b6ce542a-2b07-4749-8aba-532c886f6de7");
  assert.notEqual(signedIn.authorKey, "e7581ab5-8c15-4832-b602-f361e41ff373");
});

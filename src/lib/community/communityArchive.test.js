import test from "node:test";
import assert from "node:assert/strict";
import { PROFILE_BASELINES, decodeCommunityText, legacyLikeCount, normalizeCommunityRow } from "./communityArchive.js";

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
  assert.deepEqual(Object.keys(row).sort(), ["authorKey", "authorName", "avatarUrl", "body", "createdAt", "id", "parentId", "reactions"].sort());
});

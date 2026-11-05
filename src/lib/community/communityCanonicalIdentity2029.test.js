import test from "node:test";
import assert from "node:assert/strict";
import { REVIEWED_TORAH_TAMIMA_LINK, canonicalCommunityAuthorKey, hasReviewedCommunityHistory, reviewedCommunityAccountId } from "./communityCanonicalIdentity2029.js";

const { accountId, contributorId } = REVIEWED_TORAH_TAMIMA_LINK;
const accountKey = `user:${accountId}`;
test("reviewed Torah Tamima history has one canonical public account key", () => {
  assert.equal(canonicalCommunityAuthorKey(contributorId), accountKey);
  assert.equal(canonicalCommunityAuthorKey(accountKey), accountKey);
  assert.equal(reviewedCommunityAccountId(contributorId), accountId);
  assert.equal(hasReviewedCommunityHistory(contributorId), true);
  assert.equal(hasReviewedCommunityHistory(accountKey), true);
});
test("matching names, unrelated users and the older login ID grant no history seal or alias", () => {
  for (const key of ["תורה תמימה", "user:793dc271-2194-4110-b5ff-d2422d6f1c85", "793dc271-2194-4110-b5ff-d2422d6f1c85",
    "11111111-1111-4111-8111-111111111111", "user:11111111-1111-4111-8111-111111111111", null]) {
    assert.equal(canonicalCommunityAuthorKey(key), key);
    assert.equal(hasReviewedCommunityHistory(key), false);
    assert.equal(reviewedCommunityAccountId(key), null);
  }
});

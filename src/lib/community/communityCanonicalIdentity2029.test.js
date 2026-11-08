import test from "node:test";
import assert from "node:assert/strict";
import { REVIEWED_EMILY_LINK, REVIEWED_SHINSHIN_LINK, REVIEWED_ESTHER_LINK, REVIEWED_TORAH_TAMIMA_LINK, canonicalCommunityAuthorKey, hasReviewedCommunityHistory, reviewedCommunityAccountId } from "./communityCanonicalIdentity2029.js";

const { accountId, contributorId } = REVIEWED_TORAH_TAMIMA_LINK;
const accountKey = `user:${accountId}`;
test("reviewed Torah Tamima history has one canonical public account key", () => {
  assert.equal(canonicalCommunityAuthorKey(contributorId), accountKey);
  assert.equal(canonicalCommunityAuthorKey(accountKey), accountKey);
  assert.equal(reviewedCommunityAccountId(contributorId), accountId);
  assert.equal(hasReviewedCommunityHistory(contributorId), true);
  assert.equal(hasReviewedCommunityHistory(accountKey), true);
});
test("reviewed Emily history has its own canonical public account key, independent of Torah Tamima's", () => {
  const emilyAccountKey = `user:${REVIEWED_EMILY_LINK.accountId}`;
  assert.equal(canonicalCommunityAuthorKey(REVIEWED_EMILY_LINK.contributorId), emilyAccountKey);
  assert.equal(canonicalCommunityAuthorKey(emilyAccountKey), emilyAccountKey);
  assert.equal(reviewedCommunityAccountId(REVIEWED_EMILY_LINK.contributorId), REVIEWED_EMILY_LINK.accountId);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_EMILY_LINK.contributorId), true);
  assert.equal(hasReviewedCommunityHistory(emilyAccountKey), true);
  // Neither link's ids are recognized under the other link's key.
  assert.equal(hasReviewedCommunityHistory(REVIEWED_TORAH_TAMIMA_LINK.accountId), false);
  assert.equal(reviewedCommunityAccountId(accountKey), null);
});
test("reviewed Shinshin history has its own canonical public account key, independent of the other links", () => {
  const shinshinAccountKey = `user:${REVIEWED_SHINSHIN_LINK.accountId}`;
  assert.equal(canonicalCommunityAuthorKey(REVIEWED_SHINSHIN_LINK.contributorId), shinshinAccountKey);
  assert.equal(canonicalCommunityAuthorKey(shinshinAccountKey), shinshinAccountKey);
  assert.equal(reviewedCommunityAccountId(REVIEWED_SHINSHIN_LINK.contributorId), REVIEWED_SHINSHIN_LINK.accountId);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_SHINSHIN_LINK.contributorId), true);
  assert.equal(hasReviewedCommunityHistory(shinshinAccountKey), true);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_EMILY_LINK.accountId), false);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_TORAH_TAMIMA_LINK.accountId), false);
});
test("matching names, unrelated users and the older login ID grant no history seal or alias", () => {
  for (const key of ["תורה תמימה", "user:793dc271-2194-4110-b5ff-d2422d6f1c85", "793dc271-2194-4110-b5ff-d2422d6f1c85",
    "11111111-1111-4111-8111-111111111111", "user:11111111-1111-4111-8111-111111111111", null]) {
    assert.equal(canonicalCommunityAuthorKey(key), key);
    assert.equal(hasReviewedCommunityHistory(key), false);
    assert.equal(reviewedCommunityAccountId(key), null);
  }
});

test("reviewed Esther26 history has its own canonical account key, independent of the other links", () => {
  const estherAccountKey = `user:${REVIEWED_ESTHER_LINK.accountId}`;
  assert.equal(canonicalCommunityAuthorKey(REVIEWED_ESTHER_LINK.contributorId), estherAccountKey);
  assert.equal(canonicalCommunityAuthorKey(estherAccountKey), estherAccountKey);
  assert.equal(reviewedCommunityAccountId(REVIEWED_ESTHER_LINK.contributorId), REVIEWED_ESTHER_LINK.accountId);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_ESTHER_LINK.contributorId), true);
  assert.equal(hasReviewedCommunityHistory(estherAccountKey), true);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_EMILY_LINK.accountId), false);
  assert.equal(hasReviewedCommunityHistory(REVIEWED_SHINSHIN_LINK.accountId), false);
});

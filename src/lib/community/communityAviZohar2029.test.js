import test from "node:test";
import assert from "node:assert/strict";
import { REVIEWED_AVI_ZOHAR_LINK, REVIEWED_COMMUNITY_HISTORY_LINKS, canonicalCommunityAuthorKey, hasReviewedCommunityHistory, reviewedCommunityAccountId } from "./communityCanonicalIdentity2029.js";
import { VERIFIED_ARCHIVE_PROFILES, communityAuthorIdentity, normalizeCommunityRow, fetchClaimedContributorIds, locallyKnownLinkedContributorIds } from "./communityArchive.js";

const key = `user:${REVIEWED_AVI_ZOHAR_LINK.accountId}`;

test("Avi Zohar Ben Haim: one person under his account, his name exactly as it always was, his whole history", () => {
  assert.ok(REVIEWED_COMMUNITY_HISTORY_LINKS.includes(REVIEWED_AVI_ZOHAR_LINK));
  assert.equal(canonicalCommunityAuthorKey(REVIEWED_AVI_ZOHAR_LINK.contributorId), key);
  assert.equal(reviewedCommunityAccountId(REVIEWED_AVI_ZOHAR_LINK.contributorId), REVIEWED_AVI_ZOHAR_LINK.accountId);
  assert.equal(hasReviewedCommunityHistory(key), true);
  // the history of both the account and the old contributor is read together
  assert.deepEqual(communityAuthorIdentity(key), { accountIds: [REVIEWED_AVI_ZOHAR_LINK.accountId], contributorIds: [REVIEWED_AVI_ZOHAR_LINK.contributorId], verifiedOwner: true });
  assert.deepEqual(communityAuthorIdentity(REVIEWED_AVI_ZOHAR_LINK.contributorId).accountIds, [REVIEWED_AVI_ZOHAR_LINK.accountId]);
  assert.equal(VERIFIED_ARCHIVE_PROFILES[key].name, "אביזוהר בן חיים");
  assert.equal(VERIFIED_ARCHIVE_PROFILES[REVIEWED_AVI_ZOHAR_LINK.contributorId].accountUserId, REVIEWED_AVI_ZOHAR_LINK.accountId);
});

test("an old message of his carries his name and the account link (so the account photo shows)", () => {
  const row = normalizeCommunityRow({ id: "m1", author_name: "אביזוהר בן חיים", author_contributor_id: REVIEWED_AVI_ZOHAR_LINK.contributorId, body: "שלום", origin: "openweb", created_at: "2020-01-01T00:00:00Z" });
  assert.equal(row.authorName, "אביזוהר בן חיים");
  assert.equal(row.linkedUserId, REVIEWED_AVI_ZOHAR_LINK.accountId);
  assert.equal(row.authorKey, key);
});

test("the old-account list excludes profiles that already have an account", async () => {
  const known = locallyKnownLinkedContributorIds();
  assert.equal(known.has(REVIEWED_AVI_ZOHAR_LINK.contributorId), true);
  const free = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual([...await fetchClaimedContributorIds([free, REVIEWED_AVI_ZOHAR_LINK.contributorId], { client: {} })], [REVIEWED_AVI_ZOHAR_LINK.contributorId]);
  // the server answer (when deployed) adds to the local knowledge; an absent or failing function changes nothing
  const server = { rpc: async () => ({ data: [free], error: null }) };
  assert.equal((await fetchClaimedContributorIds([free], { client: server })).has(free), true);
  const missing = { rpc: async name => { assert.equal(name, "community_claimed_contributors"); return { data: null, error: { code: "PGRST202" } }; } };   // not deployed yet: PGRST202
  assert.equal((await fetchClaimedContributorIds([free], { client: missing })).has(free), false);
  const broken = { rpc: async () => { throw new Error("offline"); } };
  assert.equal((await fetchClaimedContributorIds([free], { client: broken })).has(free), false);
});

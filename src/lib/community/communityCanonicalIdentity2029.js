// Exact source-to-account presentation link already approved in the 2026-11-04
// human-gated identity decision and stored in canonical Person/Contributor edges.
// This is public navigation metadata, NEVER authentication or account authority.
// A matching display name, avatar, or email cannot create any additional link.
export const REVIEWED_TORAH_TAMIMA_LINK = Object.freeze({
  accountId: "365fb241-77ed-4a9d-98ab-4e30ab53c093",
  contributorId: "1f95f46b-b18b-480b-a2d2-8a9ce90eb194",
});

export function hasReviewedCommunityHistory(authorKey) {
  return authorKey === REVIEWED_TORAH_TAMIMA_LINK.contributorId
    || authorKey === `user:${REVIEWED_TORAH_TAMIMA_LINK.accountId}`;
}

export function reviewedCommunityAccountId(contributorId) {
  return contributorId === REVIEWED_TORAH_TAMIMA_LINK.contributorId
    ? REVIEWED_TORAH_TAMIMA_LINK.accountId : null;
}

export function canonicalCommunityAuthorKey(authorKey) {
  return authorKey === REVIEWED_TORAH_TAMIMA_LINK.contributorId
    ? `user:${REVIEWED_TORAH_TAMIMA_LINK.accountId}` : authorKey;
}

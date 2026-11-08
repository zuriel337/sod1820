// Exact source-to-account presentation links already approved in human-gated
// identity decisions and stored in canonical Person/Contributor edges.
// This is public navigation metadata, NEVER authentication or account authority.
// A matching display name, avatar, or email cannot create any additional link.
export const REVIEWED_TORAH_TAMIMA_LINK = Object.freeze({
  accountId: "365fb241-77ed-4a9d-98ab-4e30ab53c093",
  contributorId: "1f95f46b-b18b-480b-a2d2-8a9ce90eb194",
});

// ZURIEL, 8.11.2026: the historical community contributor he personally identified as
// אמילי, linked to the account she verified and signed into. Same seal/unified-stats
// treatment as the Torah Tmima link above, nothing more.
export const REVIEWED_EMILY_LINK = Object.freeze({
  accountId: "5516d596-46d3-486d-a9c7-a35b36bc3755",
  contributorId: "e7581ab5-8c15-4832-b602-f361e41ff373",
});

export const REVIEWED_COMMUNITY_HISTORY_LINKS = Object.freeze([REVIEWED_TORAH_TAMIMA_LINK, REVIEWED_EMILY_LINK]);

function findReviewedLink(authorKey) {
  return REVIEWED_COMMUNITY_HISTORY_LINKS.find(
    (link) => authorKey === link.contributorId || authorKey === `user:${link.accountId}`
  ) || null;
}

export function hasReviewedCommunityHistory(authorKey) {
  return Boolean(findReviewedLink(authorKey));
}

export function reviewedCommunityAccountId(contributorId) {
  return REVIEWED_COMMUNITY_HISTORY_LINKS.find((link) => link.contributorId === contributorId)?.accountId || null;
}

export function canonicalCommunityAuthorKey(authorKey) {
  const link = REVIEWED_COMMUNITY_HISTORY_LINKS.find((candidate) => authorKey === candidate.contributorId);
  return link ? `user:${link.accountId}` : authorKey;
}

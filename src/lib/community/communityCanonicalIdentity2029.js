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

// ZURIEL, 8.11.2026: the historical community contributor he personally identified as
// שינשין (shmuels@mot.gov.il), linked to the account he verified and signed into. Same
// seal/unified-stats treatment as the two links above, nothing more; dossier visibility
// is unchanged (still private, as before this link).
export const REVIEWED_SHINSHIN_LINK = Object.freeze({
  accountId: "771dbcbd-82ab-42a8-84eb-b8043464626e",
  contributorId: "f499536a-e993-4a7d-8706-a2e69337c320",
});

// ZURIEL, 8.11.2026: Esther26 historical contributor linked to the account she verified and signed into.
export const REVIEWED_ESTHER_LINK = Object.freeze({
  accountId: "9196e2b4-6473-4d44-9bad-913a4e4c4865",
  contributorId: "99bcfb38-85be-4f38-89f0-7886f2f179e6",
});

// ZURIEL, 11.11.2026: the historical contributor "אבי זוהר בן חיים" (966 messages) ↔ the account (username mamra) that already owns it
// server-side (contributors.user_id). Display/navigation only: his name, photo and the whole history under one person.
export const REVIEWED_AVI_ZOHAR_LINK = Object.freeze({
  accountId: "368a4606-d78b-43b5-862b-0baab95944e9",
  contributorId: "27c10d9a-14a6-4493-980b-2f5eda105ad7",
});

export const REVIEWED_COMMUNITY_HISTORY_LINKS = Object.freeze([REVIEWED_TORAH_TAMIMA_LINK, REVIEWED_EMILY_LINK, REVIEWED_SHINSHIN_LINK, REVIEWED_ESTHER_LINK, REVIEWED_AVI_ZOHAR_LINK]);

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

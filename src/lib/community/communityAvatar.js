import source from "./communityAvatarSources2029.json" with { type: "json" };

// Public historical source credit only. This snapshot is never account identity,
// ownership, an image-upload preference, or a new Contributor resolver.
const sources = new Map(source.rows.map(row => [row.contributor_id, row]));
export function historicalCommunityAvatar(row) {
  if (row?.origin !== "openweb" || row?.isDeleted || row?.authorUserId || row?.linkedUserId) return null;
  const match = sources.get(row.authorKey);
  if (!match || match.visibility !== "public" || !/^\/community-avatars\/[0-9a-f]{20}\.(?:jpg|png|webp)$/.test(match.asset)) return null;
  return match.asset;
}

import { REVIEWED_TORAH_TAMIMA_LINK, canonicalCommunityAuthorKey } from "../../lib/community/communityCanonicalIdentity2029.js";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { fetchPublicAuthorActivityPage, fetchCommunityAuthorSummary, fetchLinkedAccountProfiles, resolveCommunityAuthorIdentity,
  VERIFIED_ARCHIVE_PROFILES } from "../../lib/community/communityArchive.js";
import { resolveCommunityWriter } from "../../lib/community/communityWriterLink.js";
import { communityPersonHref, validCommunityAuthorKey } from "../../lib/community/communityPersonNavigation.js";
import { withPublicContributorPerson2029 } from "./publicContributorPerson2029.js";
import { loadPublicContributor2029 } from "./loadPublicContributor2029.js";
import { SECTIONS } from "./publicContributor2029Model.js";

function publicCommunity(authorKey, page, summary) {
  const baseline = VERIFIED_ARCHIVE_PROFILES[authorKey];
  const summaryLikes = Number.isSafeInteger(summary?.archiveLikes) && summary.archiveLikes >= 0 ? summary.archiveLikes : null;
  const likes = summaryLikes ?? (baseline?.isPrivate === false && Number.isSafeInteger(baseline.likes) ? baseline.likes : null);
  return { authorKey, filter: "chat", page, summary, likes,
    likesSource: summaryLikes !== null ? "public_community_author_summary" : likes !== null ? "verified_archive_profile_baseline" : null };
}

export async function loadCommunityPerson2029(rawAuthorKey, { client = getPublicResearchClient(),
  writerReader = resolveCommunityWriter, identityReader = resolveCommunityAuthorIdentity,
  activityReader = fetchPublicAuthorActivityPage, summaryReader = fetchCommunityAuthorSummary,
  contributorReader = loadPublicContributor2029, avatarReader = fetchLinkedAccountProfiles } = {}) {
  const authorKey = canonicalCommunityAuthorKey(rawAuthorKey);
  if (!validCommunityAuthorKey(authorKey)) return null;
  // Exact public-image read only for the previously human-approved account link.
  const reviewedAvatar = async () => {
    if (authorKey !== `user:${REVIEWED_TORAH_TAMIMA_LINK.accountId}`) return null;
    try {
      const accounts = await avatarReader([REVIEWED_TORAH_TAMIMA_LINK.accountId], { client });
      return accounts?.[REVIEWED_TORAH_TAMIMA_LINK.accountId]?.avatar_url || null;
    } catch { return null; }
  };
  let writer = await writerReader(authorKey, { client });
  if (!writer) {
    const identity = await identityReader(authorKey, client);
    if (identity.accountIds.length === 1 && !authorKey.startsWith("user:")) {
      writer = await writerReader(`user:${identity.accountIds[0]}`, { client });
    }
  }
  if (writer) {
    const key = decodeURIComponent(writer.href.split("/").at(-1));
    const [view, page, summary, accountAvatar] = await Promise.all([
      contributorReader(key, { publicClient: () => client }),
      activityReader(authorKey, { client, filter: "chat", limit: 20 }).catch(() => null),
      summaryReader(authorKey, { client }).catch(() => null),
      reviewedAvatar(),
    ]);
    if (!view) return null;
    const community = page ? publicCommunity(authorKey, page, summary) : null;
    return withPublicContributorPerson2029({ ...view, profile: { ...view.profile, avatar: view.profile?.avatar || accountAvatar }, communityAuthorKey: authorKey, community,
      communityFilter: "chat", entrySection: "community" }, { kind: writer.kind, entryContext: "community", community });
  }
  const [page, summary, accountAvatar] = await Promise.all([
    activityReader(authorKey, { client, filter: "chat", limit: 20 }),
    summaryReader(authorKey, { client }).catch(() => null),
    reviewedAvatar(),
  ]);
  // Identity is limited to the author credit on an existing anonymous-visible
  // message, supplemented only by an explicitly approved historical public bio
  // in the existing source metadata. Private dossier fields are never read here.
  if (!page.rows.length) return null;
  const community = publicCommunity(authorKey, page, summary);
  const view = { kind: "community_person", canonicalHref: communityPersonHref(authorKey), noindex: true,
    profile: { name: page.rows[0].authorName, avatar: accountAvatar, bio: VERIFIED_ARCHIVE_PROFILES[authorKey]?.publicBio || "", role: "" },
    items: [], sourceGroups: [], availability: {}, partial: false,
    communityAuthorKey: authorKey, communityFilter: "chat", community,
    entrySection: "community", sections: [SECTIONS.find(([key]) => key === "community"), ["all", "הכול"], ["sources", "תרומות"]],
    activitySections: { community: "chat", all: "all", sources: "contributions" },
    contextLabel: "הודעות ופעילות", publicActions: false,
    publicLinks: authorKey.startsWith("user:") ? [] : [{
      href: `/community/chat?${new URLSearchParams({ claim: authorKey })}`,
      label: "זה החשבון הישן שלי",
    }],
  };
  return withPublicContributorPerson2029(view, { kind: "community", entryContext: "community", community });
}

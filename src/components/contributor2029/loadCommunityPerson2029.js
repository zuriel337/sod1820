import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { fetchPublicAuthorActivityPage, fetchCommunityAuthorSummary, resolveCommunityAuthorIdentity,
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

export async function loadCommunityPerson2029(authorKey, { client = getPublicResearchClient(),
  writerReader = resolveCommunityWriter, identityReader = resolveCommunityAuthorIdentity,
  activityReader = fetchPublicAuthorActivityPage, summaryReader = fetchCommunityAuthorSummary,
  contributorReader = loadPublicContributor2029 } = {}) {
  if (!validCommunityAuthorKey(authorKey)) return null;
  let writer = await writerReader(authorKey, { client });
  if (!writer) {
    const identity = await identityReader(authorKey, client);
    if (identity.accountIds.length === 1 && !authorKey.startsWith("user:")) {
      writer = await writerReader(`user:${identity.accountIds[0]}`, { client });
    }
  }
  if (writer) {
    const key = decodeURIComponent(writer.href.split("/").at(-1));
    const [view, page, summary] = await Promise.all([
      contributorReader(key, { publicClient: () => client }),
      activityReader(authorKey, { client, filter: "chat", limit: 20 }).catch(() => null),
      summaryReader(authorKey, { client }).catch(() => null),
    ]);
    if (!view) return null;
    const community = page ? publicCommunity(authorKey, page, summary) : null;
    return withPublicContributorPerson2029({ ...view, communityAuthorKey: authorKey, community,
      communityFilter: "chat", entrySection: "community" }, { kind: writer.kind, entryContext: "community", community });
  }
  const [page, summary] = await Promise.all([
    activityReader(authorKey, { client, filter: "chat", limit: 20 }),
    summaryReader(authorKey, { client }).catch(() => null),
  ]);
  // Identity is limited to the author credit on an existing anonymous-visible
  // message, supplemented only by an explicitly approved historical public bio
  // in the existing source metadata. Private dossier fields are never read here.
  if (!page.rows.length) return null;
  const community = publicCommunity(authorKey, page, summary);
  const view = { kind: "community_person", canonicalHref: communityPersonHref(authorKey), noindex: true,
    profile: { name: page.rows[0].authorName, avatar: null, bio: VERIFIED_ARCHIVE_PROFILES[authorKey]?.publicBio || "", role: "" },
    items: [], sourceGroups: [], availability: {}, partial: false,
    communityAuthorKey: authorKey, communityFilter: "chat", community,
    entrySection: "community", sections: [SECTIONS.find(([key]) => key === "community"), ["all", "הכול"], ["sources", "תרומות"]],
    activitySections: { community: "chat", all: "all", sources: "contributions" },
    contextLabel: "הודעות ופעילות", publicActions: false,
    publicLinks: authorKey.startsWith("user:") ? [] : [{
      href: `/2029?${new URLSearchParams({ preview: "community", data: "live", claim: authorKey })}`,
      label: "זה החשבון הישן שלי",
    }],
  };
  return withPublicContributorPerson2029(view, { kind: "community", entryContext: "community", community });
}

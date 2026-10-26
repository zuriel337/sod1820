import { projectPersonProfile2029 } from "../../lib/research/personProfile2029Projection.js";
import { publicContributorOverview } from "./contributorOverview2029Model.js";
import { safePublicUrl } from "./publicContributor2029Model.js";
import { isCommunityPersonHref } from "../../lib/community/communityPersonNavigation.js";

// Composition over the existing anonymous writer DTO, never a Person resolver,
// standing engine or a substitute for a domain-owned public measurement reader.
const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const measurement = (value, complete, source, scope) => ({
  value: complete ? count(value) : null,
  state: complete && count(value) !== null ? "measured" : "not_measured",
  source, scope,
});
const family = (view, key, scope) => {
  const coverage = view.publicationCoverage?.[key];
  return measurement(coverage?.count, coverage?.complete === true && coverage.availability === "ok",
    "contributorPublicationCatalog", scope);
};
const unknown = (scope) => measurement(null, false, null, scope);
const axis = (key, label, measures, reason = null) => ({ key, label,
  state: Object.values(measures).some((item) => item.state === "measured") ? "partial" : "not_measured",
  score: null, measures, reason,
});

export function publicContributorPerson2029(view, { kind = null, overview = null, community = null, entryContext = "direct", requestedLens = null } = {}) {
  if (!view?.profile || !(safePublicUrl(view.canonicalHref)?.startsWith("/community/researcher/") || isCommunityPersonHref(view.canonicalHref))) {
    throw new Error("public_writer_projection_required");
  }
  const catalogueComplete = view.kind === "source_catalog" && view.catalog?.sourcesAvailable === true
    && view.catalog.truncated === false && Array.isArray(view.catalog.items)
    && view.catalog.items.every((item) => typeof item?.id === "string" && item.id.length > 0);
  const catalogue = [...new Map((view.catalog?.items || []).map((item) => [item.id, item])).values()];
  const sourcePublications = measurement(catalogue.length, catalogueComplete,
    "contributorSourceCatalogProjection+posts", "public catalogue publications; paired media count once; not independent findings");
  const mediaPublications = measurement(catalogue.filter((item) => item.media).length, catalogueComplete,
    "contributorSourceCatalogProjection+posts", "catalogue publications containing media; not individual files");
  const publications = family(view, "posts", "source-native public posts, including coauthored posts");
  const cipherRecords = family(view, "ciphers", "public cipher records attributed by credit or upload; not verified findings");
  const contributionRows = family(view, "contributions", "public contribution rows; not a chat-message or independent-finding total");
  const chat = community && community.authorKey === view.communityAuthorKey && community.filter === "chat" ? community : null;
  const messages = measurement(chat?.page?.count, Boolean(chat && Number.isSafeInteger(chat.page?.count)
    && chat.page.count >= chat.page.rows.length), "public_community_author_reader", "public chat messages and replies; not research contributions");
  const likesReceived = measurement(chat?.likes, ["verified_archive_profile_baseline", "public_community_author_summary"].includes(chat?.likesSource),
    chat?.likesSource || null, "existing public community summary or reported source-profile lifetime likes; not research standing");
  const publicActivity = chat?.summary?.publicActivity;
  const activityComplete = publicActivity?.version === "public-chat-summary-v1" && publicActivity.scope === "public_chat_only" && publicActivity.complete === true;
  const activeDays = measurement(publicActivity?.activeDays, activityComplete, "public_community_author_summary", "distinct public chat posting dates in Asia/Jerusalem; excludes private visits/searches");
  const registered = publicContributorOverview(overview);
  const joinedAt = registered.state === "ready" ? registered.joinedAt : null;
  // Only the existing canonical kind may supply a capability. Role text, item
  // volume, XP, likes and the legacy five-level result are deliberately ignored.
  const profile = projectPersonProfile2029({
    person: { displayName: view.profile.name, avatarUrl: view.profile.avatar, joinedAt },
    capabilities: { writer: kind === "writer", author: kind === "author", researcher: kind === "researcher",
      contributor: ["contributor", "community", "writer", "author", "researcher"].includes(kind) },
    metrics: { sources: sourcePublications.value, media: mediaPublications.value,
      publications: publications.value, els: cipherRecords.value, messages: messages.value },
    communityImpact: { reactionsReceived: null },
  }, { viewer: "public", entryContext, requestedLens });
  return {
    version: "writer-person-2029-v1",
    // A Contributor is not silently minted into a Person. The unsafe live Person
    // resolver is not called; canonical Person binding remains an explicit gap.
    identityScope: view.kind === "community_person" && view.communityAuthorKey?.startsWith("user:") ? "account" : "contributor",
    personBinding: "unresolved", canonicalHref: view.canonicalHref,
    profile,
    axes: [
      { ...axis("activity", "פעילות ותנופה", { activeDays }, "public_activity_reader_not_connected"),
        lastPublicActivityAt: activityComplete && typeof publicActivity.lastPublicActivityAt === "string"
          && Number.isFinite(Date.parse(publicActivity.lastPublicActivityAt)) ? publicActivity.lastPublicActivityAt : null },
      { ...axis("tenure", "ותק והמשכיות", { tenureDays: unknown("verified historical community tenure") }, "account_age_is_not_community_tenure"),
        registeredAt: joinedAt, registeredAtBasis: joinedAt ? "account_registration" : null,
        firstPublicActivityAt: chat?.summary?.firstAt || null, lastSeenAt: null },
      axis("communityImpact", "השפעה בקהילה", {
        likesReceived,
        reactionsReceived: unknown("author-wide public reactions"),
        uniqueResponders: unknown("distinct verified public responders"),
        repliesReceived: unknown("public replies received"),
      }, "native_community_activity_remains_lazy_and_separate"),
      axis("contribution", "תרומה", { ...(chat ? { messages } : {}), sourcePublications, mediaPublications, cipherRecords, contributionRows }),
      { ...axis("researchStanding", "מעמד מחקרי", {}, "approved_public_dossier_and_progression_gates_not_connected"),
        applicable: profile.capabilities.researcher, level: null, progress: null },
      axis("publication", "פרסומים", { publications }),
      axis("humanCuration", "הכרה אנושית", {}, "governed_person_recognition_not_connected"),
    ],
  };
}

export function withPublicContributorPerson2029(view, options) {
  return { ...view, personProjection: publicContributorPerson2029(view, options) };
}

import { contributorHref } from "../../lib/supabase.js";
import { CONTRIBUTOR_LOAD_PROFILE, fetchContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";
import { CONTRIBUTOR_PUBLICATION_FAMILIES, fetchContributorPublicationCatalog } from "../../lib/research/contributorPublicationCatalog.js";
import { getPublicResearchClient, PROJECTOR_MODE } from "../../lib/research/researchViewMode.js";
import { appendContributorPublicationCatalog, buildPublicContributorView, publicContributorAvatar } from "./publicContributor2029Model.js";
import { displayAvatarUrl } from "../../lib/avatar.js";
import { fetchContributorSourceCatalogProjection } from "../../lib/research/contributorSourceCatalogProjection.js";
import { appendSourceCatalogWritings2029, publicSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";
import { withPublicContributorPerson2029 } from "./publicContributorPerson2029.js";

async function readLinkedPublicAvatar(id, client) {
  const { data, error } = await client.from("users").select("avatar_url").eq("id", id).maybeSingle();
  return error ? null : displayAvatarUrl(data?.avatar_url);
}

async function readPublicContributorIdentity(slug, client) {
  const key = typeof slug === "string" ? slug.trim() : "";
  if (!key || key === "me" || !/^[\p{L}\p{N}_-]{1,160}$/u.test(key)) return null;
  const { data: identity, error } = await client.from("contributors")
    .select("id,slug,code,user_id,kind,display_name,avatar_url,bio,role,wa_names,media,locked,building,public_visibility:dossier_settings->>visibility,public_avatar:dossier_settings->public_avatar")
    .eq(/^\d+$/.test(key) ? "code" : "slug", key).eq("active", true).maybeSingle();
  if (error) throw error;
  return !identity?.slug || identity.locked || identity.building || identity.public_visibility && identity.public_visibility !== "public" ? null : identity;
}

function readPublicContributorPortrait(identity, client, linkedAvatarReader) {
  const avatar = publicContributorAvatar(identity);
  return !avatar && identity.public_avatar?.enabled == null && identity.user_id
    ? Promise.resolve().then(() => linkedAvatarReader(identity.user_id, client)).catch(() => null)
    : Promise.resolve(avatar);
}

const publicSiteContributions = catalogue => (catalogue.contributions?.rows || []).filter(row =>
  ["approved", "published"].includes(row.status) && !["openweb", "community_2029"].includes(row.origin));

// Dossier creation, account creation and editorial updates do not date a publication.
function earliestWriterPublication(catalogue) {
  return [
    ...(catalogue.posts?.rows || []).filter(row => row.slug).map(row => row.date),
    ...(catalogue.signedPassages?.rows || []).map(row => row.date),
    ...publicSiteContributions(catalogue).map(row => row.created_at),
  ].filter(value => typeof value === "string" && Number.isFinite(Date.parse(value)))
    .reduce((earliest, value) => !earliest || Date.parse(value) < Date.parse(earliest) ? value : earliest, null);
}

const writerCardFamilies = ["posts", "ciphers", "contributions", "signedPassages"];

export async function loadPublicContributorCard2029(slug, { client = getPublicResearchClient(),
  publicationReader = fetchContributorPublicationCatalog, linkedAvatarReader = readLinkedPublicAvatar } = {}) {
  const identity = await readPublicContributorIdentity(slug, client);
  if (!identity) return null;
  const [catalogue, avatar] = await Promise.all([
    publicationReader(identity, { client, families: identity.slug === "tzvi-opoc" ? ["posts"] : writerCardFamilies }),
    readPublicContributorPortrait(identity, client, linkedAvatarReader),
  ]);
  const count = (family, rows = catalogue[family]?.rows) => catalogue[family]?.complete === true && catalogue[family].availability === "ok"
    ? rows.length : null;
  return {
    name: identity.display_name,
    avatar,
    posts: count("posts", catalogue.posts?.rows.filter(row => row.slug)),
    ciphers: count("ciphers", catalogue.ciphers?.rows.filter(row => row.slug && row.status === "published" && row.visibility === "public")),
    contributions: count("contributions", publicSiteContributions(catalogue)),
    signedPassages: count("signedPassages"),
    firstPublicationAt: earliestWriterPublication(catalogue),
  };
}

// Identity lookup only. Content is always read once by the existing projection reader.
export async function loadPublicContributor2029(slug, {
  publicClient = getPublicResearchClient, projectionReader = fetchContributorFindingsProjection,
  catalogReader = fetchContributorSourceCatalogProjection,
  publicationReader = fetchContributorPublicationCatalog,
  linkedAvatarReader = readLinkedPublicAvatar,
} = {}) {
  const client = publicClient();
  const identity = await readPublicContributorIdentity(slug, client);
  if (!identity) return null;
  const portrait = readPublicContributorPortrait(identity, client, linkedAvatarReader);
  if (identity.slug === "tzvi-opoc") {
    let publicProjection = null;
    const [catalog, publications, avatarUrl] = await Promise.all([catalogReader("tzvi-opoc", {
      mode: PROJECTOR_MODE.PUBLIC_VIEW,
      publicClient: () => client,
      recentLimit: 20,
      topicsReader: async () => { throw new Error("anonymous_topic_reader_unavailable"); },
      findingsReader: async (slug, options) => {
        publicProjection = await projectionReader(slug, options);
        return publicProjection;
      },
    }), publicationReader(identity, { client, families: ["posts"] }), portrait]);
    if (!catalog || !publicProjection) return null;
    const publicData = buildPublicContributorView({ ...publicProjection, sourceGroups: [] }, identity);
    const view = publicSourceCatalog2029(catalog, {
      profile: { ...publicData.profile, avatar: avatarUrl }, canonicalHref: contributorHref(identity),
      community: publicData.items.filter((item) => item.type === "community"),
      communityAvailable: publicProjection.availability?.contributions === "ok",
    });
    return withPublicContributorPerson2029({ ...appendSourceCatalogWritings2029(view, publications.posts, { slug: identity.slug }),
      firstPublicationAt: earliestWriterPublication(publications),
      communityAuthorKey: identity.id }, { kind: identity.kind });
  }
  const [projection, publications, avatarUrl] = await Promise.all([projectionReader(identity.slug, {
    mode: PROJECTOR_MODE.PUBLIC_VIEW,
    publicClient: () => client,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY,
    // The existing Topic reader imports the session client and has no anonymous-client seam.
    // Fail closed until its owner adds one. Never duplicate that reader in a visual session.
    topicsReader: async () => { throw new Error("anonymous_topic_reader_unavailable"); },
  }), publicationReader(identity, { client, families: [...CONTRIBUTOR_PUBLICATION_FAMILIES, "signedPassages"] }), portrait]);
  if (!projection) return null;
  const view = buildPublicContributorView(projection, identity);
  return withPublicContributorPerson2029(appendContributorPublicationCatalog({ ...view, profile: { ...view.profile, avatar: avatarUrl },
    firstPublicationAt: earliestWriterPublication(publications),
    canonicalHref: contributorHref(identity), communityAuthorKey: identity.id }, publications, identity), { kind: identity.kind });
}

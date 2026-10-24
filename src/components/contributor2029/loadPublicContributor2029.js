import { contributorHref } from "../../lib/supabase.js";
import { CONTRIBUTOR_LOAD_PROFILE, fetchContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";
import { fetchContributorPublicationCatalog } from "../../lib/research/contributorPublicationCatalog.js";
import { getPublicResearchClient, PROJECTOR_MODE } from "../../lib/research/researchViewMode.js";
import { appendContributorPublicationCatalog, buildPublicContributorView } from "./publicContributor2029Model.js";
import { fetchContributorSourceCatalogProjection } from "../../lib/research/contributorSourceCatalogProjection.js";
import { appendSourceCatalogWritings2029, publicSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";

// Identity lookup only. Content is always read once by the existing projection reader.
export async function loadPublicContributor2029(slug, {
  publicClient = getPublicResearchClient, projectionReader = fetchContributorFindingsProjection,
  catalogReader = fetchContributorSourceCatalogProjection,
  publicationReader = fetchContributorPublicationCatalog,
} = {}) {
  const key = typeof slug === "string" ? slug.trim() : "";
  if (!key || key === "me" || !/^[\p{L}\p{N}_-]{1,160}$/u.test(key)) return null;
  const client = publicClient();
  const { data: identity, error } = await client.from("contributors")
    .select("id,slug,code,user_id,display_name,avatar_url,bio,role,wa_names,media,locked,building,public_visibility:dossier_settings->>visibility,public_avatar:dossier_settings->public_avatar")
    .eq(/^\d+$/.test(key) ? "code" : "slug", key).eq("active", true).maybeSingle();
  if (error) throw error;
  if (!identity?.slug || identity.locked || identity.building || identity.public_visibility && identity.public_visibility !== "public") return null;
  if (identity.slug === "tzvi-opoc") {
    let publicProjection = null;
    const [catalog, publications] = await Promise.all([catalogReader("tzvi-opoc", {
      mode: PROJECTOR_MODE.PUBLIC_VIEW,
      publicClient: () => client,
      recentLimit: 20,
      topicsReader: async () => { throw new Error("anonymous_topic_reader_unavailable"); },
      findingsReader: async (slug, options) => {
        publicProjection = await projectionReader(slug, options);
        return publicProjection;
      },
    }), publicationReader(identity, { client, families: ["posts"] })]);
    if (!catalog || !publicProjection) return null;
    const publicData = buildPublicContributorView({ ...publicProjection, sourceGroups: [] }, identity);
    const view = publicSourceCatalog2029(catalog, {
      profile: publicData.profile, canonicalHref: contributorHref(identity),
      community: publicData.items.filter((item) => item.type === "community"),
      communityAvailable: publicProjection.availability?.contributions === "ok",
    });
    return { ...appendSourceCatalogWritings2029(view, publications.posts, { slug: identity.slug }), communityAuthorKey: identity.id };
  }
  const [projection, publications] = await Promise.all([projectionReader(identity.slug, {
    mode: PROJECTOR_MODE.PUBLIC_VIEW,
    publicClient: () => client,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY,
    // The existing Topic reader imports the session client and has no anonymous-client seam.
    // Fail closed until its owner adds one. Never duplicate that reader in a visual session.
    topicsReader: async () => { throw new Error("anonymous_topic_reader_unavailable"); },
  }), publicationReader(identity, { client })]);
  if (!projection) return null;
  return appendContributorPublicationCatalog({ ...buildPublicContributorView(projection, identity),
    canonicalHref: contributorHref(identity), communityAuthorKey: identity.id }, publications, identity);
}

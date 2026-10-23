import { contributorHref } from "../../lib/supabase.js";
import { fetchContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";
import { getPublicResearchClient, PROJECTOR_MODE } from "../../lib/research/researchViewMode.js";
import { buildPublicContributorView } from "./publicContributor2029Model.js";
import { fetchContributorSourceCatalogProjection } from "../../lib/research/contributorSourceCatalogProjection.js";
import { publicSourceCatalog2029 } from "./publicSourceCatalog2029Model.js";

// Identity lookup only. Content is always read once by the existing projection reader.
export async function loadPublicContributor2029(slug, {
  publicClient = getPublicResearchClient, projectionReader = fetchContributorFindingsProjection,
  catalogReader = fetchContributorSourceCatalogProjection,
} = {}) {
  const key = typeof slug === "string" ? slug.trim() : "";
  if (!key || key === "me" || !/^[\p{L}\p{N}_-]{1,160}$/u.test(key)) return null;
  const client = publicClient();
  const { data: identity, error } = await client.from("contributors")
    .select("id,slug,code,display_name,avatar_url,bio,role,wa_names,locked,building,public_visibility:dossier_settings->>visibility")
    .eq(/^\d+$/.test(key) ? "code" : "slug", key).eq("active", true).maybeSingle();
  if (error) throw error;
  if (!identity?.slug || identity.locked || identity.building || identity.public_visibility && identity.public_visibility !== "public") return null;
  if (identity.slug === "tzvi-opoc") {
    let publicProjection = null;
    const catalog = await catalogReader("tzvi-opoc", {
      mode: PROJECTOR_MODE.PUBLIC_VIEW,
      publicClient: () => client,
      recentLimit: 20,
      topicsReader: async () => { throw new Error("anonymous_topic_reader_unavailable"); },
      findingsReader: async (slug, options) => {
        publicProjection = await projectionReader(slug, options);
        return publicProjection;
      },
    });
    if (!catalog || !publicProjection) return null;
    const publicData = buildPublicContributorView({ ...publicProjection, sourceGroups: [] }, identity);
    return publicSourceCatalog2029(catalog, {
      profile: publicData.profile, canonicalHref: contributorHref(identity),
      community: publicData.items.filter((item) => item.type === "community"),
      communityAvailable: publicProjection.availability?.contributions === "ok",
    });
  }
  const projection = await projectionReader(identity.slug, {
    mode: PROJECTOR_MODE.PUBLIC_VIEW,
    publicClient: () => client,
    // The existing Topic reader imports the session client and has no anonymous-client seam.
    // Fail closed until its owner adds one. Never duplicate that reader in a visual session.
    topicsReader: async () => { throw new Error("anonymous_topic_reader_unavailable"); },
  });
  if (!projection) return null;
  return { ...buildPublicContributorView(projection, identity), canonicalHref: contributorHref(identity) };
}

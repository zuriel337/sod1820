import { contributorHref } from "../../lib/supabase.js";
import { fetchContributorFindingsProjection } from "../../lib/research/contributorFindingsProjection.js";
import { getPublicResearchClient, PROJECTOR_MODE } from "../../lib/research/researchViewMode.js";
import { buildPublicContributorView } from "./publicContributor2029Model.js";

// Identity lookup only. Content is always read once by the existing projection reader.
export async function loadPublicContributor2029(slug, {
  publicClient = getPublicResearchClient, projectionReader = fetchContributorFindingsProjection,
} = {}) {
  const key = typeof slug === "string" ? slug.trim() : "";
  if (!key || key === "me" || !/^[\p{L}\p{N}_-]{1,160}$/u.test(key)) return null;
  const client = publicClient();
  const { data: identity, error } = await client.from("contributors")
    .select("id,slug,code,display_name,avatar_url,bio,role,wa_names,public_visibility:dossier_settings->>visibility")
    .eq(/^\d+$/.test(key) ? "code" : "slug", key).eq("active", true).maybeSingle();
  if (error) throw error;
  if (!identity?.slug || identity.public_visibility && identity.public_visibility !== "public") return null;
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

import { getPublicResearchClient } from "../src/lib/research/researchViewMode.js";
import { validContributorKey } from "../src/components/contributor2029/contributorRank2029Model.js";
import { publicContributorOverview, publicStudioItems } from "../src/components/contributor2029/contributorOverview2029Model.js";

export async function readPublicContributorIdentity(key, client = getPublicResearchClient()) {
  if (!validContributorKey(key)) return { state: "not_found" };
  const { data, error } = await client.from("contributors")
    .select("id,slug,code,display_name,user_id,created_at,locked,building,public_visibility:dossier_settings->>visibility,about:dossier_settings->>about,current_focus:dossier_settings->>current_focus")
    .eq(/^\d+$/.test(key) ? "code" : "slug", key).eq("active", true).maybeSingle();
  if (error) return { state: "unavailable" };
  // Legacy ContributorPage and the public page loader default an unset visibility to public.
  // Explicit private/unlisted/candidate values still fail closed; studio applies its own public flags.
  if (!data || data.public_visibility && data.public_visibility !== "public" || data.locked || data.building) return { state: "not_found" };
  return { state: "ready", identity: data };
}

export async function readPublicContributorOverview(key, { client = getPublicResearchClient(), page = 0, now = new Date() } = {}) {
  const resolved = await readPublicContributorIdentity(key, client);
  if (resolved.state !== "ready") return { state: resolved.state };
  const identity = resolved.identity;
  const [membership, studio] = await Promise.allSettled([
    identity.user_id ? client.from("users").select("created_at").eq("id", identity.user_id).maybeSingle() : Promise.resolve({ data: null }),
    client.rpc("studio_list", { p_slug: identity.slug, p_code: null }).order("sort", { ascending: true })
      .order("created_at", { ascending: true }).order("id", { ascending: true }).range(page * 20, page * 20 + 20),
  ]);
  const join = membership.status === "fulfilled" && !membership.value.error ? membership.value.data?.created_at : null;
  const studioOK = studio.status === "fulfilled" && !studio.value.error && Array.isArray(studio.value.data);
  const rows = studioOK ? studio.value.data : [];
  return publicContributorOverview({ state: "ready", joinedAt: join, pageSince: identity.created_at,
    // There is no authorized public contributor→Person presence binding. Do not query Auth or private activity.
    about: identity.about, currentFocus: identity.current_focus,
    studio: { available: studioOK, page, hasMore: rows.length > 20, items: publicStudioItems(rows.slice(0, 20), identity.id) },
  }, now);
}

export function contributorOverviewHandler({ reader = readPublicContributorOverview } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ state: "unavailable" }); }
    const query = req.query || Object.fromEntries(new URL(req.url || "/", "https://local.invalid").searchParams);
    const page = query.page === undefined ? 0 : /^\d{1,4}$/.test(query.page) ? Number(query.page) : -1;
    if (!validContributorKey(query.slug)) return res.status(404).json({ state: "not_found" });
    if (!Number.isSafeInteger(page) || page < 0 || page > 9999) return res.status(400).json({ state: "unavailable" });
    try {
      const result = publicContributorOverview(await reader(query.slug, { page }));
      return res.status(result.state === "not_found" ? 404 : result.state === "unavailable" ? 503 : 200).json(result);
    } catch { return res.status(503).json({ state: "unavailable" }); }
  };
}
export default contributorOverviewHandler();

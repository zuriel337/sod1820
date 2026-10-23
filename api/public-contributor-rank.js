import { getPublicResearchClient } from "../src/lib/research/researchViewMode.js";
import { publicContributorRank, validContributorKey } from "../src/components/contributor2029/contributorRank2029Model.js";

// Read-only bridge to the existing public rank function. The canonical account binding stays
// server-side: no user IDs, activity counts, XP, session JWT or raw RPC payload leave this handler.
export async function readPublicContributorRank(key, { client = getPublicResearchClient() } = {}) {
  if (!validContributorKey(key)) return { state: "not_found" };
  const { data: identity, error } = await client.from("contributors")
    .select("user_id,public_visibility:dossier_settings->>visibility")
    .eq(/^\d+$/.test(key) ? "code" : "slug", key).eq("active", true).maybeSingle();
  if (error) return { state: "unavailable" };
  if (!identity || identity.public_visibility !== "public") return { state: "not_found" };
  if (!identity.user_id) return { state: "unlinked" };
  const { data, error: rankError } = await client.rpc("research_level_of", { p_user: identity.user_id });
  if (rankError) return { state: "unavailable" };
  return publicContributorRank({ state: "ready", level: data?.level, label: data?.label });
}

export function contributorRankHandler({ reader = readPublicContributorRank } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ state: "unavailable" });
    }
    const key = req.query?.slug ?? new URL(req.url || "/", "https://local.invalid").searchParams.get("slug");
    if (!validContributorKey(key)) return res.status(404).json({ state: "not_found" });
    try {
      const rank = publicContributorRank(await reader(key));
      return res.status(rank.state === "not_found" ? 404 : rank.state === "unavailable" ? 503 : 200).json(rank);
    } catch { return res.status(503).json({ state: "unavailable" }); }
  };
}

export default contributorRankHandler();

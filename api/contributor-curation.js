import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON } from "../src/lib/supabase.js";
import { getPublicResearchClient } from "../src/lib/research/researchViewMode.js";
import { readPublicContributorIdentity } from "./contributor-public-overview.js";
import { loadPublicContributor2029 } from "../src/components/contributor2029/loadPublicContributor2029.js";
import { writerReadingItems } from "../src/components/contributor2029/contributorReading2029Model.js";
import { writerPinEntry } from "../src/components/contributor2029/contributorCuration2029Model.js";
const sessionClient = (token) => createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${token}` } },
});
const reply = (res, code, state) => res.status(code).json({ state });
export function contributorCurationHandler({ publicClient = getPublicResearchClient, authenticatedClient = sessionClient, loadView = loadPublicContributor2029 } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return reply(res, 405, "unavailable"); }
    try {
      if (!req.headers?.origin || new URL(req.headers.origin).host !== req.headers.host || req.headers["sec-fetch-site"] === "cross-site") return reply(res, 403, "unavailable");
      const token = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers.authorization || "")?.[1];
      if (!token) return reply(res, 401, "login_required");
      const client = authenticatedClient(token);
      const { data: auth, error: authError } = await client.auth.getUser(token);
      if (authError || !auth?.user?.id) return reply(res, 401, "login_required");
      const resolved = await readPublicContributorIdentity(req.body?.slug, publicClient());
      if (resolved.state !== "ready") return reply(res, 404, "not_found");
      const identity = resolved.identity;
      // Administrator claims/access codes never substitute for owning this exact writer account.
      if (!identity.user_id || identity.user_id !== auth.user.id) return reply(res, 403, "unavailable");
      if (req.body.action === "introduction") {
        const bio = req.body.bio;
        if (typeof bio !== "string" || Array.from(bio.trim()).length > 600) return reply(res, 400, "invalid");
        // Existing RPC treats an empty bio as 'preserve'; don't promise unsupported clearing.
        if (!bio.trim()) return reply(res, 400, "invalid");
        const { data: owners, error } = await client.from("contributors").select("id,page_config").eq("user_id", auth.user.id).limit(2);
        if (error || !Array.isArray(owners) || owners.length !== 1 || owners[0].id !== identity.id) return reply(res, 409, "unavailable");
        const owner = owners[0];
        const config = owner.page_config && typeof owner.page_config === "object" && !Array.isArray(owner.page_config) ? owner.page_config : {};
        const { data, error: savedError } = await client.rpc("update_my_page_config", { p_config: { ...config, bio: bio.trim() } });
        return reply(res, !savedError && data?.ok === true ? 200 : 503, !savedError && data?.ok === true ? "saved" : "error");
      }
      if (req.body.action !== "feature" || typeof req.body.itemId !== "string" || typeof req.body.enabled !== "boolean") return reply(res, 400, "invalid");
      // Selection is resolved afresh through the same anonymous reader, never a caller-supplied title/href/ref.
      const view = await loadView(identity.slug, { publicClient });
      if (view?.catalog?.sourcesAvailable === false) return reply(res, 503, "error");
      const publicItems = writerReadingItems(view);
      const item = publicItems.find((item) => item.id === req.body.itemId);
      if (!item) return reply(res, 404, "not_found");
      const { data: rows, error } = await client.rpc("studio_list", { p_slug: identity.slug, p_code: null });
      if (error || !Array.isArray(rows)) return reply(res, 503, "error");
      // Only reference-only pins created with this existing schema are mutated; never rewrite authored studio content.
      const pins = rows.filter((row) => row.contributor_id === identity.id && row.kind === "pin" && row.ref_type === "source"
        && row.ref === row.link_url && !row.body && !row.image_url && row.value == null && (!Array.isArray(row.media) || !row.media.length) && row.is_personal === false);
      const existing = pins.find((row) => row.link_url === item.href);
      if (!req.body.enabled && !existing) return reply(res, 200, "saved");
      const availableHrefs = new Set(publicItems.map((item) => item.href));
      if (req.body.enabled && !existing?.is_public && pins.filter((row) => row.is_public && availableHrefs.has(row.link_url)).length >= 3) return reply(res, 409, "limit");
      const { data, error: writeError } = await client.rpc("studio_upsert", { p_slug: identity.slug, p_code: null,
        p_entry: writerPinEntry(item, { id: existing?.id, enabled: req.body.enabled, sort: existing?.sort ?? -1000 }) });
      return reply(res, !writeError && typeof data === "string" ? 200 : 503, !writeError && typeof data === "string" ? "saved" : "error");
    } catch { return reply(res, 503, "error"); }
  };
}
export default contributorCurationHandler();

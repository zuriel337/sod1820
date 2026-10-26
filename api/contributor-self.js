import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON, contributorHref } from "../src/lib/supabase.js";
import { getPublicResearchClient } from "../src/lib/research/researchViewMode.js";
import { publicContributorRank, validContributorKey } from "../src/components/contributor2029/contributorRank2029Model.js";
import { publicContributorAvatar, safePublicUrl } from "../src/components/contributor2029/publicContributor2029Model.js";
import { publicWriterVisible } from "../src/lib/userCenter/writerPersonal2029.js";
const privateClient = (token) => createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
const reply = (res, code, state) => res.status(code).json({ state });
const number = (value) => value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;

async function boundWriter(client, uid) {
  const { data, error } = await client.from("contributors")
    .select("id,slug,code,display_name,bio,avatar_url,active,locked,building,visibility:dossier_settings->>visibility,public_avatar:dossier_settings->public_avatar")
    .eq("user_id", uid).limit(2);
  return error || !Array.isArray(data) ? { state: "unavailable" } : data.length > 1 ? { state: "ambiguous" }
    : data.length ? { state: "ready", row: data[0] } : { state: "unlinked" };
}
export function contributorSelfHandler({ authenticatedClient = privateClient, publicClient = getPublicResearchClient } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store"); res.setHeader("Vary", "Authorization");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive"); res.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return reply(res, 405, "unavailable"); }
    try {
      if (req.method === "POST" && (!req.headers?.origin || new URL(req.headers.origin).host !== req.headers.host || req.headers["sec-fetch-site"] === "cross-site")) return reply(res, 403, "unavailable");
      const token = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization || "")?.[1];
      if (!token) return reply(res, 401, "login_required");
      const client = authenticatedClient(token);
      const { data: auth, error: authError } = await client.auth.getUser(token);
      if (authError || !auth?.user?.id) return reply(res, 401, "login_required");
      const uid = auth.user.id;
      const query = req.query || Object.fromEntries(new URL(req.url || "/", "https://local.invalid").searchParams);
      if (req.method === "GET" && query.action === "conversation") {
        // A counterpart ID is disclosed only in this private response and only for this caller's inbox.
        const { data: inbox, error } = await client.rpc("dm_inbox");
        if (error || !Array.isArray(inbox)) return reply(res, 503, "unavailable");
        const anon = publicClient();
        let matched;
        if (validContributorKey(query.writer)) {
          const { data, error } = await anon.from("contributors")
            .select("user_id,slug,code,active,locked,building,visibility:dossier_settings->>visibility")
            .eq(/^\d+$/.test(query.writer) ? "code" : "slug", query.writer).eq("active", true).maybeSingle();
          if (!error && publicWriterVisible(data) && inbox.some((row) => row.counterpart === data.user_id)) matched = data;
        } else if (typeof query.counterpart === "string" && inbox.some((row) => row.counterpart === query.counterpart)) {
          const { data, error } = await anon.from("contributors")
            .select("user_id,slug,code,active,locked,building,visibility:dossier_settings->>visibility").eq("user_id", query.counterpart).eq("active", true).limit(2);
          if (!error && data?.length === 1 && publicWriterVisible(data[0])) matched = data[0];
        }
        return matched ? res.status(200).json({ state: "ready", counterpart: matched.user_id, writerHref: contributorHref(matched) }) : reply(res, 404, "not_found");
      }
      const bound = await boundWriter(client, uid);
      if (req.method === "GET") {
        const [account, rank, stats] = await Promise.allSettled([
          client.from("users").select("avatar_url").eq("id", uid).maybeSingle(),
          client.rpc("research_level_of", { p_user: uid }),
          client.from("profiles").select("xp,credits,streak,tier").eq("user_id", uid).maybeSingle(),
        ]);
        const value = (result) => result.status === "fulfilled" && !result.value.error ? result.value.data : null;
        const row = bound.row, privateStats = value(stats);
        return res.status(200).json({ state: "ready", writer: row ? { state: "ready", slug: row.slug, name: row.display_name, bio: row.bio || "",
          href: contributorHref(row), publicVisible: publicWriterVisible(row), avatar: publicContributorAvatar(row) } : { state: bound.state },
          accountAvatar: safePublicUrl(value(account)?.avatar_url), rank: publicContributorRank({ state: "ready", ...value(rank) }),
          stats: privateStats ? { xp: number(privateStats.xp), credits: number(privateStats.credits), streak: number(privateStats.streak), tier: typeof privateStats.tier === "string" ? privateStats.tier.slice(0, 60) : null } : null });
      }
      if (req.body?.action === "create") {
        if (bound.state !== "unlinked") return reply(res, 409, "unavailable");
        const name = req.body.displayName, bio = req.body.bio;
        if (req.body.ack !== true || typeof name !== "string" || !name.trim() || Array.from(name.trim()).length > 60 || /[@\u0000-\u001f]/.test(name)
          || typeof bio !== "string" || Array.from(bio.trim()).length > 600) return reply(res, 400, "invalid");
        // The legacy follow/rank gateways still use an author's display name.
        // A new page must not borrow an existing author's name/attribution.
        const pattern = name.trim().replace(/[\\%_]/g, "\\$&");
        const { data: names, error: nameError } = await publicClient().from("contributors")
          .select("display_name").ilike("display_name", pattern).limit(1);
        if (nameError || !Array.isArray(names)) return reply(res, 503, "unavailable");
        if (names.length) return reply(res, 409, "name_taken");
        const { data, error } = await client.rpc("update_my_page_config", { p_config: { version: 1, display_name: name.trim(), bio: bio.trim(), sections: [], highlights: [], links: [] } });
        return !error && data?.ok === true ? reply(res, 200, "saved") : reply(res, 503, "unavailable");
      }
      if (req.body?.action !== "portrait" || bound.state !== "ready" || req.body.ack !== true || typeof req.body.enabled !== "boolean") return reply(res, 400, "invalid");
      let url = null;
      if (req.body.enabled) {
        const { data, error } = await client.from("users").select("avatar_url").eq("id", uid).maybeSingle();
        url = !error && safePublicUrl(data?.avatar_url);
        if (!url) return reply(res, 400, "missing_photo");
      }
      const { data, error } = await client.rpc("update_my_dossier", { p_settings: { public_avatar: { enabled: req.body.enabled, url } } });
      return !error && data?.ok === true ? reply(res, 200, "saved") : reply(res, 503, "unavailable");
    } catch { return reply(res, 503, "unavailable"); }
  };
}
export default contributorSelfHandler();

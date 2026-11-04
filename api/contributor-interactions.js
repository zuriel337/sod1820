import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON } from "../src/lib/supabase.js";
import { getPublicResearchClient } from "../src/lib/research/researchViewMode.js";
import { readPublicContributorIdentity } from "./contributor-public-overview.js";
import { validContributorKey } from "../src/components/contributor2029/contributorRank2029Model.js";

const callerClient = (token) => createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
});
const responseState = (res, code, state) => res.status(code).json({ state });
function sameOrigin(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (!origin || !host || req.headers?.["sec-fetch-site"] === "cross-site") return false;
  try { const url = new URL(origin); return url.host === host && ["https:", "http:"].includes(url.protocol); } catch { return false; }
}

// Account binding is resolved anonymously on the server, never accepted from the caller.
// The only write uses the existing authenticated dm_send function with the sender's JWT.
export function contributorInteractionsHandler({ publicClient = getPublicResearchClient, authenticatedClient = callerClient } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "POST"].includes(req.method)) { res.setHeader("Allow", "GET, POST"); return responseState(res, 405, "unavailable"); }
    if (req.method === "POST" && !sameOrigin(req)) return responseState(res, 403, "unavailable");
    try {
      const query = req.query || Object.fromEntries(new URL(req.url || "/", "https://local.invalid").searchParams);
      const key = req.method === "POST" ? req.body?.slug : query.slug;
      if (!validContributorKey(key)) return responseState(res, 404, "not_found");
      const resolved = await readPublicContributorIdentity(key, publicClient());
      if (resolved.state !== "ready") return responseState(res, resolved.state === "not_found" ? 404 : 503, resolved.state);
      const identity = resolved.identity;
      const header = req.headers?.authorization || "";
      const token = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(header)?.[1];
      let sender = null, client = null;
      if (token) {
        client = authenticatedClient(token);
        const { data, error } = await client.auth.getUser(token);
        if (!error) sender = data?.user?.id || null;
      }
      const owner = !!sender && sender === identity.user_id;
      if (req.method === "GET") return res.status(200).json({ state: "ready", owner,
        followTopic: `author:${identity.display_name}`, message: !identity.user_id ? "unavailable" : owner ? "self" : sender ? "ready" : "login_required" });
      if (!sender) return responseState(res, 401, "login_required");
      if (req.body?.action !== "message" || typeof req.body?.body !== "string" || !req.body.body.trim() || req.body.body.trim().length > 4000)
        return responseState(res, 400, "invalid_message");
      if (!identity.user_id || owner) return responseState(res, 409, "unavailable");
      const { data, error } = await client.rpc("dm_send", { p_to: identity.user_id, p_body: req.body.body.trim() });
      return !error && data?.ok === true ? responseState(res, 200, "sent") : responseState(res, 503, "error");
    } catch { return responseState(res, 503, "unavailable"); }
  };
}
export default contributorInteractionsHandler();

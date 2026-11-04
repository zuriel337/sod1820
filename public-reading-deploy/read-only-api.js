import { deploymentAuthorized } from "./authorization.js";
import { requestOrigin } from "./api/public-document.js";
import { verifyReadingAdmin } from "./admin-request.js";
import { SUPABASE_ANON } from "../src/lib/supabase.js";

// Reuse reviewed public response projections; never forward a caller's saved
// Legacy account, Authorization, cookies or a POST to these public adapters.
export function publicReadingReadOnlyApi(handler, { authorized = deploymentAuthorized } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!authorized()) return res.status(503).json({ state: "unavailable" });
    if (!requestOrigin(req)) return res.status(421).json({ state: "unavailable" });
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ state: "unavailable" }); }
    const headers = { ...req.headers };
    for (const name of Object.keys(headers)) if (["authorization", "cookie"].includes(name.toLowerCase())) delete headers[name];
    return handler({ ...req, headers }, res);
  };
}

// Existing provider readers stay private. Deployment admission is not an admin
// credential; verify the current caller on the canonical Auth/RLS path before
// handing the request to the existing endpoint (which also checks its caller).
export function publicReadingAdminApi(handler, { authorized = deploymentAuthorized,
  originOf = requestOrigin, verify = verifyReadingAdmin } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!authorized()) return res.status(503).json({ state: "unavailable" });
    const origin = originOf(req);
    if (!origin || req.headers?.origin && req.headers.origin !== origin
      || req.headers?.["sec-fetch-site"] === "cross-site") return res.status(421).json({ state: "unavailable" });
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ state: "unavailable" });
    }
    const params = new URL(req.url, origin).searchParams;
    if ([...params.keys()].some(key => key !== "days") || params.getAll("days").length > 1
      || params.has("days") && !/^(?:[1-9]|[1-9][0-9]|[1-3][0-9]{2}|4[0-7][0-9]|480)$/.test(params.get("days")))
      return res.status(400).json({ state: "invalid_request" });
    const token = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization || "")?.[1];
    if (!token || !await verify({ token, apiKey: SUPABASE_ANON })) return res.status(403).json({ state: "admin_required" });
    return handler(req, res);
  };
}

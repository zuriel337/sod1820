import { contributorSelfHandler } from "../../api/contributor-self.js";
import { SUPABASE_ANON } from "../../src/lib/supabase.js";
import { deploymentAuthorized } from "../authorization.js";
import { requestOrigin } from "./public-document.js";
import { verifyReadingPrincipal } from "../admin-request.js";

// This adapter reuses the existing caller-owned profile/avatar implementation.
// No service role, browser role claim or deployment-wide public write bypass.
export function readingContributorSelfHandler({ authorized = deploymentAuthorized,
  originOf = requestOrigin, verify = verifyReadingPrincipal,
  handler = contributorSelfHandler({ previewReadOnly: false, avatarUpdates: true }) } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Authorization");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!authorized()) return res.status(503).json({ state: "unavailable" });
    const origin = originOf(req);
    if (!origin || req.headers?.origin && req.headers.origin !== origin || req.headers?.["sec-fetch-site"] === "cross-site") return res.status(421).json({ state: "unavailable" });
    if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ state: "unavailable" });
    const token = /^Bearer ([A-Za-z0-9_.-]{20,8192})$/.exec(req.headers?.authorization || "")?.[1];
    if (!token || !await verify({ token, apiKey: SUPABASE_ANON })) return res.status(403).json({ state: "login_required" });
    return handler(req, res);
  };
}
export default readingContributorSelfHandler();

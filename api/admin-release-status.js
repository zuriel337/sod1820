import { verifyAdmin } from "./vercel-insights.js";
import { createReleaseReader, runtimeIdentity } from "../server/adminReleaseStatus.js";
import { RELEASE_CONTRACT } from "../src/lib/admin/releaseProjection.js";

export function createAdminReleaseHandler({ verify = verifyAdmin, read = createReleaseReader(), env = process.env } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.status(405).json({ error: "method_not_allowed" }); return; }
    if (!await verify(req)) { res.status(401).json({ error: "unauthorized" }); return; }
    if (req.query?.mode === "identity") {
      res.status(200).json({ contract: RELEASE_CONTRACT, generated_at: new Date().toISOString(), identity: runtimeIdentity(env) });
      return;
    }
    if (req.query?.mode && req.query.mode !== "status") { res.status(400).json({ error: "invalid_mode" }); return; }
    try { res.status(200).json(await read()); }
    catch { res.status(503).json({ error: "release_sources_unavailable" }); }
  };
}
export default createAdminReleaseHandler();

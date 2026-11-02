import sitemapHandler from "../../api/sitemap.js";
import { PUBLIC_READING_PROFILE_ID } from "../../src/lib/publicReadingRelease2029.js";
import { deploymentAuthorized } from "../authorization.js";
import { requestOrigin } from "./public-document.js";

export function publicReadingSitemapHandler({ authorized = deploymentAuthorized, handler = sitemapHandler } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!authorized()) return res.status(503).send("Public reading deployment is not activated.");
    if (!requestOrigin(req)) return res.status(421).send("unavailable origin");
    if (!["GET", "HEAD"].includes(req.method)) { res.setHeader("Allow", "GET, HEAD"); return res.status(405).send("method not allowed"); }
    try {
      return await handler({ ...req, publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
        publicReadingProductionArtifact: true }, {
        setHeader(key, value) { res.setHeader(key, key.toLowerCase() === "cache-control" ? "no-store" : value); },
        status(code) { res.status(code); return this; },
        send(body) { return res.send(req.method === "HEAD" ? "" : body); },
      });
    } catch { return res.status(503).send("sitemap source unavailable"); }
  };
}
export default publicReadingSitemapHandler();

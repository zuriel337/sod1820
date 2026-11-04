import sitemapHandler from "../../api/sitemap.js";
import { PUBLIC_READING_PROFILE_ID } from "../../src/lib/publicReadingRelease2029.js";
import { CANONICAL_ORIGIN, deploymentAuthorized, publicIndexingAllowed } from "../authorization.js";
import { requestOrigin } from "./public-document.js";

export function publicReadingSitemapHandler({ authorized = deploymentAuthorized, indexable = publicIndexingAllowed, handler = sitemapHandler } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const origin = requestOrigin(req);
    const noindex = !indexable(origin);
    if (noindex) res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!authorized()) return res.status(503).send("Public reading deployment is not activated.");
    if (!origin) return res.status(421).send("unavailable origin");
    if (!["GET", "HEAD"].includes(req.method)) { res.setHeader("Allow", "GET, HEAD"); return res.status(405).send("method not allowed"); }
    let sourceCacheControl = "", sourceStatus = 0;
    try {
      return await handler({ ...req, publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
        publicReadingProductionArtifact: true }, {
        setHeader(key, value) {
          if (key.toLowerCase() === "cache-control") { sourceCacheControl = String(value); return; }
          if (noindex && key.toLowerCase() === "x-robots-tag") value = "noindex, nofollow, noarchive";
          res.setHeader(key, value);
        },
        status(code) { sourceStatus = code; res.status(code); return this; },
        send(body) {
          // Keep the existing XML owner's CDN policy only for its public,
          // canonical GET success. Protected receipts and errors never cache.
          const cacheable = req.method === "GET" && origin === CANONICAL_ORIGIN && !noindex && sourceStatus === 200
            && /^public\s*,/i.test(sourceCacheControl) && /\bs-maxage\s*=\s*\d+\b/i.test(sourceCacheControl)
            && /\bstale-while-revalidate\s*=\s*\d+\b/i.test(sourceCacheControl);
          res.setHeader("Cache-Control", cacheable ? sourceCacheControl : "no-store");
          return res.send(req.method === "HEAD" ? "" : body);
        },
      });
    } catch { res.setHeader("Cache-Control", "no-store"); return res.status(503).send("sitemap source unavailable"); }
  };
}
export default publicReadingSitemapHandler();

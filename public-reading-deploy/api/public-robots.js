import { CANONICAL_ORIGIN, deploymentAuthorized, protectedReviewOrigin, publicIndexingAllowed } from "../authorization.js";
import { requestOrigin } from "./public-document.js";
export function publicReadingRobotsHandler({ authorized = deploymentAuthorized, indexable = publicIndexingAllowed } = {}) {
  return (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (!authorized()) return res.status(503).send("User-agent: *\nDisallow: /\n");
    const origin = requestOrigin(req);
    if (!origin) return res.status(421).send("User-agent: *\nDisallow: /\n");
    if (!["GET", "HEAD"].includes(req.method)) return res.status(405).send("");
    if (!indexable(origin)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      return res.status(200).send(req.method === "HEAD" ? "" : "User-agent: *\nDisallow: /\n");
    }
    // Indexability is decided by canonical page metadata/publication readers.
    // Let crawlers fetch closed URLs to observe noindex; never hide it behind a
    // robots disallow. API and signed service addresses are never crawl targets.
    const body = `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /unsubscribe\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`;
    return res.status(200).send(req.method === "HEAD" ? "" : body);
  };
}
export default publicReadingRobotsHandler();

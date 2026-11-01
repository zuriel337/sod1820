import sitemapHandler from "../../api/sitemap.js";
export default async function publicSitemap(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (process.env.VERCEL_ENV !== "preview" || !["gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101", "gpt/2029-world-one-tree-sources-20261101", "gpt/2029-public-world-number-acceptance-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF)) return res.status(404).send("unavailable");
  if (!["GET", "HEAD"].includes(req.method)) return res.status(405).send("method not allowed");
  return sitemapHandler({ ...req, publicFoundationPreview: true }, {
    setHeader(key, value) { res.setHeader(key, key.toLowerCase() === "cache-control" ? "private, no-store" : value); },
    status(code) { res.status(code); return this; },
    send(body) { return res.send(body); },
  });
}

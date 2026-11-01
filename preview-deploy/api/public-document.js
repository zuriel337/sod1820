import { readFile } from "node:fs/promises";
import ogHandler from "../../api/og.js";

const BRANCH = "gpt/2029-public-foundation-continuity-20261101";
// Same metadata owner as Legacy, same static 2029 entry, genuine HTTP missing
// and source-failure status. No separate renderer, post store or indexability rule.
export function publicDocumentHandler({ env = process.env, readDocument = () => readFile(new URL("../dist/index.html", import.meta.url), "utf8"), metadataHandler = ogHandler } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== BRANCH) return res.status(404).send("unavailable");
    if (!["GET", "HEAD"].includes(req.method)) return res.status(405).send("method not allowed");
    try {
      const path = String(req.query?.path || "/");
      if (!path.startsWith("/") || path.startsWith("//")) return res.status(400).send("invalid path");
      let metadata = "", status = 200;
      await metadataHandler({ ...req, publicFoundationPreview: true, query: { ...req.query, path } }, {
        setHeader() {}, status(code) { status = code; return this; }, send(body) { metadata = String(body); },
      });
      let head = metadata.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
      if (!head) throw new Error("metadata unavailable");
      // The standalone OG document redirects human browsers. The SPA consumes
      // metadata only and must remain on the exact visited Preview address.
      head = head.replace(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/gi, "");
      head = head.replace(/<meta\b[^>]*name=["\']robots["\'][^>]*>/gi, '<meta name="robots" content="noindex, nofollow"/>');
      const document = await readDocument();
      const clean = document.replace(/<title>[\s\S]*?<\/title>/gi, "")
        .replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["'](?:og:[^"']+|article:[^"']+)["'])[^>]*>/gi, "")
        .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(status).send(req.method === "HEAD" ? "" : clean.replace(/<\/head>/i, head + "</head>"));
    } catch {
      return res.status(503).send("The page is temporarily unavailable. Please try again.");
    }
  };
}
export default publicDocumentHandler();

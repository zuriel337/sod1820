import { readFile } from "node:fs/promises";
import ogHandler from "../../api/og.js";
import { PUBLIC_READING_PROFILE_ID, publicReadingPath } from "../../src/lib/publicReadingRelease2029.js";
import { CANONICAL_ORIGIN, publicReadingOriginAllowed, protectedReviewOrigin, deploymentAuthorized } from "../authorization.js";

export function requestOrigin(req) {
  const host = req.headers?.host;
  if (typeof host !== "string" || !publicReadingOriginAllowed(`https://${host}`)) return null;
  if (req.headers?.["x-forwarded-proto"] && req.headers["x-forwarded-proto"] !== "https") return null;
  return `https://${host}`;
}

export function mergeProductionDocumentMetadata(document, metadata, { noindex = false } = {}) {
  let head = metadata.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  if (!head) throw new Error("public_metadata_unavailable");
  head = head.replace(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/gi, "");
  if (noindex) head = head.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/gi, "")
    + '<meta name="robots" content="noindex, nofollow, noarchive"/>';
  const clean = document.replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["'](?:og:[^"']+|article:[^"']+)["'])[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");
  return clean.replace(/<\/head>/i, head + "</head>");
}

// Dependency injection remains a local synthetic test seam. Hosted admission
// uses only the exact generated protected-review receipt; no request selects it.
export function publicReadingDocumentHandler({ authorized = deploymentAuthorized,
  readDocument = () => readFile(new URL("../.generated/2029.html", import.meta.url), "utf8"),
  metadataHandler = ogHandler } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!authorized()) return res.status(503).send("Public reading deployment is not activated.");
    const origin = requestOrigin(req);
    if (!origin) return res.status(421).send("unavailable origin");
    if (!["GET", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, HEAD");
      return res.status(405).send("method not allowed");
    }
    const original = typeof req.url === "string" && req.url.startsWith("/") && !req.url.startsWith("//")
      ? new URL(req.url, origin) : null;
    const originalDocument = original && !original.pathname.startsWith("/api/");
    const path = originalDocument ? original.pathname : req.query?.path ?? "/";
    if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")
      || /[\\\u0000-\u001f\u007f#?]/.test(path)) return res.status(400).send("invalid path");
    try {
      const decoded = decodeURIComponent(path);
      if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith("//")) return res.status(400).send("invalid path");
    } catch { return res.status(400).send("invalid path"); }
    if (origin !== CANONICAL_ORIGIN && origin !== protectedReviewOrigin() && originalDocument) {
      // URL.search preserves the original bytes, repeated parameters and the
      // legitimate user key `path`. Never reconstruct it from rewrite query.
      res.setHeader("Location", CANONICAL_ORIGIN + path + original.search);
      return res.status(308).send("");
    }
    try {
      const state = publicReadingPath(path);
      const closed = ["closed", "missing", "service-closed"].includes(state);
      let metadata = "", status = state === "missing" ? 404 : 200;
      // Closed and unknown addresses never invoke unrelated/private readers.
      const metadataPath = ({ "/2029": "/", "/2029/posts": "/post",
        "/2029/gematria/viral": "/2029/gematria", "/2029/calculator": "/2029/gematria" })[path] || path;
      await metadataHandler({ ...req,
        publicFoundationPreview: true,
        publicReadingRelease: PUBLIC_READING_PROFILE_ID,
        publicReadingProductionArtifact: true,
        query: { ...req.query, path: metadataPath, crawler: "search" },
      }, { setHeader() {}, status(code) { if (!closed) status = code; return this; }, send(value) { metadata = String(value); } });
      if (status >= 500) throw new Error("public_source_unavailable");
      const noindex = Boolean(protectedReviewOrigin()) || closed || status !== 200;
      const html = mergeProductionDocumentMetadata(await readDocument(), metadata, { noindex });
      const robots = html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i)?.[1];
      if (!robots) throw new Error("public_robots_unavailable");
      res.setHeader("X-Robots-Tag", robots);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (path.replace(/\/+$/, "") === "/unsubscribe") res.setHeader("Referrer-Policy", "no-referrer");
      return res.status(status).send(req.method === "HEAD" ? "" : html);
    } catch {
      res.setHeader("Retry-After", "60");
      return res.status(503).send(req.method === "HEAD" ? "" : "The page is temporarily unavailable. Please try again.");
    }
  };
}
export default publicReadingDocumentHandler();

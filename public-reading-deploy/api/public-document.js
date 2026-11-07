import { readFile } from "node:fs/promises";
import deploymentConfig from "../vercel.json" with { type: "json" };
import ogHandler from "../../api/og.js";
import { PUBLIC_READING_PROFILE_ID, publicReadingPath, publicReadingContinuation, publicTemporarilyClosed, PUBLIC_TEMPORARILY_CLOSED_RETRY_AFTER } from "../../src/lib/publicReadingRelease2029.js";
import { CANONICAL_ORIGIN, publicReadingOriginAllowed, protectedReviewOrigin, protectedReviewAuthOrigin, publicCandidateOrigin, publicIndexingAllowed, deploymentAuthorized } from "../authorization.js";

export function requestOrigin(req) {
  const host = req.headers?.host;
  if (typeof host !== "string" || !publicReadingOriginAllowed(`https://${host}`)) return null;
  if (req.headers?.["x-forwarded-proto"] && req.headers["x-forwarded-proto"] !== "https") return null;
  return `https://${host}`;
}

// The existing deployment table is also matched at the document boundary:
// platform literal matching does not decode historical percent-encoded slugs.
// No second address registry and no inferred child/parent mapping.
export function sourceDocumentContinuation(path, search = "") {
  const normalized = value => { try { return decodeURIComponent(value).replace(/\/+$/, ""); } catch { return null; } };
  const key = normalized(path);
  const rule = deploymentConfig.redirects.find(row =>
    (row.destination.includes("?sourceAttachment=") || /\/embed\/?$/.test(row.source))
    && normalized(row.source) === key);
  return rule ? rule.destination + (search ? (rule.destination.includes("?") ? "&" : "?") + search.replace(/^\?/, "") : "") : null;
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

// A file address under /assets/ (build output: hashed scripts, styles, fonts, images). The platform serves every file that exists
// in this deployment before any rewrite runs, so a request for such an address that reaches this function is a miss: typically a
// tab that still holds the previous deployment's HTML and asks for a chunk this deployment no longer carries. The answer for a
// file is a plain not-found (a few bytes, no-store, noindex), never the 2029 not-found document: HTML is the wrong type for a
// script, style or font, and every miss would run the metadata reader and render the whole ~11 KB shell for nothing. Only /assets/
// paths whose last segment has a file extension qualify; /assets, /assets/ and extension-less addresses are ordinary unknown
// routes and keep the document answer.
const ASSET_FILE_PATH = /^\/assets\/.*\.[A-Za-z0-9]{1,16}$/;
function missingAssetFile(path) {
  try { return ASSET_FILE_PATH.test(decodeURIComponent(path)); } catch { return false; }
}

// Dependency injection remains a local synthetic test seam. Hosted admission
// uses only the exact generated protected-review receipt; no request selects it.
export function publicReadingDocumentHandler({ authorized = deploymentAuthorized, indexable = publicIndexingAllowed,
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
    if (missingAssetFile(path)) {
      // After the activation, origin, method and path guards above; before any document, metadata or data work.
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(404).send(req.method === "HEAD" ? "" : "Asset not found.");
    }
    if (/^\/(?:audio\/|data\/user\/|wp-content\/plugins\/gallery-images\/style\/)/.test(path)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");return res.status(404).send(req.method === "HEAD" ? "" : "Public asset not found.");
    }
    if (path === "/wp-json/wp/v2/posts") {
      res.setHeader("Content-Type", "application/json");return res.status(404).send(req.method === "HEAD" ? "" : '{"error":"legacy_wordpress_api_unavailable"}');
    }
    if (origin !== CANONICAL_ORIGIN && origin !== protectedReviewOrigin() && origin !== protectedReviewAuthOrigin() && origin !== publicCandidateOrigin() && originalDocument) {
      // URL.search preserves the original bytes, repeated parameters and the
      // legitimate user key `path`. Never reconstruct it from rewrite query.
      res.setHeader("Location", CANONICAL_ORIGIN + path + original.search);
      return res.status(308).send("");
    }
    try {
      const search = originalDocument ? original.search : new URLSearchParams(Object.entries(req.query || {}).filter(([key]) => key !== "path")).toString();
      const continuation = sourceDocumentContinuation(path, search) || publicReadingContinuation(path, search);
      if (continuation) {
        const target = new URL(continuation, origin);
        res.setHeader("Location", target.pathname + target.search + target.hash);
        return res.status(308).send("");
      }
      const state = publicReadingPath(path, { search });
      const closed = ["closed", "missing", "service-closed"].includes(state);
      let metadata = "", metadataLocation = null, status = state === "missing" ? 404 : 200;
      // Closed and unknown addresses never invoke unrelated/private readers.
      const numberAlias = state === "public" && /^\/2029\/number\/([^/]+)\/?$/.exec(path);
      const metadataPath = state === "account" ? "/login" : numberAlias ? `/number/${numberAlias[1]}`
        : ({ "/2029": "/", "/2029/posts": "/post", "/2029/gematria": "/gematria",
          "/2029/gematria/viral": "/gematria", "/2029/calculator": "/gematria" })[path] || path;
      await metadataHandler({ ...req,
        publicFoundationPreview: true,
        publicReadingRelease: PUBLIC_READING_PROFILE_ID,
        publicReadingProductionArtifact: true,
        publicReadingSearch: search,
        query: { ...req.query, path: metadataPath, crawler: "search" },
      }, { setHeader(name,value) { if (name.toLowerCase() === "location") metadataLocation = value; }, status(code) { if (!closed) status = code; return this; }, send(value) { metadata = String(value); } });
      if (status === 308 && metadataLocation) {
        const target = new URL(metadataLocation, origin);
        // Only the approved Forum identity reader may emit this continuation.
        // Request headers/query never provide a redirect target or authority.
        if (!/^\/forum\/[0-9a-f-]{36}\/?$/i.test(decodeURIComponent(path))
          || target.origin !== origin || target.pathname !== "/community/chat") throw new Error("invalid_public_source_continuation");
        res.setHeader("Location", target.pathname + target.search + target.hash);
        return res.status(308).send("");
      }
      if (status >= 500) throw new Error("public_source_unavailable");
      // A feature area closed only until it reopens soon is answered 503 + Retry-After and keeps its indexable state.
      const temporarilyClosed = state === "closed" && publicTemporarilyClosed(path);
      const noindex = !originalDocument || !indexable(origin) || (closed && !temporarilyClosed) || state === "account" || status !== 200;
      const html = mergeProductionDocumentMetadata(await readDocument(), metadata, { noindex });
      if (temporarilyClosed) { status = 503; res.setHeader("Retry-After", String(PUBLIC_TEMPORARILY_CLOSED_RETRY_AFTER)); }
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

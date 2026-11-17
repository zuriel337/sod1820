// Post document freshness (ZURIEL 17.11.2026, POST_DOCUMENT_CDN_CACHE_EXPERIMENT_20261117): the purge the database asks for after a change
// to a Post (fn_post_document_change, through pg_net). It owns no data: it deletes the kept copies of the given Post tags with Vercel's own
// purge API for this deployment's project and environment (the same request-context API that @vercel/functions 3.11.3 calls). Deleting,
// not invalidating: the next reader gets a fresh document, never the old one once more (Vercel answers it REVALIDATED, built in the
// foreground). Production requires the shared key (SOD_POST_DOCUMENT_PURGE_KEY, the same value as the Vault secret); a missing key, a
// missing purge API or a failed purge is an explicit error, so the database's confirmation watch sees it — never a silent success.
// The list of recent changes is read by the edge directly from the database (post-document-freshness.js), not through this endpoint.
import { createHash, timingSafeEqual } from "node:crypto";
import { deploymentAuthorized, protectedReviewOrigin } from "../authorization.js";
import { requestOrigin } from "./public-document.js";

const TAG = /^post-document(?:-[0-9]{1,12})?$/;
const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");
// The key is compared in constant time (digests of equal length), so the answer time does not reveal how much of a guess was right.
const sameKey = (given, key) => { const digest = value => createHash("sha256").update(String(value)).digest(); return timingSafeEqual(digest(given), digest(key)); };

export function vercelPurgeApi() {
  const api = globalThis[REQUEST_CONTEXT]?.get?.()?.purge;
  return api && typeof api.dangerouslyDeleteByTag === "function" ? api : null;
}

export function validPurgeTags(body) {
  const tags = Array.isArray(body?.tags) ? body.tags : null;
  return tags && tags.length >= 1 && tags.length <= 16 && tags.every(tag => typeof tag === "string" && TAG.test(tag)) ? [...new Set(tags)] : null;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  return null;
}

export function postDocumentCacheHandler({ authorized = deploymentAuthorized, reviewOrigin = protectedReviewOrigin, purgeApi = vercelPurgeApi,
  env = process.env } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!authorized()) return res.status(503).json({ error: "deployment_not_activated" });
    if (!requestOrigin(req)) return res.status(421).json({ error: "unavailable_origin" });

    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
    // The protected Preview of a review build is already behind Vercel authentication; everywhere else the shared key is required.
    const reviewed = Boolean(reviewOrigin());
    const key = String(env.SOD_POST_DOCUMENT_PURGE_KEY || "");
    if (!reviewed) {
      if (!key) return res.status(503).json({ error: "purge_not_configured" });
      if (!sameKey(req.headers?.["x-sod-purge-key"] || "", key)) return res.status(401).json({ error: "unauthorized" });
    }
    const tags = validPurgeTags(await readJsonBody(req));
    if (!tags) return res.status(400).json({ error: "invalid_tags" });
    const api = purgeApi();
    if (!api) return res.status(503).json({ error: "purge_unavailable" });
    try {
      await api.dangerouslyDeleteByTag(tags);
      return res.status(200).json({ purged: tags });
    } catch {
      return res.status(502).json({ error: "purge_failed" });
    }
  };
}
export default postDocumentCacheHandler();

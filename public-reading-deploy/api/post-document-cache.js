// Post document freshness (ZURIEL 17.11.2026, POST_DOCUMENT_CDN_CACHE_EXPERIMENT_20261117): the site's one endpoint for the Post document
// CDN cache. It owns no data; it fronts two existing mechanisms.
//
// GET  — the list the edge gate reads (post-document-freshness.js): the hashed address keys of Posts changed in the last 20 minutes, from the
//        database's post_document_recent_changes_v1() (anonymous read; hashes and counts only). The CDN may keep this answer for 2 seconds
//        per region and never longer (no stale answers); any failure is a 503 that is never kept, which makes the edge build every Post
//        fresh until the list can be read again.
// POST — the purge the database asks for after a change (fn_post_document_change, through pg_net): deletes the kept copies of the given
//        Post tags with Vercel's own purge API for this deployment's project and environment (the same request-context API that
//        @vercel/functions 3.11.3 calls). Deleting, not invalidating: the next reader gets a fresh document, never the old one once more.
//        Production requires the shared key (SOD_POST_DOCUMENT_PURGE_KEY, the same value as the Vault secret); a missing key, a missing
//        purge API or a failed purge is an explicit error, so the database's confirmation watch sees it — never a silent success.
import { deploymentAuthorized, protectedReviewOrigin } from "../authorization.js";
import { requestOrigin } from "./public-document.js";

const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM";
export const POST_DOCUMENT_LIST_CDN = "max-age=2";
const TAG = /^post-document(?:-[0-9]{1,12})?$/;
const HEX16 = /^[0-9a-f]{16}$/;
const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

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
  env = process.env, fetchImpl = (...args) => fetch(...args) } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    if (!authorized()) return res.status(503).json({ error: "deployment_not_activated" });
    if (!requestOrigin(req)) return res.status(421).json({ error: "unavailable_origin" });

    if (req.method === "GET" || req.method === "HEAD") {
      try {
        const response = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/post_document_recent_changes_v1`, {
          method: "POST", headers: { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" }, body: "{}",
          signal: AbortSignal.timeout(1500) });
        const value = response.ok ? await response.json() : null;
        if (!value || value.version !== 1 || !Array.isArray(value.keys) || !value.keys.every(key => typeof key === "string" && HEX16.test(key))) {
          return res.status(503).json({ error: "list_unavailable" });
        }
        res.setHeader("Vercel-CDN-Cache-Control", POST_DOCUMENT_LIST_CDN);
        const list = { version: 1, keys: value.keys, all_until: value.all_until ?? null, window_seconds: value.window_seconds ?? 1200 };
        return res.status(200).json(req.method === "HEAD" ? {} : list);
      } catch {
        return res.status(503).json({ error: "list_unavailable" });
      }
    }

    if (req.method !== "POST") { res.setHeader("Allow", "GET, HEAD, POST"); return res.status(405).json({ error: "method_not_allowed" }); }
    // The protected Preview of a review build is already behind Vercel authentication; everywhere else the shared key is required.
    const reviewed = Boolean(reviewOrigin());
    const key = String(env.SOD_POST_DOCUMENT_PURGE_KEY || "");
    if (!reviewed) {
      if (!key) return res.status(503).json({ error: "purge_not_configured" });
      if (String(req.headers?.["x-sod-purge-key"] || "") !== key) return res.status(401).json({ error: "unauthorized" });
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

// Client side of the community link preview. SHIPPED DARK: it stays off until the `link-preview` Edge function is deployed and
// ZURIEL turns the flag on (VITE_COMMUNITY_LINK_PREVIEW=1). Off => the existing plain link card, no request at all.
import { SUPABASE_URL } from "../supabase.js";

export const LINK_PREVIEW_ENABLED = (() => { try { return import.meta.env?.VITE_COMMUNITY_LINK_PREVIEW === "1"; } catch { return false; } })();
const cache = new Map(); // href -> Promise<preview|null>; one request per link per page load

export function normalizeLinkPreview(raw, href) {
  const p = raw && typeof raw === "object" ? raw : null;
  if (!p) return null;
  const text = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const image = (() => { try { const u = new URL(String(p.image || "")); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; } })();
  const out = { title: text(p.title, 160), description: text(p.description, 300), siteName: text(p.siteName, 80), image, href };
  return out.title || out.description || out.image ? out : null;
}

export function fetchLinkPreview(href, { enabled = LINK_PREVIEW_ENABLED, fetchImpl = (typeof fetch === "function" ? fetch : null), base = SUPABASE_URL } = {}) {
  if (!enabled || !fetchImpl || !/^https:\/\//i.test(String(href || ""))) return Promise.resolve(null);
  if (!cache.has(href)) {
    cache.set(href, fetchImpl(`${base}/functions/v1/link-preview?url=${encodeURIComponent(href)}`, { credentials: "omit", referrerPolicy: "no-referrer" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => normalizeLinkPreview(body?.preview, href))
      .catch(() => null));
  }
  return cache.get(href);
}
export const _resetLinkPreviewCache = () => cache.clear();

// link-preview — Open Graph preview for a link posted in the community. READ-ONLY, NOT DEPLOYED until ZURIEL approves.
// verify_jwt=false on purpose: guests read the community. Safety: https only, default port, DNS must resolve ONLY to public addresses
// (re-checked on every redirect hop, max 3), 4s timeout, 256KB read cap, text/html only, no cookies/credentials sent, no body
// returned to the client except the parsed title/description/site/image. Nothing is stored.
import { isPublicIp, parsePublicHttpsUrl, parseOpenGraph, decodeHtmlBytes } from "../_shared/linkPreviewCore.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};
const json = (body: unknown, status = 200, cache = "public, max-age=3600, s-maxage=86400") =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": cache } });

async function resolvesPublic(host: string): Promise<boolean> {
  const answers: string[] = [];
  for (const type of ["A", "AAAA"] as const) {
    try { answers.push(...(await Deno.resolveDns(host, type))); } catch { /* no record of this type */ }
  }
  return answers.length > 0 && answers.every((ip) => isPublicIp(ip));
}

async function fetchHtml(start: URL): Promise<{ html: string; finalUrl: URL } | null> {
  let url = start;
  for (let hop = 0; hop <= 3; hop++) {
    if (!(await resolvesPublic(url.hostname))) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url.href, {
        redirect: "manual", signal: controller.signal, credentials: "omit",
        headers: { "user-agent": "SOD1820-LinkPreview/1.0 (+https://sod1820.co.il)", accept: "text/html,application/xhtml+xml" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return null;
        const resolved = parsePublicHttpsUrl(new URL(next, url).href);
        if (!resolved) return null;
        url = resolved; continue;
      }
      if (!res.ok || !/text\/html|application\/xhtml/i.test(res.headers.get("content-type") || "")) return null;
      const reader = res.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = []; let size = 0;
      while (size < 262144) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value); size += value.length;
      }
      try { await reader.cancel(); } catch { /* already closed */ }
      const all = new Uint8Array(size); let off = 0;
      for (const c of chunks) { all.set(c, off); off += c.length; }
      return { html: decodeHtmlBytes(all, res.headers.get("content-type")), finalUrl: url };
    } catch { return null; } finally { clearTimeout(timer); }
  }
  return null;
}

// Only an address that a member actually posted in a public community message is fetched. The function is open to guests and has
// no account, so without this guard it would be a free "fetch any public page" service. The check reads the same public rows a
// visitor can read (approved, not deleted, the two community origins) with the project's public key.
async function isPostedInCommunity(href: string): Promise<boolean> {
  const base = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key || href.length > 600) return false;
  // A bare address is normalized with a trailing slash; the message may not have it. Match from the address without it.
  const pattern = "*" + href.replace(/\/$/, "").replace(/[*\\]/g, "") + "*";
  try {
    const res = await fetch(`${base}/rest/v1/research_contributions?select=id&status=eq.approved&deleted_at=is.null&origin=in.(openweb,community_2029)&body=ilike.${encodeURIComponent(pattern)}&limit=1`, {
      headers: { apikey: key, Authorization: "Bearer " + key }, signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return json({ error: "method" }, 405, "no-store");
  const target = parsePublicHttpsUrl(new URL(req.url).searchParams.get("url") || "");
  if (!target) return json({ preview: null }, 200, "public, max-age=300");
  if (!(await isPostedInCommunity(target.href))) return json({ preview: null }, 200, "public, max-age=300");
  const page = await fetchHtml(target);
  const preview = page ? parseOpenGraph(page.html, page.finalUrl.href) : null;
  return json({ preview }, 200, preview ? "public, max-age=3600, s-maxage=86400" : "public, max-age=600");
});

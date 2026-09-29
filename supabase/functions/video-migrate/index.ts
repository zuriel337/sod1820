// video-migrate — canonical server-side Source Video ingestion path.
// TikTok share/page URLs are resolved inside the same Source Video owner before upload.
// G0: current live OCR_RUN_KEY is not configured, so a dedicated-key candidate would fail closed and break Source Video.
// Reuse the existing server-to-server FB_ADMIN_KEY root already present in Edge env + Vault; never expose service_role.
import {
  isAllowedTikTokMediaUrl,
  isTikTokPageUrl,
  mediaFetchHeaders,
  resolveTikTokSource,
} from "../_shared/tiktokSourceResolver.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const BUCKET = "media";
const MAX_ITEMS = 20;
const MAX_BYTES = 1024 * 1024 * 1024; // 1 GiB safety ceiling for this legacy buffered bridge.

type ResolvedSource = {
  kind: "direct" | "tiktok";
  mediaUrl: string;
  resolvedPageUrl?: string | null;
  platformVideoId?: string | null;
  resolutionSource?: string | null;
};

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
async function uploadToStorage(path: string, data: ArrayBuffer, contentType: string): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": contentType, "x-upsert": "false" },
    body: data,
  });
  if (!r.ok) throw new Error(`upload ${r.status}`);
}
async function existsInStorage(path: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/info/public/${BUCKET}/${path}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  return r.ok;
}
function validSource(src: string) { try { return new URL(src).protocol === "https:"; } catch { return false; } }
function validDest(dest: string) { return !!dest && !dest.startsWith("/") && !dest.includes("..") && dest.length <= 500; }
function contentLooksLikeHtml(contentType: string) {
  const ct = String(contentType || "").toLowerCase();
  return ct.includes("text/html") || ct.includes("application/xhtml+xml");
}

async function resolveSource(src: string): Promise<ResolvedSource> {
  if (!isTikTokPageUrl(src)) return { kind: "direct", mediaUrl: src };
  return await resolveTikTokSource(src) as ResolvedSource;
}

function mediaRequestInit(resolution: ResolvedSource, rangeProbe = false): RequestInit {
  const headers = new Headers(mediaFetchHeaders(resolution));
  if (rangeProbe) headers.set("Range", "bytes=0-0");
  return { method: "GET", headers, redirect: "follow" };
}

function applyResolutionProvenance(out: Record<string, unknown>, resolution: ResolvedSource) {
  out.source_kind = resolution.kind;
  if (resolution.kind !== "tiktok") return;
  out.platform = "tiktok";
  out.platform_video_id = resolution.platformVideoId || null;
  out.resolved_page_url = resolution.resolvedPageUrl || null;
  out.resolution_source = resolution.resolutionSource || null;
}

function resolvedMediaResponseAllowed(resolution: ResolvedSource, response: Response) {
  if (resolution.kind !== "tiktok") return true;
  return isAllowedTikTokMediaUrl(response.url || resolution.mediaUrl);
}

Deno.serve(async (req: Request) => {
  try {
    if (!ADMIN_KEY || !SUPABASE_URL || !SERVICE_KEY) return json({ error: "not_configured" }, 503);
    if (req.headers.get("x-fb-admin-key") !== ADMIN_KEY) return json({ error: "unauthorized" }, 401);
    if (req.method !== "POST") return json({ error: "POST only" }, 405);

    let items: Array<{ src: string; dest: string }> = [];
    let dryRun = false;
    try {
      const body = await req.json();
      if (Array.isArray(body?.items)) items = body.items.slice(0, MAX_ITEMS);
      if (body?.dry_run) dryRun = true;
    } catch { /* handled below */ }
    if (!items.length) return json({ error: "no items provided" }, 400);

    const results: Array<Record<string, unknown>> = [];
    for (const item of items) {
      const src = String(item?.src || "");
      const dest = String(item?.dest || "").replace(/^\/+/, "");
      const out: Record<string, unknown> = { src, dest };
      try {
        if (!validSource(src) || !validDest(dest)) { out.status = "invalid_input"; results.push(out); continue; }
        if (await existsInStorage(dest)) { out.status = "already_exists"; results.push(out); continue; }

        let resolution: ResolvedSource;
        try {
          resolution = await resolveSource(src);
          applyResolutionProvenance(out, resolution);
        } catch (error) {
          out.status = isTikTokPageUrl(src) ? "tiktok_resolve_failed" : "source_resolve_failed";
          out.error = String(error).slice(0, 250);
          results.push(out);
          continue;
        }

        if (dryRun) {
          const probe = await fetch(resolution.mediaUrl, mediaRequestInit(resolution, true));
          const probeType = probe.headers.get("content-type") || "";
          const allowed = probe.ok && resolvedMediaResponseAllowed(resolution, probe) && !contentLooksLikeHtml(probeType);
          out.status = allowed ? "source_ok" : `source_fail_${probe.status}`;
          out.source_status = probe.status;
          out.source_content_type = probeType || null;
          out.resolved_media_host = (() => { try { return new URL(probe.url || resolution.mediaUrl).hostname; } catch { return null; } })();
          try { await probe.body?.cancel(); } catch { /* best effort */ }
          results.push(out);
          continue;
        }

        const resp = await fetch(resolution.mediaUrl, mediaRequestInit(resolution));
        if (!resp.ok) { out.status = `source_fail_${resp.status}`; results.push(out); continue; }
        if (!resolvedMediaResponseAllowed(resolution, resp)) { out.status = "resolved_media_host_rejected"; results.push(out); continue; }
        const len = Number(resp.headers.get("content-length") || "0");
        if (len > MAX_BYTES) { out.status = "too_large"; results.push(out); continue; }
        const ct = resp.headers.get("content-type") || "video/mp4";
        if (contentLooksLikeHtml(ct)) { out.status = "source_not_video_html"; results.push(out); continue; }
        const buf = await resp.arrayBuffer();
        out.bytes = buf.byteLength;
        out.source_content_type = ct;
        out.resolved_media_host = (() => { try { return new URL(resp.url || resolution.mediaUrl).hostname; } catch { return null; } })();
        if (buf.byteLength < 1024) { out.status = "too_small_likely_error_page"; results.push(out); continue; }
        if (buf.byteLength > MAX_BYTES) { out.status = "too_large"; results.push(out); continue; }
        await uploadToStorage(dest, buf, ct.startsWith("video") ? ct : "video/mp4");
        out.status = "uploaded";
        out.public_url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${dest}`;
      } catch (error) {
        out.status = "error";
        out.error = String(error).slice(0, 250);
      }
      results.push(out);
    }
    return json({ summary: {
      total: results.length,
      uploaded: results.filter((r) => r.status === "uploaded").length,
      already: results.filter((r) => r.status === "already_exists").length,
      source_ok: results.filter((r) => r.status === "source_ok").length,
      failed: results.filter((r) => !["uploaded","already_exists","source_ok"].includes(String(r.status))).length,
    }, results });
  } catch (error) {
    return json({ stage: "handler", error: String(error) }, 500);
  }
});

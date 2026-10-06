// video-migrate — canonical server-side Source Video ingestion path.
// TikTok share/page URLs are resolved inside the same Source Video owner before upload.
// G0: current live OCR_RUN_KEY is not configured, so a dedicated-key candidate would fail closed and break Source Video.
// Reuse the existing server-to-server FB_ADMIN_KEY root already present in Edge env + Vault; never expose service_role.
import {
  fetchTikTokMedia,
  isAllowedTikTokMediaUrl,
  isTikTokPageUrl,
  resolveTikTokSource,
} from "../_shared/tiktokSourceResolver.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_KEY = (Deno.env.get("FB_ADMIN_KEY") || "").trim();
const BUCKET = "media";
const MAX_ITEMS = 20;
const MAX_BYTES = 1024 * 1024 * 1024; // 1 GiB safety ceiling for the existing Source Video bridge.

type ResolvedSource = {
  kind: "direct" | "tiktok";
  mediaUrl: string;
  mediaCandidates?: Array<{ url: string; source?: string | null }>;
  resolvedPageUrl?: string | null;
  platformVideoId?: string | null;
  resolutionSource?: string | null;
};

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
async function deleteFromStorage(path: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
  } catch { /* best-effort cleanup only */ }
}

async function uploadStreamToStorage(
  path: string,
  body: ReadableStream<Uint8Array> | null,
  contentType: string,
): Promise<number> {
  if (!body) throw new Error("source_body_missing");

  let bytes = 0;
  const limited = body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > MAX_BYTES) {
        controller.error(new Error("source_too_large"));
        return;
      }
      controller.enqueue(chunk);
    },
  }));

  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": contentType, "x-upsert": "false" },
      body: limited,
      // @ts-ignore Deno supports streaming request bodies.
      duplex: "half",
    });
    if (!r.ok) throw new Error(`upload ${r.status}`);
    return bytes;
  } catch (error) {
    // The destination was verified absent before upload. If the source stream or Storage
    // request fails, remove any incomplete object so a retry cannot be mistaken for success.
    await deleteFromStorage(path);
    throw error;
  }
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
function contentLooksLikeAudio(contentType: string) {
  return String(contentType || "").toLowerCase().startsWith("audio/");
}

async function resolveSource(src: string): Promise<ResolvedSource> {
  if (!isTikTokPageUrl(src)) return { kind: "direct", mediaUrl: src };
  return await resolveTikTokSource(src) as ResolvedSource;
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

async function fetchResolvedMedia(
  resolution: ResolvedSource,
  rangeProbe = false,
): Promise<{ response: Response; finalUrl: string; selectedCandidateSource?: string | null; attemptedCandidates?: number }> {
  if (resolution.kind === "tiktok") {
    const candidates = (resolution.mediaCandidates?.length
      ? resolution.mediaCandidates
      : [{ url: resolution.mediaUrl, source: resolution.resolutionSource }]
    ).slice(0, 8);

    let lastResponse: Response | null = null;
    let lastUrl = resolution.mediaUrl;
    let lastSource: string | null | undefined = resolution.resolutionSource;
    let lastError: unknown = null;
    let attempted = 0;

    for (const candidate of candidates) {
      attempted += 1;
      const candidateResolution: ResolvedSource = {
        ...resolution,
        mediaUrl: candidate.url,
        resolutionSource: candidate.source || null,
      };
      try {
        const response = await fetchTikTokMedia(candidateResolution, fetch, { rangeProbe });
        const finalUrl = response.url || candidate.url;
        const contentType = response.headers.get("content-type") || "";
        const usable = response.ok
          && resolvedMediaResponseAllowed(candidateResolution, response)
          && !contentLooksLikeHtml(contentType)
          && !contentLooksLikeAudio(contentType);
        if (usable) {
          return {
            response,
            finalUrl,
            selectedCandidateSource: candidate.source || null,
            attemptedCandidates: attempted,
          };
        }
        lastResponse = response;
        lastUrl = finalUrl;
        lastSource = candidate.source;
        try { await response.body?.cancel(); } catch { /* best effort */ }
      } catch (error) {
        lastError = error;
        lastSource = candidate.source;
      }
    }

    if (lastResponse) {
      return {
        response: lastResponse,
        finalUrl: lastUrl,
        selectedCandidateSource: lastSource || null,
        attemptedCandidates: attempted,
      };
    }
    throw lastError || new Error("tiktok_candidates_exhausted");
  }

  const headers = new Headers();
  if (rangeProbe) headers.set("Range", "bytes=0-0");
  const response = await fetch(resolution.mediaUrl, { method: "GET", headers, redirect: "follow" });
  return { response, finalUrl: response.url || resolution.mediaUrl };
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
          const { response: probe, finalUrl, selectedCandidateSource, attemptedCandidates } = await fetchResolvedMedia(resolution, true);
          if (selectedCandidateSource) out.resolution_source = selectedCandidateSource;
          if (attemptedCandidates) out.attempted_candidates = attemptedCandidates;
          const probeType = probe.headers.get("content-type") || "";
          const isAudio = contentLooksLikeAudio(probeType);
          const allowed = probe.ok && resolvedMediaResponseAllowed(resolution, probe) && !contentLooksLikeHtml(probeType) && !isAudio;
          out.status = isAudio ? "source_not_video_audio" : (allowed ? "source_ok" : `source_fail_${probe.status}`);
          out.source_status = probe.status;
          out.source_content_type = probeType || null;
          out.resolved_media_host = (() => { try { return new URL(finalUrl).hostname; } catch { return null; } })();
          try { await probe.body?.cancel(); } catch { /* best effort */ }
          results.push(out);
          continue;
        }

        const { response: resp, finalUrl, selectedCandidateSource, attemptedCandidates } = await fetchResolvedMedia(resolution);
        if (selectedCandidateSource) out.resolution_source = selectedCandidateSource;
        if (attemptedCandidates) out.attempted_candidates = attemptedCandidates;
        if (!resp.ok) { out.status = `source_fail_${resp.status}`; results.push(out); continue; }
        if (!resolvedMediaResponseAllowed(resolution, resp)) { out.status = "resolved_media_host_rejected"; results.push(out); continue; }
        const len = Number(resp.headers.get("content-length") || "0");
        if (len > MAX_BYTES) { out.status = "too_large"; results.push(out); continue; }
        const ct = resp.headers.get("content-type") || "video/mp4";
        if (contentLooksLikeHtml(ct)) { out.status = "source_not_video_html"; results.push(out); continue; }
        if (contentLooksLikeAudio(ct)) { out.status = "source_not_video_audio"; results.push(out); continue; }
        if (len > 0 && len < 1024) { out.status = "too_small_likely_error_page"; results.push(out); continue; }
        out.source_content_type = ct;
        out.resolved_media_host = (() => { try { return new URL(finalUrl).hostname; } catch { return null; } })();
        const streamedBytes = await uploadStreamToStorage(dest, resp.body, ct.startsWith("video") ? ct : "video/mp4");
        out.bytes = streamedBytes;
        if (streamedBytes < 1024) {
          await deleteFromStorage(dest);
          out.status = "too_small_likely_error_page";
          results.push(out);
          continue;
        }
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
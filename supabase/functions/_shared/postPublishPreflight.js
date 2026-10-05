// publish_post preflight (POST_PUBLISHING_2029_CHAIN_V1) — EXTEND_EXISTING, no store, no I/O.
// A caller supplies editorial intent + FACTS it already read from the existing owners
// (media-upload-intent read-back, video_transcripts, posts taxonomy/slugs). This module only decides.
// It never writes, never publishes and never canonicalizes: READY means "a validated bundle for the
// existing sys_save_post writer exists", not "published" and not "verified truth".
//
// States: READY | CONTINUATION (a bounded step under an existing owner is still pending) | BLOCKED.
// A bundle is produced ONLY when READY.

import { isCanonicalVideoOriginalPath, posterPathForOriginal } from "./mediaPosterLane.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RASTER_POSTER_MIMES = new Set(["image/jpeg", "image/png"]);
const RASTER_EXT_RE = /\.(jpe?g|png)$/i;
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const LANG_RE = /^[a-z]{2,3}$/;

const s = (v) => String(v ?? "").trim();
const asSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []));

export const STORAGE_PUBLIC_PREFIX = (supabaseUrl) => `${s(supabaseUrl).replace(/\/+$/, "")}/storage/v1/object/public/media/`;

function isCanonicalMediaUrl(url, supabaseUrl, storagePath) {
  const prefix = STORAGE_PUBLIC_PREFIX(supabaseUrl);
  if (!s(supabaseUrl) || !url.startsWith(prefix)) return false;
  const rel = url.slice(prefix.length).split(/[?#]/)[0];
  return rel.startsWith("sod1820/") && !rel.includes("..") && (!storagePath || rel === storagePath);
}

// Every URL the post would use as content identity (image_url / video src / poster) must be Supabase Storage.
function externalMediaRefs(content, supabaseUrl) {
  const prefix = STORAGE_PUBLIC_PREFIX(supabaseUrl);
  const refs = [];
  const re = /<(?:video|source|iframe|img)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']|<video\b[^>]*?\bposter\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(content))) for (const u of [m[1], m[2]]) if (u && /^https?:\/\//i.test(u) && !u.startsWith(prefix)) refs.push(u);
  return refs;
}

const block = (code, detail) => ({ code, detail });
const cont = (code, owner, action, detail) => ({ code, owner, action, detail });

export function preflightPost({ intent = {}, facts = {}, supabaseUrl = "" }) {
  const blockers = [];
  const continuations = [];
  const kind = s(intent.kind) || "text";
  const content = s(intent.content);
  const title = s(intent.title);
  const slug = s(intent.slug);

  if (!title) blockers.push(block("TITLE_REQUIRED"));
  if (!content) blockers.push(block("CONTENT_REQUIRED"));

  // Slug uniqueness is checked explicitly: sys_save_post would silently suffix a duplicate with the id.
  if (!slug) blockers.push(block("SLUG_REQUIRED"));
  else if (asSet(facts.existing_slugs).has(slug) && !intent.update_post_id) blockers.push(block("SLUG_TAKEN", slug));

  // Taxonomy: existing labels only (publishing_conventions). Series != Category != Medium != Representation.
  const cats = asSet(facts.taxonomy?.categories), tags = asSet(facts.taxonomy?.tags);
  for (const c of intent.categories || []) if (!cats.has(c)) blockers.push(block("TAXONOMY_UNKNOWN_CATEGORY", c));
  for (const t of intent.tags || []) if (!tags.has(t)) blockers.push(block("TAXONOMY_UNKNOWN_TAG", t));

  // Source / provenance / attribution (external media keeps a visible credit; provenance is not rewritten).
  // SOURCE != TRANSPORT: a meaningful source identity is source_kind (e.g. "uploaded_file") and/or platform.
  // attr.ingest_transport (e.g. the processing service the file passed through) is private provenance only:
  // it never satisfies provenance, never becomes the platform, and never appears in the public credit.
  const attr = intent.source_attribution || null;
  if (kind === "video" || attr) {
    const identity = attr ? (s(attr.source_kind) || s(attr.platform)) : "";
    if (!attr || !identity || !s(attr.credit_text)) blockers.push(block("PROVENANCE_MISSING", "source identity (source_kind or platform) + credit_text required; ingest_transport alone is not a source"));
    else {
      const transport = s(attr.ingest_transport).toLowerCase();
      if (transport && (s(attr.platform).toLowerCase() === transport || s(attr.credit_text).toLowerCase().includes(transport))) {
        blockers.push(block("TRANSPORT_ASSERTED_AS_SOURCE", "ingest_transport is processing provenance, not source authority or public credit"));
      }
      if (!content.includes(s(attr.credit_text))) blockers.push(block("ATTRIBUTION_NOT_VISIBLE", "credit_text must appear in post body"));
    }
  }

  // No raw external URL as content identity.
  for (const u of externalMediaRefs(content, supabaseUrl)) blockers.push(block("RAW_EXTERNAL_MEDIA_IDENTITY", u));
  const imageUrl = s(intent.image_url);
  if (imageUrl && !isCanonicalMediaUrl(imageUrl, supabaseUrl) && !imageUrl.startsWith(`${s(supabaseUrl).replace(/\/+$/, "")}/storage/v1/object/public/`)) {
    blockers.push(block("RAW_EXTERNAL_MEDIA_IDENTITY", imageUrl));
  }

  let posterUrl = "";
  if (kind === "video") {
    const v = facts.media?.video;
    if (!v) {
      blockers.push(block("SOURCE_VIDEO_REQUIRED", "source_video_publish_law: the video itself is the required representation"));
    } else {
      if (!isCanonicalMediaUrl(s(v.public_url), supabaseUrl, s(v.storage_path)) || !UUID_RE.test(s(v.asset_id))) {
        blockers.push(block("MEDIA_NOT_CANONICAL", "video must be a media-bucket object under sod1820/ with a media-upload-intent asset_id"));
      }
      if (!v.read_back?.ok || !VIDEO_MIMES.has(s(v.read_back.mime))) {
        continuations.push(cont("MEDIA_VERIFY_PENDING", "media-upload-intent", "verify", "owner-readable read-back (size/mime[/sha256]) not yet ok"));
      }
      if (!isCanonicalVideoOriginalPath(s(v.storage_path))) {
        blockers.push(block("MEDIA_PATH_NOT_2029_CANONICAL", "video original must be sod1820/2029/video/YYYY/MM/<asset-id>/original.<ext> (agent-specific paths are not canonical for new posts)"));
      }
      if (s(v.public_url) && !content.includes(s(v.public_url))) blockers.push(block("VIDEO_NOT_EMBEDDED", "post body must embed the canonical self-hosted video URL"));
    }
    const p = facts.media?.poster;
    if (!p) {
      const planned = posterPathForOriginal(s(v?.storage_path));
      continuations.push(cont("POSTER_PENDING", "media-thumb-queue", "poster_from_stored_video",
        `existing derivative lane: media-thumb-queue op=list_video_posters + scripts/media-thumbs.mjs (media-thumbs workflow) writes ${planned || "derivatives/poster.jpg"} server-side; no client capture, no new media identity`));
    } else {
      posterUrl = s(p.public_url);
      const ext = RASTER_EXT_RE.test(posterUrl.split(/[?#]/)[0]);
      if (!isCanonicalMediaUrl(posterUrl, supabaseUrl)) blockers.push(block("POSTER_NOT_SUPABASE_STORAGE", posterUrl));
      else if (!ext || (p.mime && !RASTER_POSTER_MIMES.has(s(p.mime)))) blockers.push(block("POSTER_NOT_RASTER", "post_og_image_law: JPG/PNG only"));
      const expected = posterPathForOriginal(s(v?.storage_path));
      if (expected && !blockers.some((b) => b.code === "POSTER_NOT_SUPABASE_STORAGE") && posterUrl.split(/[?#]/)[0] !== STORAGE_PUBLIC_PREFIX(supabaseUrl) + expected) {
        blockers.push(block("POSTER_PATH_MISMATCH", `poster must be the derivative ${expected}`));
      }
      if (imageUrl && posterUrl && imageUrl !== posterUrl) blockers.push(block("IMAGE_URL_POSTER_MISMATCH", "post image_url must be the verified poster"));
    }
  }

  // Transcript / translation state, only where requested. SOURCE != TRANSCRIPT != TRANSLATION.
  const lp = intent.language_policy || {};
  const rows = Array.isArray(facts.transcripts) ? facts.transcripts : [];
  const original = rows.find((r) => r.is_original);
  if (lp.require_transcript || (lp.want_translations || []).length) {
    if (!original) {
      continuations.push(cont("TRANSCRIPT_PENDING", "video-transcribe", "transcribe", "no original transcript row for this video_key"));
    } else if (!LANG_RE.test(s(original.lang))) {
      blockers.push(block("SOURCE_LANGUAGE_UNKNOWN", "original transcript has no valid language; declare it, do not default"));
    }
    if (original) {
      for (const lang of lp.want_translations || []) {
        if (lang === original.lang) continue;
        if (!rows.some((r) => r.lang === lang && !r.is_original)) continuations.push(cont("TRANSLATION_PENDING", "video-transcribe", "translate", lang));
      }
    }
  }

  const state = blockers.length ? "BLOCKED" : continuations.length ? "CONTINUATION" : "READY";
  const result = { task_key: "POST_PUBLISHING_2029_CHAIN_V1", ok: state === "READY", state, blockers, continuations, bundle: null };
  if (state !== "READY") return result;

  // Bundle = exact arguments for the existing writer public.sys_save_post (service-only). Publication != Canonical:
  // no verified / verify_level / canonical flag is set here; ai_touched is only what the caller declared.
  result.bundle = {
    writer: "public.sys_save_post",
    args: {
      p_id: intent.update_post_id ?? null,
      p_title: title, p_slug: slug, p_content: content, p_excerpt: s(intent.excerpt),
      p_categories: [...(intent.categories || [])], p_tags: [...(intent.tags || [])],
      p_author: intent.author ?? null,
      p_image_url: posterUrl || imageUrl || null,
      p_source: s(intent.source) || "ai",
      p_ai_touched: intent.ai_touched === true,
    },
    video_key: s(intent.video_key) || null,
    release: "NOT_PUBLISHED_BUNDLE_ONLY",
  };
  return result;
}

// Receipt shaped for the existing work_log AFTER pattern (caller persists it; nothing is written here).
export function preflightReceipt(result, { assignment_id = null, checked_at } = {}) {
  return {
    task_key: result.task_key, assignment_id, state: result.state, checked_at: checked_at || null,
    blocker_codes: result.blockers.map((b) => b.code),
    continuation_codes: result.continuations.map((c) => c.code),
  };
}

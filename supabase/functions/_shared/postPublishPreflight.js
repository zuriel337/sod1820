// publish_post preflight (POST_PUBLISHING_2029_CHAIN_V1) — EXTEND_EXISTING, no store, no I/O.
// A caller supplies editorial intent + FACTS it already read from the existing owners
// (media-upload-intent read-back, video_transcripts, posts taxonomy/slugs). This module only decides.
// It never writes, never publishes and never canonicalizes: READY means "a validated bundle for the
// existing sys_save_post writer exists", not "published" and not "verified truth".
//
// Routing pointer only (no domain law here): task_profile publish_post is already declared in the live
// inter_agent_coordination_law (v13); the agent is the orchestrator and this module is a pure decision helper.
// There is no publish Edge/system; the only writer is the existing service-only public.sys_save_post.
//
// States: READY | CONTINUATION (a bounded step under an existing owner is still pending) | BLOCKED.
// A bundle is produced ONLY when READY.

import { canonicalMediaPath, isCanonical2029MediaPath, isCanonicalImagePath, isCanonicalVideoOriginalPath, posterPathForOriginal } from "./mediaPosterLane.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RASTER_POSTER_MIMES = new Set(["image/jpeg", "image/png"]);
const RASTER_EXT_RE = /\.(jpe?g|png)$/i;
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const LANG_RE = /^[a-z]{2,3}$/;

const s = (v) => String(v ?? "").trim();
const asSet = (v) => (v instanceof Set ? v : new Set(Array.isArray(v) ? v : []));

export const STORAGE_PUBLIC_PREFIX = (supabaseUrl) => `${s(supabaseUrl).replace(/\/+$/, "")}/storage/v1/object/public/media/`;

// Strict media-bucket identity: exact origin, no credentials/query/hash/encoding/dot segments (see canonicalMediaPath).
// When `storagePath` is given the URL must resolve to exactly that path.
function isCanonicalMediaUrl(url, supabaseUrl, storagePath) {
  const rel = canonicalMediaPath(url, supabaseUrl);
  return !!rel && (!storagePath || rel === storagePath);
}

// Pure conservative scanner (no regex over the whole body, no DOM, no parser dependency). It walks EVERY start tag and
// EVERY attribute (no tag allowlist). The only explicit exemption is <a href> (external citations / source links), which is
// never inspected. Every other URL-bearing value must resolve to a canonical 2029 media-bucket object or it fails closed:
//  - known URL attributes (src, srcset, poster, data, href on non-<a>, xlink:href, background, formaction, data-*src*, ...)
//    are always checked, whatever their shape (a relative path is not a canonical identity);
//  - any other attribute is checked when its value is URL-like (http(s)/ftp/file/data/blob/javascript scheme or //host)
//    or carries CSS url()/@import/image-set() (style, svg presentation attrs) or a meta refresh `url=`;
//  - <style> element bodies are scanned for CSS url()/@import/image-set().
// Same-document fragment refs ("#id", url(#id)) are not media. Entity / escape / control-char / unterminated forms are
// reported as ambiguous, never guessed. Ordinary text (including URLs in text nodes) is never inspected.
const URL_ATTRS = new Set(["src", "srcset", "poster", "data", "background", "href", "xlink:href", "formaction", "action", "manifest", "longdesc", "ping", "icon", "lowsrc", "dynsrc", "usemap", "cite", "codebase", "archive", "profile"]);
const WS = /\s/;
const SCHEME_RE = /^(?:https?|ftp|file|data|blob|javascript|vbscript|ws|wss):/i;
const TEXT_ATTRS = new Set(["alt", "title", "class", "id", "lang", "dir", "name", "placeholder"]);
const ENTITY_RE = /&(?:#|colon|tab|newline|sol|bsol|lpar|rpar|quot|apos|amp)/i;

function cssUrls(css) {
  const out = [];
  const lc = css.toLowerCase();
  const take = (from) => { // read one url token starting at index `from` (after '(' or after @import)
    let k = from;
    while (k < css.length && WS.test(css[k])) k++;
    const q = css[k];
    if (q === '"' || q === "'") { const e = css.indexOf(q, k + 1); return e === -1 ? null : css.slice(k + 1, e); }
    let e = k;
    while (e < css.length && css[e] !== ")" && !WS.test(css[e])) e++;
    return css.slice(k, e);
  };
  for (let i = 0; (i = lc.indexOf("url(", i)) !== -1; i += 4) { const u = take(i + 4); out.push(u === null ? undefined : u); }
  for (let i = 0; (i = lc.indexOf("@import", i)) !== -1; i += 7) {
    let k = i + 7; while (k < css.length && WS.test(css[k])) k++;
    if (lc.startsWith("url(", k)) continue; // already taken by the url( pass
    const u = take(k); if (u !== null && u !== "") out.push(u);
  }
  for (let i = 0; (i = lc.indexOf("image-set(", i)) !== -1; i += 10) {
    const end = css.indexOf(")", i);
    const seg = css.slice(i + 10, end === -1 ? css.length : end);
    for (const m of seg.split(",")) { const t = m.trim(); const q = t[0]; if (q === '"' || q === "'") { const e = t.indexOf(q, 1); if (e > 0) out.push(t.slice(1, e)); } }
  }
  return out;
}

export function scanMediaRefs(html) {
  const text = String(html ?? "");
  const refs = [], ambiguous = [];
  const add = (tag, attr, url) => { if (url === undefined) ambiguous.push({ tag, attr, value: "(unterminated css url)" }); else if (url && !url.startsWith("#")) refs.push({ tag, attr, url }); };
  const lower = text.toLowerCase();
  let i = 0;
  while ((i = text.indexOf("<", i)) !== -1) {
    let j = i + 1;
    if (text[j] === "/" || text[j] === "!" || text[j] === "?") { i = j; continue; }
    let name = "";
    while (j < text.length && /[A-Za-z0-9:-]/.test(text[j])) name += text[j++];
    if (!name) { i = j; continue; }
    const tag = name.toLowerCase();
    let closed = false;
    while (j < text.length) {
      while (j < text.length && (WS.test(text[j]) || text[j] === "/")) j++;
      if (text[j] === ">") { closed = true; j++; break; }
      if (j >= text.length) break;
      let an = "";
      while (j < text.length && !WS.test(text[j]) && !`/>=`.includes(text[j])) an += text[j++];
      while (j < text.length && WS.test(text[j])) j++;
      let val = null;
      if (text[j] === "=") {
        j++;
        while (j < text.length && WS.test(text[j])) j++;
        const q = text[j];
        if (q === '"' || q === "'") {
          const end = text.indexOf(q, j + 1);
          if (end === -1) { j = text.length; break; }
          val = text.slice(j + 1, end); j = end + 1;
        } else {
          let v = "";
          while (j < text.length && !WS.test(text[j]) && text[j] !== ">") v += text[j++];
          val = v;
        }
      } else if (!an) { j++; continue; }
      if (val === null || !an) continue;
      const attr = an.toLowerCase();
      if (tag === "a" && attr === "href") continue; // the only explicit exemption: external citations / source links
      const compact = val.replace(/[\x00-\x20]/g, "");
      const known = URL_ATTRS.has(attr) || attr.endsWith("src") || attr.endsWith("srcset") || /^data-.*(src|poster|url|href|image|img|bg|background)/.test(attr);
      const hasCss = attr === "style" || /url\(|@import|image-set\(/i.test(val);
      const metaRefresh = tag === "meta" && /url\s*=/i.test(val);
      const urlish = SCHEME_RE.test(compact) || compact.startsWith("//");
      const obscured = /[&\\\x00]/.test(val);
      if (!known && !hasCss && !metaRefresh && !urlish) {
        // Not URL-bearing as written. Entity/escape-obscured values on non-text attributes are unreadable, not guessed.
        if (obscured && ENTITY_RE.test(val) && !TEXT_ATTRS.has(attr) && !attr.startsWith("aria-")) ambiguous.push({ tag, attr, value: val.slice(0, 120) });
        continue;
      }
      // URL values must be plain; CSS text may span lines/tabs but not carry escapes/entities.
      if (obscured || ((known || urlish || metaRefresh) && (/[\x00-\x1f]/.test(val) || val !== val.trim()))) { ambiguous.push({ tag, attr, value: val.slice(0, 120) }); continue; }
      if (hasCss && !known) { for (const u of cssUrls(val)) add(tag, attr, u); }
      if (metaRefresh) { const m = /url\s*=\s*['"]?([^'";]*)/i.exec(val); if (m) add(tag, attr, m[1].trim()); continue; }
      if (known || urlish) {
        if (attr.endsWith("srcset")) for (const c of val.split(",")) { const u = c.trim().split(/\s+/)[0]; if (u) add(tag, attr, u); }
        else if (val) add(tag, attr, val);
      }
    }
    if (!closed) ambiguous.push({ tag, attr: "(unterminated tag)", value: "" });
    // <style> bodies: CSS url()/@import/image-set() must be canonical media too (raw-text element; read to </style).
    if (tag === "style" && closed) {
      const end = lower.indexOf("</style", j);
      const body = text.slice(j, end === -1 ? text.length : end);
      if (/[&\\\x00]/.test(body)) ambiguous.push({ tag, attr: "(style element)", value: body.slice(0, 120) });
      else for (const u of cssUrls(body)) add(tag, "(style element)", u);
      if (end === -1) ambiguous.push({ tag, attr: "(unterminated style)", value: "" });
    }
    i = j > i ? j : i + 1;
  }
  return { refs, ambiguous };
}

// Every media-bearing reference in the body must be a canonical 2029 media-bucket object. Returns blockers.
function mediaRefBlockers(content, supabaseUrl) {
  const out = [];
  const { refs, ambiguous } = scanMediaRefs(content);
  for (const a of ambiguous) out.push(block("MEDIA_ATTR_AMBIGUOUS", `<${a.tag} ${a.attr}> cannot be read unambiguously (entity/escape/unterminated); rewrite it as a plain canonical URL`));
  for (const r of refs) {
    const rel = canonicalMediaPath(r.url, supabaseUrl);
    if (!rel || !isCanonical2029MediaPath(rel)) out.push(block("RAW_EXTERNAL_MEDIA_IDENTITY", `<${r.tag} ${r.attr}> ${r.url}`));
  }
  return out;
}

const kindRank = { text: 0, image: 1, video: 2 };
// Effective kind comes from facts/content (video signal > image > text). intent.kind can never downgrade it.
function effectiveKind(intent, facts, content) {
  const tags = new Set();
  for (let m, re = /<\s*([A-Za-z][A-Za-z0-9:-]*)/g; (m = re.exec(content));) tags.add(m[1].toLowerCase());
  if (s(intent.kind) === "video" || facts.media?.video || tags.has("video")) return "video";
  if (s(intent.kind) === "image" || facts.media?.image || tags.has("img") || s(intent.image_url)) return "image";
  return "text";
}

const block = (code, detail) => ({ code, detail });
const cont = (code, owner, action, detail) => ({ code, owner, action, detail });

export function preflightPost({ intent = {}, facts = {}, supabaseUrl = "" }) {
  const blockers = [];
  const continuations = [];
  const content = s(intent.content);
  const declaredKind = s(intent.kind);
  const kind = effectiveKind(intent, facts, content);
  if (declaredKind && kindRank[declaredKind] !== undefined && kindRank[declaredKind] < kindRank[kind]) {
    blockers.push(block("KIND_DOWNGRADE_DETECTED", `intent.kind=${declaredKind} but facts/content indicate ${kind}; effective kind is inferred, never downgraded`));
  }
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

  // No raw external URL as media identity: only media-bearing attributes are scanned (never plain <a href> links).
  blockers.push(...mediaRefBlockers(content, supabaseUrl));
  const imageUrl = s(intent.image_url);
  const prefixUrl = STORAGE_PUBLIC_PREFIX(supabaseUrl);
  let imagePostUrl = "";
  if (imageUrl && !canonicalMediaPath(imageUrl, supabaseUrl)) blockers.push(block("RAW_EXTERNAL_MEDIA_IDENTITY", imageUrl));

  // Image post (post_og_image_law v1: post image_url is a JPG/PNG on Supabase Storage). Released convention:
  // sod1820/2029/image/YYYY/MM/<asset-uuid>/<file>. A non-JPG/PNG canonical original is NOT published: it is an explicit
  // representation CONTINUATION (no new image store/worker is invented here).
  if (kind === "image") {
    const im = facts.media?.image;
    if (!im) {
      blockers.push(block("SOURCE_IMAGE_REQUIRED", "image post requires facts.media.image from the media-upload-intent read-back"));
    } else {
      const rel = canonicalMediaPath(s(im.public_url), supabaseUrl);
      const assetDir = rel ? rel.split("/")[5] || "" : "";
      if (!rel || rel !== s(im.storage_path) || !UUID_RE.test(s(im.asset_id)) || !isCanonicalImagePath(rel) || assetDir.toLowerCase() !== s(im.asset_id).toLowerCase()) {
        blockers.push(block("MEDIA_NOT_CANONICAL", "image must be sod1820/2029/image/YYYY/MM/<asset-id>/<file> in the media bucket with a media-upload-intent asset_id"));
      } else {
        if (!im.read_back?.ok) continuations.push(cont("MEDIA_VERIFY_PENDING", "media-upload-intent", "verify", "owner-readable image read-back not yet ok"));
        else if (!RASTER_POSTER_MIMES.has(s(im.read_back.mime)) || !RASTER_EXT_RE.test(rel)) {
          continuations.push(cont("IMAGE_RASTER_REPRESENTATION_PENDING", "post_og_image_law", "provide_jpg_png_representation", `canonical original (${s(im.read_back.mime) || "unknown mime"}) is not JPG/PNG; not publishable as post image_url until a JPG/PNG representation exists`));
        } else imagePostUrl = prefixUrl + rel;
      }
      if (imageUrl && imagePostUrl && imageUrl !== imagePostUrl) blockers.push(block("IMAGE_URL_MISMATCH", "post image_url must be exactly the verified canonical image URL"));
      else if (imageUrl && !imagePostUrl && s(im.public_url) && imageUrl !== s(im.public_url)) blockers.push(block("IMAGE_URL_MISMATCH", "post image_url must be exactly the canonical image URL"));
    }
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
      const posterRel = canonicalMediaPath(posterUrl, supabaseUrl); // exact identity: no query/hash/encoding
      if (!posterRel) blockers.push(block("POSTER_NOT_SUPABASE_STORAGE", posterUrl));
      else if (!RASTER_EXT_RE.test(posterRel) || (p.mime && !RASTER_POSTER_MIMES.has(s(p.mime)))) blockers.push(block("POSTER_NOT_RASTER", "post_og_image_law: JPG/PNG only"));
      const expected = posterPathForOriginal(s(v?.storage_path));
      if (expected && posterRel && posterRel !== expected) blockers.push(block("POSTER_PATH_MISMATCH", `poster must be the derivative ${expected}`));
      if (imageUrl && posterUrl && imageUrl !== posterUrl) blockers.push(block("IMAGE_URL_POSTER_MISMATCH", "post image_url must be the verified poster"));
    }
    if (imageUrl && !p) {
      const expected = posterPathForOriginal(s(v?.storage_path));
      if (!expected || imageUrl !== prefixUrl + expected) blockers.push(block("IMAGE_URL_POSTER_MISMATCH", "post image_url must be exactly the derived poster URL"));
    }
  }

  // Transcript / translation state, only where requested. SOURCE != TRANSCRIPT != TRANSLATION.
  const lp = intent.language_policy || {};
  const rows = Array.isArray(facts.transcripts) ? facts.transcripts : [];
  const originals = rows.filter((r) => r.is_original);
  if (originals.length > 1) blockers.push(block("TRANSCRIPT_MULTIPLE_ORIGINALS", `${originals.length} is_original rows for one video_key; resolve to exactly one before publishing`));
  const original = originals.length === 1 ? originals[0] : undefined;
  if (originals.length <= 1 && (lp.require_transcript || (lp.want_translations || []).length)) {
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

  // HUMAN GATE (governance guard, NOT a security authorization boundary): the caller must assert release_authorized=true with
  // non-"branch-only" evidence, otherwise there is no bundle (HUMAN_RELEASE_REQUIRED). The caller can fabricate this field;
  // real enforcement is that public.sys_save_post is a service-only technical writer. Publication != Canonical/Verified.
  const relState = s(intent.release_authorization_state);
  if (intent.release_authorized !== true || /BRANCH_ONLY|NO_(MERGE|DEPLOY|REAL_POST|DB_APPLY)/i.test(relState)) {
    blockers.push(block("HUMAN_RELEASE_REQUIRED", "ZURIEL Human-Gate release authorization must be supplied by the caller (governance guard only; not a security boundary)"));
  }

  const state = blockers.length ? "BLOCKED" : continuations.length ? "CONTINUATION" : "READY";
  const result = { task_key: "POST_PUBLISHING_2029_CHAIN_V1", kind, ok: state === "READY", state, blockers, continuations, bundle: null };
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
      p_image_url: kind === "image" ? imagePostUrl || null : kind === "video" ? posterUrl || null : null,
      p_source: s(intent.source) || "ai",
      p_ai_touched: intent.ai_touched === true,
    },
    video_key: s(intent.video_key) || null,
    release_evidence: relState || "release_authorized=true",
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

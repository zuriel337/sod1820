// Source-based titles for "אור הגאולה" (channel_updates.channel = 'or-geula'). One decision used by the ingest
// (wa-channel-ingest), the public page and share card (api/og.js, publicContinuityReaders2029) and the sitemap.
//
// ZURIEL 24.11.2026 (#1448, Work 43b6ca7b): a title comes from the source, never invented. Order of trust:
//   1. an existing title that is itself meaningful (not a URL, not a placeholder);
//   2. the official YouTube title (oEmbed, read on the server only);
//   3. the source caption, cleaned of links, markup and decoration;
//   4. the og:title of a linked public page (read on the server only, SSRF-guarded).
// Without one of these the item is kept and visible, but HELD for search: no placeholder title, no index.
// No AI here. Pure functions only (Deno and Node): network reads are injected by the caller.

const PLACEHOLDERS = new Set([
  "סרטון", "עדכון", "תמונה", "קישור", "הקלטה", "וידאו", "עדכון וידאו", "🎬 עדכון וידאו", "📷 עדכון", "🎧 הקלטה",
  "אור הגאולה", "אור הגאולה — סרטון", "סוד1820", "sod1820", "video", "image", "link", "update",
]);
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const YT_ID = "([A-Za-z0-9_-]{11})";
const YT_PATTERNS = [
  new RegExp(`(?:^|[/.])youtube(?:-nocookie)?\\.com/(?:watch\\?(?:[^#\\s]*&)?v=|embed/|shorts/|live/|v/)${YT_ID}`, "i"),
  new RegExp(`(?:^|[/.])youtu\\.be/${YT_ID}`, "i"),
];

// The YouTube video id of the first YouTube link in the text (watch, youtu.be, Shorts, live, embed, mobile).
export function youtubeVideoId(...texts) {
  for (const text of texts) {
    const s = String(text || "");
    for (const re of YT_PATTERNS) { const m = re.exec(s); if (m) return m[1]; }
  }
  return null;
}

// The first non-YouTube public link in the text, as written.
export function firstLink(...texts) {
  for (const text of texts) {
    for (const m of String(text || "").matchAll(URL_RE)) {
      const raw = m[0].replace(/[),.;:!?״"'\]]+$/, "");
      if (!youtubeVideoId(raw)) return raw.startsWith("www.") ? "https://" + raw : raw;
    }
  }
  return null;
}

const strip = s => String(s || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/[*_~`]+/g, " ")
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

// A title that reads as a title: not a URL, not a placeholder, with real words.
export function isMeaningfulTitle(value) {
  const s = strip(value);
  if (!s || s.length < 4) return false;
  if (/^(?:https?:\/\/|www\.)/i.test(s) || /^[\w.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(s)) return false;
  if (PLACEHOLDERS.has(s) || PLACEHOLDERS.has(s.toLowerCase())) return false;
  // A redaction token left by the public projection ("[קישור]", "[טלפון]") or only such tokens is not a title.
  if (!s.replace(/\[[^\]]{1,20}\]/g, " ").replace(/[\s.,:;–—-]+/g, "")) return false;
  const letters = (s.match(/\p{L}/gu) || []).length;
  return letters >= 4 && s.split(" ").filter(w => /\p{L}{2,}/u.test(w)).length >= 1;
}

// A caption cut into a title: links and decoration removed, first sentence or line, at most `max` characters on a word boundary.
export function captionTitle(text, max = 90) {
  const lines = String(text || "").split(/\r?\n/).map(line => strip(line.replace(URL_RE, " "))).filter(Boolean);
  for (const line of lines) {
    let s = line.split(/(?<=[.!?׃])\s/)[0].trim().replace(/[\s:–—-]+$/, "");
    if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, "").trim() + "…";
    if (isMeaningfulTitle(s)) return s;
  }
  return null;
}

// A description from the caption: links and decoration removed, at most `max` characters.
export function captionDescription(text, max = 180) {
  const s = strip(String(text || "").replace(URL_RE, " "));
  if (!isMeaningfulTitle(s)) return null;
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, "").trim() + "…" : s;
}

// What the source is, from the source itself (never from generated text).
export function orGeulaItemKind(row = {}) {
  const media = String(row.image_url || "");
  if (/\.(mp4|mov|webm|m4v)($|[?#])/i.test(media)) return "local_video";
  if (youtubeVideoId(row.text, row.link_url)) return "youtube";
  if (media) return "image";
  if (row.link_url || firstLink(row.text)) return "link";
  return "text";
}

// The title decision. `youtubeTitle` and `linkTitle` come from server reads (oEmbed / og:title), when available.
export function resolveOrGeulaTitle({ seoTitle = null, text = null, youtubeTitle = null, linkTitle = null } = {}) {
  if (isMeaningfulTitle(seoTitle)) return { title: strip(seoTitle).slice(0, 110), source: "existing", held: false };
  if (isMeaningfulTitle(youtubeTitle)) return { title: strip(youtubeTitle).slice(0, 110), source: "youtube_oembed", held: false };
  const caption = captionTitle(text);
  if (caption) return { title: caption, source: "caption", held: false };
  if (isMeaningfulTitle(linkTitle)) return { title: strip(linkTitle).slice(0, 110), source: "link_og", held: false };
  return { title: null, source: null, held: true };
}

// The official YouTube oEmbed address for a video id (fixed host: no user-controlled fetch target).
export function youtubeOEmbedUrl(id) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(id || ""))
    ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + id)}`
    : null;
}

// Read the official YouTube title and thumbnail. `fetchImpl` is injected; a private, removed or blocked video gives null.
export async function readYouTubeOEmbed(id, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  const url = youtubeOEmbedUrl(id);
  if (!url || typeof fetchImpl !== "function") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, redirect: "error", headers: { accept: "application/json" } });
    if (!response?.ok) return null;
    const data = await response.json();
    const title = typeof data?.title === "string" ? data.title.trim().slice(0, 200) : "";
    const thumb = typeof data?.thumbnail_url === "string" && /^https:\/\/i\.ytimg\.com\//.test(data.thumbnail_url) ? data.thumbnail_url : null;
    const author = typeof data?.author_name === "string" ? data.author_name.trim().slice(0, 120) : null;
    return title ? { title, thumbnailUrl: thumb, authorName: author } : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// The update a newly ingested "אור הגאולה" row receives (wa-channel-ingest). Only fields the row does not already have are filled:
// an existing meaningful seo_title, thumbnail or enrichment decision is never overwritten. Returns null when nothing changes.
export async function orGeulaIntakeUpdate(row = {}, { fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
  if (row.channel !== "or-geula") return null;
  if (isMeaningfulTitle(row.seo_title)) return null;
  const kind = orGeulaItemKind(row);
  const ytId = kind === "youtube" ? youtubeVideoId(row.text, row.link_url) : null;
  const yt = ytId ? await readYouTubeOEmbed(ytId, { fetchImpl }) : null;
  const decision = resolveOrGeulaTitle({ seoTitle: row.seo_title, text: row.text, youtubeTitle: yt?.title || null });
  // A self-hosted video keeps its pending status: wa-video-enrich still sets its watch link and research map, and keeps this title.
  const video = kind === "local_video";
  const update = decision.held
    ? (video ? {} : { enrichment_status: "seo_held", enrichment_source: ytId ? "youtube_metadata_unavailable" : "no_source_title" })
    : video ? { seo_title: decision.title }
    : { seo_title: decision.title, enrichment_status: "source_title", enrichment_source: decision.source, enriched_at: now() };
  if (yt?.thumbnailUrl && !row.thumb_url) update.thumb_url = yt.thumbnailUrl;
  return { kind, youtubeId: ytId, decision, update: Object.keys(update).length ? update : null };
}

// Sitemap admission for a video page. A video whose source is a channel message (video_media_assets_v1.primary_source_type
// 'channel_update', listed today at /video/<public_id>) or an "אור הגאולה" watch page needs a source title; other pages
// (posts) keep their own rules.
export function orGeulaSitemapAdmits(pageUrl, title, sourceType = null) {
  const channelVideo = sourceType === "channel_update" || /\/or-geula\/video\//i.test(String(pageUrl || ""));
  return !channelVideo || isMeaningfulTitle(title);
}

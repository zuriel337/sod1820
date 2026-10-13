import { youtubeId } from "../format.js";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

// External message URLs are data, never HTML or arbitrary iframe sources.
export function describeMessageLink(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
  const link = { kind: "link", href: url.href, host: url.hostname };
  if (url.protocol === "https:" && url.hostname === "linswmnnkjxvweumprav.supabase.co") {
    const file = /^\/storage\/v1\/object\/public\/gallery\/community\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|pdf|txt|docx)$/i.exec(url.pathname);
    if (file) return { ...link, kind: /^(jpg|jpeg|png|webp|gif)$/i.test(file[1]) ? "image" : "file", extension: file[1].toUpperCase() };
  }
  if (url.port) return link;
  if (YOUTUBE_HOSTS.has(url.hostname)) {
    const candidate = url.hostname.endsWith("youtu.be") ? url.pathname.slice(1)
      : url.pathname === "/watch" ? url.searchParams.get("v")
      : /^\/(?:embed|shorts|live|v)\/([^/]+)\/?$/.exec(url.pathname)?.[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(candidate || "")) {
      const id = youtubeId(`https://www.youtube.com/watch?v=${candidate}`);
      return { ...link, kind: "youtube", id, embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    }
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
    const id = /^\/(?:video\/)?([0-9]{1,12})\/?$/.exec(url.pathname)?.[1];
    if (id) return { ...link, kind: "vimeo", id, embed: `https://player.vimeo.com/video/${id}` };
  }
  return link;
}

export function splitMessageLinks(text = "") {
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    // Keep prose punctuation outside the anchor without truncating balanced URL parentheses.
    let raw = match[0].replace(/[.,!?;:،。]+$/, "");
    while (raw.endsWith(")") && (raw.match(/\)/g) || []).length > (raw.match(/\(/g) || []).length) raw = raw.slice(0, -1);
    const link = describeMessageLink(raw);
    if (!link) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ text: raw, link });
    cursor = match.index + raw.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export function messageLinkPreviews(parts) {
  const seen = new Set();
  return parts.flatMap(({ link }) => {
    if (!link) return [];
    const key = link.id ? `${link.kind}:${link.id}` : link.href;
    if (seen.has(key) || seen.size >= 3) return [];
    seen.add(key);
    return [{ ...link, key }];
  });
}

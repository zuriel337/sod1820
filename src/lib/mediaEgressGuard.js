// EGRESS_HARDENING_MONITORING_V1
// Passive/raw HTML surfaces must never opt into media fetch before an explicit user play action.
// This helper preserves the original media URL and controls, but strips autoplay and forces
// preload="none" on HTML5 video/audio tags. Dedicated players remain untouched.

// PUBLIC_STORAGE_MEDIA_V1 — the one shared answer used by the public-reading worker (transport.js) and by the public readers that
// hand media to players (publicNowMediaHref and the surfaces built on it): is this URL an already-public object, or an image
// rendition, in one of this project's public buckets, carrying only display/version parameters? It returns the canonical object
// identity (bucket + path, no parameters) separately from those parameters, and a media kind taken from the path, never from the
// query. Signed (/object/sign/), authenticated, private-bucket and foreign URLs never qualify, and nothing here rewrites them.
// Self-contained on purpose: the worker embeds this exact function source.
export function publicStorageMedia(href) {
  let url;
  try { url = new URL(String(href)); } catch { return null; }
  if (url.origin !== "https://linswmnnkjxvweumprav.supabase.co" || url.username || url.password) return null;
  const match = /^\/storage\/v1\/(object|render\/image)\/public\/(media|gallery|magar)\/([^?#]+)$/.exec(url.pathname);
  if (!match || match[3].includes("//")) return null;
  const rendition = match[1] !== "object", display = {};
  for (const [key, value] of url.searchParams) {
    if (Object.prototype.hasOwnProperty.call(display, key)) return null;
    // A version/cache key (gen-thumb style ?v=<time>, imported WordPress players ?_=<n>) changes no identity and no permission.
    if (key === "v" || key === "_") { if (!/^[A-Za-z0-9._-]{1,40}$/.test(value)) return null; }
    else if (rendition && (key === "width" || key === "height")) { if (!/^[0-9]{1,4}$/.test(value) || Number(value) < 1 || Number(value) > 2048) return null; }
    else if (rendition && key === "quality") { if (!/^[0-9]{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 100) return null; }
    else if (rendition && key === "resize") { if (!["cover", "contain", "fill"].includes(value)) return null; }
    else return null;
    display[key] = value;
  }
  if (rendition && !("width" in display || "height" in display)) return null;
  const ext = (/\.([A-Za-z0-9]{1,5})$/.exec(match[3]) || [])[1]?.toLowerCase() || "";
  const kind = rendition ? "image" : /^(?:mp4|webm|mov|m4v)$/.test(ext) ? "video" : /^(?:mp3|m4a|aac|oga|ogg|opus|wav|flac)$/.test(ext) ? "audio"
    : /^(?:jpg|jpeg|png|webp|gif|avif|svg)$/.test(ext) ? "image" : ext === "vtt" ? "caption" : "file";
  // A media fragment start time (the Now preview frame, #t=0.1) is a player instruction the network never sees; any other
  // fragment, and any fragment on an image, does not qualify.
  if (url.hash) {
    const start = /^#t=([0-9]{1,6}(?:\.[0-9]{1,3})?)(?:,[0-9]{1,6}(?:\.[0-9]{1,3})?)?$/.exec(url.hash);
    if (!start || (kind !== "video" && kind !== "audio")) return null;
    display.t = url.hash.slice(3);
  }
  // The 2029 ingress convention keeps one generated asset id in the path (sod1820/2029/<kind>/YYYY/MM/<asset-id>/original.<ext>).
  const asset = /^sod1820\/2029\/(?:image|video|audio|document)\/[0-9]{4}\/[0-9]{2}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(match[3]);
  return { href: url.href, canonical: `${url.origin}/storage/v1/object/public/${match[2]}/${match[3]}`,
    bucket: match[2], path: match[3], assetId: asset ? asset[1].toLowerCase() : null, rendition, kind, display };
}

function withoutAttr(attrs, name) {
  const re = new RegExp(
    "\\s+" + name + "(?:\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s>]+))?",
    "gi",
  );
  return String(attrs || "").replace(re, "");
}

function hardenTag(tag, attrs) {
  let next = withoutAttr(attrs, "autoplay");
  next = withoutAttr(next, "preload");
  next = withoutAttr(next, "data-sod-egress-guard");
  const playsInline = tag === "video" && !/\splaysinline(?:\s|=|$)/i.test(next)
    ? " playsinline"
    : "";
  return `<${tag}${next}${playsInline} preload="none" data-sod-egress-guard="passive">`;
}

export function hardenPassiveMediaHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<video\b([^>]*)>/gi, (_match, attrs) => hardenTag("video", attrs))
    .replace(/<audio\b([^>]*)>/gi, (_match, attrs) => hardenTag("audio", attrs));
}

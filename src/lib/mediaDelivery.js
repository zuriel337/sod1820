// Canonical media delivery guard for imported/legacy HTML.
// Owner: Research Intake / Media Performance map. This is presentation-only:
// it never changes stored source HTML or media identity.
//
// Contract: page render must not fetch heavyweight video/audio before explicit user intent.
// Legacy WordPress/Elementor content frequently carries preload="metadata" or autoplay.
// Normalize only the rendered copy: preload=none + no autoplay. The original source stays byte-for-byte.

const MEDIA_TAG_RE = /<(video|audio)\b([^>]*)>/gi;
const PRELOAD_RE = /\s+preload\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
const AUTOPLAY_RE = /\s+autoplay(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi;

function deferTag(tagName, attrs = "") {
  let next = String(attrs || "").replace(AUTOPLAY_RE, "");
  if (PRELOAD_RE.test(next)) next = next.replace(PRELOAD_RE, ' preload="none"');
  else next += ' preload="none"';
  return `<${tagName}${next}>`;
}

export function deferLegacyHtmlMedia(html = "") {
  const source = String(html || "");
  if (!source) return source;
  return source.replace(MEDIA_TAG_RE, (_full, tagName, attrs) => deferTag(tagName, attrs));
}

export function hasEagerLegacyHtmlMedia(html = "") {
  const source = String(html || "");
  if (!source) return false;
  return /<(?:video|audio)\b[^>]*(?:preload\s*=\s*["']?(?:auto|metadata)|\sautoplay(?:\s|=|>))/i.test(source);
}

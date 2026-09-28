// EGRESS_HARDENING_MONITORING_V1
// Passive/raw HTML surfaces must never opt into media fetch before an explicit user play action.
// This helper preserves the original media URL and controls, but strips autoplay and forces
// preload="none" on HTML5 video/audio tags. Dedicated players remain untouched.

function withoutAttr(attrs, name) {
  const re = new RegExp(
    String.raw`\\s+${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,
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

// Dependency-free link admission for contributor/writer/community addresses.
// Lives apart from publicContributor2029Model.js so the frame-level personal-link helpers and the Community
// chat do not pull the World research projection into their first load. The function bodies are the exact
// ones that previously lived in the Model, which re-exports them (same API, same behaviour).
const text = (v) => typeof v === "string" ? v.trim() : "";

export function safePublicUrl(value) {
  const raw = text(value);
  if (!raw || /[\\\u0000-\u0020]/.test(raw) || raw.startsWith("//")) return null;
  if (raw.startsWith("/") && !/^\/(?:researcher|admin)(?:\/|$)/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

const RETURN_PATH = /^\/(?:(?:2029\/)?(?:world|post|posts|p|topic|number|book|books|source|sources|community|search)(?:\/|$)|2029\/me\/(?:public-page|page-editor|profile|messages|notifications|progress)(?:\/|$))/;
// The Preview community is one exact URL shape, `/2029?preview=community`; other /2029 targets stay rejected.
const isPreviewCommunity = (url) => url.pathname === "/2029" && url.searchParams.get("preview") === "community";

export function approvedReturnHref(value, origin) {
  const raw = text(value);
  if (!raw || raw.length > 2500 || /[\\\u0000-\u0020]/.test(raw) || raw.startsWith("//")) return null;
  try {
    const base = new URL(origin);
    const url = new URL(raw, base);
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== base.origin || url.username || url.password || !(RETURN_PATH.test(decoded) || isPreviewCommunity(url))
      || /[\\\u0000-\u0020]/.test(decoded) || decoded.includes("//") || decoded.includes("%")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

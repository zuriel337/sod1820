// ZURIEL 1.11.2026: explicit deployment-scoped public reading configuration.
// Existing availability owner, one projection shared by routes, metadata and XML.
// This profile never writes/rewrites shared site_flags or changes Legacy defaults.
export const PUBLIC_READING_PROFILE_ID = "public-reading-20261101";
export const PUBLIC_READING_RELEASE = typeof __SOD_2029_BUILD__ !== "undefined" && __SOD_2029_BUILD__
  && import.meta.env?.VITE_PUBLIC_READING_RELEASE === PUBLIC_READING_PROFILE_ID;
// Only the separate, dormant Production artifact preserves signed Legacy
// unsubscribe. Preview and Legacy cannot acquire this service exception.
export const PUBLIC_READING_PRODUCTION_ARTIFACT = PUBLIC_READING_RELEASE
  && typeof __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__ !== "undefined"
  && __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__ === true;

const openFlags = new Set(["lock_world", "lock_number", "lock_gematria"]);
export function publicReadingFeatureLock(flag) {
  return Object.freeze({ enabled: !openFlags.has(flag), mode: "all", message: openFlags.has(flag) ? "" : "האזור אינו פתוח בגרסת הקריאה הציבורית." });
}

export function publicReadingPath(pathname, { isAdmin = false } = {}) {
  let path;
  try { path = decodeURIComponent(pathname).replace(/\/+$/, "") || "/"; } catch { return "missing"; }
  if (path === "/login") return "account";
  // Screen admission is distinct from operation admission. These existing
  // read surfaces retain their feature/action locks and server authorization.
  if (isAdmin && /^\/(?:code|els|heichal|היכל|books?)(?:\/|$)/.test(path)) return "admin-view";
  if (/^\/(?:api|admin|auth|community\/chat|2029\/me|community\/researcher\/me|code|els|heichal|היכל|journey|2029\/journey|raziel|2029\/raziel|books?|beit-midrash|research)(?:\/|$)/.test(path)) return "closed";
  if (path === "/unsubscribe" && PUBLIC_READING_PRODUCTION_ARTIFACT) return "public";
  if (["/updates", "/unsubscribe"].includes(path)) return "service-closed";
  if (["/", "/world", "/post", "/posts", "/number", "/gematria", "/gallery", "/map", "/privacy", "/2029", "/2029/posts", "/2029/gematria", "/2029/gematria/viral", "/2029/calculator"].includes(path)) return "public";
  if (/^\/(?:post|number|topic|researcher|video)\/[^/]+$/.test(path) || /^\/2029\/number\/[^/]+$/.test(path) || /^\/community\/researcher\/[^/]+$/.test(path)) return "public";
  // A historical single-segment Post remains subject to the canonical public
  // Post lookup/boundary. This does not declare an unknown/draft slug published.
  return /^\/[^/]+$/.test(path) ? "post-lookup" : "missing";
}

export const PUBLIC_READING_OPEN_ROUTES = Object.freeze(["/", "/world", "/post", "/number", "/gematria", "/gallery", "/map", "/privacy"]);

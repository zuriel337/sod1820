import { publicPageShareUrl } from "../publicPostUrls.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validCommunityAuthorKey(value) {
  return typeof value === "string" && UUID.test(value.startsWith("user:") ? value.slice(5) : value);
}

// Keep the existing source/account namespace and community URL. This is not a
// newly minted Person identity or a public URL for a private contributor dossier.
export function communityPersonHref(authorKey) {
  return validCommunityAuthorKey(authorKey)
    ? `/community/chat?${new URLSearchParams({ member: authorKey })}` : null;
}

export function isCommunityPersonHref(href) {
  if (typeof href !== "string" || !href.startsWith("/")) return false;
  try {
    const url = new URL(href, "https://local.invalid");
    const canonical = url.pathname === "/community/chat";
    const legacy = url.pathname === "/2029" && url.searchParams.get("preview") === "community" && url.searchParams.get("data") === "live";
    return url.origin === "https://local.invalid" && (canonical || legacy) && !url.hash
      && validCommunityAuthorKey(url.searchParams.get("member"))
      && [...url.searchParams.keys()].every((key) => (canonical ? ["member"] : ["preview", "data", "member"]).includes(key));
  } catch { return false; }
}

export function communityPersonReturnHref(pathname, search, hash = "") {
  const params = new URLSearchParams(search);
  for (const key of ["member", "memberCard", "claim", "section", "item", "page", "format", "returnTo"]) params.delete(key);
  return `${pathname}${params.size ? `?${params}` : ""}${hash}`;
}

// The account trip stays local and keeps the complete reading position. Reuse
// the existing context sanitizer so a Preview grant cannot enter return URLs.
export function communityAccountReturnHref(location) {
  const safe = publicPageShareUrl(location);
  if (!safe) return "/community/chat";
  const url = new URL(safe);
  return url.pathname + url.search + url.hash;
}

// In-page navigation retains the exact reading state and inert anchor while the
// existing URL sanitizer removes access grants. New links use the public route.
export function communityChatHref(search = "", hash = "") {
  const params = new URLSearchParams(search);
  params.delete("preview"); params.delete("data");
  return communityAccountReturnHref({ pathname: "/community/chat", search: params.toString(), hash });
}

export function communityReadingReturnHref(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || !(url.pathname === "/community/chat"
        || url.pathname === "/2029" && url.searchParams.get("preview") === "community")) return null;
    // Do not grow recursive return chains when switching thread/reply views.
    url.searchParams.delete("returnTo");
    return communityChatHref(url.search, url.hash);
  } catch { return null; }
}

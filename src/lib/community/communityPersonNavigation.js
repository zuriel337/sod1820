const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validCommunityAuthorKey(value) {
  return typeof value === "string" && UUID.test(value.startsWith("user:") ? value.slice(5) : value);
}

// Keep the existing source/account namespace and community URL. This is not a
// newly minted Person identity or a public URL for a private contributor dossier.
export function communityPersonHref(authorKey) {
  return validCommunityAuthorKey(authorKey)
    ? `/2029?${new URLSearchParams({ preview: "community", data: "live", member: authorKey })}` : null;
}

export function isCommunityPersonHref(href) {
  if (typeof href !== "string" || !href.startsWith("/2029?")) return false;
  try {
    const url = new URL(href, "https://local.invalid");
    return url.origin === "https://local.invalid" && url.pathname === "/2029" && !url.hash
      && url.searchParams.get("preview") === "community" && url.searchParams.get("data") === "live"
      && validCommunityAuthorKey(url.searchParams.get("member"))
      && [...url.searchParams.keys()].every((key) => ["preview", "data", "member"].includes(key));
  } catch { return false; }
}

export function communityPersonReturnHref(pathname, search, hash = "") {
  const params = new URLSearchParams(search);
  for (const key of ["member", "memberCard", "claim", "section", "item", "page", "format", "returnTo"]) params.delete(key);
  return `${pathname}${params.size ? `?${params}` : ""}${hash}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Only ancestry already established by the public recursive thread reader.
// Rebuild the URL: account, inbox, return, search and Preview access state never travel.
export function communityMessageShareUrl(currentHref, path) {
  if (!Array.isArray(path) || !path.length || path.length > 30
      || path.some(id => typeof id !== "string" || !UUID.test(id)) || new Set(path).size !== path.length) return null;
  try {
    const current = new URL(currentHref);
    if (current.username || current.password || !(current.protocol === "https:" || current.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(current.hostname))) return null;
    const url = new URL("/community/chat", current.origin);
    url.searchParams.set("thread", path[0]);
    if (path.length > 1) {
      url.searchParams.set("reply", path[path.length - 1]);
      url.searchParams.set("path", path.join(","));
    }
    return url.href;
  } catch { return null; }
}

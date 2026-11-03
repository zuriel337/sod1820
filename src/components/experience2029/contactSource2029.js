// Source context for the existing contact/issue gateway only. No account,
// callback, mail credential, free-text search, return URL or fragment is copied.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const integer = value => /^\d{1,9}$/.test(value);
const identity = value => UUID.test(value);
const author = value => UUID.test(value.replace(/^user:/, ""));
const oneOf = values => value => values.includes(value);
const selectionPath = value => {
  const ids = value.split(",");
  return ids.length <= 30 && ids.every(identity) && new Set(ids).size === ids.length;
};
const READING_PARAMS = Object.freeze({
  thread: identity, reply: identity, path: selectionPath, member: author, memberCard: author,
  gallery: value => integer(value) || identity(value), image: value => integer(value) || identity(value),
  assetId: identity, record: value => integer(value) || identity(value),
  page: integer, chapter: integer, offset: integer, take: integer, part: integer,
  number: value => /^-?\d{1,12}$/.test(value), value: value => /^-?\d{1,12}$/.test(value),
  method: value => /^[a-z][a-z0-9_:-]{0,63}$/i.test(value),
  sort: oneOf(["newest", "oldest", "liked", "relevance", "asc", "desc"]),
  sourceSort: oneOf(["newest", "oldest"]),
  section: oneOf(["all", "community", "sources", "findings", "writings", "topics", "gallery", "video"]),
  tab: oneOf(["all", "community", "sources", "findings", "writings", "topics"]),
  tool: oneOf(["gematria", "calculator"]),
  preview: oneOf(["community"]), data: oneOf(["live"]),
});
const PRIVATE_OR_SERVICE = /^\/(?:auth|login|join|welcome|unsubscribe|updates|profile|admin|credits|buy|journey|raziel|2029\/(?:me|control|journey|raziel)|community\/researcher\/me)(?:\/|$)/;

export function contactSourceHref(value, origin = globalThis.window?.location?.origin || "https://sod1820.co.il") {
  if (!value) return null;
  try {
    const base = new URL(origin);
    if (base.username || base.password || !(base.protocol === "https:" || base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) return null;
    const raw = typeof value === "string" ? value : `${value.pathname || "/"}${value.search || ""}`;
    if (raw.length > 12000 || /[\\\u0000-\u0020]/.test(raw) || raw.startsWith("//")) return null;
    const url = new URL(raw, base.origin);
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== base.origin || url.username || url.password || url.pathname.length > 600 || /[\\\u0000-\u001f]/.test(path)) return null;
    const source = new URL(url.pathname, base.origin);
    if (!PRIVATE_OR_SERVICE.test(path)) {
      for (const [key, item] of url.searchParams) {
        const accept = READING_PARAMS[key];
        if (Object.hasOwn(READING_PARAMS, key) && accept(item) && url.searchParams.getAll(key).length === 1) source.searchParams.set(key, item);
      }
    }
    // Keep bounded exact reading identities; never copy a truncated credential.
    if (source.href.length > 2500) source.search = "";
    return source.href;
  } catch { return null; }
}

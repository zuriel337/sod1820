// Public Post address adapter under the existing publishing/routing owners.
// Source publication dates can be backdated; they are never an address clock.
const SITE = "https://sod1820.co.il";
const OWN_HOSTS = new Set(["sod1820.co.il", "www.sod1820.co.il", "sod1820.vercel.app"]);
// Live provenance review: two AI and two document publications have an old
// root-form link field. Keep those root URLs as readable aliases, prefer /post/.
// Original imported WordPress records (including AI-revised4756) stay at root.
const REVIEWED_MODERN_ROOT_IDS = new Set(["2601", "5084", "5104", "5110"]);
const clean = value => String(value ?? "").trim();

export function decodePostSlug(value) {
  const slug = clean(value);
  try { return decodeURIComponent(slug); } catch { return slug; }
}

export function postSlugSegment(value) {
  const slug = decodePostSlug(value);
  return slug && slug !== "." && slug !== ".." ? encodeURIComponent(slug) : "";
}

function storedPostPath(post) {
  const link = clean(post?.link), slug = decodePostSlug(post?.slug);
  if (!link || !slug) return null;
  try {
    const url = new URL(link, SITE);
    if (!OWN_HOSTS.has(url.hostname) || !["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const match = url.pathname.match(/^\/(post\/)?([^/]+)\/?$/);
    if (!match || decodePostSlug(match[2]) !== slug) return null;
    return { path: url.pathname, modern: Boolean(match[1]) };
  } catch { return null; }
}

export function publicPostAddress(post) {
  const row = typeof post === "string" ? { slug: post } : post || {};
  const segment = postSlugSegment(row.slug);
  if (!segment) return null;
  const stored = storedPostPath(row), source = clean(row.source).toLowerCase();
  if (source === "wordpress") return { path: stored && !stored.modern ? stored.path : `/${segment}`, kind: "legacy", basis: "wordpress_origin" };
  if (stored && !stored.modern && !REVIEWED_MODERN_ROOT_IDS.has(String(row.id))) return { path: stored.path, kind: "legacy", basis: "preserved_original_address" };
  if (["ai", "sod1820", "source_document", "uploaded_file"].includes(source) || stored?.modern) return { path: `/post/${segment}`, kind: "modern", basis: "native_publication_provenance" };
  // Missing/other provenance never authorizes moving an existing durable URL.
  return { path: `/${segment}`, kind: "legacy", basis: "conservative_existing_address" };
}

export function publicPostHref(post, { search = "", hash = "" } = {}) {
  const address = publicPostAddress(post);
  return address ? address.path + (search ? (search.startsWith("?") ? search : "?" + search) : "")
    + (hash ? (hash.startsWith("#") ? hash : "#" + hash) : "") : null;
}

export function publicPostUrl(post) {
  const path = publicPostHref(post);
  return path ? SITE + path : null;
}

// Research return is the visited document/parameters, not a canonical redirect.
export function exactPostReadingHref(post, location = {}, hash = "") {
  const path = clean(location.pathname);
  const wp = new URLSearchParams(location.search || "").get("p");
  const isSamePost = postAddressSlug(path) === decodePostSlug(post?.slug)
    || (path === "/" && /^\d+$/.test(wp || "") && post?.wp_id != null && wp === String(post.wp_id));
  const base = isSamePost ? path + (location.search || "") : publicPostHref(post);
  const anchor = hash || location.hash || "";
  return base ? base + (anchor && !anchor.startsWith("#") ? "#" + anchor : anchor) : null;
}

export function postAddressSlug(pathname) {
  const match = clean(pathname).match(/^\/(?:post\/)?([^/?#]+)\/?$/);
  return match ? decodePostSlug(match[1]) : null;
}

export function canonicalPostShareUrl(currentUrl, canonicalUrl) {
  try {
    const current = new URL(currentUrl), canonical = new URL(canonicalUrl);
    if (canonical.origin !== SITE || !postAddressSlug(current.pathname)
      || postAddressSlug(current.pathname) !== postAddressSlug(canonical.pathname)) return currentUrl;
    return publicPostShareUrl({ slug: postAddressSlug(canonical.pathname), link: canonical.href }, current);
  } catch { return currentUrl; }
}

// Public sharing never carries Preview access grants or authentication material.
// Reading identifiers, source, method, repeated parameters and anchors remain.
export function publicPostShareUrl(post, location = {}) {
  const canonical = publicPostUrl(post);
  if (!canonical) return null;
  const params = new URLSearchParams(location.search || "");
  for (const key of [...params.keys()]) if (/^(?:_vercel_share|_?vercel_protection_bypass|x-vercel-protection-bypass|x-vercel-set-bypass-cookie|access_token|refresh_token|id_token|token|secret|password|authorization)$/i.test(key)) params.delete(key);
  const search = params.toString();
  const hash = /(?:^#|[?&])(?:access_token|refresh_token|id_token|token)=/i.test(location.hash || "") ? "" : location.hash || "";
  return canonical + (search ? "?" + search : "") + hash;
}

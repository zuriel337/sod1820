import { isPublicPostReadingSource } from "./publicPostBoundary.js";

// Old-address Posts first (ZURIEL 16.11.2026): the cover image that the Post page renders first and with priority — `post.image_url`
// (Post2029Page postReadingCoverItem -> CanonicalMediaImage2029 primary, loading=eager, fetchpriority=high) — starts downloading when the
// route-owned source read returns (about 3.5 s into a cold load on a slow phone) instead of when the page code has mounted (about 7 s).
// Same URL, same element, same request (the image element reuses the preload): discovery time only. On WordPress posts the body usually
// repeats the same file at full width and that copy is the largest paint, so it is served from the same download.
export function postCoverHref2029(post) {
  const href = typeof post?.image_url === "string" ? post.image_url.trim() : "";
  return /^https:\/\/[^\s"'<>]+$/i.test(href) ? href : null;
}

export function hintPostCover2029(post, { doc = globalThis.document } = {}) {
  try {
    if (!doc?.head || !isPublicPostReadingSource(post)) return false;   // the page renders a cover only for an admitted public source
    const href = postCoverHref2029(post);
    if (!href) return false;
    if ([...doc.head.querySelectorAll('link[rel="preload"][as="image"]')].some((link) => link.href === href)) return false;
    const link = doc.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.fetchPriority = "high";
    link.href = href;
    link.dataset.postCoverHint = "true";
    doc.head.appendChild(link);
    return true;
  } catch {
    return false;   // a missed hint keeps the existing loading behaviour
  }
}

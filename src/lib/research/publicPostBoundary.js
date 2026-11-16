const clean = (value) => value == null ? "" : String(value).trim();

export const PUBLIC_POST_SUPPRESSED_TAGS = Object.freeze(["טיוטה", "פורום"]);

// Shared server-side public-post boundary for Home and World projections.
export function publicPostOnlyFilter() {
  return `tags.is.null,tags.not.ov.{${PUBLIC_POST_SUPPRESSED_TAGS.join(",")}}`;
}

export function hasSuppressedPublicPostTag(row) {
  return (Array.isArray(row?.tags) ? row.tags : [])
    .some((tag) => PUBLIC_POST_SUPPRESSED_TAGS.includes(clean(tag)));
}

// The Post page's own admission of a readable public source (moved here unchanged from post2029ReadingProjection.js, which re-exports it), so that
// code that runs before the page graph — the early cover hint of an original-address Post — applies exactly the same rule without loading the page.
// Home placement is distinct from publication/access. The existing public catalogue and XML include home-hidden posts; RLS and publication gates apply.
export function isPublicPostReadingSource(post) {
  return Boolean(post?.id != null && clean(post.slug)
    && !post._privateStage && !post._previewSnapshot && !hasSuppressedPublicPostTag(post)
    && !["gpt-draft", "web"].includes(clean(post.source).toLowerCase()));
}

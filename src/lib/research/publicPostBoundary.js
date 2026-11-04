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

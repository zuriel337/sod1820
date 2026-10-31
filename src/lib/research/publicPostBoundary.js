const clean = (value) => value == null ? "" : String(value).trim();

export const PUBLIC_POST_SUPPRESSED_TAGS = Object.freeze(["טיוטה", "פורום"]);

// A bounded 2029 publication projection over the SAME canonical Post. This is NOT
// a new Post, private security boundary or permission to release in Legacy.
// Legacy readers continue to suppress "טיוטה". Only the 2029 public readers
// may admit a deliberately marked, home-hidden Post while that suppression holds.
// Do not use this for private/paid content: the existing posts table is anon-readable.
export const POST_2029_ONLY_RELEASE_TAG = "2029-only-live";

export function isPost2029OnlyReleased(row) {
  const tags = (Array.isArray(row?.tags) ? row.tags : []).map(clean);
  return tags.includes(POST_2029_ONLY_RELEASE_TAG)
    && tags.includes("טיוטה")
    && !tags.includes("פורום");
}

// Reuse the one existing public reader. The third OR arm is deliberately
// narrower than the default: both release marker and Legacy draft suppression
// must be present, and home_hidden must still prevent Legacy home placement.
// The PostgREST filter is a server-side admission; it does NOT make RLS private.
export function publicPostOnlyFilter() {
  return `tags.is.null,tags.not.ov.{${PUBLIC_POST_SUPPRESSED_TAGS.join(",")}},and(tags.cs.{טיוטה,${POST_2029_ONLY_RELEASE_TAG}},tags.not.ov.{פורום},home_hidden.eq.true)`;
}

export function hasSuppressedPublicPostTag(row) {
  const tags = (Array.isArray(row?.tags) ? row.tags : []).map(clean);
  return tags.includes("פורום")
    || (tags.includes("טיוטה") && !isPost2029OnlyReleased(row));
}

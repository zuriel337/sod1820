// Column projection of the public single-Post reader (getPostBySlug).
//
// The reader used select('*'). Of the 42 columns of public.posts, twelve are never read by any client source
// (`content_old` is the pre-edit body backup; the rest are verification / Facebook / AI bookkeeping that only
// Edge functions and the admin tools use), yet PostgREST returned them on every post view:
//   content_old   present on 52% of the 1,320 posts, avg 29 KB, max 553 KB (SELECT-only measurement, 2026-11-07)
//   the other 11  small, but dead weight on the wire
// Every other column stays, so each consumer receives exactly the object it received before minus these keys.
// If a client source starts to read one of the excluded columns it must be moved into POST_READER_COLUMNS first;
// src/lib/postReaderColumns.test.js fails the build of that change otherwise.
export const POST_READER_EXCLUDED_COLUMNS = Object.freeze([
  "content_old", "verified_by", "ai_touched_note", "verify_level", "convergence_axes", "verify_signature",
  "has_1820_seal", "ai_number", "share_to_fb", "fb_posted_at", "fb_post_id", "fb_error",
]);

export const POST_READER_COLUMNS = Object.freeze([
  "id", "title", "content", "date", "slug", "link", "images", "categories", "created_at", "wp_id", "image_url",
  "excerpt", "author", "tags", "modified", "source", "tree_priority", "space", "verified", "verified_at",
  "ai_addition", "ai_touched", "convergence_score", "has_1820", "theme", "authors", "axis_pin", "thumb_url",
  "home_hidden", "cipher_slug",
]);

export const POST_READER_SELECT = POST_READER_COLUMNS.join(",");

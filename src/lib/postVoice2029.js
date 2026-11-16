// Visual VOICE of a Post (ZURIEL 12.11.2026, decision 1) — presentation only.
//   system      the system's own post: full royal finish (deep brown, sapphire, living gold from the canonical palette)
//   external    a named outside creator: rich but calmer finish
//   original    an early WordPress post whose own colours are a reference: its original colours and layout are kept
//   unspecified no reviewed identity: the calm finish, and it is reported as needing a classification
// It never changes text, authorship, provenance or posts.ai_addition. A named author is never overridden by a design choice.
// `source = 'ai'` alone is NOT an identity: 30 live posts carry source 'ai' with no author, and many 'ai' posts carry a named creator.
// A system voice therefore needs a REVIEWED entry below AND no named author; anything else stays unspecified until classified.
// (There is no canonical identity column today; deciding one is a ZURIEL decision, not something this file invents.)
export const POST_VOICES = Object.freeze({ system: "system", external: "external", original: "original", unspecified: "unspecified" });

// Reviewed on 12.11.2026 against the live rows (posts.source, posts.author, posts.authors).
export const REVIEWED_SYSTEM_VOICE_POSTS = Object.freeze({ 5107: "הבחירות לכנסת ה־26 — פוסט המערכת (source=ai, ללא כותב מוצהר)" });
export const REVIEWED_ORIGINAL_STYLE_POSTS = Object.freeze({ 92: "נסראללה — מקרה השוואה לצבעוניות WordPress המקורית" });

const clean = (value) => String(value ?? "").trim();
export const namedAuthorsOf = (post) => [
  ...(Array.isArray(post?.authors) ? post.authors : []),
].map(clean).filter(Boolean);

export function postVoiceFor(post) {
  const id = Number(post?.id);
  if (Number.isSafeInteger(id) && REVIEWED_ORIGINAL_STYLE_POSTS[id]) return { voice: POST_VOICES.original, reason: "reviewed_original_style" };
  // The explicit authors[] attribution (publishing conventions) always wins over any design preference.
  if (namedAuthorsOf(post).length) return { voice: POST_VOICES.external, reason: "named_authors" };
  if (Number.isSafeInteger(id) && REVIEWED_SYSTEM_VOICE_POSTS[id] && clean(post?.source).toLowerCase() === "ai" && !clean(post?.author)) {
    return { voice: POST_VOICES.system, reason: "reviewed_system_voice" };
  }
  return { voice: POST_VOICES.unspecified, reason: clean(post?.source).toLowerCase() === "ai" && !clean(post?.author) ? "ai_source_without_reviewed_identity" : "no_reviewed_identity" };
}

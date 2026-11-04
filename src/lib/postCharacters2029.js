// Reading character of a Post — presentation only. It picks which styling vocabulary the
// shared 2029 reading stage uses; it never changes the source text, claims, numbers or colours
// of the site. Derived from facts the post already carries (slug / authored markup), so a new
// post of the same kind needs no list edit. POST_FX stays the single owner of the matrix opening.
import { POST_FX } from "./postFx.js";

export const POST_CHARACTERS = Object.freeze({ quiet: "quiet", lexicon: "lexicon", matrix: "matrix", plain: "plain" });

const LEXICON_MARKUP = /class="sgx[\s"-]/;
const LEXICON_SLUG = /^chibur-/;
const QUIET_SLUG = /-dim5$/;

export function postCharacterFor(post) {
  const slug = String(post?.slug || "");
  const content = typeof post?.content === "string" ? post.content : "";
  if (POST_FX[slug]) return POST_CHARACTERS.matrix;
  if (LEXICON_SLUG.test(slug) || LEXICON_MARKUP.test(content)) return POST_CHARACTERS.lexicon;
  if (QUIET_SLUG.test(slug)) return POST_CHARACTERS.quiet;
  return POST_CHARACTERS.plain;
}

// The matrix opening is a decorative stage: static when the reader asks for reduced motion.
export function matrixOpeningFor(post) {
  const fx = POST_FX[String(post?.slug || "")];
  return fx ? { color: fx.color, headColor: fx.headColor, featured: fx.featured } : null;
}

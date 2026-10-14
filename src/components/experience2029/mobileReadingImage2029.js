// Pure helper: presentation-only mobile rendition URL for 2029 primary reading images.
// The original canonical source stays the <img src>; this only yields an optional <source>.
export const MOBILE_READING_MEDIA = "(max-width: 420px) and (max-resolution: 2dppx)";
export const MOBILE_READING_WIDTH = 768;

const ORIGINAL_PATH = /^\/storage\/v1\/object\/public\/media\/sod1820\/2029\/image\/[A-Za-z0-9._\-/]+\/reading-v\d+\.jpg$/;

export function mobileReadingRenditionUrl(src, { supabaseUrl, primary = false, thumbnail = false } = {}) {
  if (!primary || thumbnail || typeof src !== "string" || !supabaseUrl) return null;
  let url;
  let base;
  try {
    url = new URL(src);
    base = new URL(supabaseUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.origin !== base.origin) return null;
  if (url.search || url.hash || url.username || url.password) return null;
  if (!ORIGINAL_PATH.test(url.pathname) || url.pathname.includes("..") || url.pathname.includes("//")) return null;
  const path = url.pathname.replace("/object/public/", "/render/image/public/");
  return `${url.origin}${path}?width=${MOBILE_READING_WIDTH}&resize=contain&quality=90&format=origin`;
}

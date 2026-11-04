// The tiny "עכשיו" unread/new badge is an attention signal, not a
// publication rule, a Follow notification, Push delivery, or a source filter.
// ZURIEL 2026-11-05: Or HaGeula must increment the badge only for an
// authorized public image or video. Text-only and audio never increment it.
// All approved rows continue to appear in the Now list unchanged.

const PUBLIC_IMAGE_OR_VIDEO = /\.(?:jpe?g|png|webp|gif|avif|mp4|webm|mov|m4v)(?:[?#]|$)/i;

// Must be the public media URL projected by the canonical public reader,
// never a thumbnail-only preview, arbitrary source string or private object.
export function isNowBadgeEligible(item) {
  if (item?.channel !== "or-geula") return true;
  const media = item.mediaHref || item.mediaUrl;
  if (typeof media !== "string" || !PUBLIC_IMAGE_OR_VIDEO.test(media)) return false;
  try {
    const u = new URL(media);
    return u.protocol === "https:" && !u.username && !u.password
      && u.origin === "https://linswmnnkjxvweumprav.supabase.co"
      && /^\/storage\/v1\/object\/public\/(?:media|gallery|magar)\//.test(u.pathname)
      && !u.search && !u.hash;
  } catch {
    return false;
  }
}

// Never change which rows appear in the feed or whether their original
// "isNew" state can be marked seen. Filter ONLY the derived numeral badge.
export function nowBadgeRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter(row => row?.isNew === true && isNowBadgeEligible(row.item));
}

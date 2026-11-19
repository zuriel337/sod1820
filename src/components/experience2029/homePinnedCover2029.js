// The pinned מפת המציאות card's cover (HomePinnedLead in HomeComposition2029.jsx), in ONE place: the card renders it, and the Home's early start
// (src/lib/homePinnedLeadEarly2029.js) asks the browser for the very same file before the card exists, so both requests are one download.
//
// Copies of the cover: two of the Post's own widths at its quality (postArticleCore2029), so they are copies already prepared for the Post. The
// card is at most ~380 CSS px wide on a desktop and the width of a phone on a phone, so 768 px covers it at the usual densities (5107: 66 KB
// against 127 KB for the 1080 copy, 17.11.2026).
import { thumb } from "../../lib/img.js";
import { seriesLatestMember2029 } from "../../lib/nowPublications2029.js";

export const PIN_COVER_WIDTHS = Object.freeze([480, 768]);
export const PIN_COVER_QUALITY = 80;
// Same breakpoint as homeComposition2029.css (@media (max-width:760px)); the card is the page width less the gutters on a phone.
export const PIN_COVER_SIZES = "(max-width: 760px) calc(100vw - 32px), 720px";

export const pinCoverSet = url => (url && thumb(url, PIN_COVER_WIDTHS[0], PIN_COVER_QUALITY) !== url
  ? PIN_COVER_WIDTHS.map(width => `${thumb(url, width, PIN_COVER_QUALITY)} ${width}w`).join(", ") : "");

/**
 * The image the card shows while it stands on the series catalog (before the shared feed names the lead; the same Post in practice):
 * the newest member of the primary series and its cover copies. → { src, srcSet, sizes } or null when that member has no cover.
 */
export function pinnedCatalogCover2029(series) {
  const primary = (Array.isArray(series) ? series : []).find(entry => entry?.priorityLane === "primary") || null;
  const member = seriesLatestMember2029(primary?.items || []);
  const src = member?.coverUrl || null;
  if (!src) return null;
  const srcSet = pinCoverSet(src);
  return { src, srcSet: srcSet || null, sizes: srcSet ? PIN_COVER_SIZES : null, memberId: member.id };
}

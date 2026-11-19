// Home Media Policy: the original asset remains canonical in storage and in its Post.
// The Home only asks the browser for a small delivery copy sized to the visual slot.
// External URLs and assets already transformed by the delivery layer remain unchanged by thumb().
import { thumb } from "../../lib/img.js";

export const HOME_MEDIA_SLOTS_2029 = Object.freeze({
  compact: { widths: [96, 160], sizes: "64px", quality: 58 },
  series: { widths: [240, 480], sizes: "(max-width: 760px) calc(100vw - 48px), 360px", quality: 62 },
  tile: { widths: [160, 320], sizes: "150px", quality: 62 },
  poster: { widths: [240, 480], sizes: "(max-width: 760px) 150px, 180px", quality: 64 },
});

const slotFor = slot => HOME_MEDIA_SLOTS_2029[slot] || HOME_MEDIA_SLOTS_2029.compact;

/** React image attributes for a Home slot. Never rewrites the stored original. */
export function homeMediaProps2029(url, slot = "compact") {
  const { widths, sizes, quality } = slotFor(slot);
  const src = thumb(url, widths[0], quality);
  if (!src || src === url) return { src: url || null, srcSet: null, sizes: null };
  return {
    src,
    srcSet: widths.map(width => `${thumb(url, width, quality)} ${width}w`).join(", "),
    sizes,
  };
}

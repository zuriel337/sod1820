// The Home's early start for its pinned מפת המציאות card (ZURIEL 17.11.2026, "מאשר, תתחיל בסעיף 2"; test branch).
//
// Measured on the live Home (phone profile: Slow 4G + 4x CPU, 17.11.2026): the entry code arrives at ~2.9 s, the Home component mounts and
// only then asks for the series catalog (~4.8 s), the card appears when that answers (~5.8 s), and its cover is requested only then and
// painted at ~6.4 s (the page's largest paint). The image itself takes ~0.55 s; the wait is the chain before it.
//
// This runs from the entry (homeAtmospherePreload2029.js, on the Home address of the public release only) as soon as the entry code runs:
//  1. it starts the SAME series catalog read the Home reads (fetchContentSeriesCatalog2029 with the Home's own options). That read is shared
//     for a minute (contentSeries2029Projection: one superset read for every consumer), so when the Home component asks, it gets this read:
//     nothing is read twice;
//  2. when the catalog answers, it asks the browser for the card's cover copies (homePinnedCover2029.js: the same src, srcset and sizes the card
//     renders), so the card's image request is served by this download.
// The document stays the same for every reader (nothing is written into it on the server), so the kept CDN copy of "/" stays valid.
// Whatever fails here only restores today's timing: the Home reads and renders as before.
export const HOME_PINNED_COVER_MARK = "data-home-pinned-cover";

/** Adds one preload for the card's cover (idempotent). → the link, or null when there is nothing to ask for. */
export function preloadPinnedCover2029(cover, { doc = typeof document === "undefined" ? null : document } = {}) {
  if (!doc || !cover?.src) return null;
  const existing = doc.querySelector?.(`link[rel="preload"][${HOME_PINNED_COVER_MARK}]`);
  if (existing) return existing;
  const link = doc.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = cover.src;
  if (cover.srcSet) { link.setAttribute("imagesrcset", cover.srcSet); link.setAttribute("imagesizes", cover.sizes); }
  link.setAttribute("fetchpriority", "high");
  link.setAttribute(HOME_PINNED_COVER_MARK, String(cover.memberId ?? ""));
  doc.head.appendChild(link);
  return link;
}

/** Starts the Home's catalog read now and preloads the pinned card's cover when it answers. Never throws. */
export default async function({ read: suppliedRead, coverFor: suppliedCoverFor, doc } = {}) {
  try {
    // Keep this starter chunk independent of the Home route's catalog/card code. The catalog reader starts as soon
    // as its small dependency arrives; the cover rule loads in parallel and only gates creation of the preload link.
    const read = suppliedRead || await import("./research/contentSeries2029Projection.js").then(module => module.fetchContentSeriesCatalog2029);
    const pendingResult = read({ homeOnly: true, homeDisplay: true });
    const coverFor = suppliedCoverFor || await import("../components/experience2029/homePinnedCover2029.js").then(module => module.pinnedCatalogCover2029);
    const result = await pendingResult;
    return preloadPinnedCover2029(coverFor(result?.series), doc === undefined ? {} : { doc });
  } catch {
    return null;
  }
}

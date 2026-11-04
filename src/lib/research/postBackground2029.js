import { contentSeriesKeysForPost } from "./contentSeries2029Identity.js";
import { hasSuppressedPublicPostTag } from "./publicPostBoundary.js";

// Asset selection for the adopted Post backdrop, not a series taxonomy or store.
// Membership belongs to contentSeries2029Identity. Slugs, titles, numbers and
// arbitrary URLs in source rows cannot assign a background. Public access is
// checked by the Post reader before this presentation projection is consumed.
export const POST_BACKGROUND_ASSETS_2029 = Object.freeze({
  general: Object.freeze({
    mobile: "/legacy-dark-bg-post-mobile-v2-720x1280-81d7bbed9769.webp",
    preview: "/legacy-dark-bg-post-720-8f3a91ae32df.webp",
    desktop: "/legacy-dark-bg-post-1280-6ca0167e2dda.webp",
  }),
  "dimension-five": Object.freeze({
    mobile: "/dimension-five-night-mobile-v2-720x1280-b062e53195ec.webp",
    preview: "/dimension-five-night-720-a608fa1bd777.webp",
    desktop: "/dimension-five-night-1280-fed0a0b53207.webp",
  }),
  "sod-hashmal": Object.freeze({
    mobile: "/sod-hashmal-night-mobile-v2-720x1280-83478f421a58.webp",
    preview: "/sod-hashmal-night-720-90d9a95561e9.webp",
    desktop: "/sod-hashmal-night-1280-42ded30738bd.webp",
  }),
  "mah-kore-habora": Object.freeze({
    mobile: "/mah-kore-habora-night-mobile-v2-720x1280-ee55ed6ecb14.webp",
    preview: "/mah-kore-habora-night-720-883ada3afb2f.webp",
    desktop: "/mah-kore-habora-night-1280-8bce64abed3a.webp",
  }),
});

export function postBackground2029(post) {
  const suppressed = hasSuppressedPublicPostTag(post);
  const keys = suppressed ? [] : contentSeriesKeysForPost(post);
  const key = keys.length === 1 && POST_BACKGROUND_ASSETS_2029[keys[0]] ? keys[0] : "general";
  return { key, ...POST_BACKGROUND_ASSETS_2029[key],
    reason: suppressed ? "suppressed_source" : keys.length > 1 ? "ambiguous_series"
      : key === "general" ? "no_mapped_series" : "exact_series_membership" };
}

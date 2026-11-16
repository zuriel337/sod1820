// "מפת המציאות" experience gate (ZURIEL 12.11.2026). The advanced reading/editing experience belongs to the flagship series
// `reality-map` ONLY. Membership is the exact tag, exactly as contentSeries2029Identity.js defines it: no category, author, number or
// research relation admits a Post, and "רמזים חזקים" stays a separate editorial category. Ordinary Posts keep the basic reading layer.
//
// ACCEPTANCE EXCEPTION (preview only): Posts 5107 and 5112 are approved acceptance cases. They get the series experience ONLY in a build
// that sets VITE_REALITY_MAP_PREVIEW=true (the protected preview). It writes no tag, adds no category, and a production build never
// sets the flag, so the rule is not widened to the site. This list is not a series registry.
import { contentSeriesKeysForPost } from "./contentSeries2029Identity.js";

export const REALITY_MAP_KEY = "reality-map";
export const REALITY_MAP_ACCEPTANCE_POSTS = Object.freeze({
  5107: "פוסט הבחירות — מקרה קבלה ראשון (בלי תגית במסד)",
  5112: "פוסט המטוס — מקרה קבלה שני (בלי תגית במסד)",
});

// A static `import.meta.env.VITE_REALITY_MAP_PREVIEW` so a bundler can replace it; outside a bundler (node tests) it is simply off.
const buildFlag = (() => { try { return import.meta.env.VITE_REALITY_MAP_PREVIEW; } catch { return undefined; } })();
export const realityMapPreviewEnabled = () => buildFlag === "true";

// → { active, basis }  basis: "series_tag" | "preview_acceptance_exception" | null
export function realityMapExperienceFor(post, { previewEnabled = realityMapPreviewEnabled() } = {}) {
  if (!post) return { active: false, basis: null };
  if (contentSeriesKeysForPost(post).includes(REALITY_MAP_KEY)) return { active: true, basis: "series_tag" };
  const id = Number(post.id);
  if (previewEnabled && Number.isSafeInteger(id) && REALITY_MAP_ACCEPTANCE_POSTS[id]) return { active: true, basis: "preview_acceptance_exception" };
  return { active: false, basis: null };
}

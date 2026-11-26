import { postClassification2029 } from "./postClassification2029.js";
// The one continue-reading target of a Post (ZURIEL 26.11.2026): its series when it has one, otherwise its first category; null when neither.
export function postContinueTarget2029(post) {
  const classification = postClassification2029(post);
  const series = classification.series[0];
  if (series) return { label: `עוד מהסדרה: ${series.name}`, href: series.href };
  const category = classification.items.find(item => item.role !== "media-type" && item.href);
  return category ? { label: `עוד בקטגוריה: ${category.name}`, href: category.href } : null;
}

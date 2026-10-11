// ZURIEL correction, 2026-10-12: this accidental label is the existing editorial
// category, not a second category and never a derived quality/strength/tier score.
export const STRONG_HINT_CATEGORY_NAME = 'רמזים חזקים';
const LEGACY_HINT_LABEL = 'רמזי הגאולה';

export function canonicalPostCategories(categories) {
  const names = (Array.isArray(categories) ? categories : [])
    .filter(value => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
    .map(name => name === LEGACY_HINT_LABEL ? STRONG_HINT_CATEGORY_NAME : name);
  return [...new Set(names)];
}

// Preserve old bookmarked category URLs and include the two existing source rows
// until their stored metadata is reconciled separately. Unrelated categories stay exact.
export function postCategoryFilterNames(category) {
  const name = canonicalPostCategories([category])[0];
  return name === STRONG_HINT_CATEGORY_NAME
    ? [STRONG_HINT_CATEGORY_NAME, LEGACY_HINT_LABEL]
    : name ? [name] : [];
}

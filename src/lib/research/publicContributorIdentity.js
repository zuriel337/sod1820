const clean = (value) => value == null ? "" : String(value).trim();

export const ZVI_PUBLIC_CONTRIBUTOR = Object.freeze({
  slug: "tzvi-opoc",
  displayName: "צבי",
  href: "/world?view=sources&source=tzvi-opoc#world-contributor-material",
});

const ZVI_ALIASES = new Set([
  "צבי",
  "צבי (opoc)",
  "צבי opoc",
  "tzvi",
  "tzvi (opoc)",
  "tzvi opoc",
  "tzvi-opoc",
  "zvi",
  "zvi (opoc)",
  "zvi opoc",
]);

function normalizedAlias(value) {
  return clean(value).toLocaleLowerCase("he-IL").replace(/\s+/g, " ");
}

/**
 * Public author identity is resolved only from reviewed exact aliases.
 * Substring matching is deliberately forbidden: a credit that merely mentions
 * a person's name must not silently be attributed to that person.
 */
export function publicContributorIdentity(value) {
  return ZVI_ALIASES.has(normalizedAlias(value)) ? ZVI_PUBLIC_CONTRIBUTOR : null;
}

export function publicContributorHref(value) {
  return publicContributorIdentity(value)?.href || null;
}

export function publicWorldSourceHref(value) {
  return publicContributorHref(value) || "/world#world-sources";
}

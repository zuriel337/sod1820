// The legacy noindex decision follows the stored slug, including when a numeric code is canonical.
export const automaticContributorSlug2029 = slug => /^r-[0-9a-f]{16,}$/i.test(String(slug ?? "").trim());

export function writerProfileSchema2029(name, url) {
  return { "@context": "https://schema.org", "@type": "ProfilePage", url,
    mainEntity: { "@type": "Person", name } };
}

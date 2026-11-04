// Purpose enforcement for the existing subscribers/newsletter pipeline only.
export const OPENING_PURPOSE = "site-openings";
export const OPENING_SOURCE = "2029-opening-parts";
export const OPENING_CONTRACT = "opening-parts-v1";
export function openingSubscriber(email, consent, now = new Date().toISOString()) {
  if (consent !== true) throw new Error("opening-consent-required");
  return { email, source: OPENING_SOURCE, active: true, email_purposes: [OPENING_PURPOSE], opening_updates_consented_at: now };
}
// One product, "עדכוני האתר". It has its own purpose id and consent timestamp so a historical
// opening-only consent is never widened retroactively; those rows keep "site-openings".
export const SITE_UPDATES_PURPOSE = "site-updates";
export const SITE_UPDATES_SOURCE = "2029-site-updates";
export const SITE_UPDATES_CONTRACT = "site-updates-v1";
export function siteUpdatesSubscriber(email, consent, now = new Date().toISOString()) {
  if (consent !== true) throw new Error("site-updates-consent-required");
  return { email, source: SITE_UPDATES_SOURCE, active: true, email_purposes: [SITE_UPDATES_PURPOSE], site_updates_consented_at: now };
}
export function siteUpdatesExistingStatus(row) {
  if (!row || row.active !== true || row.unsubscribed_at) return "verification-required";
  return Array.isArray(row.email_purposes) && row.email_purposes.includes(SITE_UPDATES_PURPOSE)
    && Number.isFinite(Date.parse(row.site_updates_consented_at || "")) ? "exists" : "verification-required";
}
export function openingExistingStatus(row) {
  if (!row || row.active !== true || row.unsubscribed_at) return "verification-required";
  return Array.isArray(row.email_purposes) && row.email_purposes.includes(OPENING_PURPOSE)
    && Number.isFinite(Date.parse(row.opening_updates_consented_at || "")) ? "exists" : "verification-required";
}
export function newsletterPurpose(value) {
  if (value == null || value === "general") return "general";
  if (value === OPENING_PURPOSE) return OPENING_PURPOSE;
  if (value === SITE_UPDATES_PURPOSE) return SITE_UPDATES_PURPOSE;
  throw new Error("unsupported-newsletter-purpose");
}
export function canReceiveNewsletter(row, purpose = "general") {
  return row?.active === true && !row.unsubscribed_at && Array.isArray(row.email_purposes)
    && row.email_purposes.includes(purpose)
    && (purpose !== OPENING_PURPOSE || Number.isFinite(Date.parse(row.opening_updates_consented_at || "")))
    && (purpose !== SITE_UPDATES_PURPOSE || Number.isFinite(Date.parse(row.site_updates_consented_at || "")));
}

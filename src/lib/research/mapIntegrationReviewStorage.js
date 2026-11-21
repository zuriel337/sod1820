// Browser-local review data for the exact protected integration branch.
export const mapIntegrationReview = import.meta.env?.VITE_MAP_INTEGRATION_REVIEW === "true";

export function readMapReviewValue(kind, key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(`map-integration-review:${kind}:${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeMapReviewValue(kind, key, value) {
  try {
    window.localStorage.setItem(`map-integration-review:${kind}:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

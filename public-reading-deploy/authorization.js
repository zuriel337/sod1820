import { PROTECTED_REVIEW_BUILD } from "./.generated/protected-review-build.js";
import { protectedReviewRuntimeAuthorized } from "./review-admission.js";
import { PUBLIC_READING_ORIGINS } from "./deployment-policy.js";
export { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION, CANONICAL_ORIGIN,
  PUBLIC_READING_ORIGINS } from "./deployment-policy.js";

// The generated receipt is null for the ordinary dormant local build. A hosted
// review build is bound to this exact immutable deployment, source SHA and host.
// Production is denied in every case; this is not cutover authorization.
export function deploymentAuthorized() {
  const env = typeof process === "undefined" ? undefined : process?.env;
  return protectedReviewRuntimeAuthorized(PROTECTED_REVIEW_BUILD, env);
}
export function protectedReviewOrigin() {
  return deploymentAuthorized() ? `https://${PROTECTED_REVIEW_BUILD.host}` : null;
}
export function protectedReviewAuthOrigin() {
  return deploymentAuthorized() && PROTECTED_REVIEW_BUILD.authHost
    ? `https://${PROTECTED_REVIEW_BUILD.authHost}` : null;
}
export function publicReadingOriginAllowed(origin) {
  const review = protectedReviewOrigin();
  return review ? origin === review || origin === protectedReviewAuthOrigin() : PUBLIC_READING_ORIGINS.includes(origin);
}

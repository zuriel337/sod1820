import { PROTECTED_REVIEW_BUILD } from "./.generated/protected-review-build.js";
import { protectedReviewRuntimeAuthorized, publicCandidateRuntimeAuthorized } from "./review-admission.js";
import { PUBLIC_READING_ORIGINS } from "./deployment-policy.js";
export { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION, CANONICAL_ORIGIN,
  PUBLIC_READING_ORIGINS } from "./deployment-policy.js";

// The generated receipt is null for the ordinary dormant local build. A hosted
// review build is bound to this exact immutable deployment, source SHA and host.
// A separately selected staged Production-target review remains bound to its
// immutable review host. Canonical/public serving and indexing remain denied;
// this generated receipt is never cutover or domain-assignment authorization.
export function deploymentAuthorized() {
  const env = typeof process === "undefined" ? undefined : process?.env;
  return protectedReviewRuntimeAuthorized(PROTECTED_REVIEW_BUILD, env)
    || publicCandidateRuntimeAuthorized(PROTECTED_REVIEW_BUILD, env);
}
export function protectedReviewOrigin() {
  return deploymentAuthorized() && PROTECTED_REVIEW_BUILD.mode !== "public-production-candidate"
    ? `https://${PROTECTED_REVIEW_BUILD.host}` : null;
}
export function protectedReviewAuthOrigin() {
  return deploymentAuthorized() && PROTECTED_REVIEW_BUILD.target === "preview" && PROTECTED_REVIEW_BUILD.authHost
    ? `https://${PROTECTED_REVIEW_BUILD.authHost}` : null;
}
export function publicCandidateOrigin() {
  return deploymentAuthorized() && PROTECTED_REVIEW_BUILD.mode === "public-production-candidate"
    ? `https://${PROTECTED_REVIEW_BUILD.host}` : null;
}
export function publicIndexingAllowed(origin) {
  return Boolean(publicCandidateOrigin()) && PUBLIC_READING_ORIGINS.includes(origin);
}
export function publicReadingOriginAllowed(origin) {
  const review = protectedReviewOrigin();
  const candidate = publicCandidateOrigin();
  return review ? origin === review || origin === protectedReviewAuthOrigin()
    : Boolean(candidate) && origin === candidate || PUBLIC_READING_ORIGINS.includes(origin);
}

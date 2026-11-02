// Pure admission checks for this existing artifact's protected review only.
// The operator pins a clean Git SHA in this deployment's build command; the
// compiler records its own platform identity, which runtime must match exactly.
// No user request/header/query or shared site flag selects this mode.
export const REVIEW_PROJECT_ID = "prj_43q7k7QFAcWnin1tcBjce5xOi7Cq";
export const REVIEW_BRANCH = "gpt/2029-doc37-unified-alignment-20261102";
const sourceShaPattern = /^[0-9a-f]{40}$/;
const deploymentPattern = /^dpl_[A-Za-z0-9]+$/;
const hostPattern = /^sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/;
function previewPlatform(env) {
  return Boolean(env) && typeof env === "object"
    && env.VERCEL === "1" && env.VERCEL_ENV === "preview"
    && env.VERCEL_TARGET_ENV === "preview"
    && env.VERCEL_PROJECT_ID === REVIEW_PROJECT_ID
    && env.VERCEL_GIT_COMMIT_REF === REVIEW_BRANCH
    && sourceShaPattern.test(env.VERCEL_GIT_COMMIT_SHA || "")
    && deploymentPattern.test(env.VERCEL_DEPLOYMENT_ID || "")
    && hostPattern.test(env.VERCEL_URL || "");
}
export function protectedReviewBuildIdentity({ env, sourceSha, sourceDirty, requestedSourceSha }) {
  if (!previewPlatform(env) || sourceDirty || !sourceShaPattern.test(sourceSha || "")
    || requestedSourceSha !== sourceSha || env.VERCEL_GIT_COMMIT_SHA !== sourceSha)
    throw new Error("public_reading_protected_review_identity_rejected");
  return Object.freeze({ schema: 1, mode: "protected-preview-review", target: "preview",
    sourceSha, branch: REVIEW_BRANCH, projectId: REVIEW_PROJECT_ID,
    deploymentId: env.VERCEL_DEPLOYMENT_ID, host: env.VERCEL_URL,
    productionAuthorized: false, indexingAuthorized: false });
}
export function protectedReviewRuntimeAuthorized(identity, env) {
  return identity?.schema === 1 && identity.mode === "protected-preview-review"
    && identity.target === "preview" && identity.productionAuthorized === false
    && identity.indexingAuthorized === false && previewPlatform(env)
    && identity.projectId === env.VERCEL_PROJECT_ID
    && identity.branch === env.VERCEL_GIT_COMMIT_REF
    && identity.sourceSha === env.VERCEL_GIT_COMMIT_SHA
    && identity.deploymentId === env.VERCEL_DEPLOYMENT_ID
    && identity.host === env.VERCEL_URL;
}

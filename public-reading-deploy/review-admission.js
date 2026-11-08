// Pure admission checks for the existing protected review artifact.
// A staged Production-target review does not authorize canonical serving,
// indexing, domain assignment or cutover; those remain separately dormant.
// The operator pins an exact Git SHA in this deployment's build command; the
// compiler records its own platform identity, which runtime must match exactly.
// No user request/header/query or shared site flag selects this mode.
export const REVIEW_PROJECT_ID = "prj_43q7k7QFAcWnin1tcBjce5xOi7Cq";
export const REVIEW_BRANCH = "gpt/2029-main-live-state-reconcile-20261104";
// Temporary, narrowly scoped Preview-only branch for restoring analytics.
// Its exact commit SHA must still be pinned and verified at build and runtime.
export const ANALYTICS_PREVIEW_BRANCH = "gpt/analytics-full-site-restoration-20261108";
export const PRODUCTION_REVIEW_BRANCH = "main";
// Existing Git-branch alias in the same project, verified through Vercel.
// A stable callback avoids a different Auth allowlist entry for every commit.
export const REVIEW_AUTH_HOST = "sod1820-git-gpt-2029-public-cutover-f-7ce8ee-sod1820-s-projects.vercel.app";
const sourceShaPattern = /^[0-9a-f]{40}$/;
const deploymentPattern = /^dpl_[A-Za-z0-9]+$/;
const hostPattern = /^sod1820-[a-z0-9]+-sod1820-s-projects\.vercel\.app$/;
function reviewPlatform(env, target = "preview") {
  const branches = target === "preview" ? [REVIEW_BRANCH, ANALYTICS_PREVIEW_BRANCH]
    : target === "production" ? [PRODUCTION_REVIEW_BRANCH] : [];
  return branches.length > 0 && Boolean(env) && typeof env === "object"
    && env.VERCEL === "1" && env.VERCEL_ENV === target
    && (env.VERCEL_TARGET_ENV === target || (target === "preview" && env.VERCEL_TARGET_ENV == null))
    && env.VERCEL_PROJECT_ID === REVIEW_PROJECT_ID
    && branches.includes(env.VERCEL_GIT_COMMIT_REF)
    && sourceShaPattern.test(env.VERCEL_GIT_COMMIT_SHA || "")
    && deploymentPattern.test(env.VERCEL_DEPLOYMENT_ID || "")
    && hostPattern.test(env.VERCEL_URL || "");
}

// Vercel materializes the selected nested vercel.json at repository root.
// Accept that one unstaged replacement only when its complete parsed value
// matches the nested config read from the pinned Git commit. Array order counts;
// the ordinary file mode must also remain 100644 in Git's raw worktree diff.
// This does not ignore dirty files or authorize any platform/runtime identity.
export function protectedReviewConfigMaterialization({ reviewMode, reviewTarget = "preview", env, trackedStatus, trackedDiff,
  committedConfig, workingConfig }) {
  if (reviewMode !== true || !reviewPlatform(env, reviewTarget) || trackedStatus !== " M vercel.json\0"
    || !/^:100644 100644 [0-9a-f]{40} 0{40} M\0vercel\.json\0$/.test(trackedDiff || "")
    || typeof committedConfig !== "string" || typeof workingConfig !== "string") return false;
  function equal(left, right) {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object"
      || Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key =>
      Object.prototype.hasOwnProperty.call(right, key) && equal(left[key], right[key]));
  }
  try {
    const committed = JSON.parse(committedConfig), working = JSON.parse(workingConfig);
    return committed !== null && typeof committed === "object" && !Array.isArray(committed)
      && equal(committed, working);
  } catch { return false; }
}

export function protectedReviewBuildIdentity({ env, sourceSha, sourceDirty, requestedSourceSha, reviewTarget = "preview" }) {
  if (!reviewPlatform(env, reviewTarget) || sourceDirty || !sourceShaPattern.test(sourceSha || "")
    || requestedSourceSha !== sourceSha || env.VERCEL_GIT_COMMIT_SHA !== sourceSha)
    throw new Error("public_reading_protected_review_identity_rejected");
  return Object.freeze({ schema: 1, mode: reviewTarget === "production" ? "staged-production-review" : "protected-preview-review", target: reviewTarget,
    sourceSha, branch: env.VERCEL_GIT_COMMIT_REF, projectId: REVIEW_PROJECT_ID,
    deploymentId: env.VERCEL_DEPLOYMENT_ID, host: env.VERCEL_URL,
    ...(reviewTarget === "preview" && env.VERCEL_BRANCH_URL === REVIEW_AUTH_HOST && env.VERCEL_GIT_COMMIT_REF === REVIEW_BRANCH ? { authHost: REVIEW_AUTH_HOST } : {}),
    productionAuthorized: false, indexingAuthorized: false,
    ...(reviewTarget === "production" ? { cutoverAuthorized: false, domainAssignmentAuthorized: false } : {}) });
}
export function protectedReviewRuntimeAuthorized(identity, env) {
  const target = identity?.mode === "protected-preview-review" ? "preview"
    : identity?.mode === "staged-production-review" ? "production" : null;
  return Boolean(target) && identity?.schema === 1
    && identity.target === target && identity.productionAuthorized === false
    && identity.indexingAuthorized === false && reviewPlatform(env, target)
    && (target !== "production" || identity.cutoverAuthorized === false
      && identity.domainAssignmentAuthorized === false)
    && identity.projectId === env.VERCEL_PROJECT_ID
    && identity.branch === env.VERCEL_GIT_COMMIT_REF
    && identity.sourceSha === env.VERCEL_GIT_COMMIT_SHA
    && identity.deploymentId === env.VERCEL_DEPLOYMENT_ID
    && identity.host === env.VERCEL_URL
    && (identity.authHost === undefined || target === "preview" && identity.branch === REVIEW_BRANCH && identity.authHost === REVIEW_AUTH_HOST && env.VERCEL_BRANCH_URL === REVIEW_AUTH_HOST);
}

// Explicit public-capable Production candidate. It is created unrouted and
// protected; only a separately authorized platform traffic switch is cutover.
// No request parameter, host header, shared flag or environment switch can
// generate this compiled receipt. Production creation needs its own approval.
export function publicCandidateBuildIdentity({env,sourceSha,sourceDirty,requestedSourceSha}) {
  if (!reviewPlatform(env,"production") || sourceDirty || !sourceShaPattern.test(sourceSha || "")
      || requestedSourceSha !== sourceSha || env.VERCEL_GIT_COMMIT_SHA !== sourceSha)
    throw new Error("public_production_candidate_identity_rejected");
  return Object.freeze({schema:1,mode:"public-production-candidate",target:"production",
    sourceSha,branch:PRODUCTION_REVIEW_BRANCH,projectId:REVIEW_PROJECT_ID,
    deploymentId:env.VERCEL_DEPLOYMENT_ID,host:env.VERCEL_URL,
    canonicalServingPrepared:true,indexingPrepared:true,
    productionAuthorized:false,cutoverAuthorized:false,domainAssignmentAuthorized:false});
}
export function publicCandidateRuntimeAuthorized(identity,env) {
  return identity?.schema === 1 && identity.mode === "public-production-candidate"
    && identity.target === "production" && identity.canonicalServingPrepared === true
    && identity.indexingPrepared === true && identity.productionAuthorized === false
    && identity.cutoverAuthorized === false && identity.domainAssignmentAuthorized === false
    && identity.authHost === undefined && reviewPlatform(env,"production")
    && identity.projectId === env.VERCEL_PROJECT_ID
    && identity.branch === env.VERCEL_GIT_COMMIT_REF
    && identity.sourceSha === env.VERCEL_GIT_COMMIT_SHA
    && identity.deploymentId === env.VERCEL_DEPLOYMENT_ID && identity.host === env.VERCEL_URL;
}

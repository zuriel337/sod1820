export const NUMBER_REVIEW_PREVIEW_BRANCH_2029 = "gpt/perf-unified-wave3-preview-20261018";

// This is a review-only projection of the existing launch gate. Vercel exposes
// these system values during the build, so a cherry-pick, another Preview branch
// or a Production build cannot inherit the exception accidentally.
export function isNumberReviewPreviewBuild2029(env = {}) {
  return env.SOD_BUILD_TARGET === "2029"
    && env.VERCEL_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === NUMBER_REVIEW_PREVIEW_BRANCH_2029;
}

const NUMBER_REVIEW_PREVIEW_OPEN =
  typeof __SOD_NUMBER_REVIEW_PREVIEW_OPEN__ !== "undefined"
  && __SOD_NUMBER_REVIEW_PREVIEW_OPEN__ === true;

export function projectNumberReviewFlag2029(flag, lock, previewOpen = NUMBER_REVIEW_PREVIEW_OPEN) {
  if (!previewOpen || flag !== "lock_number" || !lock) return lock;
  return { ...lock, enabled: false };
}

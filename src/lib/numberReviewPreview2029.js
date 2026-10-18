export const NUMBER_REVIEW_PREVIEW_BRANCH_2029 = "gpt/perf-unified-wave4-preview-20261018";

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

const NUMBER_REVIEW_PREVIEW_HOST =
  typeof __SOD_NUMBER_REVIEW_PREVIEW_HOST__ !== "undefined"
  && typeof __SOD_NUMBER_REVIEW_PREVIEW_HOST__ === "string"
    ? __SOD_NUMBER_REVIEW_PREVIEW_HOST__.trim().toLowerCase()
    : "";

export function isApprovedNumberReviewPreviewHost2029(hostname, approvedHost = NUMBER_REVIEW_PREVIEW_HOST) {
  return typeof hostname === "string"
    && typeof approvedHost === "string"
    && approvedHost.length > 0
    && hostname.trim().toLowerCase() === approvedHost.trim().toLowerCase();
}

export function isNumberReviewPreviewRuntime2029({
  previewOpen = NUMBER_REVIEW_PREVIEW_OPEN,
  approvedHost = NUMBER_REVIEW_PREVIEW_HOST,
  hostname = typeof location === "undefined" ? "" : location.hostname,
} = {}) {
  return previewOpen === true
    && isApprovedNumberReviewPreviewHost2029(hostname, approvedHost);
}

export function isValidNumberReviewFlag2029(flag, lock) {
  return flag === "lock_number"
    && !!lock
    && typeof lock === "object"
    && lock.key === "lock_number"
    && typeof lock.enabled === "boolean"
    && (lock.mode === "all" || lock.mode === "anon");
}

// Preview-only recovery reads exactly one canonical row and deliberately bypasses
// the shared navigation snapshot. It neither invalidates that snapshot nor emits
// its invalidation callbacks, so runtime switches cannot restart while Number is
// retrying its own required gate.
export async function readNumberReviewFlagUncached2029(client) {
  if (!client?.from) return null;
  const { data, error } = await client
    .from("site_flags")
    .select("key,enabled,message,mode")
    .eq("key", "lock_number")
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : null;
}

export function projectNumberReviewFlag2029(
  flag,
  lock,
  previewOpen = isNumberReviewPreviewRuntime2029(),
) {
  if (flag !== "lock_number") return lock;
  // A missing or malformed canonical gate can never be converted into an open
  // Preview projection. Locked(requireFlag) will therefore remain fail-closed.
  if (!isValidNumberReviewFlag2029(flag, lock)) return null;
  if (!previewOpen) return lock;
  return { ...lock, enabled: false };
}

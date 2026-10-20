export const HOSTED_HYBRID_BRANCH = "gpt/els-research-v1-closure-20261020";

export function approvedHybridPreviewHost(raw) {
  if (typeof raw !== "string" || raw !== raw.trim() || raw !== raw.toLowerCase()) return "";
  if (!/^sod1820-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-sod1820-s-projects\.vercel\.app$/.test(raw)) return "";
  if (raw === "sod1820-sod1820-s-projects.vercel.app") return "";
  try {
    const parsed = new URL(`https://${raw}`);
    return parsed.hostname === raw && parsed.host === raw && parsed.pathname === "/" ? raw : "";
  } catch {
    return "";
  }
}

export function isExactHostedShallowCheckout({ env, head, isShallow }) {
  return isShallow === true
    && env.VERCEL === "1"
    && env.SOD_HYBRID_HOSTED_SHALLOW === "1"
    && env.SOD_BUILD_TARGET === "hybrid"
    && env.VERCEL_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === HOSTED_HYBRID_BRANCH
    && env.VERCEL_GIT_COMMIT_SHA === head
    && approvedHybridPreviewHost(env.VERCEL_URL || "") !== "";
}

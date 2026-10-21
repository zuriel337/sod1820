// Visual review exception for the VERIFIED read-only Hybrid 2029 Preview only.
// This cannot authorize data access, tool execution, writes or publication.
// The 2029 runtime is loaded only AFTER the hosted service worker attests its
// exact identity. The local Hybrid build similarly installs a read-only guard.
const HOSTED_PREVIEW_HOST = /^sod1820-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-sod1820-s-projects\.vercel\.app$/;
const SHA256 = /^[0-9a-f]{64}$/;

function currentBuild2029() {
  return typeof __SOD_2029_BUILD__ !== "undefined" && __SOD_2029_BUILD__ === true;
}

function currentDeployEnvironment() {
  return typeof __SOD_DEPLOY_ENV__ === "string" ? __SOD_DEPLOY_ENV__ : "";
}

export function isVerifiedReadOnlyHybrid2029({
  build2029 = currentBuild2029(),
  deployEnv = currentDeployEnvironment(),
  runtime = typeof document === "undefined" ? "" : document.querySelector('meta[name="sod-hybrid-runtime"]')?.content || "",
  hostname = typeof location === "undefined" ? "" : location.hostname,
  hostedGuard = typeof document === "undefined" ? "" : document.documentElement?.dataset?.sodPreviewGuard || "",
  localGuard = typeof document === "undefined" ? "" : document.documentElement?.dataset?.sodHybridGuard || "",
} = {}) {
  if (build2029 !== true || runtime !== "2029") return false;
  if (deployEnv === "preview") {
    // The hosted build verifies the preview branch, host, commit and read-only worker
    // before loading JS. The attested guard digest is set ONLY after that succeeds.
    return HOSTED_PREVIEW_HOST.test(hostname)
      && hostname !== "sod1820-sod1820-s-projects.vercel.app"
      && SHA256.test(hostedGuard);
  }
  // Local Hybrid acceptance is also guarded against writes, never general dev mode.
  return deployEnv === "hybrid-local"
    && (hostname === "localhost" || hostname === "127.0.0.1")
    && localGuard === "local-read-only";
}

// Presentation projection ONLY. Never modify the canonical lock row or the
// pure resolveFeatureState rule, and never widen Supabase RLS or server gates.
export function projectHybridPreviewDisplayAccess(canonical, readOnlyReview = isVerifiedReadOnlyHybrid2029()) {
  if (!canonical || readOnlyReview !== true) return canonical;
  return {
    ...canonical,
    enabled: false, blocked: false, allowed: true, showLogin: false,
    publicState: "open", viewerState: "preview_read_only", status: "active",
    readOnlyPreview: true,
  };
}

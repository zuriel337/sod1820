import { execFileSync } from "node:child_process";
import { buildIdentity } from "../src/lib/admin/releaseProjection.js";

export function adminBuildMetadata(env = process.env, at = new Date().toISOString()) {
  const git = args => { try { return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
  return buildIdentity({ sha: env.VERCEL_GIT_COMMIT_SHA || git(["rev-parse", "HEAD"]),
    branch: env.VERCEL_GIT_COMMIT_REF || git(["branch", "--show-current"]),
    environment: env.VERCEL_ENV || "local", deploymentId: env.VERCEL_DEPLOYMENT_ID,
    builtAt: at, source: env.VERCEL === "1" ? "vercel-system-environment" : "local-build" });
}

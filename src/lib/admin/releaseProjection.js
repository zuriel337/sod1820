// A projection of build/provider evidence; never a release ledger or a deploy gate.
export const RELEASE_CONTRACT = "sod1820-admin-release-v1";
export const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/i.test(value) ? value.toLowerCase() : null;
const text = (value, max) => typeof value === "string" && !/[\r\n\x00]/.test(value) ? value.slice(0, max) : null;
export function buildIdentity(value = {}) {
  return { sha: sha(value.sha), branch: text(value.branch, 160),
    environment: ["preview", "production", "development", "local"].includes(value.environment) ? value.environment : "unknown",
    deploymentId: /^dpl_[\w]+$/.test(value.deploymentId || "") ? value.deploymentId : null,
    builtAt: typeof value.builtAt === "string" && Number.isFinite(Date.parse(value.builtAt)) ? new Date(value.builtAt).toISOString() : null,
    source: value.source === "vercel-system-environment" ? value.source : "local-build" };
}
export function sameVersion(a, b) {
  const left = sha(a), right = sha(b);
  return left && right ? left === right ? "same" : "different" : "unknown";
}
export function releaseRelations(client, data) {
  const live = data?.live?.status === "ready" ? data.live.data : null;
  const canary = data?.canary?.status === "ready" ? data.canary.data : null;
  return { browserServer: sameVersion(client?.sha, data?.identity?.sha),
    mainLive: sameVersion(data?.main?.status === "ready" ? data.main.data?.sha : null, live?.sha),
    serverLive: sameVersion(data?.identity?.sha, live?.sha),
    // A passing status on another SHA never verifies this production deployment.
    liveVerification: live?.sha && canary?.sha === live.sha ? canary.state : "unknown" };
}

// Deliberately dormant. No environment variable, request/query/header, branch
// name or injected VERCEL_ENV can enable a hosted build or these entrypoints.
// Activation requires a separate reviewed authorization/guard change after
// ZURIEL names the exact 2029 Production cutover SHA and deployment ID.
export const PUBLIC_READING_DEPLOYMENT_AUTHORIZATION = Object.freeze({
  state: "dormant",
  approvedSourceSha: null,
  approvedDeploymentId: null,
  approvedAt: null,
});
export const CANONICAL_ORIGIN = "https://sod1820.co.il";
export const PUBLIC_READING_ORIGINS = Object.freeze([
  CANONICAL_ORIGIN, "https://www.sod1820.co.il", "https://sod1820.vercel.app",
]);
export function deploymentAuthorized() { return false; }

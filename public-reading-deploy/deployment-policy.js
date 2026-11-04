// Production stays dormant. A protected-review receipt is separate and never
// authorizes Production, canonical domains, aliases or public indexing.
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

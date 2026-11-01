import { contributorSelfHandler } from "../../api/contributor-self.js";

// Same canonical Auth/ownership handler; only the explicit own-avatar exception
// is admitted on the reviewed source and exact unified integration branches.
// The shared handler verifies the caller and owned URL; other writes stay blocked.
export default contributorSelfHandler({ previewReadOnly: !(process.env.VERCEL_ENV === "preview" && ["gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF)),
  avatarUpdates: process.env.VERCEL_ENV === "preview" && ["gpt/community-auth-publish-media-20261031", "gpt/2029-unified-community-latest-integration-20261031", "gpt/2029-unified-performance-consolidation-20261031", "gpt/2029-home-loading-acceptance-20261031", "gpt/2029-functional-unified-preview-20261031", "gpt/2029-public-foundation-continuity-20261101", "gpt/2029-public-frame-context-20261101", "gpt/2029-community1187-unified-20261101", "gpt/2029-number-fullpage-performance-20261101"].includes(process.env.VERCEL_GIT_COMMIT_REF) });

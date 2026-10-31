import { contributorSelfHandler } from "../../api/contributor-self.js";

// Same canonical Auth/ownership handler; only the explicit own-avatar exception
// is admitted on the reviewed source and exact unified integration branches.
// The shared handler verifies the caller and owned URL; other writes stay blocked.
export default contributorSelfHandler({ previewReadOnly: true,
  avatarUpdates: process.env.VERCEL_ENV === "preview" && ["gpt/community-auth-publish-media-20261031", "gpt/2029-unified-community-latest-integration-20261031"].includes(process.env.VERCEL_GIT_COMMIT_REF) });

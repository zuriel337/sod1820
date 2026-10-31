import { contributorSelfHandler } from "../../api/contributor-self.js";

// Same canonical Auth/ownership handler; only the explicit own-avatar exception
// is admitted on the reviewed Community branch. All other writes stay blocked.
export default contributorSelfHandler({ previewReadOnly: true,
  avatarUpdates: process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "gpt/community-auth-publish-media-20261031" });
